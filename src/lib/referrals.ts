/**
 * Referral binding and reward logic. The referrer earns 1 spin token when
 * their referred user publishes their first public harvest — wired via the
 * setOnFirstPublicHarvest hook in src/instrumentation.ts.
 */
import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { referrals, users } from "@/db/schema";
import { logger } from "@/lib/logger";
import { describeError } from "@/lib/errors";

export type BindReferralInput = { userId: string; code: string };
export type BindReferralResult =
  | { ok: true }
  | {
      ok: false;
      reason:
        | "not_found"
        | "self_referral"
        | "already_referred"
        | "already_bound";
    };

export async function bindReferral(
  input: BindReferralInput,
): Promise<BindReferralResult> {
  const db = getDb();

  const referrerRows = await db
    .select()
    .from(users)
    .where(eq(users.referralCode, input.code))
    .limit(1);
  const referrer = referrerRows[0];
  if (!referrer) return { ok: false, reason: "not_found" };

  if (referrer.id === input.userId) {
    return { ok: false, reason: "self_referral" };
  }

  const selfRows = await db
    .select()
    .from(users)
    .where(eq(users.id, input.userId))
    .limit(1);
  const self = selfRows[0];
  if (!self) return { ok: false, reason: "not_found" };
  if (self.referredBy) return { ok: false, reason: "already_referred" };

  const existing = await db
    .select()
    .from(referrals)
    .where(eq(referrals.referredId, input.userId))
    .limit(1);
  if (existing.length > 0) return { ok: false, reason: "already_bound" };

  await db
    .update(users)
    .set({ referredBy: referrer.id })
    .where(eq(users.id, input.userId));

  await db.insert(referrals).values({
    referrerId: referrer.id,
    referredId: input.userId,
    rewarded: false,
  });

  return { ok: true };
}

export type AwardReferrerInput = { userId: string; harvestId: string };

/**
 * Called from the first-public-harvest hook. Best-effort: any error is logged
 * but never re-thrown, because harvest creation must never fail because of
 * referral bookkeeping.
 */
export async function awardReferrerIfEligible(
  input: AwardReferrerInput,
): Promise<void> {
  try {
    const db = getDb();

    const selfRows = await db
      .select({ referredBy: users.referredBy })
      .from(users)
      .where(eq(users.id, input.userId))
      .limit(1);
    const self = selfRows[0];
    if (!self || !self.referredBy) return;

    const referralRows = await db
      .select()
      .from(referrals)
      .where(eq(referrals.referredId, input.userId))
      .limit(1);
    const row = referralRows[0];
    if (!row) return;
    if (row.rewarded) return;

    await db
      .update(users)
      .set({ spinTokens: sql`${users.spinTokens} + 1` })
      .where(eq(users.id, self.referredBy));

    await db
      .update(referrals)
      .set({ rewarded: true })
      .where(eq(referrals.id, row.id));

    logger.info("referral.awarded", {
      referrerId: self.referredBy,
      referredId: input.userId,
      harvestId: input.harvestId,
    });
  } catch (err) {
    logger.error("referral.award_failed", {
      err: describeError(err),
      userId: input.userId,
      harvestId: input.harvestId,
    });
  }
}

/**
 * Atomic check-and-decrement of spin tokens. Neon-http doesn't support
 * transactions, so we use a conditional UPDATE and check affected rows.
 */
export async function spendSpinToken(
  userId: string,
): Promise<{ ok: true } | { ok: false; reason: "no_tokens" }> {
  const db = getDb();
  const updated = await db
    .update(users)
    .set({ spinTokens: sql`${users.spinTokens} - 1` })
    .where(and(eq(users.id, userId), sql`${users.spinTokens} > 0`))
    .returning({ id: users.id });
  if (updated.length === 0) return { ok: false, reason: "no_tokens" };
  return { ok: true };
}
