import { eq, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { users, spinResults } from "@/db/schema";
import { apiError, ERROR_CODES, describeError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { getCurrentUser } from "@/lib/session";
import { spendSpinToken } from "@/lib/referrals";
import { rollSpin } from "@/lib/spin";
import { rateLimit } from "@/lib/rate-limit";

export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return apiError(ERROR_CODES.UNAUTHORIZED, "Not signed in", 401);
    }

    const rl = rateLimit(`spin:${user.id}`, 10, 60 * 1000);
    if (!rl.success) {
      return apiError(ERROR_CODES.RATE_LIMITED, "Too many spins", 429);
    }

    const spend = await spendSpinToken(user.id);
    if (!spend.ok) {
      return apiError(ERROR_CODES.BAD_REQUEST, "No spin tokens", 400);
    }

    const prize = rollSpin();
    const db = getDb();

    const updated = await db
      .update(users)
      .set({ bonusPrompts: sql`${users.bonusPrompts} + ${prize.prompts}` })
      .where(eq(users.id, user.id))
      .returning({
        bonusPrompts: users.bonusPrompts,
        spinTokens: users.spinTokens,
      });

    await db.insert(spinResults).values({
      userId: user.id,
      tokensSpent: 1,
      promptsWon: prize.prompts,
    });

    const row = updated[0];
    return Response.json({
      promptsWon: prize.prompts,
      totalBonusPrompts: row?.bonusPrompts ?? 0,
      spinTokensRemaining: row?.spinTokens ?? 0,
    });
  } catch (err) {
    logger.error("spin failed", { err: describeError(err) });
    return apiError(ERROR_CODES.INTERNAL, "Failed to spin", 500);
  }
}
