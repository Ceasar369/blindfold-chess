import { describe, expect, it } from "vitest";
import { apart, seeded } from "../../../random/index.ts";
import type { Ask, Did, Item, Level, Square, Step, Told } from "../../../shape/index.ts";
import { challenge, findTheSquare, LEVELS, MISTAKES } from "./index.ts";

const level = (id: string): Level => LEVELS.find((l) => l.id === id)!;
const click = (square: Square): Did => ({ did: "answer", answer: { kind: "squares", squares: [square] } });

// Plays one item: its Ask, then what I did, then Done.
function play(item: Item, did: Did): { ask: Ask; told: Told; done: Step } {
  const ask = item.first() as Ask;
  const told = item.next(did) as Told;
  const done = item.next({ did: "press" });
  return { ask, told, done };
}

describe("1.1.1 Find the square", () => {
  it("copies the card's level table", () => {
    expect(LEVELS.map((l) => [l.id, l.seat, l.dials[0]!.value, l.seconds, l.questions, l.minutes])).toEqual([
      ["L1", "white", "Yes", null, 20, 3],
      ["L2", "white", "No", null, 20, 3],
      ["L3", "white", "No", 2, 20, 2],
    ]);
    expect(challenge.needs).toBe("Nothing.");
  });

  it("plays a whole round at each level, every answer right", () => {
    for (const l of LEVELS) {
      const items = challenge.makeRound(l, seeded(`1.1.1 ${l.id}`), { side: "white", back: [] });
      expect(items).toHaveLength(20);
      let last: Square | null = null;
      for (const item of items) {
        const ask = item.first() as Ask;
        expect(ask.step).toBe("ask");
        const square = ask.question.match(/^Find ([a-h][1-8])\.$/)![1] as Square;
        if (last) expect(apart(square, last)).toBe(true);
        last = square;
        expect(ask.board).toEqual({ seat: l.seat, names: l.id === "L1", pieces: [], lit: [] });
        expect(ask.seconds).toBe(l.seconds);
        expect(ask.input).toEqual({ how: "click-one" });
        const told = item.next(click(square)) as Told;
        expect(told.verdict).toBe("right");
        expect(told.line).toBe(`Right: ${square}.`);
        expect(item.next({ did: "press" })).toEqual({ step: "done", back: null });
      }
    }
  });

  // Record line 1-036: a missed square comes back in a round that asks it; a round past its count leaves the rest.
  it("asks the first of its count of the squares coming back, and the rest wait", () => {
    const back = ["a1", "b3", "c5", "d7", "e2", "f4", "g6"].map((square) => ({ square }));
    expect(challenge.asks!(level("L1"), { side: "white", count: 5, back: [{ fen: "x" }, ...back] })).toEqual(back.slice(0, 5));
    expect(challenge.asks!(level("L1"), { side: "white", back })).toEqual(back);
    const items = challenge.makeRound(level("L1"), seeded("1.1.1 asks"), { side: "white", count: 5, back });
    expect(items).toHaveLength(5);
    const shown = items.map((i) => (i.first() as Ask).question);
    for (const { square } of back.slice(0, 5)) expect(shown).toContain(`Find ${square}.`);
  });

  it("judges the card's L1 example: g3", () => {
    expect(play(findTheSquare(level("L1"), "g3"), click("g3")).told.line).toBe("Right: g3.");
    const { told, done } = play(findTheSquare(level("L1"), "g3"), click("g4"));
    expect(told.line).toBe("No: that is g4, the rank beside. g3 is lit.");
    expect(told.score.mistakes).toEqual(["The rank beside"]);
    expect(told.again?.board?.lit).toEqual(["g3"]);
    expect(done).toEqual({ step: "done", back: { square: "g3" } });
  });

  it("judges the card's L2 example: b6", () => {
    expect(play(findTheSquare(level("L2"), "b6"), click("b6")).told.verdict).toBe("right");
    const { told } = play(findTheSquare(level("L2"), "b6"), click("c6"));
    expect(told.line).toBe("No: that is c6, the file beside. b6 is lit.");
    expect(told.score.mistakes).toEqual(["The file beside"]);
  });

  it("judges the card's L3 example: e2, too slow", () => {
    const { ask, told, done } = play(findTheSquare(level("L3"), "e2"), { did: "timeout" });
    expect(ask.question).toBe("Find e2.");
    expect(ask.seconds).toBe(2);
    expect(told.verdict).toBe("slow");
    expect(told.line).toBe("Too slow. e2 is lit.");
    expect(told.score.mistakes).toEqual(["Too slow"]);
    expect(done).toEqual({ step: "done", back: { square: "e2" } });
  });

  it("names the card's f6 mistakes, and another square", () => {
    const wrong = (s: Square) => play(findTheSquare(level("L2"), "f6"), click(s)).told;
    expect(wrong("e6").line).toBe("No: that is e6, the file beside. f6 is lit.");
    expect(wrong("f5").score.mistakes).toEqual(["The rank beside"]);
    expect(wrong("c3").score.mistakes).toEqual(["The board turned"]);
    expect(wrong("c6").score.mistakes).toEqual(["The files reversed"]);
    expect(wrong("f3").score.mistakes).toEqual(["The ranks reversed"]);
    expect(wrong("a1").score.mistakes).toEqual(["Another square"]);
    expect(wrong("a1").line).toBe("No: that is a1. f6 is lit.");
    expect(MISTAKES).toEqual([
      "The file beside", "The rank beside", "The board turned", "The files reversed", "The ranks reversed", "Too slow", "Another square",
    ]);
  });

  it("brings a missed square back among the round's", () => {
    const items = challenge.makeRound(level("L2"), seeded("back"), { side: "white", back: [{ square: "f6" }, { square: "nonsense" }, 7] });
    const asked = items.map((i) => (i.first() as Ask).question);
    expect(asked).toHaveLength(20);
    expect(asked).toContain("Find f6.");
  });

  it("asks 20 different squares a round, those coming back included", () => {
    const back = ["f6", "c3", "a1"].map((square) => ({ square }));
    for (let n = 0; n < 200; n++) {
      const asked = challenge.makeRound(level("L2"), seeded(`different ${n}`), { side: "white", back }).map((i) => (i.first() as Ask).question);
      expect(new Set(asked).size).toBe(20);
    }
  });

  it("asks a mixed round's count", () => {
    expect(challenge.makeRound(level("L3"), seeded("mixed"), { side: "white", count: 5, back: [] })).toHaveLength(5);
  });

  it("gives one seed one round", () => {
    const qs = (seed: string) => challenge.makeRound(level("L1"), seeded(seed), { side: "white", back: [] }).map((i) => (i.first() as Ask).question);
    expect(qs("same")).toEqual(qs("same"));
    expect(qs("same")).not.toEqual(qs("other"));
  });
});
