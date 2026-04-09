import { z } from "zod";
import { apiError, ERROR_CODES, describeError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { getOrCreateUser } from "@/lib/session";
import { getHarvest } from "@/lib/harvests";
import { rateLimit } from "@/lib/rate-limit";
import { addSnippet, CommunityError } from "@/lib/community";

const paramsSchema = z.object({ id: z.string().uuid() });
const bodySchema = z.object({
  title: z.string().min(1).max(200),
  language: z.string().min(1).max(40),
  code: z.string().min(1).max(10000),
});

export async function POST(
  req: Request,
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

    const rl = rateLimit(`snippets:${userId}`, 20, 60_000);
    if (!rl.success) {
      return apiError(ERROR_CODES.RATE_LIMITED, "Too many snippets", 429);
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return apiError(ERROR_CODES.BAD_REQUEST, "Invalid JSON", 400);
    }
    const parsedBody = bodySchema.safeParse(body);
    if (!parsedBody.success) {
      return apiError(ERROR_CODES.BAD_REQUEST, "Invalid body", 400);
    }

    const harvest = await getHarvest(parsed.data.id, userId);
    if (!harvest) {
      return apiError(ERROR_CODES.NOT_FOUND, "Harvest not found", 404);
    }

    const created = await addSnippet({
      harvestId: parsed.data.id,
      userId,
      ...parsedBody.data,
    });
    return Response.json(created, { status: 201 });
  } catch (err) {
    if (err instanceof CommunityError) {
      return apiError(ERROR_CODES.BAD_REQUEST, err.message, 400);
    }
    logger.error("snippets.post failed", { err: describeError(err) });
    return apiError(ERROR_CODES.INTERNAL, "Failed to add snippet", 500);
  }
}
