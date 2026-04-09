-- Full-text search support on harvests.
-- Adds a generated tsvector column + GIN index covering description, name,
-- and stack tokens. Built over English dictionary; good enough for v1.

ALTER TABLE "harvests"
  ADD COLUMN IF NOT EXISTS "search_tsv" tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce("name", '')), 'A') ||
    setweight(to_tsvector('english', array_to_string(coalesce("stack", ARRAY[]::text[]), ' ')), 'B') ||
    setweight(to_tsvector('english', coalesce("description", '')), 'C')
  ) STORED;

CREATE INDEX IF NOT EXISTS "harvests_search_tsv_idx"
  ON "harvests" USING GIN ("search_tsv");
