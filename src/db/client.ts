import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

type Db = ReturnType<typeof drizzle<typeof schema>>;

let _db: Db | null = null;

/**
 * Lazy DB client — only instantiates on first call.
 * Safe for build time (does not read DATABASE_URL at module load).
 * NEVER wrap this in a Proxy; see vercel-storage skill notes.
 */
export function getDb(): Db {
  if (_db) return _db;
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  const sql = neon(url);
  _db = drizzle(sql, { schema });
  return _db;
}
