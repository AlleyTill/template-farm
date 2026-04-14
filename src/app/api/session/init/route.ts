import { getOrCreateUser, toPublicUser } from "@/lib/session";
import { apiError } from "@/lib/errors";
import { rateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { describeError } from "@/lib/errors";

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const rl = rateLimit(`session:init:${ip}`, 10, 60_000);
  if (!rl.success) {
    return apiError("rate_limited", "Too many requests, please slow down.", 429);
  }

  try {
    const result = await getOrCreateUser();
    if (result.isNew) {
      return Response.json({
        user: toPublicUser(result.user),
        passphrase: result.passphrase,
      });
    }
    return Response.json({ user: toPublicUser(result.user) });
  } catch (err) {
    logger.error("session.init failed", { err: describeError(err) });
    return apiError("internal_error", "Could not initialize session.", 500);
  }
}
