import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { users, type User } from "@/db/schema";
import {
  generateDisplayName,
  generatePassphrase,
  generateReferralCode,
  hashPassphrase,
  verifyPassphrase,
} from "./passphrase";

export const SESSION_COOKIE = "tf_uid";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/**
 * Result returned when a *new* user is created. The passphrase is displayed
 * to the user exactly once — it is never retrievable again.
 */
export type NewSessionResult = {
  user: User;
  passphrase: string;
  isNew: true;
};

export type ExistingSessionResult = {
  user: User;
  isNew: false;
};

export type SessionResult = NewSessionResult | ExistingSessionResult;

function firstOfNextMonth(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
}

/**
 * Read the current user from the cookie, or create a new one if absent.
 * Server-side only (uses next/headers cookies).
 */
export async function getOrCreateUser(): Promise<SessionResult> {
  const cookieStore = await cookies();
  const existingId = cookieStore.get(SESSION_COOKIE)?.value;
  const db = getDb();

  if (existingId) {
    const rows = await db.select().from(users).where(eq(users.id, existingId)).limit(1);
    const found = rows[0];
    if (found) {
      return { user: found, isNew: false };
    }
    // Cookie points to a missing user — fall through and create a new one.
  }

  const passphrase = generatePassphrase();
  const passphraseHash = await hashPassphrase(passphrase);
  const displayName = generateDisplayName();
  const referralCode = generateReferralCode();

  const inserted = await db
    .insert(users)
    .values({
      passphraseHash,
      displayName,
      referralCode,
      quotaResetAt: firstOfNextMonth(),
    })
    .returning();

  const user = inserted[0];
  cookieStore.set(SESSION_COOKIE, user.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ONE_YEAR_SECONDS,
  });

  return { user, passphrase, isNew: true };
}

/**
 * Recover a session by passphrase. On success, sets the cookie and returns
 * the user. On failure, returns null.
 */
export async function recoverByPassphrase(
  passphrase: string,
): Promise<User | null> {
  const db = getDb();
  // Passphrase space is small enough that this is O(n) over all users in the
  // worst case. That's fine for now; in Wave 4 we'll either salt-per-user
  // with a lookup hint or move to a proper account system.
  const candidates = await db.select().from(users);
  for (const u of candidates) {
    if (await verifyPassphrase(passphrase, u.passphraseHash)) {
      const cookieStore = await cookies();
      cookieStore.set(SESSION_COOKIE, u.id, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: ONE_YEAR_SECONDS,
      });
      return u;
    }
  }
  return null;
}

/** Read-only: returns the current user or null. Does NOT create one. */
export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const id = cookieStore.get(SESSION_COOKIE)?.value;
  if (!id) return null;
  const db = getDb();
  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return rows[0] ?? null;
}

/** Strips the passphrase hash before returning a user to the client. */
export function toPublicUser(user: User) {
  const { passphraseHash: _ph, ...rest } = user;
  void _ph;
  return rest;
}
