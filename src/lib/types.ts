/**
 * Public shared types. **Do not change signatures here without coordinating
 * across every Wave 1+ lane** — these are the contracts parallel agents rely
 * on. Add new types freely; only the existing ones are frozen.
 */

import type {
  User as DbUser,
  Harvest as DbHarvest,
  Comment as DbComment,
  Snippet as DbSnippet,
  Ref as DbRef,
} from "@/db/schema";

/** Safe user shape exposed to the client (no passphrase hash). */
export type PublicUser = Omit<DbUser, "passphraseHash">;

/** Harvest as returned by API endpoints. */
export type Harvest = DbHarvest;

/** Harvest with its community content joined in. */
export type HarvestWithContent = Harvest & {
  author: Pick<PublicUser, "id" | "displayName">;
  comments: (DbComment & { author: Pick<PublicUser, "id" | "displayName"> })[];
  snippets: DbSnippet[];
  refs: DbRef[];
  likedByMe: boolean;
};

/** Search result row. */
export type SearchHit = Pick<
  Harvest,
  "id" | "name" | "description" | "stack" | "likeCount" | "createdAt"
> & {
  rank: number;
};

/** Quota info returned by /api/me. */
export type QuotaInfo = {
  monthlyQuota: number;
  quotaUsed: number;
  bonusPrompts: number;
  spinTokens: number;
  quotaResetAt: string; // ISO
  farmPoolRemaining: number;
  farmPoolMax: number;
};

/** Standard API error envelope. */
export type ApiError = {
  error: {
    code: string;
    message: string;
  };
};
