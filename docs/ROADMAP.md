# Template Farm — Build Roadmap

> A wave-based plan designed for **parallel agent execution**. Each task in a
> wave owns a **disjoint set of files** and communicates with other tasks only
> through the interfaces frozen in the previous wave. Agents working the same
> wave never edit each other's files.

## Rules of engagement for parallel agents

1. **Do not edit files outside your task's file ownership list.**
2. **Do not change any type exported from `src/lib/types.ts`.** If a type needs
   to change, open a discussion — it breaks every other lane.
3. **Do not alter the Drizzle schema outside of a schema-owning task.** Add
   migrations in your own files if you need new tables.
4. **Every task must leave `npx tsc --noEmit` passing** before handing off.
5. **Every task writes a one-paragraph "what I did" note to its PR description**
   listing the files it touched.

---

## Wave 0 — Foundations (serial, one agent)

**Why serial:** everything in Waves 1–3 depends on these interfaces. Must land
before any parallel work begins.

**Owner:** Claude (primary)
**File ownership:**
- `drizzle.config.ts`
- `src/db/schema.ts`
- `src/db/client.ts`
- `src/db/migrate.ts`
- `drizzle/**` (migration SQL)
- `src/lib/types.ts`
- `src/lib/session.ts`
- `src/lib/passphrase.ts`
- `src/lib/errors.ts`
- `src/lib/logger.ts`
- `src/lib/rate-limit.ts`
- `package.json` (add deps, add scripts)

**Deliverables:**
- Drizzle schema for all tables in SPEC §8
- First migration committed
- Shared type exports (`Harvest`, `User`, `Comment`, `Snippet`, `Ref`, etc.)
- Session helper: `getOrCreateUser(req)`, `requireUser(req)`
- Passphrase lib: `generate()`, `hash()`, `verify()`
- Error helpers: `apiError(code, message, status)`
- Logger wrapper
- Rate-limit primitive (in-memory for dev, documented swap to Upstash later)
- `npm run db:generate`, `db:migrate`, `db:studio` scripts

**Exit criteria:**
- `npm run db:migrate` works against Neon
- Hitting `/` in dev creates a user row and sets a cookie
- Typecheck clean

---

## Wave 1 — Core loop (3 parallel lanes)

### Lane 1A — Harvest CRUD + Search API
**File ownership:**
- `src/app/api/harvests/route.ts`
- `src/app/api/harvests/[id]/route.ts`
- `src/app/api/search/route.ts`
- `src/lib/harvests.ts` (shared service functions — the *only* lane that touches this file)

**Deliverables:**
- `POST /api/harvests` (create — public or private)
- `GET /api/harvests?mine=true|false` (list)
- `GET /api/harvests/[id]` (single + community content joined)
- `POST /api/search` with `{ query: string }` → ranked list
- Zod validation at every boundary
- Full-text search uses `search_tsv` + `ts_rank_cd`

### Lane 1B — AI Generate API
**File ownership:**
- `src/app/api/generate/route.ts`
- `src/lib/ai.ts`
- `src/lib/quota.ts`

**Deliverables:**
- Rewrite `/api/generate` to:
  1. Require an authenticated user (Wave 0 session)
  2. Check user quota + global daily pool *before* calling Claude
  3. Call Claude Haiku 4.5 with `generateText` + `Output.object`
  4. Save result as a public harvest (via `src/lib/harvests.ts` — **read-only
     import, do not edit**)
  5. Decrement user quota, increment global pool
  6. Return the saved harvest
- `src/lib/ai.ts` exports a single `generateRecipe(description)` function
- `src/lib/quota.ts` exports `checkAndConsume(userId)` and `restore(userId)`

### Lane 1C — Session + Identity API
**File ownership:**
- `src/app/api/session/init/route.ts`
- `src/app/api/session/recover/route.ts`
- `src/app/api/me/route.ts`

**Deliverables:**
- `POST /api/session/init` → returns `{ user, passphrase? }` (passphrase only on first visit)
- `POST /api/session/recover` with `{ passphrase }` → sets new cookie
- `GET /api/me` → current user + quota + spin tokens

### Wave 1 exit criteria
- All three lanes pass typecheck
- End-to-end: user visits `/`, gets a cookie, searches, falls back to AI,
  result is saved, community can see it
- Zero imports across lane boundaries except through `src/lib/*` helpers

---

## Wave 2 — Community + Gamification (3 parallel lanes)

### Lane 2A — Community content
**File ownership:**
- `src/app/api/harvests/[id]/comments/route.ts`
- `src/app/api/harvests/[id]/snippets/route.ts`
- `src/app/api/harvests/[id]/refs/route.ts`
- `src/app/api/harvests/[id]/like/route.ts`
- `src/app/api/harvests/[id]/fork/route.ts`
- `src/lib/community.ts`
- `src/lib/markdown.ts` (sanitizing renderer)

### Lane 2B — Referrals + Spin wheel
**File ownership:**
- `src/app/api/referrals/route.ts`
- `src/app/api/me/spin/route.ts`
- `src/lib/referrals.ts`
- `src/lib/spin.ts` (prize table lives here)

**Deliverables:**
- Enter a referral code on any page → binds current user to referrer
- When the referred user creates their first public harvest, referrer gets a
  spin token (hook called from `src/lib/harvests.ts` — Lane 2B only *reads*
  that module; the hook is triggered by Lane 1A's code, so Lane 1A must export
  an `onFirstPublicHarvest` extension point during Wave 1)
- Spin endpoint: spends a token, rolls a prize, awards bonus prompts

### Lane 2C — Profile pages (API)
**File ownership:**
- `src/app/api/users/[name]/route.ts`
- `src/lib/profiles.ts`

### Wave 2 exit criteria
- Can comment, snippet, and link-ref a harvest
- Can like and fork a harvest
- Referral flow works end-to-end
- Spin wheel returns valid prizes and updates bonus prompt count

---

## Wave 3 — UI (3+ parallel lanes)

Every UI lane owns a **separate route segment**. They share `src/components/*`
only through **append-only** files (add new component, never edit an existing
one in a parallel wave).

### Lane 3A — Landing + Search + Generate
- `src/app/page.tsx`
- `src/app/_components/search-form.tsx`
- `src/app/_components/results-list.tsx`
- `src/app/_components/ai-toggle.tsx`

### Lane 3B — Harvest detail
- `src/app/h/[id]/page.tsx`
- `src/app/h/[id]/_components/*`

### Lane 3C — Profile + me dashboard
- `src/app/u/[name]/page.tsx`
- `src/app/me/page.tsx`
- `src/app/me/_components/*`

### Lane 3D — Spin wheel + referral UI
- `src/app/me/_components/spin-wheel.tsx`
- `src/app/_components/referral-banner.tsx`

### Wave 3 exit criteria
- Full UI flow works against the API
- Lighthouse accessibility ≥ 90
- No agent overwrote another's component file

---

## Wave 4 — Hardening (serial)

- Real rate limiter (Upstash Redis via Marketplace)
- Sentry integration
- Seed data loader (curated templates)
- Input sanitization audit
- Accessibility audit
- Test suite (Vitest) targeting `src/lib/*`
- Deploy to Vercel

---

## Parallelism cheat sheet

| Lane | Directory root | Never touch |
|---|---|---|
| 1A | `src/app/api/harvests`, `src/app/api/search`, `src/lib/harvests.ts` | 1B, 1C files |
| 1B | `src/app/api/generate`, `src/lib/ai.ts`, `src/lib/quota.ts` | 1A, 1C files |
| 1C | `src/app/api/session`, `src/app/api/me` | 1A, 1B files |
| 2A | `src/app/api/harvests/[id]/{comments,snippets,refs,like,fork}`, `src/lib/community.ts`, `src/lib/markdown.ts` | 2B, 2C files |
| 2B | `src/app/api/referrals`, `src/app/api/me/spin`, `src/lib/referrals.ts`, `src/lib/spin.ts` | 2A, 2C files |
| 2C | `src/app/api/users`, `src/lib/profiles.ts` | 2A, 2B files |
| 3A–3D | disjoint route segments | each other's segments |
