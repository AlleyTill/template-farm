/**
 * Sprout service. Handles creating sprouts, advancing through stages,
 * fetching a sprout with its stage history, and producing the final
 * harvest plan.
 */
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { eq, desc, asc } from "drizzle-orm";
import { getDb } from "@/db/client";
import { sprouts, sproutStages, type Sprout, type SproutStage } from "@/db/schema";
import { STAGES, nextStage, type StageKey } from "./stages";
import { farmhandSystem } from "./farmhand-prompt";
import { classifyIntent, type IntentTag } from "./intent";
import { pickTools, type BeginnerTool } from "./beginner-tools";
import { logger } from "./logger";
import { describeError } from "./errors";

export type SproutWithStages = Sprout & {
  stages: SproutStage[];
};

export type HarvestPlan = {
  tagline: string;
  tools: BeginnerTool[];
  nextSteps: string[];
  encouragement: string;
};

const replySchema = z.object({
  farmhandReply: z
    .string()
    .describe("In-character farmhand reply, 1-3 sentences, roast + reflect + move on."),
  mood: z.enum(["happy", "thinking", "sassy", "angry", "default"]),
});

/**
 * Create a new sprout from a user's seedling sentence.
 * Runs the intent gate first; only app_idea / ambiguous sprouts become
 * actual sprouts. not_an_app and unsafe return an intent-only response with
 * the farmhand's rejection reply (no DB row created).
 */
export async function createSprout(
  userId: string,
  title: string,
): Promise<
  | { ok: true; sprout: SproutWithStages; intent: IntentTag; mood: string }
  | { ok: false; intent: IntentTag; farmhandReply: string; mood: string }
> {
  const classification = await classifyIntent(title);

  if (classification.intent === "not_an_app" || classification.intent === "unsafe") {
    return {
      ok: false,
      intent: classification.intent,
      farmhandReply: classification.farmhandReply,
      mood: classification.mood,
    };
  }

  const db = getDb();
  const inserted = await db
    .insert(sprouts)
    .values({
      userId,
      title: title.slice(0, 500),
      currentStage: "seed",
      intent: classification.intent,
    })
    .returning();
  const sprout = inserted[0];

  // Record the seed stage: the farmhand's intent-gate reply is the "question"
  // for stage 1. The user's seedling title is their "answer" to "what is this?"
  const stageRow = await db
    .insert(sproutStages)
    .values({
      sproutId: sprout.id,
      stage: "seed",
      question: STAGES.seed.question,
      userAnswer: title.slice(0, 500),
      farmhandReply: classification.farmhandReply,
      mood: classification.mood,
    })
    .returning();

  return {
    ok: true,
    sprout: { ...sprout, stages: stageRow },
    intent: classification.intent,
    mood: classification.mood,
  };
}

/**
 * Advance a sprout to the next stage. The user's answer is saved, the
 * farmhand responds in character, and the sprout's currentStage bumps.
 * If we're at the final stage, we generate + save the harvest plan.
 */
export async function advanceSprout(
  sproutId: string,
  userId: string,
  userAnswer: string,
): Promise<
  | { ok: true; sprout: SproutWithStages; harvestPlan?: HarvestPlan }
  | { ok: false; error: string }
> {
  const db = getDb();
  const rows = await db
    .select()
    .from(sprouts)
    .where(eq(sprouts.id, sproutId))
    .limit(1);
  const sprout = rows[0];
  if (!sprout) return { ok: false, error: "Sprout not found." };
  if (sprout.userId !== userId) return { ok: false, error: "Not your sprout." };

  const current = sprout.currentStage as StageKey;
  const next = nextStage(current);
  if (!next) {
    return { ok: false, error: "This sprout's already harvested." };
  }

  // Generate the farmhand's reply for this turn using the *current* stage's
  // instruction (we're reacting to the answer they just gave to the current
  // stage's question), then advancing to `next`.
  const stageDef = STAGES[current];
  const prior = await db
    .select()
    .from(sproutStages)
    .where(eq(sproutStages.sproutId, sproutId))
    .orderBy(asc(sproutStages.createdAt));

  let reply: { farmhandReply: string; mood: "happy" | "thinking" | "sassy" | "angry" | "default" };
  try {
    const context = prior
      .map((s) => `[${s.stage}] Q: ${s.question}\nA: ${s.userAnswer ?? ""}`)
      .join("\n\n");
    const { object } = await generateObject({
      model: anthropic("claude-haiku-4-5"),
      schema: replySchema,
      system: farmhandSystem(stageDef.instruction),
      prompt: `Sprout title: ${sprout.title}\n\nConversation so far:\n${context}\n\nThe user just answered the "${current}" stage question with:\n${userAnswer}\n\nRespond in character.`,
    });
    reply = object;
  } catch (err) {
    logger.error("sprouts.advance LLM failed", { err: describeError(err) });
    reply = {
      farmhandReply:
        "*kicks dirt* My brain's full of manure right now. Try that again in a sec, partner.",
      mood: "thinking",
    };
  }

  // Update the current stage row with the user's answer (if it doesn't
  // already have one — the seed stage gets its answer at create time).
  const currentRow = prior.find((p) => p.stage === current && !p.userAnswer);
  if (currentRow) {
    await db
      .update(sproutStages)
      .set({
        userAnswer: userAnswer.slice(0, 2000),
        farmhandReply: reply.farmhandReply,
        mood: reply.mood,
      })
      .where(eq(sproutStages.id, currentRow.id));
  } else {
    // The seed row is already filled in; just update its farmhand reply
    // if we don't have one for this answer yet, and continue.
  }

  // Insert the NEXT stage's opening question row (empty answer, ready for
  // the user's next turn).
  const nextDef = STAGES[next];
  await db.insert(sproutStages).values({
    sproutId,
    stage: next,
    question: nextDef.question,
    farmhandReply: reply.farmhandReply,
    mood: reply.mood,
  });

  // Bump sprout stage.
  const updatedRows = await db
    .update(sprouts)
    .set({ currentStage: next, updatedAt: new Date() })
    .where(eq(sprouts.id, sproutId))
    .returning();
  const updated = updatedRows[0];

  // If we just entered the final harvest stage, build the plan.
  let harvestPlan: HarvestPlan | undefined;
  if (next === "harvest") {
    harvestPlan = buildHarvestPlan(sprout.title, prior, userAnswer);
    await db
      .update(sprouts)
      .set({ finalPlan: harvestPlan })
      .where(eq(sprouts.id, sproutId));
  }

  const allStages = await db
    .select()
    .from(sproutStages)
    .where(eq(sproutStages.sproutId, sproutId))
    .orderBy(asc(sproutStages.createdAt));

  return {
    ok: true,
    sprout: { ...updated, stages: allStages },
    harvestPlan,
  };
}

function buildHarvestPlan(
  title: string,
  priorStages: SproutStage[],
  finalAnswer: string,
): HarvestPlan {
  const keywords = [title, finalAnswer, ...priorStages.map((s) => s.userAnswer ?? "")].filter(Boolean);
  const tools = pickTools(keywords, 3);
  const bloomStage = priorStages.find((s) => s.stage === "bloom");
  const steps: string[] = [];
  if (bloomStage?.userAnswer) {
    const lines = bloomStage.userAnswer
      .split(/\n|[.;]|,\s+(?=\d)/)
      .map((l) => l.trim())
      .filter((l) => l.length > 3)
      .slice(0, 3);
    steps.push(...lines);
  }
  while (steps.length < 3) {
    steps.push(
      [
        "Open one of the tools below and start a blank project.",
        "Make the screen you described show up, even if it's ugly.",
        "Show it to one human and see if they get what it is.",
      ][steps.length]!,
    );
  }
  return {
    tagline: title,
    tools,
    nextSteps: steps,
    encouragement:
      "Now get in the dirt, partner. Ain't no crop ever grew by starin' at it.",
  };
}

export async function getSprout(
  sproutId: string,
  viewerId?: string,
): Promise<SproutWithStages | null> {
  const db = getDb();
  const rows = await db.select().from(sprouts).where(eq(sprouts.id, sproutId)).limit(1);
  const sprout = rows[0];
  if (!sprout) return null;
  if (sprout.visibility === "private" && sprout.userId !== viewerId) return null;
  const stages = await db
    .select()
    .from(sproutStages)
    .where(eq(sproutStages.sproutId, sproutId))
    .orderBy(asc(sproutStages.createdAt));
  return { ...sprout, stages };
}

export async function listMySprouts(userId: string): Promise<Sprout[]> {
  const db = getDb();
  return db
    .select()
    .from(sprouts)
    .where(eq(sprouts.userId, userId))
    .orderBy(desc(sprouts.updatedAt));
}
