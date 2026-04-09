import { z } from "zod";
import { getDb } from "@/db/client";
import { harvests } from "@/db/schema";
import { getOrCreateUser } from "@/lib/session";
import { apiError, ERROR_CODES, describeError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { checkAndConsume, restore } from "@/lib/quota";
import { generateRecipe } from "@/lib/ai";

export const maxDuration = 60;

const bodySchema = z.object({
  description: z.string().min(10).max(2000),
});

export async function POST(req: Request) {
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return apiError(ERROR_CODES.BAD_REQUEST, "Invalid JSON body", 400);
  }

  const parsed = bodySchema.safeParse(payload);
  if (!parsed.success) {
    return apiError(
      ERROR_CODES.BAD_REQUEST,
      "description must be 10-2000 characters",
      400,
    );
  }
  const { description } = parsed.data;

  const session = await getOrCreateUser();
  const user = session.user;

  const check = await checkAndConsume(user.id);
  if (!check.allowed) {
    if (check.reason === "user_quota") {
      return apiError(
        ERROR_CODES.QUOTA_EXHAUSTED,
        "You've used all your AI prompts for this month.",
        429,
      );
    }
    return apiError(
      ERROR_CODES.FARM_RESTING,
      "The farm is resting — daily AI pool is exhausted. Try the community search.",
      429,
    );
  }

  let recipe;
  try {
    recipe = await generateRecipe(description);
  } catch (err) {
    logger.error("generate.route generation failed", {
      err: describeError(err),
      userId: user.id,
    });
    await restore(user.id);
    return apiError(
      ERROR_CODES.INTERNAL,
      "AI generation failed. Please try again.",
      500,
    );
  }

  try {
    const db = getDb();
    const inserted = await db
      .insert(harvests)
      .values({
        userId: user.id,
        source: "ai",
        description,
        name: recipe.name,
        stack: recipe.stack,
        scaffoldCommands: recipe.scaffoldCommands,
        compileSteps: recipe.compileSteps,
        rationale: recipe.rationale,
        // visibility defaults to "public" per schema — SPEC says AI is public-by-default.
      })
      .returning();
    const harvest = inserted[0];
    return Response.json(harvest);
  } catch (err) {
    logger.error("generate.route harvest insert failed", {
      err: describeError(err),
      userId: user.id,
    });
    return apiError(
      ERROR_CODES.INTERNAL,
      "Failed to save generated harvest.",
      500,
    );
  }
}
