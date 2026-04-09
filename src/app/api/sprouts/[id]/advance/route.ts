import { z } from "zod";
import { getCurrentUser } from "@/lib/session";
import { advanceSprout } from "@/lib/sprouts";
import { apiError, describeError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { rateLimit } from "@/lib/rate-limit";

const schema = z.object({
  answer: z.string().trim().min(1).max(2000),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) return apiError("unauthorized", "No active session.", 401);

    const rl = rateLimit(`sprouts.advance:${user.id}`, 30, 10 * 60 * 1000);
    if (!rl.success) {
      return apiError("rate_limited", "Easy there, tiger. Let the soil breathe.", 429);
    }

    const raw = await req.json().catch(() => null);
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      return apiError("bad_request", "Answer can't be empty, partner.", 400);
    }

    const result = await advanceSprout(id, user.id, parsed.data.answer);
    if (!result.ok) {
      const status = result.error.includes("Not your") ? 403 : 400;
      return apiError("bad_request", result.error, status);
    }
    return Response.json({
      ok: true,
      sprout: result.sprout,
      harvestPlan: result.harvestPlan,
    });
  } catch (err) {
    logger.error("sprouts.advance failed", { err: describeError(err) });
    return apiError("internal_error", "Farmhand tripped on a rake. Try again.", 500);
  }
}
