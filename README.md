# 🌱 Template Farm 🌾

> Sow a description, harvest a project template. A cozy, Stardew-Valley-vibed
> community library of starter templates for developers.

Template Farm is a community-first template library. Search thousands of
community-grown project scaffolds by plain description. If nothing fits, toggle
on the farmhand (Claude Haiku 4.5) to generate a new one — AI results are
published back to the public library by default, so every prompt grows the
farm.

No email, no signup form. Your identity is a passphrase you write down once.

---

## Features

- 🔎 **Full-text search** over community harvests (Postgres `tsvector` + GIN)
- 🤖 **AI generation** (Claude Haiku 4.5) with honest warning banner
- 🌾 **Dual-layer quotas**: 3 AI prompts / month per user + global 200/day farm pool
- 🔑 **Passphrase identity** — farm-themed phrases, bcrypt-hashed, recoverable on any device
- 💬 **Community content**: comments (one-level threaded), code snippets, link refs
- ❤️ **Likes & forks** on any public harvest
- 🎡 **Spin wheel** for bonus prompts, earned via referrals
- 👥 **Referral codes** — award your friend a spin when they post their first harvest
- 👤 **Public profiles** at `/u/[displayName]`
- 🎨 **NES.css pixel UI** with a cozy farm palette

## Stack

- **Next.js 16** (App Router) + React 19 + TypeScript
- **Neon Postgres** via Vercel Marketplace (serverless HTTP driver)
- **Drizzle ORM** with generated `tsvector` column for search
- **Tailwind v4** + **NES.css** + Press Start 2P / Nunito fonts
- **@ai-sdk/anthropic** — Claude Haiku 4.5 via `generateText` + `Output.object`
- **bcryptjs** for passphrase hashing, **marked + isomorphic-dompurify** for safe markdown

---

## Quick start

### 1. Prerequisites

- **Node.js 20+** (24 LTS recommended)
- A **Neon** database (free tier is fine — easiest via `vercel link` + Vercel Marketplace, or sign up at <https://neon.tech>)
- An **Anthropic API key** from <https://console.anthropic.com/> (starts with `sk-ant-...`)

### 2. Install

```bash
git clone <your-fork-url> template-farm
cd template-farm
npm install
```

### 3. Configure environment

Create `.env.local`:

```
DATABASE_URL=postgres://...        # Neon connection string
ANTHROPIC_API_KEY=sk-ant-...
```

### 4. Run migrations

```bash
npm run db:push          # push schema to Neon
# migrations in drizzle/ include a hand-written tsvector + GIN index
```

### 5. Dev server

```bash
npm run dev
```

Open <http://localhost:3000>. On first visit you'll be assigned a farm, shown
your passphrase once (**write it down!**), and dropped at the search page.

### 6. Production

```bash
npm run build
npm run start
```

Or deploy to Vercel (`vercel deploy`) — the Marketplace can provision Neon for you.

---

## Routes

### Pages
- `/` — landing, search, AI toggle
- `/h/[id]` — harvest detail (recipe, comments, snippets, refs, likes, fork)
- `/me` — your dashboard (quota, passphrase, referral, spin wheel, your harvests)
- `/u/[name]` — public profile
- `/recover` — restore a farm from a passphrase

### API
- `POST /api/session/init` — idempotent session bootstrap
- `POST /api/session/recover` — passphrase recovery (rate-limited)
- `GET  /api/me` — current user + quota
- `POST /api/me/spin` — spend a spin token
- `POST /api/generate` — AI generation (checks quota, rolls back on failure)
- `POST /api/search` — full-text search
- `GET/POST /api/harvests` — list / create
- `GET  /api/harvests/[id]` — single harvest with community content
- `POST /api/harvests/[id]/{comments,snippets,refs,like,fork}`
- `POST /api/referrals` — bind a referral code
- `GET  /api/users/[name]` — public profile

---

## Project layout

```
src/
  app/
    _components/        # landing shell, search, AI toggle, referral banner, session boot
    api/                # all routes above
    h/[id]/             # harvest detail page + its components
    me/                  # dashboard + spin wheel, quota card, passphrase card
    u/[name]/           # profile page
    recover/            # passphrase recovery
    layout.tsx, page.tsx, globals.css
  db/
    schema.ts           # 9 tables (users, harvests, comments, snippets, refs, likes, referrals, spin_results, ai_budget)
    client.ts           # lazy getDb() — Neon HTTP driver
  lib/
    ai.ts               # generateRecipe()
    quota.ts            # checkAndConsume() / restore() — dual-layer
    harvests.ts         # create/get/list/search + onFirstPublicHarvest hook
    community.ts        # comments, snippets, refs, likes, fork
    referrals.ts        # bind + award
    spin.ts             # prize table + rollSpin()
    profiles.ts
    session.ts          # getOrCreateUser, recoverByPassphrase
    passphrase.ts       # generate, hash, verify
    markdown.ts         # safe marked + dompurify
    rate-limit.ts       # in-memory sliding window (dev)
    errors.ts, logger.ts, types.ts
  instrumentation.ts    # wires referral reward into first-public-harvest hook
drizzle/
  0000_*.sql            # schema
  0001_search_tsv.sql   # generated tsvector + GIN index
```

## Security notes

- Passphrases are bcrypt-hashed; `/recover` is rate-limited to 5/15min/IP to keep brute-force impractical.
- Session cookies are HTTP-only, `SameSite=Lax`, 1-year expiry.
- All user-generated markdown is sanitized server-side via marked + isomorphic-dompurify with a strict allowlist (no script/style/iframe, forced `target="_blank" rel="noopener nofollow"` on links).
- AI calls are guarded by a per-user monthly quota *and* a global daily farm pool — both checked and consumed before the LLM call, and rolled back on failure.

## License

MIT. Have fun. Tend the soil. Share the harvest.
