import { eq } from "drizzle-orm";
import { z } from "zod";
import { getCurrentUser, toPublicUser } from "@/lib/session";
import { apiError, describeError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { getDb } from "@/db/client";
import { aiBudget, users } from "@/db/schema";
import type { QuotaInfo } from "@/lib/types";
import { rateLimit } from "@/lib/rate-limit";

const DEFAULT_FARM_POOL_MAX = 200;

function todayUtcDateString(): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return apiError("unauthorized", "No active session.", 401);
    }

    const db = getDb();
    const today = todayUtcDateString();

    // Defensive upsert: another lane may also write this row.
    await db
      .insert(aiBudget)
      .values({ date: today, used: 0, max: DEFAULT_FARM_POOL_MAX })
      .onConflictDoNothing();

    const rows = await db
      .select()
      .from(aiBudget)
      .where(eq(aiBudget.date, today))
      .limit(1);

    const row = rows[0];
    const max = row?.max ?? DEFAULT_FARM_POOL_MAX;
    const used = row?.used ?? 0;

    const quota: QuotaInfo = {
      monthlyQuota: user.monthlyQuota,
      quotaUsed: user.quotaUsed,
      bonusPrompts: user.bonusPrompts,
      spinTokens: user.spinTokens,
      quotaResetAt: user.quotaResetAt.toISOString(),
      farmPoolRemaining: Math.max(0, max - used),
      farmPoolMax: max,
    };

    return Response.json({ user: toPublicUser(user), quota });
  } catch (err) {
    logger.error("me.get failed", { err: describeError(err) });
    return apiError("internal_error", "Could not load profile.", 500);
  }
}

const patchSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(3, "Display name must be at least 3 characters.")
    .max(40, "Display name must be at most 40 characters.")
    .regex(
      /^[A-Za-z0-9 _\-']+$/,
      "Only letters, numbers, spaces, - _ ' allowed.",
    ),
});

export async function PATCH(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return apiError("unauthorized", "No active session.", 401);
    }

    // Limit renames: 5/hour/user.
    const rl = rateLimit(`me.patch:${user.id}`, 5, 60 * 60 * 1000);
    if (!rl.success) {
      return apiError(
        "rate_limited",
        "Too many rename attempts. Try again later.",
        429,
      );
    }

    const raw = await req.json().catch(() => null);
    const parsed = patchSchema.safeParse(raw);
    if (!parsed.success) {
      return apiError(
        "bad_request",
        parsed.error.issues[0]?.message ?? "Invalid request.",
        400,
      );
    }

    const newName = parsed.data.displayName;
    if (newName === user.displayName) {
      return Response.json({ user: toPublicUser(user) });
    }

    const db = getDb();
    // Uniqueness check — displayName is also used in /u/[name] lookups.
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.displayName, newName))
      .limit(1);
    if (existing.length > 0 && existing[0].id !== user.id) {
      return apiError(
        "bad_request",
        "That farm name is already taken.",
        400,
      );
    }

    const updated = await db
      .update(users)
      .set({ displayName: newName })
      .where(eq(users.id, user.id))
      .returning();

    return Response.json({ user: toPublicUser(updated[0]) });
  } catch (err) {
    logger.error("me.patch failed", { err: describeError(err) });
    return apiError("internal_error", "Could not update profile.", 500);
  }
}
