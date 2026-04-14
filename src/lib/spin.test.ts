import { describe, it, expect } from "vitest";
import { PRIZE_TABLE, rollSpin } from "./spin";

describe("spin", () => {
  it("PRIZE_TABLE weights sum to 100", () => {
    const sum = PRIZE_TABLE.reduce((a, b) => a + b.weight, 0);
    expect(sum).toBe(100);
  });

  it("rollSpin always returns a prize from the table", () => {
    const valid = new Set(PRIZE_TABLE.map((p) => p.prompts));
    for (let i = 0; i < 500; i++) {
      const { prompts } = rollSpin();
      expect(valid.has(prompts)).toBe(true);
    }
  });

  it("rollSpin distribution roughly matches weights over many rolls", () => {
    const counts = new Map<number, number>();
    const N = 5000;
    for (let i = 0; i < N; i++) {
      const { prompts } = rollSpin();
      counts.set(prompts, (counts.get(prompts) ?? 0) + 1);
    }
    // Weight 50 (+1) should dominate, weight 10 (+5) should be rarest.
    const p1 = counts.get(1) ?? 0;
    const p5 = counts.get(5) ?? 0;
    expect(p1).toBeGreaterThan(p5);
    // +1 roughly 50% ± 10%
    expect(p1 / N).toBeGreaterThan(0.4);
    expect(p1 / N).toBeLessThan(0.6);
  });
});
