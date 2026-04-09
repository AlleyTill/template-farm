import { z } from "zod";
import { apiError, ERROR_CODES, describeError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { getCurrentUser } from "@/lib/session";
import { bindReferral } from "@/lib/referrals";
import { rateLimit } from "@/lib/rate-limit";

const bodySchema = z.object({
  code: z.string().min(5).max(100),
});

function clientIp(req: Request): string {
  const h = req.headers;
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "unknown"
  );
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return apiError(ERROR_CODES.UNAUTHORIZED, "Not signed in", 401);
    }

    const ip = clientIp(req);
    const rl = rateLimit(`referrals:${ip}`, 10, 10 * 60 * 1000);
    if (!rl.success) {
      return apiError(ERROR_CODES.RATE_LIMITED, "Too many attempts", 429);
    }

    const json = await req.json().catch(() => null);
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return apiError(
        ERROR_CODES.BAD_REQUEST,
        "Invalid referral code",
        400,
      );
    }

    const result = await bindReferral({
      userId: user.id,
      code: parsed.data.code,
    });
    if (!result.ok) {
      // Generic error — don't leak whether the code exists.
      return apiError(
        ERROR_CODES.BAD_REQUEST,
        "Invalid referral code",
        400,
      );
    }

    return Response.json({ ok: true });
  } catch (err) {
    logger.error("referrals.bind failed", { err: describeError(err) });
    return apiError(ERROR_CODES.INTERNAL, "Failed to bind referral", 500);
  }
}
