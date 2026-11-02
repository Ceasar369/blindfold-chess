import { describe, expect, it } from "vitest";
import { apart, roundOfSquares, seeded, squareAwayFrom } from "./index.ts";

describe("Random draws", () => {
  it("gives the same draws from the same seed", () => {
    const a = seeded("1.1.1 L2 round 7");
    const b = seeded("1.1.1 L2 round 7");
    const c = seeded("1.1.1 L2 round 8");
    const draw = (r: ReturnType<typeof seeded>) => Array.from({ length: 50 }, () => r.int(64));
    const da = draw(a);
    expect(draw(b)).toEqual(da);
    expect(draw(c)).not.toEqual(da);
  });

  it("draws every value in range, and only those", () => {
    const r = seeded("range");
    const seen = new Set<number>();
    for (let i = 0; i < 2000; i++) {
      const n = r.int(8);
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(8);
      seen.add(n);
    }
    expect(seen.size).toBe(8);
  });

  it("shuffles without losing or adding", () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8];
    const out = seeded("shuffle").shuffle(items);
    expect([...out].sort()).toEqual(items);
    expect(items).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it("picks a square never on the last one's file or rank", () => {
    const r = seeded("away");
    for (let i = 0; i < 500; i++) expect(apart(squareAwayFrom(r, ["e4"]), "e4")).toBe(true);
  });

  it("makes a round where no square shares a file or rank with the one before", () => {
    for (let n = 0; n < 50; n++) {
      const round = roundOfSquares(seeded(`round ${n}`), 20);
      expect(round).toHaveLength(20);
      for (let i = 1; i < round.length; i++) expect(apart(round[i]!, round[i - 1]!)).toBe(true);
    }
  });

  it("gives squares coming back a place among them", () => {
    for (let n = 0; n < 50; n++) {
      const round = roundOfSquares(seeded(`back ${n}`), 20, ["f6", "f5", "a1"]);
      expect(round).toHaveLength(20);
      for (const s of ["f6", "f5", "a1"] as const) expect(round).toContain(s);
      for (let i = 1; i < round.length; i++) expect(apart(round[i]!, round[i - 1]!)).toBe(true);
    }
    // A round too short for them all keeps the first ones.
    expect(roundOfSquares(seeded("short"), 2, ["f6", "c3", "a1"]).sort()).toEqual(["c3", "f6"]);
  });

  it("makes every square of a round different when asked, those coming back included", () => {
    for (let n = 0; n < 500; n++) {
      const round = roundOfSquares(seeded(`different ${n}`), 20, ["f6", "f5", "a1"], undefined, true);
      expect(new Set(round).size).toBe(20);
      for (let i = 1; i < round.length; i++) expect(apart(round[i]!, round[i - 1]!)).toBe(true);
    }
  });
});
