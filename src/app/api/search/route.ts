import { z } from "zod";
import { apiError, ERROR_CODES, describeError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { searchHarvests } from "@/lib/harvests";

const bodySchema = z.object({
  query: z.string().min(1).max(500),
});

export async function POST(req: Request) {
  try {
    const json = await req.json().catch(() => null);
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return apiError(ERROR_CODES.BAD_REQUEST, "Invalid search query", 400);
    }
    const hits = await searchHarvests(parsed.data.query, 10);
    return Response.json({ hits });
  } catch (err) {
    logger.error("search failed", { err: describeError(err) });
    return apiError(ERROR_CODES.INTERNAL, "Search failed", 500);
  }
}
