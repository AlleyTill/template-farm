import { sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  boolean,
  date,
  primaryKey,
  index,
  uniqueIndex,
  pgEnum,
} from "drizzle-orm/pg-core";

export const tierEnum = pgEnum("tier", ["free", "paid"]);
export const visibilityEnum = pgEnum("visibility", ["public", "private"]);
export const harvestSourceEnum = pgEnum("harvest_source", [
  "ai",
  "community",
  "seed",
]);
export const refKindEnum = pgEnum("ref_kind", [
  "doc",
  "tutorial",
  "repo",
  "video",
  "other",
]);

/**
 * Users — anonymous-first identity with passphrase recovery.
 * Never stores PII. Passphrase is bcrypt-hashed.
 */
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    passphraseHash: text("passphrase_hash").notNull(),
    displayName: text("display_name").notNull(),
    tier: tierEnum("tier").notNull().default("free"),
    monthlyQuota: integer("monthly_quota").notNull().default(3),
    quotaUsed: integer("quota_used").notNull().default(0),
    bonusPrompts: integer("bonus_prompts").notNull().default(0),
    quotaResetAt: timestamp("quota_reset_at", { withTimezone: true }).notNull(),
    referralCode: text("referral_code").notNull(),
    referredBy: uuid("referred_by"),
    spinTokens: integer("spin_tokens").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("users_referral_code_idx").on(t.referralCode),
    index("users_referred_by_idx").on(t.referredBy),
  ],
);

/**
 * Harvests — a generated or shared project template.
 * search_tsv is a generated column; see the migration for its definition.
 */
export const harvests = pgTable(
  "harvests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    source: harvestSourceEnum("source").notNull(),
    description: text("description").notNull(),
    name: text("name").notNull(),
    stack: text("stack").array().notNull(),
    scaffoldCommands: text("scaffold_commands").array().notNull(),
    compileSteps: text("compile_steps").array().notNull(),
    rationale: text("rationale").notNull(),
    visibility: visibilityEnum("visibility").notNull().default("public"),
    forkOf: uuid("fork_of"),
    likeCount: integer("like_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("harvests_user_id_idx").on(t.userId),
    index("harvests_visibility_idx").on(t.visibility),
    index("harvests_created_at_idx").on(t.createdAt),
    // search_tsv GIN index is created in the migration SQL
  ],
);

/**
 * Comments — threaded, one level of nesting.
 */
export const comments = pgTable(
  "comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    harvestId: uuid("harvest_id")
      .notNull()
      .references(() => harvests.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    parentId: uuid("parent_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("comments_harvest_id_idx").on(t.harvestId),
    index("comments_parent_id_idx").on(t.parentId),
  ],
);

/**
 * Snippets — titled code blocks attached to a harvest.
 */
export const snippets = pgTable(
  "snippets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    harvestId: uuid("harvest_id")
      .notNull()
      .references(() => harvests.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    language: text("language").notNull(),
    code: text("code").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("snippets_harvest_id_idx").on(t.harvestId)],
);

/**
 * Refs — external link references attached to a harvest.
 */
export const refs = pgTable(
  "refs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    harvestId: uuid("harvest_id")
      .notNull()
      .references(() => harvests.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    title: text("title").notNull(),
    kind: refKindEnum("kind").notNull().default("other"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("refs_harvest_id_idx").on(t.harvestId)],
);

/**
 * Likes — user × harvest join.
 */
export const likes = pgTable(
  "likes",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    harvestId: uuid("harvest_id")
      .notNull()
      .references(() => harvests.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.harvestId] }),
    index("likes_harvest_id_idx").on(t.harvestId),
  ],
);

/**
 * Referrals — audit trail of who referred whom.
 * referredId is unique (each user can only be referred once).
 */
export const referrals = pgTable(
  "referrals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    referrerId: uuid("referrer_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    referredId: uuid("referred_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    rewarded: boolean("rewarded").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("referrals_referred_id_idx").on(t.referredId),
    index("referrals_referrer_id_idx").on(t.referrerId),
  ],
);

/**
 * Spin results — audit trail of spin wheel outcomes.
 */
export const spinResults = pgTable(
  "spin_results",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokensSpent: integer("tokens_spent").notNull().default(1),
    promptsWon: integer("prompts_won").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("spin_results_user_id_idx").on(t.userId)],
);

/**
 * AI budget — one row per date. Global daily pool for AI calls.
 */
export const aiBudget = pgTable("ai_budget", {
  date: date("date").primaryKey(),
  used: integer("used").notNull().default(0),
  max: integer("max").notNull().default(200),
});

// Row type exports (inferred from the schema)
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Harvest = typeof harvests.$inferSelect;
export type NewHarvest = typeof harvests.$inferInsert;
export type Comment = typeof comments.$inferSelect;
export type Snippet = typeof snippets.$inferSelect;
export type Ref = typeof refs.$inferSelect;
export type Like = typeof likes.$inferSelect;
export type Referral = typeof referrals.$inferSelect;
export type SpinResult = typeof spinResults.$inferSelect;
export type AiBudget = typeof aiBudget.$inferSelect;

// Re-export sql for callers that need it alongside the schema
export { sql };
