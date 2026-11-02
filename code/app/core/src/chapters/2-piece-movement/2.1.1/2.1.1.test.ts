import { describe, expect, it } from "vitest";
import { apart, seeded } from "../../../random/index.ts";
import { reachOnEmpty } from "../../../reach/index.ts";
import type { Answer, Ask, Did, Level, Square, Told } from "../../../shape/index.ts";
import { CENTRE, challenge, knightSquares, LEVELS, MISTAKES } from "./index.ts";

const level = (id: string): Level => LEVELS.find((l) => l.id === id)!;
const answer = (a: Answer): Did => ({ did: "answer", answer: a });
const clicked = (...squares: Square[]) => answer({ kind: "squares", squares });
const reach = (s: Square) => reachOnEmpty({ side: "white", kind: "knight" }, s);

function play(id: string, knight: Square, did: Did) {
  const it = knightSquares(level(id), knight);
  const ask = it.first() as Ask;
  const told = it.next(did) as Told;
  return { ask, told, done: it.next({ did: "press" }) };
}

describe("2.1.1 Name the knight's squares", () => {
  it("copies the card's level table", () => {
    expect(LEVELS.map((l) => [l.id, ...l.dials.map((d) => d.value), l.seconds, l.questions, l.minutes])).toEqual([
      ["L1", "The knight", "The centre 16", "Click", null, 10, 3],
      ["L2", "The knight", "Any of the 64", "Click", null, 10, 3],
      ["L3", "Nothing", "Any of the 64", "Click", null, 10, 3],
      ["L4", "No board until I reveal it", "Any of the 64", "Click", null, 10, 4],
      ["L5", "No board until I reveal it", "Any of the 64", "Click", 15, 10, 3],
    ]);
    expect(challenge.needs).toBe("1.1.1 L2 and 1.2.1 L1.");
    expect(CENTRE).toHaveLength(16);
    expect(CENTRE.every((s) => reach(s).length === 8)).toBe(true);
  });

  it("plays a whole round at each level, every answer right", () => {
    for (const l of LEVELS) {
      const items = challenge.makeRound(l, seeded(`2.1.1 ${l.id}`), { side: "white", back: [] });
      expect(items).toHaveLength(10);
      let last: Square | null = null;
      for (const it of items) {
        const ask = it.first() as Ask;
        const knight = ask.question.match(/^Which squares can a knight on ([a-h][1-8]) reach\?$/)![1] as Square;
        if (l.id === "L1") expect(CENTRE).toContain(knight);
        if (last) expect(apart(knight, last)).toBe(true);
        last = knight;
        if (l.id === "L4" || l.id === "L5") expect([ask.board, ask.input]).toEqual([null, { how: "click-many", none: null, reveal: { seat: "white", names: false, pieces: [], lit: [] } }]);
        else {
          expect(ask.board!.pieces).toEqual(l.id === "L3" ? [] : [{ side: "white", kind: "knight", square: knight }]);
          expect(ask.input).toEqual({ how: "click-many", none: null });
        }
        expect(ask.seconds).toBe(l.seconds);
        const did = clicked(...[...reach(knight)].reverse());
        expect((it.next(did) as Told).line).toBe(`Right: ${reach(knight).join(", ").replace(/, ([a-h][1-8])$/, " and $1")}.`);
        expect(it.next({ did: "press" })).toEqual({ step: "done", back: null });
      }
    }
  });

  it("tells the card's lines for a knight on e4", () => {
    expect(play("L2", "e4", clicked(...reach("e4"))).told.line).toBe("Right: c3, c5, d2, d6, f2, f6, g3 and g5.");
    const g4 = play("L2", "e4", clicked("c3", "c5", "d2", "d6", "f2", "f6", "g4", "g5")).told;
    expect(g4.line).toBe("No: a knight on e4 reaches c3, c5, d2, d6, f2, f6, g3 and g5. g4 is the rank beside g3.");
    expect(g4.score.mistakes).toEqual(["The rank beside"]);
    const e6 = play("L2", "e4", clicked(...reach("e4"), "e6")).told;
    expect(e6.line).toBe(
      "No: a knight on e4 reaches c3, c5, d2, d6, f2, f6, g3 and g5. e6 is light, like e4: a knight always lands on the other colour.",
    );
    expect(e6.score.mistakes).toEqual(["A square of the knight's own colour"]);
    expect(play("L5", "e4", { did: "timeout" }).told.line).toBe("Too slow. A knight on e4 reaches c3, c5, d2, d6, f2, f6, g3 and g5.");
  });

  // Record line 2-069: a missed square comes back in a round that asks it; a mixed round's 3 leaves the rest.
  it("asks the first of its count of the squares coming back, and the rest wait", () => {
    const back = ["d4", "e5", "c3", "f6", "d5"].map((square) => ({ square }));
    expect(challenge.asks!(level("L4"), { side: "white", count: 3, back: [{ fen: "x" }, ...back] })).toEqual(back.slice(0, 3));
    expect(challenge.asks!(level("L4"), { side: "white", back })).toEqual(back);
    const items = challenge.makeRound(level("L4"), seeded("2.1.1 asks"), { side: "white", count: 3, back });
    expect(items).toHaveLength(3);
    const asked = items.map((i) => (i.first() as Ask).question);
    for (const { square } of back.slice(0, 3)) expect(asked).toContain(`Which squares can a knight on ${square} reach?`);
  });

  it("judges the card's L1 example: d5", () => {
    const right = play("L1", "d5", clicked("b4", "b6", "c3", "c7", "e3", "e7", "f4", "f6"));
    expect(right.ask.board?.pieces).toEqual([{ side: "white", kind: "knight", square: "d5" }]);
    expect(right.told.verdict).toBe("right");
    const { told, done } = play("L1", "d5", clicked("b4", "b6", "c3", "c7", "e3", "e7", "f4", "f5"));
    expect(told.line).toBe("No: a knight on d5 reaches b4, b6, c3, c7, e3, e7, f4 and f6. f5 is the rank beside f6.");
    expect(told.again?.board?.lit).toEqual(reach("d5"));
    expect(done).toEqual({ step: "done", back: { square: "d5" } });
  });

  it("judges the card's L2 example: h7", () => {
    expect(play("L2", "h7", clicked("f6", "f8", "g5")).told.line).toBe("Right: f6, f8 and g5.");
    expect(play("L2", "h7", clicked("f6", "f8", "g5", "h5")).told.line).toBe(
      "No: a knight on h7 reaches f6, f8 and g5. h5 is light, like h7: a knight always lands on the other colour.",
    );
  });

  it("judges the card's L3 example: b1, nothing on the board", () => {
    const { ask, told } = play("L3", "b1", clicked("a3", "c3", "d2"));
    expect([ask.board?.pieces, told.verdict]).toEqual([[], "right"]);
    const wrong = play("L3", "b1", clicked("a3", "c3")).told;
    expect(wrong.line).toBe("No: a knight on b1 reaches a3, c3 and d2. You left out d2.");
    expect(wrong.score.mistakes).toEqual(["A square left out"]);
  });

  it("judges the card's L4 example: g2, on the revealed board", () => {
    expect(play("L4", "g2", clicked("e1", "e3", "f4", "h4")).told.verdict).toBe("right");
    const wrong = play("L4", "g2", clicked("e1", "e3", "f4", "h4", "g3")).told;
    expect(wrong.line).toBe("No: a knight on g2 reaches e1, e3, f4 and h4. g3 is no knight's square: it sits next to g2.");
    expect(wrong.score.mistakes).toEqual(["Another square"]);
  });

  it("judges the card's L5 example: c6, 15 seconds", () => {
    const { ask, told } = play("L5", "c6", clicked("a5", "a7", "b4", "b8", "d4", "d8", "e5", "e7"));
    expect([ask.seconds, told.verdict]).toEqual([15, "right"]);
    const late = play("L5", "c6", { did: "timeout" }).told;
    expect([late.verdict, late.line]).toEqual(["slow", "Too slow. A knight on c6 reaches a5, a7, b4, b8, d4, d8, e5 and e7."]);
  });

  it("names chapter 1's five against a left-out square, then the rest", () => {
    // With g3 left out, for a knight on e4.
    const without = reach("e4").filter((s) => s !== "g3");
    const kind = (s: Square) => play("L2", "e4", clicked(...without, s)).told.score.mistakes;
    expect(kind("f3")).toEqual(["The file beside"]);
    expect(kind("g4")).toEqual(["The rank beside"]);
    expect(kind("b6")).toEqual(["The board turned"]);
    expect(kind("b3")).toEqual(["The files reversed"]);
    expect(kind("g6")).toEqual(["The ranks reversed"]);
    expect(play("L2", "e4", clicked(...reach("e4"), "e5")).told.score.mistakes).toEqual(["Another square"]);
    expect(play("L2", "e4", clicked(...reach("e4"), "a1")).told.line).toMatch(/ a1 is no knight's square\.$/);
    expect(MISTAKES).toEqual([
      "A square left out", "The file beside", "The rank beside", "The board turned", "The files reversed", "The ranks reversed",
      "Too slow", "A square of the knight's own colour", "Another square",
    ]);
  });

  it("brings a missed knight back", () => {
    const items = challenge.makeRound(level("L2"), seeded("back"), { side: "white", back: [{ square: "h7" }] });
    expect(items.map((i) => (i.first() as Ask).question)).toContain("Which squares can a knight on h7 reach?");
    expect(challenge.makeRound(level("L5"), seeded("mixed"), { side: "white", count: 3, back: [] })).toHaveLength(3);
  });
});
