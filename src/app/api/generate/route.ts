import { generateText, Output } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";

export const maxDuration = 60;

const recipeSchema = z.object({
  name: z.string().describe("Short, friendly name for the template"),
  stack: z.array(z.string()).describe("Languages, frameworks, and key libraries"),
  scaffoldCommands: z
    .array(z.string())
    .describe("Shell commands the user runs to create the project from scratch"),
  compileSteps: z
    .array(z.string())
    .describe("Shell commands to install deps, build, and run the project"),
  rationale: z
    .string()
    .describe("1-3 sentences explaining why this stack fits the description"),
});

export async function POST(req: Request) {
  const { description } = (await req.json()) as { description?: string };
  if (!description || typeof description !== "string") {
    return Response.json({ error: "description required" }, { status: 400 });
  }

  try {
    const { output } = await generateText({
      model: anthropic("claude-haiku-4-5"),
      output: Output.object({ schema: recipeSchema }),
      system:
        "You are Template Farm, a friendly assistant that recommends a minimal, sensible project template for a developer's described project. Prefer popular, well-supported tools. Keep commands copy-pasteable for macOS/Linux. Be concise.",
      prompt: `Project description:\n${description}\n\nReturn a single template recipe.`,
    });
    return Response.json(output);
  } catch (err) {
    console.error("[generate] error:", err);
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 500 });
  }
}
