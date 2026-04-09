import { randomInt } from "node:crypto";

export const PRIZE_TABLE = [
  { weight: 50, prompts: 1 },
  { weight: 25, prompts: 2 },
  { weight: 15, prompts: 3 },
  { weight: 10, prompts: 5 },
] as const;

/**
 * Roll the spin wheel. Uses crypto.randomInt for fairness/auditability.
 * Weights sum to 100; we roll an integer in [0, 100).
 */
export function rollSpin(): { prompts: number } {
  const roll = randomInt(0, 100);
  let cursor = 0;
  for (const entry of PRIZE_TABLE) {
    cursor += entry.weight;
    if (roll < cursor) {
      return { prompts: entry.prompts };
    }
  }
  // Unreachable if weights sum to 100, but fall back to the smallest prize.
  return { prompts: PRIZE_TABLE[0].prompts };
}
