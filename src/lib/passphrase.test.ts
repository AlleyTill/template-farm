import { describe, it, expect } from "vitest";
import {
  generatePassphrase,
  generateDisplayName,
  generateReferralCode,
  hashPassphrase,
  verifyPassphrase,
} from "./passphrase";

describe("passphrase", () => {
  it("generatePassphrase returns the 5-token farm format", () => {
    const p = generatePassphrase();
    const parts = p.split("-");
    expect(parts).toHaveLength(5);
    expect(parts[0]).toMatch(/^[a-z]+$/);
    expect(parts[1]).toMatch(/^[a-z]+$/);
    expect(Number(parts[2])).toBeGreaterThanOrEqual(0);
    expect(Number(parts[2])).toBeLessThan(10000);
    expect(parts[3]).toMatch(/^[a-z]+$/);
    expect(parts[4]).toMatch(/^[a-z]+$/);
  });

  it("generatePassphrase is not deterministic", () => {
    const a = new Set<string>();
    for (let i = 0; i < 20; i++) a.add(generatePassphrase());
    expect(a.size).toBeGreaterThan(1);
  });

  it("generateDisplayName ends with 'Farm' and is capitalized", () => {
    const name = generateDisplayName();
    expect(name).toMatch(/^[A-Z][a-z]+ [A-Z][a-z]+ Farm$/);
  });

  it("generateReferralCode is 3 hyphen tokens", () => {
    const code = generateReferralCode();
    const parts = code.split("-");
    expect(parts).toHaveLength(3);
    expect(Number(parts[2])).toBeGreaterThanOrEqual(0);
  });

  it("hashPassphrase + verifyPassphrase round-trips", async () => {
    const pw = "sunny-turnip-42-mossy-barn";
    const hash = await hashPassphrase(pw);
    expect(hash).not.toEqual(pw);
    expect(await verifyPassphrase(pw, hash)).toBe(true);
    expect(await verifyPassphrase("wrong-passphrase", hash)).toBe(false);
  });
});
