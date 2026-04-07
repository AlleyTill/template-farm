# 🌱 Template Farm 🌾

> Sow a description, harvest a project template.

Template Farm is a cozy, Stardew Valley–vibed web app for developers. Describe
the project you're trying to build, and the farm hands you back a ready-to-go
template: a stack, the commands to scaffold it, and the steps to build and run
it on your machine.

> ⚠️ **Spoiler warning:** under the cute pixel UI, the farm is currently powered
> by Anthropic's Claude Haiku 4.5. You bring the API key, the farm does the rest.
> A future version will lean on a community-seeded template library so AI calls
> become a fallback rather than the default.

---

## What you need

- **Node.js 20+** (Node 24 LTS recommended)
- **npm** (or pnpm/yarn — examples below use npm)
- An **Anthropic API key** — see below

## 1. Get an Anthropic API key

1. Go to <https://console.anthropic.com/>
2. Sign in or create an account
3. Navigate to **Settings → API Keys**
4. Click **Create Key**, give it a name (e.g. `template-farm-dev`), and copy the
   value. It starts with `sk-ant-...`
5. Treat this key like a password. Don't commit it. Don't paste it into chat
   logs. If you leak it, rotate it immediately from the same page.

> 💸 **Cost note:** Template Farm uses Claude Haiku 4.5, the cheapest Claude
> model. A single recipe generation costs roughly **$0.0035** (about a third of
> a cent). At 1,000 users generating 3 recipes/month each, you're looking at
> ~$10/month total. New Anthropic accounts also get free trial credits.

## 2. Clone and install

```bash
git clone <your-fork-url> template-farm
cd template-farm
npm install
```

## 3. Configure your environment

Copy the example env file and paste your key into it:

```bash
cp .env.local.example .env.local
```

Open `.env.local` in your editor and set:

```
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

`.env.local` is already in `.gitignore`, so it will not be committed.

## 4. Run the dev server

```bash
npm run dev
```

Open <http://localhost:3000> in your browser. You should see the farm.

Type a project description into the text area (e.g. *"a REST API for tracking
houseplants with a small web dashboard"*) and click **Plant seed 🌱**. After a
few seconds you'll get back:

- A template name and recommended stack
- Shell commands to scaffold the project
- Shell commands to install, build, and run it
- A short rationale for why this stack fits

## 5. Build for production

```bash
npm run build
npm run start
```

This produces an optimized production build and serves it on port 3000.

---

## How it works (very short tour)

- `src/app/page.tsx` — landing page with NES.css pixel styling
- `src/app/template-form.tsx` — client form + result card
- `src/app/api/generate/route.ts` — server route that calls Claude Haiku via the
  Vercel AI SDK using `generateText` + `Output.object` for structured output
- `src/app/types.ts` — shared `Recipe` type

The API route validates the model's response against a Zod schema, so the
frontend always receives a well-formed `{ name, stack, scaffoldCommands,
compileSteps, rationale }` object — or a clean error.

## Troubleshooting

**"Unauthenticated" / 401 errors**
Your `ANTHROPIC_API_KEY` is missing, malformed, or revoked. Double-check
`.env.local` and **restart `npm run dev`** after editing it (Next.js only loads
env files at startup).

**500 error with no useful message**
Open the terminal where `npm run dev` is running. The route logs the real
error with `[generate] error: ...` just above the stack trace.

**Model not found**
You're probably on an old `@ai-sdk/anthropic` version. Run `npm i @ai-sdk/anthropic@latest`.

## License

MIT. Have fun. Tend the soil. Share the harvest.
