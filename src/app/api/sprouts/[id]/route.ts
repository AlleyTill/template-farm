import { getCurrentUser } from "@/lib/session";
import { getSprout } from "@/lib/sprouts";
import { apiError, describeError } from "@/lib/errors";
import { logger } from "@/lib/logger";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const viewer = await getCurrentUser();
    const sprout = await getSprout(id, viewer?.id);
    if (!sprout) return apiError("not_found", "No sprout here.", 404);
    return Response.json({ sprout });
  } catch (err) {
    logger.error("sprouts.get failed", { err: describeError(err) });
    return apiError("internal_error", "Couldn't load that sprout.", 500);
  }
}
