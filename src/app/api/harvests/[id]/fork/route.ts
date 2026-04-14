import { z } from "zod";
import { apiError, ERROR_CODES, describeError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { getOrCreateUser } from "@/lib/session";
import { getHarvest } from "@/lib/harvests";
import { rateLimit } from "@/lib/rate-limit";
import { forkHarvest, CommunityError } from "@/lib/community";

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

    const rl = rateLimit(`fork:${userId}`, 5, 60_000);
    if (!rl.success) {
      return apiError(ERROR_CODES.RATE_LIMITED, "Too many forks", 429);
    }

    const harvest = await getHarvest(parsed.data.id, userId);
    if (!harvest) {
      return apiError(ERROR_CODES.NOT_FOUND, "Harvest not found", 404);
    }

    const forked = await forkHarvest({
      sourceId: parsed.data.id,
      userId,
    });
    return Response.json(forked, { status: 201 });
  } catch (err) {
    if (err instanceof CommunityError) {
      const status = err.code === "not_found" ? 404 : 400;
      return apiError(
        err.code === "not_found"
          ? ERROR_CODES.NOT_FOUND
          : ERROR_CODES.BAD_REQUEST,
        err.message,
        status,
      );
    }
    logger.error("fork.post failed", { err: describeError(err) });
    return apiError(ERROR_CODES.INTERNAL, "Failed to fork harvest", 500);
  }
}
