import { describe, expect, it } from "vitest";
import { seeded } from "../../../random/index.ts";
import type { Answer, Ask, Did, Done, Item, Level, Square, Told } from "../../../shape/index.ts";
import { between, lineOf } from "../../../squares/index.ts";
import { challenge, LEVELS, linePair, MISTAKES, pairFact, pairOffFile, pairOffRank, squaresBetween, type Pair } from "./index.ts";

const level = (id: string): Level => LEVELS.find((l) => l.id === id)!;
const answer = (a: Answer): Did => ({ did: "answer", answer: a });
const clicked = (...squares: Square[]) => answer({ kind: "squares", squares });
const none = answer({ kind: "none" });

function play(id: string, pair: Pair, did: Did) {
  const it = squaresBetween(level(id), pair);
  const ask = it.first() as Ask;
  const told = it.next(did) as Told;
  return { ask, told, done: it.next({ did: "press" }) };
}

const QUESTION = /^Which squares lie between ([a-h][1-8]) and ([a-h][1-8]) on their diagonal\?$/;

function pairOf(it: Item): Pair {
  const [, a, b] = (it.first() as Ask).question.match(QUESTION)! as [string, Square, Square];
  return { a, b };
}

const offDiagonal = (p: Pair) => lineOf(p.a, p.b) !== "diagonal";

const round = (l: Level, seed: string, count?: number) => challenge.makeRound(l, seeded(seed), { side: "white", count, back: [] });

// The kind of each pair on no diagonal a round asks, from the facts it brings back when missed.
function kindsOf(items: Item[]) {
  return items.filter((it) => offDiagonal(pairOf(it))).map((it) => {
    const { b } = pairOf(it);
    it.next(clicked("a1"));
    const { reach } = (it.next({ did: "press" }) as Done).back as Pair;
    return !reach ? "line" : reach[1] === b[1] ? "file" : "rank";
  });
}

describe("1.3.1 Name the squares between", () => {
  it("copies the card's level table", () => {
    expect(LEVELS.map((l) => [l.id, ...l.dials.map((d) => d.value), l.questions, l.minutes, l.seconds])).toEqual([
      ["L1", "Both squares lit", "6 of 20", "Click", 20, 6, null],
      ["L2", "Nothing lit", "6 of 20", "Click", 20, 8, null],
      ["L3", "No board until I reveal it", "6 of 20", "Click", 20, 10, null],
    ]);
    expect(challenge.needs).toBe("1.1.1 L2.");
  });

  it("plays a whole round at each level, every answer right, 6 of 20 on no diagonal", () => {
    for (const l of LEVELS) {
      const items = challenge.makeRound(l, seeded(`1.3.1 ${l.id}`), { side: "white", back: [] });
      expect(items).toHaveLength(20);
      let offs = 0;
      for (const it of items) {
        const ask = it.first() as Ask;
        const [, a, b] = ask.question.match(QUESTION)! as [string, Square, Square];
        const on = lineOf(a, b) === "diagonal";
        if (on) expect(between(a, b)!.length).toBeGreaterThanOrEqual(1);
        else offs++;
        if (l.id === "L3") {
          expect(ask.board).toBe(null);
          expect(ask.input).toEqual({ how: "click-many", none: "No diagonal", reveal: { seat: "white", names: false, pieces: [], lit: [] } });
        } else {
          expect(ask.board?.lit).toEqual(l.id === "L2" ? [] : [a, b]);
          expect(ask.input).toEqual({ how: "click-many", none: "No diagonal" });
        }
        const told = it.next(on ? clicked(...between(a, b)!) : none) as Told;
        expect(told.verdict).toBe("right");
        expect(it.next({ did: "press" })).toEqual({ step: "done", back: null });
      }
      expect(offs).toBe(6);
    }
  });

  it("makes 6 of 20 pairs on no diagonal, 2 of each kind, and 2 of 5 in a mixed round's share", () => {
    for (const l of LEVELS) {
      expect(kindsOf(round(l, `kinds ${l.id}`)).sort()).toEqual(["file", "file", "line", "line", "rank", "rank"]);
      expect(kindsOf(round(l, `mixed ${l.id}`, 5))).toHaveLength(2);
    }
  });

  it("makes each kind of pair on no diagonal as the card says", () => {
    const random = seeded("kinds");
    for (let i = 0; i < 200; i++) {
      const file = pairOffFile(random);
      const rank = pairOffRank(random);
      const line = linePair(random);
      for (const p of [file, rank]) {
        expect(lineOf(p.a, p.b)).toBe(null);
        expect(lineOf(p.a, p.reach!)).toBe("diagonal");
        expect(pairFact(p)).toEqual(p);
      }
      expect(file.reach![1]).toBe(file.b[1]);
      expect(rank.reach![0]).toBe(rank.b[0]);
      expect(["file", "rank"]).toContain(lineOf(line.a, line.b));
      expect(between(line.a, line.b)!.length).toBeGreaterThanOrEqual(1);
      expect(pairFact(line)).toEqual(line);
    }
  });

  it("judges the card's L1 example: c4 and f7, both lit", () => {
    const { ask, told } = play("L1", { a: "c4", b: "f7" }, clicked("e6", "d5"));
    expect(ask.question).toBe("Which squares lie between c4 and f7 on their diagonal?");
    expect(ask.board?.lit).toEqual(["c4", "f7"]);
    expect(told.line).toBe("Right: d5 and e6.");
    const wrong = play("L1", { a: "c4", b: "f7" }, clicked("d5"));
    expect(wrong.told.line).toBe("No: between c4 and f7 lie d5 and e6. You left out e6.");
    expect(wrong.told.score.mistakes).toEqual(["A square left out"]);
    expect(wrong.told.again?.board?.lit).toEqual(["c4", "f7", "d5", "e6"]);
    expect(wrong.done).toEqual({ step: "done", back: { a: "c4", b: "f7" } });
  });

  it("tells a pair on no diagonal by counting, and lights only its two squares", () => {
    const moved: Pair = { a: "c4", b: "e7", reach: "f7" };
    expect(play("L1", moved, none).told.line).toBe("Right: c4 and e7 share no diagonal.");
    const { told, done } = play("L1", moved, clicked("d5", "e6", "f7"));
    expect(told.line).toBe("No: c4 and e7 share no diagonal. They sit 2 files and 3 ranks apart; a diagonal needs both equal.");
    expect(told.score.mistakes).toEqual(["A diagonal that is not there"]);
    expect(told.again?.board?.lit).toEqual(["c4", "e7"]);
    expect(done).toEqual({ step: "done", back: { a: "c4", b: "e7", reach: "f7" } });
    // One file or rank over, the count reads in the singular.
    expect(play("L1", { a: "c4", b: "d6", reach: "e6" }, clicked("d5")).told.line).toBe(
      "No: c4 and d6 share no diagonal. They sit 1 file and 2 ranks apart; a diagonal needs both equal.",
    );
    const file = play("L2", { a: "c4", b: "c7" }, clicked("c5", "c6"));
    expect(file.told.line).toBe("No: c4 and c7 share a file, not a diagonal.");
    expect(file.told.again?.board?.lit).toEqual(["c4", "c7"]);
    expect(file.done).toEqual({ step: "done", back: { a: "c4", b: "c7" } });
    expect(play("L2", { a: "a1", b: "e1" }, clicked("b1")).told.line).toBe("No: a1 and e1 share a rank, not a diagonal.");
    expect(play("L2", { a: "a1", b: "e1" }, none).told.line).toBe("Right: a1 and e1 share no diagonal.");
  });

  it("judges the card's L2 example: h3 and e6, nothing lit", () => {
    const { ask, told } = play("L2", { a: "h3", b: "e6" }, clicked("g4", "f5"));
    expect(ask.board?.lit).toEqual([]);
    expect(told.verdict).toBe("right");
    const wrong = play("L2", { a: "h3", b: "e6" }, clicked("g4", "f6")).told;
    expect(wrong.line).toBe("No: between h3 and e6 lie g4 and f5. You left out f5, and f6 is off the diagonal.");
    expect(wrong.score.mistakes).toEqual(["A square left out", "A square off the diagonal"]);
  });

  it("judges the card's L3 example: a1 and e5, no board until revealed", () => {
    const { ask, told } = play("L3", { a: "a1", b: "e5" }, clicked("b2", "c3", "d4"));
    expect([ask.board, told.line]).toEqual([null, "Right: b2, c3 and d4."]);
    const wrong = play("L3", { a: "a1", b: "e5" }, clicked("b2", "c3")).told;
    expect(wrong.line).toBe("No: between a1 and e5 lie b2, c3 and d4. You left out d4.");
    // The board shows lit once told, revealed or not.
    expect(wrong.again?.board?.lit).toEqual(["a1", "e5", "b2", "c3", "d4"]);
  });

  it("names each of the card's mistakes", () => {
    expect(play("L1", { a: "c4", b: "f7" }, clicked("d5", "e6", "d6")).told).toMatchObject({
      line: "No: between c4 and f7 lie d5 and e6. d6 is off the diagonal.",
      score: { mistakes: ["A square off the diagonal"] },
    });
    expect(play("L1", { a: "c4", b: "e7", reach: "f7" }, clicked("d5")).told).toMatchObject({
      score: { mistakes: ["A diagonal that is not there"] },
    });
    expect(play("L1", { a: "c4", b: "f7" }, none).told).toMatchObject({
      line: "No: between c4 and f7 lie d5 and e6.",
      score: { mistakes: ["A diagonal missed"] },
    });
    // A square past the pair, on its own line, is not between them.
    expect(play("L1", { a: "c4", b: "f7" }, clicked("d5", "e6", "g8")).told.line).toBe(
      "No: between c4 and f7 lie d5 and e6. g8 is not between them.",
    );
    expect(MISTAKES).toEqual(["A square left out", "A square off the diagonal", "A diagonal that is not there", "A diagonal missed"]);
  });

  // Record line 1-122: a missed pair comes back in a round that asks it; a round past its count leaves the rest.
  it("asks the first of its count of the pairs coming back, and the rest wait", () => {
    const back = [{ a: "c4", b: "f7" }, { a: "a1", b: "d4" }, { a: "b1", b: "e4" }, { a: "h1", b: "e4" }, { a: "a3", b: "d6" }, { a: "c1", b: "g5" }, { a: "d1", b: "h5" }];
    for (const f of back) expect(pairFact(f), `${f.a} ${f.b}`).not.toBe(null);
    expect(challenge.asks!(level("L3"), { side: "white", count: 5, back: [{ square: "c4" }, ...back] })).toEqual(back.slice(0, 5));
    expect(challenge.asks!(level("L3"), { side: "white", back })).toEqual(back);
    const items = challenge.makeRound(level("L3"), seeded("1.3.1 asks"), { side: "white", count: 5, back });
    expect(items).toHaveLength(5);
    const asked = items.map((i) => (i.first() as Ask).question);
    for (const f of back.slice(0, 5)) expect(asked).toContain(`Which squares lie between ${f.a} and ${f.b} on their diagonal?`);
  });

  it("brings a missed pair back, and passes over anything else", () => {
    expect(pairFact({ a: "c4", b: "f7" })).toEqual({ a: "c4", b: "f7" });
    expect(pairFact({ a: "c4", b: "c7" })).toEqual({ a: "c4", b: "c7" });
    expect(pairFact({ a: "a1", b: "e1" })).toEqual({ a: "a1", b: "e1" });
    expect(pairFact({ a: "c4", b: "e7", reach: "f7" })).toEqual({ a: "c4", b: "e7", reach: "f7" });
    expect(pairFact({ a: "c4", b: "e7", reach: "e6" })).toEqual({ a: "c4", b: "e7", reach: "e6" });
    expect(pairFact({ a: "c4", b: "e7", reach: "d5" })).toBe(null);
    expect(pairFact({ a: "c4", b: "d5" })).toBe(null);
    expect(pairFact({ a: "c4", b: "e7" })).toBe(null);
    expect(pairFact({ square: "c4" })).toBe(null);
    const items = challenge.makeRound(level("L1"), seeded("back"), { side: "white", back: [{ a: "c1", b: "g4", reach: "f4" }, { a: "c4", b: "c7" }] });
    const asked = items.map((i) => (i.first() as Ask).question);
    expect(asked).toContain("Which squares lie between c1 and g4 on their diagonal?");
    expect(asked).toContain("Which squares lie between c4 and c7 on their diagonal?");
    // The pairs back on no diagonal count toward the 6.
    expect(items.map(pairOf).filter(offDiagonal)).toHaveLength(6);
    expect(challenge.makeRound(level("L3"), seeded("mixed"), { side: "white", count: 5, back: [] })).toHaveLength(5);
  });
});
