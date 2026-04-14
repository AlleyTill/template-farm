import { z } from "zod";
import { recoverByPassphrase, toPublicUser } from "@/lib/session";
import { apiError, describeError } from "@/lib/errors";
import { rateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

const bodySchema = z.object({
  passphrase: z.string().min(10).max(200),
});

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const rl = rateLimit(`session:recover:${ip}`, 5, 15 * 60_000);
  if (!rl.success) {
    return apiError("rate_limited", "Too many attempts. Try again later.", 429);
  }

  let parsed: z.infer<typeof bodySchema>;
  try {
    const json = await request.json();
    parsed = bodySchema.parse(json);
  } catch {
    return apiError("unauthorized", "Passphrase not recognized", 401);
  }

  try {
    const user = await recoverByPassphrase(parsed.passphrase);
    if (!user) {
      return apiError("unauthorized", "Passphrase not recognized", 401);
    }
    return Response.json({ user: toPublicUser(user) });
  } catch (err) {
    logger.error("session.recover failed", { err: describeError(err) });
    return apiError("internal_error", "Could not recover session.", 500);
  }
}
