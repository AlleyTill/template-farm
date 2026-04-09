/**
 * Harvest service module. Shared by route handlers and other lanes
 * (Lane 1B AI generate imports `createHarvest`).
 */
import { and, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  harvests,
  users,
  comments,
  snippets,
  refs,
  likes,
  type Harvest as DbHarvest,
} from "@/db/schema";
import type { HarvestWithContent, SearchHit } from "@/lib/types";
import { logger } from "@/lib/logger";
import { describeError } from "@/lib/errors";

type FirstPublicHarvestHandler = (ctx: {
  userId: string;
  harvestId: string;
}) => Promise<void>;
let firstPublicHarvestHandler: FirstPublicHarvestHandler | null = null;
export function setOnFirstPublicHarvest(
  fn: FirstPublicHarvestHandler,
): void {
  firstPublicHarvestHandler = fn;
}

export type CreateHarvestInput = {
  userId: string;
  source: "ai" | "community" | "seed";
  description: string;
  name: string;
  stack: string[];
  scaffoldCommands: string[];
  compileSteps: string[];
  rationale: string;
  visibility: "public" | "private";
};

export async function createHarvest(
  input: CreateHarvestInput,
): Promise<DbHarvest> {
  const db = getDb();
  const rows = await db
    .insert(harvests)
    .values({
      userId: input.userId,
      source: input.source,
      description: input.description,
      name: input.name,
      stack: input.stack,
      scaffoldCommands: input.scaffoldCommands,
      compileSteps: input.compileSteps,
      rationale: input.rationale,
      visibility: input.visibility,
    })
    .returning();
  const inserted = rows[0];

  if (inserted.visibility === "public" && firstPublicHarvestHandler) {
    const countRows = await db.execute(sql`
      SELECT count(*)::int AS count FROM harvests
      WHERE user_id = ${inserted.userId} AND visibility = 'public'
    `);
    const countResult =
      (countRows as unknown as { rows?: unknown[] }).rows ??
      (countRows as unknown as unknown[]);
    const first = (countResult as Array<Record<string, unknown>>)[0];
    const count = first ? Number(first.count) : 0;
    if (count === 1) {
      const handler = firstPublicHarvestHandler;
      Promise.resolve()
        .then(() =>
          handler({ userId: inserted.userId, harvestId: inserted.id }),
        )
        .catch((err) =>
          logger.error("firstPublicHarvest handler failed", {
            err: describeError(err),
          }),
        );
    }
  }

  return inserted;
}

export async function getHarvest(
  id: string,
  viewerId?: string,
): Promise<HarvestWithContent | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(harvests)
    .where(eq(harvests.id, id))
    .limit(1);
  const h = rows[0];
  if (!h) return null;
  if (h.visibility === "private" && h.userId !== viewerId) {
    return null;
  }

  const [authorRows, commentRows, snippetRows, refRows, likeRows] =
    await Promise.all([
      db
        .select({ id: users.id, displayName: users.displayName })
        .from(users)
        .where(eq(users.id, h.userId))
        .limit(1),
      db
        .select({
          comment: comments,
          authorId: users.id,
          authorName: users.displayName,
        })
        .from(comments)
        .innerJoin(users, eq(comments.userId, users.id))
        .where(eq(comments.harvestId, id))
        .orderBy(comments.createdAt),
      db
        .select()
        .from(snippets)
        .where(eq(snippets.harvestId, id))
        .orderBy(snippets.createdAt),
      db
        .select()
        .from(refs)
        .where(eq(refs.harvestId, id))
        .orderBy(refs.createdAt),
      viewerId
        ? db
            .select()
            .from(likes)
            .where(and(eq(likes.harvestId, id), eq(likes.userId, viewerId)))
            .limit(1)
        : Promise.resolve([]),
    ]);

  const author = authorRows[0] ?? { id: h.userId, displayName: "unknown" };

  return {
    ...h,
    author,
    comments: commentRows.map((r) => ({
      ...r.comment,
      author: { id: r.authorId, displayName: r.authorName },
    })),
    snippets: snippetRows,
    refs: refRows,
    likedByMe: likeRows.length > 0,
  };
}

export async function listMyHarvests(userId: string): Promise<DbHarvest[]> {
  const db = getDb();
  return db
    .select()
    .from(harvests)
    .where(eq(harvests.userId, userId))
    .orderBy(desc(harvests.createdAt));
}

export async function searchHarvests(
  query: string,
  limit = 10,
): Promise<SearchHit[]> {
  const db = getDb();
  // websearch_to_tsquery is safe for raw user input.
  // Rank = ts_rank_cd * 1.0 + log(1 + like_count) * 0.2 + 1/(1+days_old)
  // Computes tsvector inline from name/stack/description. Slower than a
  // generated column + GIN index, but portable and avoids Postgres
  // immutability issues with generated columns over array expressions.
  const result = await db.execute(sql`
    WITH scored AS (
      SELECT
        id,
        name,
        description,
        stack,
        like_count      AS "likeCount",
        created_at      AS "createdAt",
        (
          setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
          setweight(to_tsvector('english', array_to_string(coalesce(stack, ARRAY[]::text[]), ' ')), 'B') ||
          setweight(to_tsvector('english', coalesce(description, '')), 'C')
        ) AS tsv
      FROM harvests
      WHERE visibility = 'public'
    )
    SELECT
      id,
      name,
      description,
      stack,
      "likeCount",
      "createdAt",
      (
        ts_rank_cd(tsv, q) * 1.0
        + ln(1 + "likeCount") * 0.2
        + (1.0 / (1.0 + EXTRACT(EPOCH FROM (now() - "createdAt")) / 86400.0))
      ) AS rank
    FROM scored, websearch_to_tsquery('english', ${query}) AS q
    WHERE tsv @@ q
    ORDER BY rank DESC
    LIMIT ${limit}
  `);

  const rows = (result as unknown as { rows?: unknown[] }).rows ??
    (result as unknown as unknown[]);
  return (rows as Array<Record<string, unknown>>).map((r) => ({
    id: r.id as string,
    name: r.name as string,
    description: r.description as string,
    stack: r.stack as string[],
    likeCount: Number(r.likeCount),
    createdAt: new Date(r.createdAt as string),
    rank: Number(r.rank),
  }));
}
