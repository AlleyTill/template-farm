# Template Farm — Product & Technical Spec

> Living document. If something here is wrong, fix it in a PR before fixing the code.

## 1. What it is

A Stardew Valley–vibed, community-first project-template app. A developer
describes what they want to build; the farm returns a template (stack, scaffold
commands, compile steps, rationale). Templates can come from:

1. **Seed data** — curated by maintainers
2. **Community harvests** — other users' past public generations
3. **AI** — opt-in, rate-limited, produces a new public harvest by default

The core loop is intentionally *not* "prompt → AI → output". It's:

```
describe project
   └─▶ search community + seed first
         └─▶ if no good match, user can OPT IN to AI (with warning)
               └─▶ AI result is saved to the public library
```

## 2. Non-goals

- We are not a code generator. We hand back scaffolding commands, not files.
- We are not an IDE, a build tool, or a package manager.
- We are not trying to replace StackShare / Awesome lists — we add the cozy
  community layer on top of a fast "describe → recommend" loop.
- No PII collection. No emails required. No passwords.

## 3. Users & identity

**Anonymous-first with sticky recovery.**

- First visit: server generates a random `userId` (uuid), sets an HTTP-only
  cookie (`tf_uid`), and generates a cute **farm passphrase** like
  `sunny-turnip-42-mossy-barn`. The passphrase is displayed exactly once.
- Subsequent visits: cookie auto-identifies the user.
- Cross-device / lost cookie: user enters their passphrase on any device to
  restore their harvest history.
- Never stored in plaintext — `passphrase_hash` is bcrypt.
- Each user gets a display name (also auto-generated, e.g. "Sunny Turnip Farm")
  which they can rename.
- Later: Clerk or email claim layered on top. Schema already has room.

## 4. Tiers & quotas

| Tier | Monthly AI prompts | Notes |
|------|---|---|
| `free` | 3 | Default for all new users |
| `paid` | TBD | Not enforced yet; schema supports it |

**Two rate-limit layers (both enforced):**

1. **Per-user monthly quota** (`users.quota_used` / `users.monthly_quota`),
   reset on `quota_reset_at`.
2. **Global daily farm pool** (`ai_budget` table, e.g. 200/day) — safety cap so
   one day can't run away with the bill even if everyone hits their quota.

When either is exhausted, the UI shows "the farm is resting" and funnels the
user into community search.

## 5. Gamification

Community growth through referrals + a spin wheel.

**Referrals:**
- Every user has a `referral_code` (short slug, e.g. `sunny-turnip-42`).
- New users can enter a referral code at signup (or any time before their first
  AI use). Stored in `users.referred_by`.
- When a referred user creates their first **public** harvest, the referrer
  earns **1 spin token** (`users.spin_tokens += 1`). This prevents drive-by
  referrals — the referred user has to actually engage.

**Spin wheel:**
- Users spend spin tokens for bonus AI prompts.
- Prize table (tunable, stored in code constants):
  - 50% → +1 prompt
  - 25% → +2 prompts
  - 15% → +3 prompts
  - 10% → +5 prompts
- Each spin is audited in `spin_results` for tuning.
- Spins grant prompts above the base monthly quota, up to a reasonable cap
  (e.g. `quota_used` can go negative or we add a `bonus_quota` column).
  **Decision:** use a `bonus_prompts` column, independent of `quota_used`.

## 6. Community content on harvests

Each harvest is a living page, not a dead recipe. Users can attach:

- **Comments** (threaded, markdown, one level of nesting for v1)
- **Snippets** — titled code blocks with a language tag
- **Link references** — external docs, tutorials, repos, videos, tagged by kind
- **Likes** — one per user per harvest, drives a `like_count` (denormalized)
- **Forks** — "I grew this from that" — a new harvest with `fork_of` set to the
  original. Lets people evolve community templates.

All community content is public by default (matches the harvest's visibility).
Private harvests have no community layer.

## 7. Search

- Postgres **full-text search** over `harvests` via a generated `search_tsv`
  column indexed with GIN.
- Covers `description || name || stack`.
- Ranks by `ts_rank_cd` + recency + `like_count` (simple weighted sum).
- Returns top 10 public harvests. No AI involved.
- Upgrade path: pgvector for semantic search once we hit a quality ceiling.

## 8. Data model (authoritative)

See `src/db/schema.ts` — Drizzle ORM. This section just summarizes tables.

| Table | Purpose |
|---|---|
| `users` | Identity, tier, quota, referral code, spin tokens |
| `harvests` | A generated/shared project template |
| `comments` | Threaded comments on a harvest |
| `snippets` | Attached code blocks |
| `refs` | Attached link references (docs, repos, etc.) |
| `likes` | user×harvest join |
| `referrals` | Audit trail of who referred whom |
| `spin_results` | Audit trail of spin wheel outcomes |
| `ai_budget` | One row per date; global daily pool |

Every table has `id uuid` + `created_at` unless noted. Full column list is in
the Drizzle schema file.

## 9. Surfaces (routes)

### Pages
- `/` — landing + search + form
- `/h/[id]` — harvest detail (community content lives here)
- `/u/[name]` — public user profile / "my farm"
- `/me` — private dashboard (quota, spin wheel, recovery passphrase)
- `/recover` — enter passphrase to restore session

### API (all under `/api`)
- `POST /api/session/init` — ensure cookie, return user
- `POST /api/session/recover` — passphrase → session
- `POST /api/search` — query → top community harvests
- `POST /api/generate` — AI generation (checks quota + global pool)
- `GET|POST /api/harvests` — list / create (create = save a harvest)
- `GET /api/harvests/[id]` — single harvest + community content
- `POST /api/harvests/[id]/fork` — fork an existing harvest
- `POST /api/harvests/[id]/like` — toggle like
- `POST /api/harvests/[id]/comments` — add comment
- `POST /api/harvests/[id]/snippets` — add snippet
- `POST /api/harvests/[id]/refs` — add link reference
- `POST /api/me/spin` — spend a spin token

## 10. Cost controls

- AI uses **Claude Haiku 4.5** only (cheapest production Claude).
- Hard monthly spend cap set at Anthropic dashboard level (operator task).
- Every AI call is counted against the daily pool *before* the LLM is invoked.
- If the per-user or global pool check fails, the request returns 429 before
  any LLM tokens are spent.
- Descriptions capped at 2,000 chars server-side.

## 11. Security posture (v1 minimum)

- `.env.local` gitignored (already done)
- API keys never returned to the client
- Error messages sanitized before reaching the client; real error logged
  server-side
- All user input validated with Zod at the route boundary
- Shell commands in AI output rendered as **plain text only** — never executed,
  never parsed client-side
- Comments/snippets rendered as markdown through a sanitizing renderer (no raw
  HTML)
- Rate limits per IP on session init and recovery endpoints to blunt abuse

## 12. Accessibility commitments

- All interactive elements keyboard-focusable with visible focus rings
- Color contrast ≥ 4.5:1 for body text (NES.css palette audited)
- Live regions announce async results
- Minimum body font size 14px (override NES.css defaults)

## 13. Observability

- Structured logging via a small `logger` wrapper
- Sentry (or equivalent) for error tracking — added before first public deploy
- Request IDs on every API call, logged and returned in response headers
