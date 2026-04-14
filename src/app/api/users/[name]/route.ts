import { apiError, describeError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { getProfileByName, getProfileHarvests } from "@/lib/profiles";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ name: string }> },
): Promise<Response> {
  try {
    const { name } = await ctx.params;
    const decoded = decodeURIComponent(name);
    const profile = await getProfileByName(decoded);
    if (!profile) {
      return apiError("not_found", "Farmer not found", 404);
    }
    const harvests = await getProfileHarvests(profile.id);
    return Response.json({ profile, harvests });
  } catch (err) {
    logger.error("GET /api/users/[name] failed", { err: describeError(err) });
    return apiError("internal_error", "Something went wrong", 500);
  }
}
