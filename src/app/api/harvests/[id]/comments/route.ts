import { z } from "zod";
import { apiError, ERROR_CODES, describeError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { getOrCreateUser, getCurrentUser } from "@/lib/session";
import { getHarvest } from "@/lib/harvests";
import { rateLimit } from "@/lib/rate-limit";
import { addComment, listComments, CommunityError } from "@/lib/community";

const paramsSchema = z.object({ id: z.string().uuid() });
const bodySchema = z.object({
  body: z.string().min(1).max(5000),
  parentId: z.string().uuid().nullable().optional(),
});

function mapCommunityError(err: CommunityError): Response {
  switch (err.code) {
    case "not_found":
      return apiError(ERROR_CODES.NOT_FOUND, err.message, 404);
    case "forbidden":
      return apiError(ERROR_CODES.UNAUTHORIZED, err.message, 403);
    default:
      return apiError(ERROR_CODES.BAD_REQUEST, err.message, 400);
  }
}

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

    const rl = rateLimit(`comments:${userId}`, 30, 60_000);
    if (!rl.success) {
      return apiError(ERROR_CODES.RATE_LIMITED, "Too many comments", 429);
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

    const created = await addComment({
      harvestId: parsed.data.id,
      userId,
      body: parsedBody.data.body,
      parentId: parsedBody.data.parentId ?? null,
    });
    return Response.json(created, { status: 201 });
  } catch (err) {
    if (err instanceof CommunityError) return mapCommunityError(err);
    logger.error("comments.post failed", { err: describeError(err) });
    return apiError(ERROR_CODES.INTERNAL, "Failed to add comment", 500);
  }
}

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
    const rows = await listComments(parsed.data.id);
    return Response.json(rows);
  } catch (err) {
    logger.error("comments.list failed", { err: describeError(err) });
    return apiError(ERROR_CODES.INTERNAL, "Failed to list comments", 500);
  }
}
