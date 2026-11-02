import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { besidesKings, fromFen, fromWords, inWords, standsWords, startingPosition, THIRTEEN, toFen } from "../../../positions/index.ts";
import { seeded } from "../../../random/index.ts";
import type { Ask, Did, Done, Facts, Item, Level, Show, Square, Step, Told } from "../../../shape/index.ts";
import { askedOf, atTheStart, CHOICES, challenge, judgeStands, LEVELS, MISTAKES, namePositions, type Asked } from "./index.ts";

// The positions pack, as the site fetches it and hands it in.
const PACKS = { "positions.json": JSON.parse(readFileSync(join(import.meta.dirname, "..", "..", "..", "..", "packs", "positions.json"), "utf8")) };

const level = (id: string): Level => LEVELS.find((l) => l.id === id)!;
const choose = (value: string): Did => ({ did: "answer", answer: { kind: "choice", value } });
const press: Did = { did: "press" };

const asked = (words: string, from: string, squares: Square[]): Asked => ({ fen: toFen(fromWords(words)), from, squares });

// The card's example positions, each asked its example square among five.
const L2 = asked(
  "White: king a5, rook d4, knight f5. Black: king e6, pawns f6 and h5.",
  "From a Lichess game of January 2013, players rated 1415 and 1500, after White's 46th move.",
  ["f6", "d4", "h5", "e5", "g6"],
);
const L3 = asked(
  "White: king g2, rooks a4 and b6, pawns f2 and g3. Black: king g8, rook b7, pawns a5 and g5.",
  "From a Lichess game of January 2013, players rated 1413 and 1409, after White's 40th move.",
  ["b7", "a4", "g5", "c7", "h8"],
);
const L4 = asked(
  "White: king g3, bishop a6, pawns f3 and h3. Black: king g7, rook d6, pawns f7, g6 and h7.",
  "From a Lichess game of January 2013, players rated 1252 and 1322, after Black's 33rd move.",
  ["g6", "d6", "a6", "e5", "f6"],
);
const L5 = asked(
  "White: king d3, rook h6, pawns c2, g2 and h2. Black: king d6, rook a6, pawns c5 and g6.",
  "From a Lichess game of January 2013, players rated 1402 and 1322, after Black's 43rd move.",
  ["h5", "c2", "a6", "c4", "g6"],
);

// Plays a position's item: the Show, Hide, then each question answered.
function playPosition(item: Item, answers: Did[]): { show: Show; asks: Ask[]; tolds: Told[]; done: Step } {
  const show = item.first() as Show;
  const asks: Ask[] = [];
  const tolds: Told[] = [];
  let step = item.next(press);
  for (const a of answers) {
    asks.push(step as Ask);
    tolds.push(item.next(a) as Told);
    step = item.next(press);
  }
  return { show, asks, tolds, done: step };
}

const at = (a: Asked) => fromFen(a.fen);
const judge = (a: Asked, square: Square, text: string) => {
  const named = text === "Empty" ? null : CHOICES.find((c) => c.words === text)!.value;
  return judgeStands(at(a), square, named === null ? null : { side: named.split("-")[0] as "white", kind: named.split("-")[1] as "pawn" });
};

describe("4.1.1 Name what stands there", () => {
  it("copies the card's level table", () => {
    expect(LEVELS.map((l) => [l.id, l.seat, l.questions, l.minutes, l.dials.map((d) => d.value).join(" | ")])).toEqual([
      ["L1", null, 20, 3, "The starting position, no look | 30 | An empty board, the square lit | Piece picker"],
      ["L2", null, 20, 4, "Real, on a board, until I hide it | 4 | An empty board, the square lit | Piece picker"],
      ["L3", null, 20, 5, "Real, on a board, until I hide it | 7 | An empty board, the square lit | Piece picker"],
      ["L4", null, 20, 5, "Real, on a board, until I hide it | 7 | No board, the square named | Piece picker"],
      ["L5", null, 20, 5, "Real, in words, until I hide them | 7 | No board, the square named | Piece picker"],
    ]);
    expect(LEVELS[0]!.passMark).toBe("Pass mark for 4.1.1 L1 to L5: the right answers in one round, and my average look time. My practice sets it.");
    expect(CHOICES.map((c) => c.words)).toEqual([
      "White's king", "White's queen", "White's rook", "White's bishop", "White's knight", "White's pawn",
      "Black's king", "Black's queen", "Black's rook", "Black's bishop", "Black's knight", "Black's pawn", "Empty",
    ]);
  });

  it("judges the card's L1 example: c8 at the start, on a board facing White", () => {
    const item = atTheStart(level("L1"), "c8");
    const ask = item.first() as Ask;
    expect(ask.question).toBe("At the start, what stands on c8?");
    expect(ask.board).toEqual({ seat: "white", names: false, pieces: [], lit: ["c8"] });
    expect(ask.input).toEqual({ how: "choose", choices: CHOICES });
    expect(item.next(choose("black-bishop"))).toMatchObject({ verdict: "right", line: "Right: Black's bishop stands on c8." });
    expect(item.next(press)).toEqual({ step: "done", back: null });
    const wrong = atTheStart(level("L1"), "c8");
    wrong.first();
    expect(wrong.next(choose("black-knight"))).toMatchObject({
      verdict: "wrong",
      line: "No: Black's bishop stands on c8. Black's knight stands on b8, the file beside.",
      score: { mistakes: ["The file beside"] },
    });
    expect(wrong.next(press)).toEqual({ step: "done", back: { square: "c8" } });
  });

  it("judges the card's L2 example: f6, picked from 13", () => {
    const right = playPosition(namePositions(level("L2"), L2), [choose("black-pawn"), choose("white-rook"), choose("black-pawn"), choose("empty"), choose("empty")]);
    expect(right.show).toMatchObject({ step: "show", button: "Hide", time: "look", lines: [L2.from], board: { seat: "white", names: false, lit: [] } });
    expect(right.show.board!.pieces).toHaveLength(6);
    expect(right.asks[0]).toMatchObject({ question: "What stands on f6?", board: { seat: "white", pieces: [], lit: ["f6"] } });
    expect(right.tolds.map((t) => t.verdict)).toEqual(["right", "right", "right", "right", "right"]);
    expect(right.tolds[0]!.line).toBe("Right: Black's pawn stands on f6.");
    expect(right.done).toEqual({ step: "done", back: null });
    const wrong = playPosition(namePositions(level("L2"), L2), [choose("white-knight"), choose("white-rook"), choose("black-pawn"), choose("empty"), choose("empty")]);
    expect(wrong.tolds[0]).toMatchObject({ verdict: "wrong", line: "No: Black's pawn stands on f6. White's knight stands on f5, the rank beside.", score: { mistakes: ["The rank beside"] } });
    // The position comes back mirrored, asking the mirrored squares: f6 as c6.
    const back = askedOf((wrong.done as Done).back)!;
    expect(inWords(fromFen(back.fen))).toBe("White: king h5, rook e4, knight c5. Black: king d6, pawns a5 and c6.");
    expect(back.squares[0]).toBe("c6");
    expect(back.from).toBe("Mirrored, a to h, from a Lichess game of January 2013, players rated 1415 and 1500, after White's 46th move.");
  });

  it("judges the card's L3 example: b7, picked from 13", () => {
    const item = namePositions(level("L3"), L3);
    item.first();
    const ask = item.next(press) as Ask;
    expect(ask).toMatchObject({ question: "What stands on b7?", board: { seat: "white", lit: ["b7"] } });
    expect(ask.input).toEqual({ how: "choose", choices: CHOICES });
    expect(item.next(choose("black-rook"))).toMatchObject({ verdict: "right" });
    const wrong = namePositions(level("L3"), L3);
    wrong.first();
    wrong.next(press);
    expect(wrong.next(choose("white-rook"))).toMatchObject({ line: "No: Black's rook stands on b7. White's rook stands on b6, the rank beside." });
  });

  it("judges the card's L4 example: g6, no board once it hides", () => {
    const item = namePositions(level("L4"), L4);
    expect((item.first() as Show).board?.pieces).toHaveLength(9);
    const ask = item.next(press) as Ask;
    expect(ask).toMatchObject({ question: "What stands on g6?", board: null });
    expect(ask.input).toEqual({ how: "choose", choices: CHOICES });
    expect(item.next(choose("black-pawn"))).toMatchObject({ verdict: "right" });
    const wrong = namePositions(level("L4"), L4);
    wrong.first();
    wrong.next(press);
    expect(wrong.next(choose("empty"))).toMatchObject({ line: "No: Black's pawn stands on g6. You left it out.", score: { mistakes: ["A piece left out"] } });
  });

  it("judges the card's L5 example: h5, read in words", () => {
    const item = namePositions(level("L5"), L5);
    const show = item.first() as Show;
    expect(show.board).toBeUndefined();
    expect(show.words).toBe("White: king d3, rook h6, pawns c2, g2 and h2. Black: king d6, rook a6, pawns c5 and g6.");
    expect(item.next(press)).toMatchObject({ question: "What stands on h5?", board: null, input: { how: "choose", choices: CHOICES } });
    expect(item.next(choose("empty"))).toMatchObject({ verdict: "right", line: "Right: h5 is empty." });
    const wrong = namePositions(level("L5"), L5);
    wrong.first();
    wrong.next(press);
    expect(wrong.next(choose("white-rook"))).toMatchObject({ line: "No: h5 is empty. White's rook stands on h6, the rank beside." });
  });

  it("names each mistake on the card", () => {
    expect(judge(L4, "f7", "Black's king").mistakes).toEqual(["The file beside"]);
    expect(judge(L4, "g6", "Black's king").mistakes).toEqual(["The rank beside"]);
    expect(judge(L4, "a6", "White's pawn").mistakes).toEqual(["The board turned"]);
    expect(judge(L4, "g6", "White's king").mistakes).toEqual(["The ranks reversed"]);
    expect(judge(L2, "h5", "White's king").mistakes).toEqual(["The files reversed"]);
    expect(judge(L4, "g6", "Empty").mistakes).toEqual(["A piece left out"]);
    expect(judge(L4, "f7", "White's pawn").mistakes).toEqual(["The wrong side"]);
    expect(judge(L4, "d6", "Black's bishop").mistakes).toEqual(["The wrong piece"]);
    expect(judge(L4, "e5", "Black's pawn").mistakes).toEqual(["A piece where nothing stands"]);
    expect(judge(L4, "g6", "White's queen").mistakes).toEqual(["Another answer"]);
    expect(MISTAKES).toEqual([
      "The file beside", "The rank beside", "The board turned", "The files reversed", "The ranks reversed",
      "A piece left out", "The wrong side", "The wrong piece", "A piece where nothing stands", "Another answer",
    ]);
  });

  // Record line 4-075: at L1 a missed square comes back only in an L1 round, each once, the first of its count.
  it("asks a square at L1 alone, the first of its count, and a position waits for L2", () => {
    const squares = ["c8", "a1", "h4", "e2"].map((square) => ({ square }));
    const back: Facts[] = [{ ...L2 }, ...squares, "junk"];
    expect(challenge.asks!(level("L1"), { side: "white", count: 3, back })).toEqual(squares.slice(0, 3));
    expect(challenge.asks!(level("L1"), { side: "white", back })).toEqual(squares);
    // A round of 20 asks every one of 4; the position, asked from L2, is not asked here.
    const items = challenge.makeRound(level("L1"), seeded("4.1.1 asks L1"), { side: "white", back, packs: PACKS });
    const asked = items.map((i) => (i.first() as Ask).question.match(/on ([a-h][1-8])\?$/)![1]);
    for (const { square } of squares) expect(asked).toContain(square);
    // From L2 a square waits: no position, nothing asked.
    for (const id of ["L2", "L3", "L4", "L5"]) expect(challenge.asks!(level(id), { side: "white", back: squares }), id).toEqual([]);
  });

  // Record line 4-076: from L2 a missed position comes back, the first of its 4 a round; an L1 round leaves it.
  it("asks a position from L2 alone, the first 4 of its round, and a square waits for L1", () => {
    const positions = Array.from({ length: 6 }, (_, i) => ({ ...L2, from: `Position ${i}.` }));
    const back: Facts[] = [{ square: "c8" }, ...positions, { fen: "junk" }];
    for (const id of ["L2", "L3", "L4", "L5"]) expect(challenge.asks!(level(id), { side: "white", back }), id).toEqual(positions.slice(0, 4));
    expect(challenge.asks!(level("L2"), { side: "white", count: 5, back })).toEqual(positions.slice(0, 1));
    expect(challenge.asks!(level("L1"), { side: "white", back: positions })).toEqual([]);
    // What it says it asks is what it makes: four of them, among the round's four.
    const shown = challenge.makeRound(level("L2"), seeded("4.1.1 asks L2"), { side: "white", back, packs: PACKS }).map((i) => (i.first() as Show).lines![0]);
    expect(shown).toEqual(expect.arrayContaining(positions.slice(0, 4).map((p) => p.from)));
    expect(shown).not.toContain("Position 4.");
    expect(shown).not.toContain("Position 5.");
  });

  it("asks L1's 20 squares: 16 holding a piece, 4 empty of ranks 3 to 6, none twice", () => {
    const items = challenge.makeRound(level("L1"), seeded("4.1.1 L1"), { side: "black", back: [{ square: "c8" }, "junk"], packs: PACKS });
    expect(items).toHaveLength(20);
    const squares = items.map((i) => (i.first() as Ask).question.match(/on ([a-h][1-8])\?$/)![1] as Square);
    expect(new Set(squares).size).toBe(20);
    expect(squares).toContain("c8");
    const start = startingPosition();
    expect(squares.filter((s) => start.board[s]).length).toBe(16);
    for (const s of squares.filter((x) => !start.board[x])) expect("3456").toContain(s[1]);
    // The round drew Black, and no board turns for it.
    for (const i of items) expect((i.first() as Ask).board?.seat).toBe("white");
  });

  it("asks 4 real positions from L2, 5 squares each: 3 holding a piece, a pawn among them, 2 empty next to a piece", () => {
    for (const id of ["L2", "L3", "L4", "L5"]) {
      const items = challenge.makeRound(level(id), seeded(`4.1.1 ${id}`), { side: "white", back: [], packs: PACKS });
      expect(items).toHaveLength(4);
      expect(items.reduce((n, i) => n + i.questions, 0)).toBe(20);
      for (const item of items) {
        const show = item.first() as Show;
        expect(show.lines![0]).toMatch(/^From a Lichess game of January 2013, players rated \d{4} and \d{4}, after (White|Black)'s \d+(st|nd|rd|th) move\.$/);
        const pos = id === "L5" ? fromWords(show.words!) : fromWords(inWords({ ...startingPosition(), board: Object.fromEntries(show.board!.pieces.map((p) => [p.square, p])) }));
        expect(besidesKings(pos)).toBe(id === "L2" ? 4 : 7);
        const squares: Square[] = [];
        let step = item.next(press);
        while (step.step === "ask") {
          squares.push(step.question.match(/on ([a-h][1-8])\?$/)![1] as Square);
          const named = pos.board[squares.at(-1)!] ?? null;
          const told = item.next(choose(named ? `${named.side}-${named.kind}` : "empty")) as Told;
          expect(told.verdict).toBe("right");
          step = item.next(press);
        }
        expect(step).toEqual({ step: "done", back: null });
        const held = squares.filter((s) => pos.board[s]);
        expect(held).toHaveLength(3);
        if (Object.values(pos.board).some((p) => p!.kind === "pawn")) expect(held.some((s) => pos.board[s]!.kind === "pawn")).toBe(true);
        expect(new Set(squares).size).toBe(5);
      }
    }
  });

  // B2: the thirteen answers are piece cards. A choice that carries what it names is drawn as a card.
  it("carries on each of the thirteen choices the piece it names, or Empty, in the card's order", () => {
    expect(CHOICES.map((c) => c.stands)).toEqual(THIRTEEN);
    expect(CHOICES.map((c) => c.stands === null ? "empty" : `${c.stands!.side}-${c.stands!.kind}`)).toEqual(CHOICES.map((c) => c.value));
    // The words stay each card's name: "Black's bishop".
    expect(CHOICES.map((c) => c.words)).toEqual(THIRTEEN.map((s) => standsWords(s)));
  });

  it("tells the value of the right choice with every answer, right or wrong, for the cards to ring", () => {
    const start = atTheStart(level("L1"), "c8");
    start.first();
    expect(start.next(choose("black-bishop"))).toMatchObject({ verdict: "right", rightChoice: "black-bishop" });
    const wrong = atTheStart(level("L1"), "c8");
    wrong.first();
    expect(wrong.next(choose("black-knight"))).toMatchObject({ verdict: "wrong", rightChoice: "black-bishop" });
    const empty = atTheStart(level("L1"), "c5");
    empty.first();
    expect(empty.next(choose("white-pawn"))).toMatchObject({ verdict: "wrong", rightChoice: "empty" });
    // A real position: f6 holds Black's pawn, e5 nothing.
    const told = playPosition(namePositions(level("L2"), L2), [choose("white-knight"), choose("white-rook"), choose("black-pawn"), choose("black-king"), choose("empty")]).tolds;
    expect(told.map((t) => t.rightChoice)).toEqual(["black-pawn", "white-rook", "black-pawn", "empty", "empty"]);
  });

  it("brings a missed position back, mirrored, among the round's", () => {
    const back = { fen: L2.fen, from: L2.from, squares: L2.squares };
    const items = challenge.makeRound(level("L2"), seeded("4.1.1 back"), { side: "white", back: [back, { fen: "junk" }], packs: PACKS });
    expect(items).toHaveLength(4);
    expect(items.map((i) => (i.first() as Show).lines![0])).toContain(L2.from);
  });
});
