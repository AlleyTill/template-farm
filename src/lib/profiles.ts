/**
 * Public user profile service. Read-only lookups by display name.
 */
import { and, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { harvests, users, type Harvest as DbHarvest } from "@/db/schema";

export type ProfileView = {
  id: string;
  displayName: string;
  createdAt: Date;
  publicHarvestCount: number;
  totalLikesReceived: number;
};

function slugify(s: string): string {
  return s.toLowerCase().replace(/\s+/g, "-");
}

export async function getProfileByName(
  displayName: string,
): Promise<ProfileView | null> {
  const db = getDb();
  const slug = slugify(displayName);
  const rows = await db
    .select({
      id: users.id,
      displayName: users.displayName,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(sql`lower(replace(${users.displayName}, ' ', '-')) = ${slug}`)
    .limit(1);

  const u = rows[0];
  if (!u) return null;

  const aggRows = await db
    .select({
      count: sql<number>`count(*)::int`,
      totalLikes: sql<number>`coalesce(sum(${harvests.likeCount}), 0)::int`,
    })
    .from(harvests)
    .where(
      and(eq(harvests.userId, u.id), eq(harvests.visibility, "public")),
    );

  const agg = aggRows[0] ?? { count: 0, totalLikes: 0 };

  return {
    id: u.id,
    displayName: u.displayName,
    createdAt: u.createdAt,
    publicHarvestCount: Number(agg.count),
    totalLikesReceived: Number(agg.totalLikes),
  };
}

export async function getProfileHarvests(
  userId: string,
  limit = 20,
): Promise<DbHarvest[]> {
  const db = getDb();
  return db
    .select()
    .from(harvests)
    .where(
      and(eq(harvests.userId, userId), eq(harvests.visibility, "public")),
    )
    .orderBy(desc(harvests.createdAt))
    .limit(limit);
}
