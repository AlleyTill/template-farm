import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";

/**
 * Farm-themed passphrase generator.
 * Format: "adjective-noun-##-adjective-noun"
 * Example: "sunny-turnip-42-mossy-barn"
 *
 * This is both the user's recovery passphrase (entropy from a 0–9999 number
 * plus ~12 bits of word choice on each side ≈ 37 bits — weak for bruteforce
 * but paired with rate-limited recovery it's fine for a cozy cross-device
 * restore flow, not a password).
 */
const ADJECTIVES = [
  "sunny", "mossy", "golden", "silver", "rustic", "cozy", "humble", "wild",
  "dewy", "sleepy", "bright", "hidden", "crooked", "jolly", "mellow",
  "tangled", "piney", "foggy", "amber", "breezy", "fern", "hazel",
  "misty", "pebble", "ripe", "shady", "sprout", "thistle", "twilight", "velvet",
] as const;

const NOUNS = [
  "turnip", "barn", "cabbage", "acorn", "harvest", "willow", "meadow",
  "orchard", "hearth", "berry", "sprig", "bramble", "clover", "sprout",
  "furrow", "paddock", "brook", "silo", "kettle", "basket", "cellar",
  "hollow", "pumpkin", "radish", "onion", "pepper", "melon", "grove",
  "thicket", "lantern",
] as const;

function pick<T>(arr: readonly T[]): T {
  const bytes = randomBytes(2).readUInt16BE(0);
  return arr[bytes % arr.length];
}

export function generatePassphrase(): string {
  const number = randomBytes(2).readUInt16BE(0) % 10000;
  return `${pick(ADJECTIVES)}-${pick(NOUNS)}-${number}-${pick(ADJECTIVES)}-${pick(NOUNS)}`;
}

export function generateDisplayName(): string {
  const adj = pick(ADJECTIVES);
  const noun = pick(NOUNS);
  // "Sunny Turnip Farm"
  return `${cap(adj)} ${cap(noun)} Farm`;
}

export function generateReferralCode(): string {
  return `${pick(ADJECTIVES)}-${pick(NOUNS)}-${randomBytes(2).readUInt16BE(0) % 10000}`;
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const BCRYPT_ROUNDS = 10;

export async function hashPassphrase(passphrase: string): Promise<string> {
  return bcrypt.hash(passphrase, BCRYPT_ROUNDS);
}

export async function verifyPassphrase(
  passphrase: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(passphrase, hash);
}
