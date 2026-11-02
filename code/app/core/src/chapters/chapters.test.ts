import { describe, expect, it } from "vitest";
import { builtChallenges, CHAPTERS } from "./index.ts";

describe("the six chapters", () => {
  it("lists six chapters and their twenty-seven challenges", () => {
    expect(CHAPTERS.map((c) => c.n)).toEqual([1, 2, 3, 4, 5, 6]);
    const ids = CHAPTERS.flatMap((c) => c.sections.flatMap((s) => s.challenges.map((x) => x.id)));
    expect(ids).toEqual([
      "1.1.1", "1.1.2", "1.2.1", "1.3.1",
      "2.1.1", "2.1.2", "2.2.1", "2.3.1", "2.3.2",
      "3.1.1", "3.2.1",
      "4.1.1", "4.2.1", "4.3.1", "4.3.2", "4.3.3", "4.3.4", "4.3.5", "4.3.6", "4.3.7", "4.3.8", "4.3.9",
      "5.1.1", "5.2.1",
      "6.1.1", "6.2.1", "6.3.1",
    ]);
  });

  // A round that leaves a come-back out must not age it (Challenge.asks): every card says which it asks.
  it("gives every built challenge its own asks, naming the come-backs its round maker takes", () => {
    const built = builtChallenges();
    expect([...built.keys()].sort()).toHaveLength(27);
    for (const [id, challenge] of built) expect(typeof challenge.asks, id).toBe("function");
  });

  it("holds each path's steps, on challenges its chapter lists", () => {
    expect(CHAPTERS.map((c) => c.path.length)).toEqual([12, 25, 12, 38, 9, 17]);
    for (const ch of CHAPTERS) {
      const ids = new Set(ch.sections.flatMap((s) => s.challenges.map((x) => x.id)));
      for (const step of ch.path) {
        if (step.kind === "level") expect(ids.has(step.challenge)).toBe(true);
        else {
          for (const p of step.parts) expect(ids.has(p.challenge)).toBe(true);
          expect(step.parts.reduce((n, p) => n + p.count, 0)).toBe(step.questions);
        }
      }
    }
  });

  it("names each level a built challenge's path steps ask, with the same words", () => {
    const built = builtChallenges();
    // Each D session builds more: 1.1.1 is built, whatever else is.
    expect(built.has("1.1.1")).toBe(true);
    for (const ch of CHAPTERS) for (const step of ch.path) {
      if (step.kind !== "level" || !built.has(step.challenge)) continue;
      const level = built.get(step.challenge)!.levels.find((l) => l.id === step.level);
      expect(level?.path).toBe(step.words);
    }
  });
});
