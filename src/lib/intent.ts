/**
 * Intent classifier. Runs before stage 1 to decide whether the user's
 * seedling is actually an app idea. Uses a small Haiku call with structured
 * output so we get a clean tag back.
 */
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { logger } from "./logger";
import { describeError } from "./errors";
import { farmhandSystem } from "./farmhand-prompt";

export type IntentTag = "app_idea" | "not_an_app" | "ambiguous" | "unsafe";

const intentSchema = z.object({
  intent: z.enum(["app_idea", "not_an_app", "ambiguous", "unsafe"]),
  farmhandReply: z
    .string()
    .describe(
      "The farmhand's in-character reply. 1-3 sentences, roast-heavy, farm puns. If not_an_app, gently redirect. If unsafe, refuse kindly. If ambiguous, ask ONE clarifying question. If app_idea, roast the idea and tell them you'll take it from here.",
    ),
  mood: z
    .enum(["happy", "thinking", "sassy", "angry", "default"])
    .describe("The farmhand's mood for this reply."),
});

const INSTRUCTION = `
The user just submitted a seedling (their initial app idea). Your job this
turn is to CLASSIFY it and reply in character.

Classifications:
- "app_idea": clearly a software/app/website/game idea. Example: "a todo app",
  "a game where you catch fish", "a website for my dog walking business".
- "not_an_app": not software at all. Example: "a fig newton recipe", "help me
  write an essay", "how do I ask someone out", "what's 2+2".
- "ambiguous": could go either way. Example: "something about coffee",
  "a thing for my mom", "music".
- "unsafe": the user is asking for something harmful, illegal, sexual, or
  describing self-harm. Refuse kindly.

Remember: kids might use this. No slurs, no personal insults, no profanity,
no sexual content. Roast the IDEA, not the person.

Return the classification plus your in-character reply.
`.trim();

export async function classifyIntent(text: string): Promise<{
  intent: IntentTag;
  farmhandReply: string;
  mood: "happy" | "thinking" | "sassy" | "angry" | "default";
}> {
  try {
    const { object } = await generateObject({
      model: anthropic("claude-haiku-4-5"),
      schema: intentSchema,
      system: farmhandSystem(INSTRUCTION),
      prompt: `Seedling: ${text}`,
    });
    return object;
  } catch (err) {
    logger.error("intent.classify failed", { err: describeError(err) });
    // Safe fallback: treat as ambiguous so we don't block the user.
    return {
      intent: "ambiguous",
      farmhandReply:
        "*spits sunflower seed* My brain's muddier than a pig pen today. Try tellin' me again what you're tryin' to build, partner.",
      mood: "thinking",
    };
  }
}
