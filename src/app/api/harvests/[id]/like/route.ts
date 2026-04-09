import { z } from "zod";
import { apiError, ERROR_CODES, describeError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { getOrCreateUser } from "@/lib/session";
import { getHarvest } from "@/lib/harvests";
import { rateLimit } from "@/lib/rate-limit";
import { toggleLike, CommunityError } from "@/lib/community";

const paramsSchema = z.object({ id: z.string().uuid() });

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const raw = await ctx.params;
    const parsed = paramsSchema.safeParse(raw);
    if (!parsed.success) {
      return apiError(ERROR_CODES.BAD_REQUEST, "Invalid harvest id", 400);
    }
    const session = await getOrCreateUser();
    const userId = session.user.id;

    const rl = rateLimit(`like:${userId}`, 60, 60_000);
    if (!rl.success) {
      return apiError(ERROR_CODES.RATE_LIMITED, "Too many likes", 429);
    }

    const harvest = await getHarvest(parsed.data.id, userId);
    if (!harvest) {
      return apiError(ERROR_CODES.NOT_FOUND, "Harvest not found", 404);
    }

    const result = await toggleLike({
      harvestId: parsed.data.id,
      userId,
    });
    return Response.json(result);
  } catch (err) {
    if (err instanceof CommunityError) {
      return apiError(ERROR_CODES.BAD_REQUEST, err.message, 400);
    }
    logger.error("like.post failed", { err: describeError(err) });
    return apiError(ERROR_CODES.INTERNAL, "Failed to toggle like", 500);
  }
}
