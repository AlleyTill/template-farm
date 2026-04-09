/**
 * Curated beginner-friendly tool recommendations for the HARVEST stage.
 *
 * The farmhand does NOT recommend raw `npm create next-app` commands to
 * beginners. Instead we hand them a real, in-browser, zero-install path.
 * Each tool here is chosen because a true beginner (including a kid) can
 * get a working app running from their browser with no terminal.
 */

export type BeginnerTool = {
  id: string;
  name: string;
  url: string;
  tagline: string;
  /** The kinds of apps this tool is good for. */
  goodFor: string[];
  /** Why we picked it. Shown to the user. */
  why: string;
};

export const BEGINNER_TOOLS: BeginnerTool[] = [
  {
    id: "scratch",
    name: "Scratch",
    url: "https://scratch.mit.edu/",
    tagline: "Drag-and-drop code blocks. Make games and stories in your browser.",
    goodFor: ["game", "story", "animation", "kid", "first"],
    why: "Zero typing. You snap code blocks together like LEGOs. If you can click and drag, you can make a game.",
  },
  {
    id: "p5",
    name: "p5.js Web Editor",
    url: "https://editor.p5js.org/",
    tagline: "Draw, animate, and make visuals in JavaScript, all in your browser.",
    goodFor: ["art", "visual", "drawing", "animation", "game", "creative"],
    why: "Perfect for creative coding. You type a few lines of JavaScript and things move on a canvas instantly.",
  },
  {
    id: "glitch",
    name: "Glitch",
    url: "https://glitch.com/",
    tagline: "Full websites and apps you can build and remix in your browser.",
    goodFor: ["website", "web app", "api", "multiplayer", "share"],
    why: "No setup. Edit a live website in your browser and share it with a link the second it works.",
  },
  {
    id: "replit",
    name: "Replit",
    url: "https://replit.com/",
    tagline: "Write code in any language, in your browser, with an AI helper.",
    goodFor: ["anything", "python", "backend", "bot", "script"],
    why: "Pick any language, get a running project in seconds. Has an AI helper if you get stuck.",
  },
  {
    id: "bolt",
    name: "Bolt.new",
    url: "https://bolt.new/",
    tagline: "Describe an app in plain English and get a real working one back.",
    goodFor: ["web app", "ai", "prototype", "tool", "dashboard"],
    why: "Tell it what you want in English, it builds a starter app for you to customize.",
  },
  {
    id: "lovable",
    name: "Lovable",
    url: "https://lovable.dev/",
    tagline: "Build full apps by chatting with an AI. No setup.",
    goodFor: ["web app", "ai", "saas", "dashboard", "prototype"],
    why: "Chat-driven app builder. Keep asking for changes and it rewrites your app live.",
  },
  {
    id: "tldraw",
    name: "Make Real (tldraw)",
    url: "https://makereal.tldraw.com/",
    tagline: "Draw a UI on a whiteboard, get working code back.",
    goodFor: ["prototype", "ui", "sketch", "mockup"],
    why: "If you can sketch what your screen looks like, it can turn the drawing into a real, clickable mockup.",
  },
];

/**
 * Pick 2–3 beginner tools for a sprout based on a simple keyword match
 * against the user's answers. Naive but honest — no LLM needed.
 */
export function pickTools(keywords: string[], max = 3): BeginnerTool[] {
  const text = keywords.join(" ").toLowerCase();
  const scored = BEGINNER_TOOLS.map((tool) => {
    const score = tool.goodFor.reduce(
      (acc, tag) => (text.includes(tag) ? acc + 1 : acc),
      0,
    );
    return { tool, score };
  });
  scored.sort((a, b) => b.score - a.score);
  // Always return at least `max` — pad with top generic picks if no matches.
  const picks = scored
    .filter((s) => s.score > 0)
    .slice(0, max)
    .map((s) => s.tool);
  if (picks.length < max) {
    for (const t of BEGINNER_TOOLS) {
      if (picks.length >= max) break;
      if (!picks.find((p) => p.id === t.id)) picks.push(t);
    }
  }
  return picks;
}
