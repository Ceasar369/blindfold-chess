import { describe, expect, it } from "vitest";
import { apart, seeded } from "../../../random/index.ts";
import type { Ask, Did, Item, Level, Square, Step, Told } from "../../../shape/index.ts";
import { SQUARES } from "../../../squares/index.ts";
import { blocksHolding, challenge, fourChoices, LEVELS, MISTAKES, nameTheSquare } from "./index.ts";

const level = (id: string): Level => LEVELS.find((l) => l.id === id)!;
// A file, then a rank, on the keypad.
const keyed = (square: string): Did => ({ did: "answer", answer: { kind: "squares", squares: [square as Square] } });
const picked = (value: string): Did => ({ did: "answer", answer: { kind: "choice", value } });
const item = (id: string, square: Square) => nameTheSquare(level(id), square, seeded(square));

// Plays one item: its Ask, then what I did, then Done.
function play(it: Item, did: Did): { ask: Ask; told: Told; done: Step } {
  const ask = it.first() as Ask;
  const told = it.next(did) as Told;
  const done = it.next({ did: "press" });
  return { ask, told, done };
}

describe("1.1.2 Name the square", () => {
  it("copies the card's level table", () => {
    expect(LEVELS.map((l) => [l.id, l.seat, l.dials[0]!.value, l.seconds, l.questions, l.minutes])).toEqual([
      ["L1", "white", "Pick one of four", null, 20, 3],
      ["L2", "white", "Square keypad", null, 20, 4],
      ["L3", "white", "Square keypad", 5, 20, 3],
    ]);
    expect(challenge.needs).toBe("1.1.1 L2.");
  });

  it("plays a whole round at each level, every answer right", () => {
    for (const l of LEVELS) {
      const items = challenge.makeRound(l, seeded(`1.1.2 ${l.id}`), { side: "white", back: [] });
      expect(items).toHaveLength(20);
      let last: Square | null = null;
      for (const it of items) {
        const ask = it.first() as Ask;
        expect(ask.question).toBe("Which square is lit?");
        const square = ask.board!.lit[0]!;
        expect(ask.board).toEqual({ seat: l.seat, names: false, pieces: [], lit: [square] });
        if (last) expect(apart(square, last)).toBe(true);
        last = square;
        expect(ask.seconds).toBe(l.seconds);
        const did = l.id === "L1" ? picked(square) : keyed(square);
        if (l.id === "L1") expect(ask.input).toMatchObject({ how: "choose" });
        else expect(ask.input).toEqual({ how: "keypad", many: "one", none: null });
        const told = it.next(did) as Told;
        expect(told.line).toBe(`Right: ${square}.`);
        expect(it.next({ did: "press" })).toEqual({ step: "done", back: null });
      }
    }
  });

  it("offers L1's four: a 2×2 block holding the lit square, at random, shuffled", () => {
    expect(blocksHolding("b3")).toEqual([["b3", "c3", "b4", "c4"], ["a3", "b3", "a4", "b4"], ["b2", "c2", "b3", "c3"], ["a2", "b2", "a3", "b3"]]);
    expect(blocksHolding("h8")).toEqual([["g7", "h7", "g8", "h8"]]);
    expect(blocksHolding("a5")).toEqual([["a5", "b5", "a6", "b6"], ["a4", "b4", "a5", "b5"]]);
    for (const square of SQUARES) {
      const drawn = new Set(Array.from({ length: 40 }, (_, i) => fourChoices(square, seeded(`${square} ${i}`)).join(" ")));
      expect([...drawn].sort(), square).toEqual(blocksHolding(square).map((b) => b.join(" ")).sort());
    }
    const ask = item("L1", "b3").first() as Ask;
    const shown = ask.input.how === "choose" ? ask.input.choices.map((c) => c.value).sort() : [];
    expect(blocksHolding("b3").map((b) => [...b].sort())).toContainEqual(shown);
  });

  // For each four names, the best guess is the square lit most often behind them.
  it("lets no guess from L1's four names alone beat 1 in 3, over all 64 squares", () => {
    const behind = new Map<string, Map<Square, number>>();
    for (const square of SQUARES) {
      const blocks = blocksHolding(square);
      for (const block of blocks) {
        const names = [...block].sort().join(" ");
        const lit = behind.get(names) ?? new Map<Square, number>();
        lit.set(square, (lit.get(square) ?? 0) + 1 / blocks.length / 64);
        behind.set(names, lit);
      }
    }
    const best = [...behind.values()].reduce((sum, lit) => sum + Math.max(...lit.values()), 0);
    expect(best).toBeLessThanOrEqual(1 / 3);
  });

  // Record line 1-069: a missed square comes back in a round that asks it; a round past its count leaves the rest.
  it("asks the first of its count of the squares coming back, and the rest wait", () => {
    const back = ["a1", "b3", "c5", "d7", "e2", "f4", "g6"].map((square) => ({ square }));
    expect(challenge.asks!(level("L2"), { side: "white", count: 5, back: [{ fen: "x" }, ...back] })).toEqual(back.slice(0, 5));
    expect(challenge.asks!(level("L2"), { side: "white", back })).toEqual(back);
    const items = challenge.makeRound(level("L2"), seeded("1.1.2 asks"), { side: "white", count: 5, back });
    expect(items).toHaveLength(5);
    const lit = items.map((i) => (i.first() as Ask).board!.lit[0]);
    for (const { square } of back.slice(0, 5)) expect(lit).toContain(square);
  });

  it("judges the card's L1 example: b3, from four", () => {
    expect(play(item("L1", "b3"), picked("b3")).told.line).toBe("Right: b3.");
    const { told, done } = play(item("L1", "b3"), picked("c3"));
    expect(told.line).toBe("No: it is b3. c3 is the file beside.");
    expect(told.score.mistakes).toEqual(["The file beside"]);
    expect(done).toEqual({ step: "done", back: { square: "b3" } });
    // The block's diagonal neighbour has no name of its own.
    const diagonal = play(item("L1", "b3"), picked("c4")).told;
    expect([diagonal.line, diagonal.score.mistakes]).toEqual(["No: it is b3.", ["Another square"]]);
  });

  it("judges the card's L2 example: e5, on the keypad", () => {
    expect(play(item("L2", "e5"), keyed("e5")).told.verdict).toBe("right");
    const { told } = play(item("L2", "e5"), keyed("e6"));
    expect(told.line).toBe("No: it is e5. e6 is the rank beside.");
    expect(told.score.mistakes).toEqual(["The rank beside"]);
  });

  it("judges the card's L3 example: g2, 5 seconds", () => {
    const { ask, told } = play(item("L3", "g2"), keyed("g2"));
    expect(ask.seconds).toBe(5);
    expect(told.verdict).toBe("right");
    expect(play(item("L3", "g2"), keyed("g7")).told.line).toBe("No: it is g2. g7 is the ranks reversed.");
    const late = play(item("L3", "g2"), { did: "timeout" }).told;
    expect([late.verdict, late.line, late.score.mistakes]).toEqual(["slow", "Too slow. It is g2.", ["Too slow"]]);
  });

  it("names the card's b3 mistakes, and another square", () => {
    const wrong = (s: string) => play(item("L2", "b3"), keyed(s)).told.score.mistakes;
    expect(wrong("c3")).toEqual(["The file beside"]);
    expect(wrong("b4")).toEqual(["The rank beside"]);
    expect(wrong("g6")).toEqual(["The board turned"]);
    expect(wrong("g3")).toEqual(["The files reversed"]);
    expect(wrong("b6")).toEqual(["The ranks reversed"]);
    expect(wrong("e1")).toEqual(["Another square"]);
    expect(play(item("L2", "b3"), keyed("e1")).told.line).toBe("No: it is b3.");
    expect(MISTAKES).toEqual([
      "The file beside", "The rank beside", "The board turned", "The files reversed", "The ranks reversed", "Too slow", "Another square",
    ]);
  });

  it("brings a missed square back, and asks a mixed round's count", () => {
    const items = challenge.makeRound(level("L2"), seeded("back"), { side: "white", back: [{ square: "b3" }, { square: "z9" }] });
    expect(items.map((i) => (i.first() as Ask).board!.lit[0])).toContain("b3");
    expect(challenge.makeRound(level("L3"), seeded("mixed"), { side: "white", count: 5, back: [] })).toHaveLength(5);
  });
});
