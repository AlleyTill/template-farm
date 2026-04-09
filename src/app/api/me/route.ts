import { eq } from "drizzle-orm";
import { getCurrentUser, toPublicUser } from "@/lib/session";
import { apiError, describeError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { getDb } from "@/db/client";
import { aiBudget } from "@/db/schema";
import type { QuotaInfo } from "@/lib/types";

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
