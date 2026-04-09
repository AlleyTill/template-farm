import { z } from "zod";
import { apiError, ERROR_CODES, describeError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { getCurrentUser } from "@/lib/session";
import { getHarvest } from "@/lib/harvests";

const paramsSchema = z.object({ id: z.string().uuid() });

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const raw = await ctx.params;
    const parsed = paramsSchema.safeParse(raw);
    if (!parsed.success) {
      return apiError(ERROR_CODES.BAD_REQUEST, "Invalid harvest id", 400);
    }
    const viewer = await getCurrentUser();
    const harvest = await getHarvest(parsed.data.id, viewer?.id);
    if (!harvest) {
      return apiError(ERROR_CODES.NOT_FOUND, "Harvest not found", 404);
    }
    return Response.json(harvest);
  } catch (err) {
    logger.error("harvests.get failed", { err: describeError(err) });
    return apiError(ERROR_CODES.INTERNAL, "Failed to fetch harvest", 500);
  }
}
