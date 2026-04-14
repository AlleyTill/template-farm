/**
 * Community service module — comments, snippets, refs, likes, forks.
 *
 * Visibility/auth gating is performed at the route-handler layer via
 * `getHarvest()`. These functions assume their caller has already verified
 * that the acting user is allowed to write to the target harvest.
 *
 * NOTE on atomicity: the neon-http driver does not support transactions, so
 * the two-step like/unlike flow (insert|delete in `likes` + update
 * `harvests.likeCount`) runs as a sequence of statements. A crash between
 * steps could leave the denormalized count off by one; a reconciliation job
 * (future Wave) can fix drift. The `likes` primary key prevents duplicates.
 */
import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  comments,
  snippets,
  refs,
  likes,
  harvests,
  users,
  type Comment as DbComment,
  type Snippet as DbSnippet,
  type Ref as DbRef,
  type Harvest as DbHarvest,
} from "@/db/schema";
import { getHarvest, createHarvest } from "@/lib/harvests";

export const COMMENT_MAX = 5000;
export const SNIPPET_TITLE_MAX = 200;
export const SNIPPET_LANGUAGE_MAX = 40;
export const SNIPPET_CODE_MAX = 10000;
export const REF_TITLE_MAX = 200;

export const REF_KINDS = ["doc", "tutorial", "repo", "video", "other"] as const;
export type RefKind = (typeof REF_KINDS)[number];

export class CommunityError extends Error {
  constructor(
    public readonly code:
      | "bad_request"
      | "not_found"
      | "forbidden",
    message: string,
  ) {
    super(message);
    this.name = "CommunityError";
  }
}

function assertLength(
  value: string,
  max: number,
  field: string,
): void {
  if (value.length === 0) {
    throw new CommunityError("bad_request", `${field} is required`);
  }
  if (value.length > max) {
    throw new CommunityError(
      "bad_request",
      `${field} exceeds ${max} characters`,
    );
  }
}

export type AddCommentInput = {
  harvestId: string;
  userId: string;
  body: string;
  parentId?: string | null;
};

export async function addComment(input: AddCommentInput): Promise<DbComment> {
  assertLength(input.body, COMMENT_MAX, "body");
  const db = getDb();

  if (input.parentId) {
    const parentRows = await db
      .select()
      .from(comments)
      .where(eq(comments.id, input.parentId))
      .limit(1);
    const parent = parentRows[0];
    if (!parent || parent.harvestId !== input.harvestId) {
      throw new CommunityError("not_found", "Parent comment not found");
    }
    if (parent.parentId !== null) {
      throw new CommunityError(
        "bad_request",
        "Only one level of nesting is allowed",
      );
    }
  }

  const rows = await db
    .insert(comments)
    .values({
      harvestId: input.harvestId,
      userId: input.userId,
      body: input.body,
      parentId: input.parentId ?? null,
    })
    .returning();
  return rows[0];
}

export type AddSnippetInput = {
  harvestId: string;
  userId: string;
  title: string;
  language: string;
  code: string;
};

export async function addSnippet(input: AddSnippetInput): Promise<DbSnippet> {
  assertLength(input.title, SNIPPET_TITLE_MAX, "title");
  assertLength(input.language, SNIPPET_LANGUAGE_MAX, "language");
  assertLength(input.code, SNIPPET_CODE_MAX, "code");
  const db = getDb();
  const rows = await db
    .insert(snippets)
    .values({
      harvestId: input.harvestId,
      userId: input.userId,
      title: input.title,
      language: input.language,
      code: input.code,
    })
    .returning();
  return rows[0];
}

export type AddRefInput = {
  harvestId: string;
  userId: string;
  url: string;
  title: string;
  kind: RefKind;
};

export async function addRef(input: AddRefInput): Promise<DbRef> {
  assertLength(input.title, REF_TITLE_MAX, "title");
  let parsed: URL;
  try {
    parsed = new URL(input.url);
  } catch {
    throw new CommunityError("bad_request", "Invalid URL");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new CommunityError("bad_request", "URL must be http(s)");
  }
  if (!REF_KINDS.includes(input.kind)) {
    throw new CommunityError("bad_request", "Invalid ref kind");
  }
  const db = getDb();
  const rows = await db
    .insert(refs)
    .values({
      harvestId: input.harvestId,
      userId: input.userId,
      url: input.url,
      title: input.title,
      kind: input.kind,
    })
    .returning();
  return rows[0];
}

export type ToggleLikeInput = { harvestId: string; userId: string };
export type ToggleLikeResult = { liked: boolean; likeCount: number };

export async function toggleLike(
  input: ToggleLikeInput,
): Promise<ToggleLikeResult> {
  const db = getDb();
  const existing = await db
    .select()
    .from(likes)
    .where(
      and(
        eq(likes.userId, input.userId),
        eq(likes.harvestId, input.harvestId),
      ),
    )
    .limit(1);

  // neon-http has no transactions — sequential statements. See file header.
  if (existing.length > 0) {
    await db
      .delete(likes)
      .where(
        and(
          eq(likes.userId, input.userId),
          eq(likes.harvestId, input.harvestId),
        ),
      );
    const updated = await db
      .update(harvests)
      .set({ likeCount: sql`GREATEST(${harvests.likeCount} - 1, 0)` })
      .where(eq(harvests.id, input.harvestId))
      .returning({ likeCount: harvests.likeCount });
    return { liked: false, likeCount: updated[0]?.likeCount ?? 0 };
  }

  await db
    .insert(likes)
    .values({ userId: input.userId, harvestId: input.harvestId });
  const updated = await db
    .update(harvests)
    .set({ likeCount: sql`${harvests.likeCount} + 1` })
    .where(eq(harvests.id, input.harvestId))
    .returning({ likeCount: harvests.likeCount });
  return { liked: true, likeCount: updated[0]?.likeCount ?? 1 };
}

export type ForkHarvestInput = { sourceId: string; userId: string };

export async function forkHarvest(
  input: ForkHarvestInput,
): Promise<DbHarvest> {
  const source = await getHarvest(input.sourceId, input.userId);
  if (!source) {
    throw new CommunityError("not_found", "Source harvest not found");
  }
  const forkName = `${source.name} (fork)`;
  const created = await createHarvest({
    userId: input.userId,
    source: "community",
    description: source.description,
    name: forkName,
    stack: source.stack,
    scaffoldCommands: source.scaffoldCommands,
    compileSteps: source.compileSteps,
    rationale: source.rationale,
    visibility: "public",
  });
  // Persist forkOf pointer (createHarvest doesn't take it on the input shape).
  const db = getDb();
  const rows = await db
    .update(harvests)
    .set({ forkOf: input.sourceId })
    .where(eq(harvests.id, created.id))
    .returning();
  return rows[0] ?? created;
}

/**
 * List comments for a harvest, sorted so that parents appear before their
 * replies. Returns the comment row plus the author's display name.
 */
export async function listComments(
  harvestId: string,
): Promise<
  Array<DbComment & { author: { id: string; displayName: string } }>
> {
  const db = getDb();
  const rows = await db
    .select({
      comment: comments,
      authorId: users.id,
      authorName: users.displayName,
    })
    .from(comments)
    .innerJoin(users, eq(comments.userId, users.id))
    .where(eq(comments.harvestId, harvestId));

  const mapped = rows.map((r) => ({
    ...r.comment,
    author: { id: r.authorId, displayName: r.authorName },
  }));

  // Parents first (asc by createdAt), then their replies grouped under them.
  const parents = mapped
    .filter((c) => c.parentId === null)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const replies = mapped.filter((c) => c.parentId !== null);

  const out: typeof mapped = [];
  for (const p of parents) {
    out.push(p);
    for (const r of replies
      .filter((r) => r.parentId === p.id)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())) {
      out.push(r);
    }
  }
  return out;
}
