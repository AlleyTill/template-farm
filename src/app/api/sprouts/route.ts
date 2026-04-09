import { z } from "zod";
import { getOrCreateUser } from "@/lib/session";
import { createSprout, listMySprouts } from "@/lib/sprouts";
import { apiError, describeError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { rateLimit } from "@/lib/rate-limit";

const createSchema = z.object({
  title: z.string().trim().min(3).max(500),
});

export async function POST(req: Request) {
  try {
    const session = await getOrCreateUser();
    const user = session.user;
    const rl = rateLimit(`sprouts.create:${user.id}`, 10, 60 * 60 * 1000);
    if (!rl.success) {
      return apiError("rate_limited", "Whoa there partner — slow down. Try again in a bit.", 429);
    }
    const raw = await req.json().catch(() => null);
    const parsed = createSchema.safeParse(raw);
    if (!parsed.success) {
      return apiError("bad_request", "Need at least 3 characters, cowpoke.", 400);
    }
    const result = await createSprout(user.id, parsed.data.title);
    if (!result.ok) {
      // Intent gate rejected it — return 200 with farmhand reply, not an error.
      return Response.json({
        ok: false,
        intent: result.intent,
        farmhandReply: result.farmhandReply,
        mood: result.mood,
      });
    }
    return Response.json({
      ok: true,
      sprout: result.sprout,
      intent: result.intent,
      mood: result.mood,
    });
  } catch (err) {
    logger.error("sprouts.create failed", { err: describeError(err) });
    return apiError("internal_error", "The farmhand's nappin'. Try again.", 500);
  }
}

export async function GET() {
  try {
    const session = await getOrCreateUser();
    const user = session.user;
    const rows = await listMySprouts(user.id);
    return Response.json({ sprouts: rows });
  } catch (err) {
    logger.error("sprouts.list failed", { err: describeError(err) });
    return apiError("internal_error", "Couldn't fetch your sprouts.", 500);
  }
}
