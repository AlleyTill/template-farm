/**
 * Seed the farm with curated starter templates.
 *
 * Usage: npm run db:seed
 *
 * Idempotent: uses a fixed "seed farmer" user (by display name) and skips
 * harvests whose name already exists for that user.
 */
import "dotenv/config";
import { eq, and } from "drizzle-orm";
import { getDb } from "../src/db/client";
import { users, harvests } from "../src/db/schema";
import { hashPassphrase, generateReferralCode } from "../src/lib/passphrase";

const SEED_DISPLAY_NAME = "The Farm Keeper";

type SeedHarvest = {
  name: string;
  description: string;
  stack: string[];
  scaffoldCommands: string[];
  compileSteps: string[];
  rationale: string;
};

const SEEDS: SeedHarvest[] = [
  {
    name: "Next.js 16 App Router starter",
    description:
      "A modern full-stack React app with server components, TypeScript, and Tailwind. Good default for websites, dashboards, and SaaS products.",
    stack: ["Next.js 16", "React 19", "TypeScript", "Tailwind CSS v4"],
    scaffoldCommands: [
      "npx create-next-app@latest my-app --typescript --tailwind --app --eslint",
      "cd my-app",
    ],
    compileSteps: ["npm install", "npm run dev"],
    rationale:
      "Next.js App Router is the default for new React projects. Server components reduce client JS and TypeScript + Tailwind are the dominant defaults.",
  },
  {
    name: "FastAPI REST service",
    description:
      "A fast, typed Python REST API with automatic OpenAPI docs. Ideal for data-heavy backends, ML inference endpoints, and internal tools.",
    stack: ["Python 3.12", "FastAPI", "Uvicorn", "Pydantic v2"],
    scaffoldCommands: [
      "mkdir my-api && cd my-api",
      "python -m venv .venv && source .venv/bin/activate",
      "pip install 'fastapi[standard]' uvicorn",
      "printf 'from fastapi import FastAPI\\napp = FastAPI()\\n\\n@app.get(\"/\")\\ndef root():\\n    return {\"ok\": True}\\n' > main.py",
    ],
    compileSteps: ["uvicorn main:app --reload"],
    rationale:
      "FastAPI gives you async, typed endpoints with free OpenAPI docs. The fastest way to ship a Python API without ceremony.",
  },
  {
    name: "Hono edge API",
    description:
      "A tiny, fast TypeScript API that deploys to Cloudflare Workers, Vercel, Bun, or Node. Perfect for low-latency edge endpoints.",
    stack: ["Hono", "TypeScript", "Node.js or Workers"],
    scaffoldCommands: [
      "npm create hono@latest my-api",
      "cd my-api",
    ],
    compileSteps: ["npm install", "npm run dev"],
    rationale:
      "Hono is smaller and faster than Express, runs on every runtime, and has a clean middleware API. Best default for a minimal API.",
  },
  {
    name: "Expo React Native app",
    description:
      "Cross-platform mobile app (iOS + Android) with hot reload and easy builds. Best for consumer mobile apps and prototypes.",
    stack: ["Expo", "React Native", "TypeScript", "expo-router"],
    scaffoldCommands: ["npx create-expo-app@latest my-app -t", "cd my-app"],
    compileSteps: ["npm install", "npx expo start"],
    rationale:
      "Expo removes native toolchain pain, expo-router gives you file-based routing, and EAS handles builds. The fastest way to ship mobile.",
  },
  {
    name: "Astro content site",
    description:
      "A super-fast content site (blog, docs, marketing) that ships zero JS by default. Great for personal sites, documentation, and landing pages.",
    stack: ["Astro", "TypeScript", "MDX"],
    scaffoldCommands: [
      "npm create astro@latest my-site -- --template minimal --typescript strict",
      "cd my-site",
      "npx astro add mdx",
    ],
    compileSteps: ["npm install", "npm run dev"],
    rationale:
      "Astro's island architecture gives you perfect Lighthouse scores on content sites without giving up component DX.",
  },
  {
    name: "SvelteKit full-stack app",
    description:
      "A minimal, fast full-stack web framework with server routes, form actions, and file-based routing. Great for indie apps.",
    stack: ["SvelteKit", "Svelte 5", "TypeScript", "Vite"],
    scaffoldCommands: ["npx sv create my-app", "cd my-app"],
    compileSteps: ["npm install", "npm run dev"],
    rationale:
      "Svelte 5 runes + SvelteKit give you less boilerplate than React for the same power. Form actions make server mutations effortless.",
  },
  {
    name: "Rust CLI with clap",
    description:
      "A fast, single-binary command-line tool. Perfect for dev tooling, system utilities, and performance-critical scripts.",
    stack: ["Rust", "clap", "anyhow"],
    scaffoldCommands: [
      "cargo new my-cli",
      "cd my-cli",
      "cargo add clap --features derive",
      "cargo add anyhow",
    ],
    compileSteps: ["cargo run -- --help", "cargo build --release"],
    rationale:
      "clap with the derive feature gives you typed arg parsing in ~10 lines, and Rust produces a single static binary you can ship anywhere.",
  },
  {
    name: "Go HTTP API with chi",
    description:
      "A small, idiomatic Go HTTP service with routing and middleware. Good for internal services, background workers, and microservices.",
    stack: ["Go", "chi router", "stdlib"],
    scaffoldCommands: [
      "mkdir my-api && cd my-api",
      "go mod init example.com/my-api",
      "go get github.com/go-chi/chi/v5",
    ],
    compileSteps: ["go run .", "go build -o my-api ."],
    rationale:
      "chi is a thin router over net/http with middleware support. Idiomatic Go, zero magic, fast compile, single binary deploy.",
  },
];

async function main() {
  const db = getDb();

  // Find or create the seed farmer.
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.displayName, SEED_DISPLAY_NAME))
    .limit(1);

  let farmerId: string;
  if (existing.length > 0) {
    farmerId = existing[0].id;
    console.log(`[seed] using existing seed farmer ${farmerId}`);
  } else {
    const passphraseHash = await hashPassphrase(
      `seed-farmer-${Date.now()}-${Math.random()}`,
    );
    const resetAt = new Date();
    resetAt.setMonth(resetAt.getMonth() + 1);
    const inserted = await db
      .insert(users)
      .values({
        passphraseHash,
        displayName: SEED_DISPLAY_NAME,
        tier: "free",
        monthlyQuota: 0,
        quotaResetAt: resetAt,
        referralCode: generateReferralCode(),
      })
      .returning();
    farmerId = inserted[0].id;
    console.log(`[seed] created seed farmer ${farmerId}`);
  }

  let inserted = 0;
  let skipped = 0;
  for (const s of SEEDS) {
    const dupe = await db
      .select({ id: harvests.id })
      .from(harvests)
      .where(and(eq(harvests.userId, farmerId), eq(harvests.name, s.name)))
      .limit(1);
    if (dupe.length > 0) {
      skipped++;
      continue;
    }
    await db.insert(harvests).values({
      userId: farmerId,
      source: "seed",
      visibility: "public",
      name: s.name,
      description: s.description,
      stack: s.stack,
      scaffoldCommands: s.scaffoldCommands,
      compileSteps: s.compileSteps,
      rationale: s.rationale,
    });
    inserted++;
  }

  console.log(
    `[seed] done. inserted=${inserted} skipped=${skipped} total=${SEEDS.length}`,
  );
}

main().catch((err) => {
  console.error("[seed] failed:", err);
  process.exit(1);
});
