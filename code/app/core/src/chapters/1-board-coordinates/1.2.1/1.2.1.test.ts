import { describe, expect, it } from "vitest";
import { apart, seeded } from "../../../random/index.ts";
import type { Ask, Did, Level, Square, Told } from "../../../shape/index.ts";
import { colourOf } from "../../../squares/index.ts";
import { challenge, LEVELS, MISTAKES, nameTheColour } from "./index.ts";

const level = (id: string): Level => LEVELS.find((l) => l.id === id)!;
const picked = (value: string): Did => ({ did: "answer", answer: { kind: "choice", value } });

function play(id: string, square: Square, did: Did) {
  const it = nameTheColour(level(id), square);
  const ask = it.first() as Ask;
  const told = it.next(did) as Told;
  return { ask, told, done: it.next({ did: "press" }) };
}

describe("1.2.1 Name the colour", () => {
  it("copies the card's level table", () => {
    expect(LEVELS.map((l) => [l.id, l.seconds, l.questions, l.minutes, l.seat])).toEqual([
      ["L1", null, 20, 3, null],
      ["L2", 2, 20, 2, null],
    ]);
    expect(challenge.needs).toBe("Nothing.");
  });

  it("plays a whole round at each level, every answer right", () => {
    for (const l of LEVELS) {
      const items = challenge.makeRound(l, seeded(`1.2.1 ${l.id}`), { side: "white", back: [] });
      expect(items).toHaveLength(20);
      let last: Square | null = null;
      for (const it of items) {
        const ask = it.first() as Ask;
        const square = ask.question.match(/^What colour is ([a-h][1-8])\?$/)![1] as Square;
        if (last) expect(apart(square, last)).toBe(true);
        last = square;
        expect([ask.board, ask.seconds]).toEqual([null, l.seconds]);
        expect(ask.input).toEqual({ how: "choose", choices: [{ words: "Light", value: "light" }, { words: "Dark", value: "dark" }] });
        const told = it.next(picked(colourOf(square))) as Told;
        expect(told.line).toBe(`Right: ${square} is ${colourOf(square)}.`);
        expect(it.next({ did: "press" })).toEqual({ step: "done", back: null });
      }
    }
  });

  // Record line 1-093: a missed square comes back in a round that asks it; a round past its count leaves the rest.
  it("asks the first of its count of the squares coming back, and the rest wait", () => {
    const back = ["a1", "b3", "c5", "d7", "e2", "f4", "g6"].map((square) => ({ square }));
    expect(challenge.asks!(level("L1"), { side: "white", count: 5, back: [{ fen: "x" }, ...back] })).toEqual(back.slice(0, 5));
    expect(challenge.asks!(level("L1"), { side: "white", back })).toEqual(back);
    const items = challenge.makeRound(level("L1"), seeded("1.2.1 asks"), { side: "white", count: 5, back });
    expect(items).toHaveLength(5);
    const shown = items.map((i) => (i.first() as Ask).question);
    for (const { square } of back.slice(0, 5)) expect(shown.some((q) => q.includes(square))).toBe(true);
  });

  it("judges the card's L1 example: f5", () => {
    expect(play("L1", "f5", picked("light")).told.line).toBe("Right: f5 is light.");
    const { told, done } = play("L1", "f5", picked("dark"));
    expect(told.line).toBe("No: f5 is light. f is file 6, and 6 + 5 = 11 is odd.");
    expect(told.score.mistakes).toEqual(["The wrong colour"]);
    expect(done).toEqual({ step: "done", back: { square: "f5" } });
  });

  it("judges the card's L2 example: c7, 2 seconds", () => {
    const { ask, told } = play("L2", "c7", picked("dark"));
    expect([ask.question, ask.seconds, told.verdict]).toEqual(["What colour is c7?", 2, "right"]);
    expect(play("L2", "c7", picked("light")).told.line).toBe("No: c7 is dark. c is file 3, and 3 + 7 = 10 is even.");
  });

  it("tells a pick too slow, with the sum", () => {
    const { told } = play("L2", "f5", { did: "timeout" });
    expect([told.verdict, told.line, told.score.mistakes]).toEqual(["slow", "Too slow. f5 is light: 6 + 5 = 11 is odd.", ["Too slow"]]);
    expect(MISTAKES).toEqual(["The wrong colour", "Too slow"]);
  });

  it("brings a missed square back", () => {
    const items = challenge.makeRound(level("L1"), seeded("back"), { side: "white", back: [{ square: "f5" }] });
    expect(items.map((i) => (i.first() as Ask).question)).toContain("What colour is f5?");
  });
});
