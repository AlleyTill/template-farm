import { eq, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { users, aiBudget } from "@/db/schema";
import { logger } from "./logger";
import { describeError } from "./errors";

/**
 * Quota enforcement for AI generation.
 *
 * NOTE: Drizzle's neon-http driver does NOT support transactions. We use
 * sequential updates with defensive checks and best-effort rollback in
 * `restore()`. Under concurrent load this can race, but the global daily
 * pool gives us a safety ceiling — worst case we overshoot the daily max
 * by a handful of calls.
 */

export type CheckResult =
  | { allowed: true }
  | { allowed: false; reason: "user_quota" | "farm_pool" };

function firstOfNextMonth(from: Date = new Date()): Date {
  return new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + 1, 1));
}

function todayDateString(): string {
  // yyyy-mm-dd (UTC) — matches `date` column format
  return new Date().toISOString().slice(0, 10);
}

const DEFAULT_DAILY_MAX = 200;

/**
 * Atomically (best-effort) check the user's monthly quota AND the global
 * daily farm pool. If both pass, consumes one unit from each. If either
 * fails, returns the reason and consumes nothing.
 *
 * Bonus prompts are spent before the monthly quota.
 */
export async function checkAndConsume(userId: string): Promise<CheckResult> {
  const db = getDb();

  // 1. Load user and auto-reset monthly quota if the window has elapsed.
  const userRows = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  const user = userRows[0];
  if (!user) {
    return { allowed: false, reason: "user_quota" };
  }

  const now = new Date();
  let quotaUsed = user.quotaUsed;
  let bonusPrompts = user.bonusPrompts;
  let quotaResetAt = user.quotaResetAt;

  if (quotaResetAt.getTime() <= now.getTime()) {
    quotaUsed = 0;
    quotaResetAt = firstOfNextMonth(now);
    await db
      .update(users)
      .set({ quotaUsed: 0, quotaResetAt })
      .where(eq(users.id, userId));
  }

  // Effective quota = monthlyQuota + bonusPrompts
  const hasBonus = bonusPrompts > 0;
  const hasMonthly = quotaUsed < user.monthlyQuota;
  if (!hasBonus && !hasMonthly) {
    return { allowed: false, reason: "user_quota" };
  }

  // 2. Ensure today's ai_budget row exists and has headroom.
  const today = todayDateString();
  const budgetRows = await db
    .select()
    .from(aiBudget)
    .where(eq(aiBudget.date, today))
    .limit(1);
  let budget = budgetRows[0];
  if (!budget) {
    try {
      const inserted = await db
        .insert(aiBudget)
        .values({ date: today, used: 0, max: DEFAULT_DAILY_MAX })
        .onConflictDoNothing()
        .returning();
      budget = inserted[0];
    } catch (err) {
      logger.warn("quota.checkAndConsume insert ai_budget failed", {
        err: describeError(err),
      });
    }
    if (!budget) {
      const refetch = await db
        .select()
        .from(aiBudget)
        .where(eq(aiBudget.date, today))
        .limit(1);
      budget = refetch[0];
    }
  }
  if (!budget) {
    return { allowed: false, reason: "farm_pool" };
  }
  if (budget.used >= budget.max) {
    return { allowed: false, reason: "farm_pool" };
  }

  // 3. Consume from the global pool first (the scarcer resource).
  const poolUpdate = await db
    .update(aiBudget)
    .set({ used: sql`${aiBudget.used} + 1` })
    .where(sql`${aiBudget.date} = ${today} AND ${aiBudget.used} < ${aiBudget.max}`)
    .returning();
  if (poolUpdate.length === 0) {
    return { allowed: false, reason: "farm_pool" };
  }

  // 4. Consume from the user — bonus first, else monthly quota.
  if (hasBonus) {
    const userUpdate = await db
      .update(users)
      .set({ bonusPrompts: sql`${users.bonusPrompts} - 1` })
      .where(sql`${users.id} = ${userId} AND ${users.bonusPrompts} > 0`)
      .returning();
    if (userUpdate.length === 0) {
      // Bonus vanished between read and write — try monthly.
      if (!hasMonthly) {
        // Roll back the pool.
        await rollbackPool(today);
        return { allowed: false, reason: "user_quota" };
      }
      const mq = await db
        .update(users)
        .set({ quotaUsed: sql`${users.quotaUsed} + 1` })
        .where(
          sql`${users.id} = ${userId} AND ${users.quotaUsed} < ${users.monthlyQuota}`,
        )
        .returning();
      if (mq.length === 0) {
        await rollbackPool(today);
        return { allowed: false, reason: "user_quota" };
      }
    }
  } else {
    const mq = await db
      .update(users)
      .set({ quotaUsed: sql`${users.quotaUsed} + 1` })
      .where(
        sql`${users.id} = ${userId} AND ${users.quotaUsed} < ${users.monthlyQuota}`,
      )
      .returning();
    if (mq.length === 0) {
      await rollbackPool(today);
      return { allowed: false, reason: "user_quota" };
    }
  }

  return { allowed: true };
}

async function rollbackPool(date: string): Promise<void> {
  try {
    const db = getDb();
    await db
      .update(aiBudget)
      .set({ used: sql`GREATEST(${aiBudget.used} - 1, 0)` })
      .where(eq(aiBudget.date, date));
  } catch (err) {
    logger.warn("quota.rollbackPool failed", { err: describeError(err) });
  }
}

/**
 * Best-effort rollback of a prior `checkAndConsume` — call this when the AI
 * generation fails *after* the quota check succeeded. We can't know whether
 * bonus or monthly was charged, so we prefer to refund quotaUsed if > 0,
 * otherwise refund bonusPrompts.
 */
export async function restore(userId: string): Promise<void> {
  const db = getDb();
  try {
    const userRows = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    const user = userRows[0];
    if (user) {
      if (user.quotaUsed > 0) {
        await db
          .update(users)
          .set({ quotaUsed: sql`GREATEST(${users.quotaUsed} - 1, 0)` })
          .where(eq(users.id, userId));
      } else {
        await db
          .update(users)
          .set({ bonusPrompts: sql`GREATEST(${users.bonusPrompts} - 1, 0) + 1` })
          .where(eq(users.id, userId));
      }
    }
  } catch (err) {
    logger.warn("quota.restore user decrement failed", {
      err: describeError(err),
    });
  }
  await rollbackPool(todayDateString());
}
