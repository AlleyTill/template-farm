import { generateText, Output } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { logger } from "./logger";
import { describeError } from "./errors";

export type RecipeOutput = {
  name: string;
  stack: string[];
  scaffoldCommands: string[];
  compileSteps: string[];
  rationale: string;
};

const recipeSchema = z.object({
  name: z.string().describe("Short, friendly name for the template"),
  stack: z
    .array(z.string())
    .describe("Languages, frameworks, and key libraries"),
  scaffoldCommands: z
    .array(z.string())
    .describe(
      "Shell commands the user runs to create the project from scratch",
    ),
  compileSteps: z
    .array(z.string())
    .describe("Shell commands to install deps, build, and run the project"),
  rationale: z
    .string()
    .describe("1-3 sentences explaining why this stack fits the description"),
});

const SYSTEM_PROMPT =
  "You are Template Farm, a friendly assistant that recommends a minimal, sensible project template for a developer's described project. Prefer popular, well-supported tools. Keep commands copy-pasteable for macOS/Linux. Be concise.";

/**
 * Generate a template recipe for a project description using Claude Haiku.
 * Throws a clean Error on failure — the real error is logged server-side.
 */
export async function generateRecipe(
  description: string,
): Promise<RecipeOutput> {
  try {
    const { experimental_output } = await generateText({
      model: anthropic("claude-haiku-4-5"),
      experimental_output: Output.object({ schema: recipeSchema }),
      system: SYSTEM_PROMPT,
      prompt: `Project description:\n${description}\n\nReturn a single template recipe.`,
    });
    return experimental_output;
  } catch (err) {
    logger.error("ai.generateRecipe failed", { err: describeError(err) });
    throw new Error("AI generation failed");
  }
}
