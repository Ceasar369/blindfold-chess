import { describe, expect, it } from "vitest";
import { arrowsOf, findMove, moveKind, readMove } from "../../../notation/index.ts";
import { fromWords, kingSquare, other, type Position, startingPosition, toFen } from "../../../positions/index.ts";
import { seeded } from "../../../random/index.ts";
import { fileNumber, rankNumber } from "../../../squares/index.ts";
import { isCheck, isCheckmate, moveBetween, type Move, play as playMove } from "../../../rules/index.ts";
import type { Ask, Did, Done, Item, Kind, Level, Square, Step, Told } from "../../../shape/index.ts";
import { chapter } from "../chapter.ts";
import { apartBy, levelPlans, makeQuestion, type Question, questionFacts, questionOf } from "../moves.ts";
import { challenge, judgeWritten, LEVELS, MISTAKES, questionArrows, writeTheMove } from "./index.ts";

const level = (id: string): Level => LEVELS.find((l) => l.id === id)!;
// A move built key by key on the move composer, then Confirm: its text.
const composed = (text: string): Did => ({ did: "answer", answer: { kind: "text", text } });
const choose = (value: string): Did => ({ did: "answer", answer: { kind: "choice", value } });

const BOTH = { white: { king: true, queen: true }, black: { king: true, queen: true } };

function question(words: string, from: Square, to: Square, extra: Partial<Position> = {}, promotion: Kind | null = null, last: Question["last"] = null): Question {
  const pos = { ...fromWords(words), ...extra };
  const move = moveBetween(pos, from, to, promotion)!;
  expect(move, `${from}-${to} in ${words}`).not.toBeNull();
  return { pos, move, last };
}

function play(item: Item, did: Did): { ask: Ask; told: Told; done: Step } {
  const ask = item.first() as Ask;
  const told = item.next(did) as Told;
  return { ask, told, done: item.next({ did: "press" }) };
}

// A written move judged against a question's move: its line, or its verdict.
const judged = (q: Question, text: string, signs = false) => judgeWritten(q.pos, q.move, text, signs);
const line = (q: Question, text: string, signs = false) => {
  const j = judged(q, text, signs);
  return j === "not counted" ? j : j.line;
};
const kinds = (q: Question, text: string, signs = false) => {
  const j = judged(q, text, signs);
  return j === "not counted" ? j : j.mistakes;
};
const right = (q: Question, text: string, signs = false) => {
  const j = judged(q, text, signs);
  return j !== "not counted" && j.right;
};

// The card's examples.
const L1 = question("White: king e1, knights c3 and g1. Black: king e8, knight b8, pawn d7.", "g1", "f3");
const L2 = question("White: king g1, knight f3, pawn c4. Black: king g8, pawns b5 and d5. Black to move.", "d5", "c4");
const L3 = question("White: king g1, bishop f1, pawns g2 and h2. Black: king g8, rook e8, pawns b2 and h7. Black to move.", "b2", "b1", {}, "queen");
const L4 = question("White: king g1, rooks a1 and a5, pawns f2 and g2. Black: king g8, pawns f7 and h7.", "a1", "a3");
const L5 = question("White: king g1, queen d1, bishop c4, knight f3. Black: king g8, rook e8, pawns f7 and h7.", "c4", "f7");
// The card's other positions, under "After each answer" and "Mistakes it names".
const PASSING = question("White: king g1, rook f1, pawns e5 and g2. Black: king g8, rook c8, pawns d5 and h7.", "e5", "d6", { enPassant: "d6" }, null, { from: "d7", to: "d5" });
const LONG = question("White: king e1, rooks a1 and h1, pawns f2 and g2. Black: king g8, bishop g7, pawn f7.", "e1", "c1", { castling: BOTH });
const MATE = question("White: king g1, rook e1. Black: king g8, pawns f7, g7 and h7.", "e1", "e8");
// A promotion that mates: e8=Q#.
const e8Checkmate = () => question("White: king g6, pawn e7. Black: king h8.", "e7", "e8", {}, "queen");
const NBD2 = question("White: king g1, knights b1 and f3, pawn e4. Black: king g8, rook e8, knight c6, pawn d6.", "b1", "d2");

describe("3.2.1 Write the move", () => {
  it("copies the card's level table", () => {
    expect(LEVELS.map((l) => [l.id, l.seat, l.questions, l.minutes, l.dials.map((d) => d.value).join(" | ")])).toEqual([
      ["L1", "round", 10, 2, "A board, every piece, my move's squares lit, an arrow between them | Moves without a capture | 4 | No | Pick one of four"],
      ["L2", "round", 10, 3, "A board, every piece, my move's squares lit, an arrow between them | Captures too | 4 | No | Move composer"],
      ["L3", "round", 10, 3, "A board, every piece, my move's squares lit, an arrow between them | Castling, promotion and a pawn taken in passing too | 6 | No | Move composer"],
      ["L4", "round", 10, 4, "A board, every piece, my move's squares lit, an arrow between them | Two pieces told apart too | 6 | Yes | Move composer"],
      ["L5", null, 10, 5, "No board, the position and my move in words | As at L4 | 6 | Yes | Move composer"],
    ]);
    expect(LEVELS.every((l) => l.passMark === "Pass mark for 3.2.1 L1 to L5: the right answers in one round. My practice sets it.")).toBe(true);
  });

  it("judges the card's L1 example: four choices, Nf3", () => {
    const item = writeTheMove(level("L1"), L1, seeded("L1"));
    const ask = item.first() as Ask;
    expect(ask.question).toBe("Write your move in notation.");
    expect(ask.board).toMatchObject({ seat: "white", names: false, lit: ["g1", "f3"] });
    if (ask.input.how !== "choose") throw new Error("L1 picks one of four");
    const words = ask.input.choices.map((c) => c.words);
    expect(new Set(words).size).toBe(4);
    expect(words).toContain("Nf3");
    expect(item.next(choose("Nf3"))).toMatchObject({ verdict: "right", line: "Right: Nf3." });
    // Whichever wrong choice is picked, it is told why, by the judge.
    for (const wrong of words.filter((w) => w !== "Nf3")) {
      const told = play(writeTheMove(level("L1"), L1, seeded("L1")), choose(wrong)).told;
      expect(told).toMatchObject({ verdict: "wrong", line: line(L1, wrong) });
      expect(told.line.startsWith("No: it is Nf3.")).toBe(true);
      expect(told.score.mistakes).toEqual(kinds(L1, wrong));
    }
    const wrong = play(writeTheMove(level("L1"), L1, seeded("L1")), choose("Kf3"));
    expect(wrong.told.line).toBe("No: it is Nf3. N is the knight. K is the king.");
    expect(wrong.told.score.mistakes).toEqual(["The wrong piece's letter"]);
    expect(questionOf((wrong.done as Done).back)).toMatchObject({ move: { san: "Nf3" } });
    expect(kinds(L1, "Ng1")).toEqual(["The square it leaves"]);
    expect(kinds(L1, "Ng3")).toEqual(["The file beside"]);
    // A square that is no near miss and not the one it leaves is told where the piece lands.
    expect(kinds(L1, "Nd5")).toEqual(["Another move"]);
    expect(line(L1, "Nd5")).toBe("No: it is Nf3. Your knight lands on f3.");
    expect(line(L2, "dxe5")).toBe("No: it is dxc4. Your pawn lands on c4.");
    expect(line(PASSING, "exg6")).toBe("No: it is exd6. A pawn taken in passing is written where your pawn lands, d6.");
  });

  it("judges the card's L2 example: dxc4, as Black", () => {
    const { ask, told } = play(writeTheMove(level("L2"), L2, seeded("L2")), composed("dxc4"));
    expect(ask.board).toMatchObject({ seat: "black", lit: ["d5", "c4"] });
    expect(ask.input).toEqual({ how: "compose-move" });
    expect(told.line).toBe("Right: dxc4.");
    const wrong = play(writeTheMove(level("L2"), L2, seeded("L2")), composed("bxc4"));
    expect(wrong.told.line).toBe("No: it is dxc4. Your pawn on d5 takes, and a pawn's capture names the file it leaves. bxc4 is the pawn on b5.");
    expect(wrong.told.score.mistakes).toEqual(["The other piece named"]);
  });

  it("judges the card's L3 example: b1=Q", () => {
    const { ask, told } = play(writeTheMove(level("L3"), L3, seeded("L3")), composed("b1=Q"));
    expect(ask.notes).toEqual(["It becomes a queen."]);
    expect(ask.board).toMatchObject({ seat: "black", lit: ["b2", "b1"] });
    expect(told).toMatchObject({ verdict: "right", line: "Right: b1=Q." });
    const wrong = play(writeTheMove(level("L3"), L3, seeded("L3")), composed("b1"));
    expect(wrong.told.line).toBe("No: it is b1=Q. A promotion names the piece the pawn becomes.");
    expect(wrong.told.score.mistakes).toEqual(["A promotion without its piece"]);
  });

  it("judges the card's L4 example: R1a3", () => {
    expect(play(writeTheMove(level("L4"), L4, seeded("L4")), composed("R1a3")).told.line).toBe("Right: R1a3.");
    const wrong = play(writeTheMove(level("L4"), L4, seeded("L4")), composed("Ra3"));
    expect(wrong.told.line).toBe("No: it is R1a3. Your rook on a5 reaches a3 too. Both stand on the a-file, so the rank tells them apart: 1.");
    expect(wrong.told.score.mistakes).toEqual(["What tells two apart, left out"]);
  });

  it("judges the card's L5 example: Bxf7+, no board", () => {
    const right5 = play(writeTheMove(level("L5"), L5, seeded("L5")), composed("Bxf7+"));
    expect(right5.ask.board).toBeNull();
    expect(right5.ask.words).toBe("White: king g1, queen d1, bishop c4, knight f3. Black: king g8, rook e8, pawns f7 and h7.");
    expect(right5.ask.notes).toEqual(["Your bishop goes from c4 to f7."]);
    expect(right5.ask.input).toEqual({ how: "compose-move" });
    expect(right5.told.line).toBe("Right: Bxf7+.");
    const wrong = play(writeTheMove(level("L5"), L5, seeded("L5")), composed("Bxf7"));
    expect(wrong.told.line).toBe("No: it is Bxf7+. On f7, your bishop attacks Black's king on g8: that is check.");
    expect(wrong.told.score.mistakes).toEqual(["A check left unmarked"]);
  });

  it("tells a pawn taken in passing, as the card's line does", () => {
    const item = writeTheMove(level("L3"), PASSING, seeded("ep"));
    expect((item.first() as Ask).notes).toEqual(["Black's last move: d7 to d5."]);
    expect(line(PASSING, "exd5")).toBe("No: it is exd6. A pawn taken in passing is written where your pawn lands, d6. d5 is the rank beside.");
    expect(kinds(PASSING, "exd5")).toEqual(["The rank beside"]);
  });

  it("counts every form the card accepts", () => {
    expect(right(L1, "Nf3")).toBe(true);
    // A small b is always the b-file: "bd3" is no bishop's move.
    const bPawn = question("White: king g1, bishop f1, pawn b2. Black: king g8, knight c3.", "b2", "c3");
    expect(right(bPawn, "bxc3")).toBe(true);
    const bishop = question("White: king g1, bishop f1. Black: king g8.", "f1", "d3");
    expect(right(bishop, "Bd3")).toBe(true);
    expect(right(bishop, "bd3")).toBe(false);
    // A pawn: no letter.
    const e4 = { pos: startingPosition(), move: moveBetween(startingPosition(), "e2", "e4")!, last: null };
    expect(right(e4, "e4")).toBe(true);
    // A capture: x, or the word; a pawn's capture names its file.
    const bxc6 = question("White: king g1, bishop b5. Black: king g8, knight c6.", "b5", "c6");
    for (const t of ["Bxc6", "bishop takes c6", "bishop captures c6"]) expect(right(bxc6, t), t).toBe(true);
    const exd5 = question("White: king g1, knight c3, pawns d4 and e4. Black: king g8, knight f6, pawns c5 and d5.", "e4", "d5");
    for (const t of ["exd5", "e takes d5"]) expect(right(exd5, t), t).toBe(true);
    // Castling, each one key.
    const short = question("White: king e1, rooks a1 and h1, pawns f2 and g2. Black: king g8, bishop g7, pawn f7.", "e1", "g1", { castling: BOTH });
    expect(right(short, "O-O")).toBe(true);
    expect(right(LONG, "O-O-O")).toBe(true);
    // A promotion, with = or without.
    const e8 = question("White: king a1, pawn e7. Black: king h1.", "e7", "e8", {}, "queen");
    for (const t of ["e8=Q", "e8Q"]) expect(right(e8, t), t).toBe(true);
    expect(right(e8Checkmate(), "e8=Q#", true)).toBe(true);
    // A pawn taken in passing.
    expect(right(PASSING, "exd6")).toBe(true);
    // Two pieces told apart: the file; the rank when they share a file; the
    // rank too when they differ in both.
    expect(right(NBD2, "Nbd2")).toBe(true);
    expect(right(NBD2, "N1d2")).toBe(true);
    expect(right(L4, "R1a3")).toBe(true);
  });

  it("judges signs from L4 only, in each written form", () => {
    const bb5 = question("White: king g1, bishop f1. Black: king e8, pawn a6.", "f1", "b5");
    expect(bb5.move.san).toBe("Bb5+");
    expect(right(bb5, "Bb5", false)).toBe(true);
    expect(right(bb5, "Bb5+", false)).toBe(true);
    expect(right(bb5, "Bb5", true)).toBe(false);
    expect(right(bb5, "Bb5+", true)).toBe(true);
    expect(MATE.move.san).toBe("Re8#");
    for (const t of ["Re8#", "Re8++"]) expect(right(MATE, t, true), t).toBe(true);
    expect(right(L4, "R1a3", true)).toBe(true);
  });

  it("counts nothing naming no move", () => {
    for (const t of ["N", "Nf"]) expect(judged(L1, t), t).toBe("not counted");
    const item = writeTheMove(level("L2"), L2, seeded("nc"));
    item.first();
    expect(item.next(composed("N"))).toMatchObject({ step: "ask", note: "Not counted. The question stays open.", reopened: true });
    expect(item.next(composed("dxc4"))).toMatchObject({ step: "told", verdict: "right" });
  });

  it("names each mistake on the card", () => {
    expect(kinds(L1, "Ne3")).toEqual(["The file beside"]);
    expect(kinds(L1, "Nf2")).toEqual(["The rank beside"]);
    expect(kinds(L1, "Nf4")).toEqual(["The rank beside"]);
    expect(kinds(L1, "Nc6")).toEqual(["The board turned"]);
    expect(kinds(L1, "Nc3")).toEqual(["The files reversed"]);
    expect(kinds(L1, "Nf6")).toEqual(["The ranks reversed"]);
    expect(kinds(L1, "Kf3")).toEqual(["The wrong piece's letter"]);
    const e4 = { pos: startingPosition(), move: moveBetween(startingPosition(), "e2", "e4")!, last: null };
    expect(kinds(e4, "Pe4")).toEqual(["A letter on a pawn"]);
    expect(line(e4, "Pe4")).toBe("No: it is e4. A pawn takes no letter.");
    expect(kinds(L1, "Ng1")).toEqual(["The square it leaves"]);
    expect(kinds(L2, "bxc4")).toEqual(["The other piece named"]);
    expect(kinds(NBD2, "Nfd2")).toEqual(["The other piece named"]);
    expect(kinds(L2, "xc4")).toEqual(["A pawn's capture without its file"]);
    expect(kinds(L2, "c4")).toEqual(["A pawn's capture without its file", "A capture without its x"]);
    expect(kinds(L2, "dc4")).toEqual(["A capture without its x"]);
    expect(kinds(L1, "Nxf3")).toEqual(["A capture where nothing is taken"]);
    expect(line(L1, "Nxf3")).toBe("No: it is Nf3. f3 is empty.");
    expect(kinds(LONG, "O-O")).toEqual(["The other side's castling"]);
    expect(kinds(LONG, "Kc1")).toEqual(["Castling written as a king move"]);
    expect(kinds(L3, "b1")).toEqual(["A promotion without its piece"]);
    expect(kinds(L3, "b1=N")).toEqual(["The wrong new piece"]);
    expect(kinds(L4, "Ra3")).toEqual(["What tells two apart, left out"]);
    expect(kinds(L4, "Raa3")).toEqual(["What tells two apart, left out"]);
    expect(kinds(L1, "Ngf3")).toEqual(["More than tells them apart"]);
    expect(kinds(L1, "Ng1f3")).toEqual(["More than tells them apart"]);
    expect(kinds(NBD2, "Nb1d2")).toEqual(["More than tells them apart"]);
    expect(kinds(L5, "Bxf7", true)).toEqual(["A check left unmarked"]);
    expect(kinds(L4, "R1a3+", true)).toEqual(["A sign where there is none"]);
    expect(kinds(MATE, "Re8+", true)).toEqual(["A mate written as check"]);
    expect(kinds(L1, "Qa8")).toEqual(["The wrong piece's letter", "Another move"]);
    expect(MISTAKES).toHaveLength(22);
  });

  // The card's rule, stricter than FIDE's C.9: a capture is written as one.
  it("writes a capture with its capture mark, as the x or the word", () => {
    const bishop = question("White: king g1, bishop c4. Black: king g8, pawn f7.", "c4", "f7");
    expect(bishop.move.san).toBe("Bxf7+");
    const pawn = question("White: king g1, knight c3, pawns d4 and e4. Black: king g8, knight f6, pawns c5 and d5.", "e4", "d5");
    const queen = question("White: king g1, queen c1. Black: king g8, knight c6.", "c1", "c6");
    expect(queen.move.san).toBe("Qxc6");
    const promotes = question("White: king g1, pawn e7. Black: king a1, rook d8.", "e7", "d8", {}, "queen");
    expect(promotes.move.san).toBe("exd8=Q");
    // Each case: the question, whether signs are judged, the forms that count, and the ones that miss the mark.
    const cases: [Question, boolean, string[], string[]][] = [
      [bishop, true, ["Bxf7+", "bishop captures f7 check"], ["Bf7+"]],
      [bishop, false, ["Bxf7", "Bxf7+"], ["Bf7", "Bf7+"]],
      [pawn, false, ["exd5", "e takes d5"], ["ed5"]],
      [queen, false, ["Qxc6", "queen takes c6"], ["Qc6"]],
      [promotes, false, ["exd8=Q", "exd8Q", "e takes d8 promotes to queen"], ["ed8=Q", "ed8Q"]],
      [PASSING, false, ["exd6"], ["ed6"]],
    ];
    for (const [q, signs, accept, reject] of cases) {
      for (const t of accept) expect(right(q, t, signs), `${q.move.san} for ${t}`).toBe(true);
      for (const t of reject) {
        expect(kinds(q, t, signs), `${q.move.san} for ${t}`).toContain("A capture without its x");
        expect(right(q, t, signs), `${q.move.san} for ${t}`).toBe(false);
      }
    }
    // It is a told mistake of its own, never "not counted".
    expect(judged(bishop, "Bf7+")).not.toBe("not counted");
    expect(line(bishop, "Bf7+", true)).toBe("No: it is Bxf7+. Your bishop captures on f7, so an x goes before the square.");
    expect(line(pawn, "ed5")).toBe("No: it is exd5. Your pawn captures on d5, so an x goes before the square.");
    expect(kinds(bishop, "Bf7+", true)).toEqual(["A capture without its x"]);
    // The composer's own screen: the same answer, built key by key, then Confirm.
    const { told } = play(writeTheMove(level("L2"), pawn, seeded("x")), composed("ed5"));
    expect(told).toMatchObject({ verdict: "wrong", line: "No: it is exd5. Your pawn captures on d5, so an x goes before the square." });
    expect(told.score.mistakes).toEqual(["A capture without its x"]);
    // A move that captures nothing, and a different square, are other mistakes.
    expect(kinds(L1, "Nf3")).toEqual([]);
    expect(kinds(bishop, "Bg8", true)).not.toContain("A capture without its x");
  });

  it("gives each question's arrows: my move's at L1 to L4, none at L5", () => {
    const arrows = (id: string, q: Question) => questionArrows(level(id), q);
    // A white knight g1 to f3. A black pawn d5 to c4, down the White-facing board.
    expect(arrows("L1", L1)).toEqual([{ from: "g1", to: "f3" }]);
    expect(arrows("L2", L2)).toEqual([{ from: "d5", to: "c4" }]);
    const blackPawn = question("White: king e1, pawn a2. Black: king e8, pawn e7. Black to move.", "e7", "e5");
    expect(arrows("L1", blackPawn)).toEqual([{ from: "e7", to: "e5" }]);
    // Castling: the king's, then the rook's. Both wings, both colours.
    const white = (san: string) => question("White: king e1, rooks a1 and h1, pawns f2 and g2. Black: king g8, bishop g7, pawn f7.", "e1", san === "O-O" ? "g1" : "c1", { castling: BOTH });
    expect(arrows("L3", white("O-O"))).toEqual([{ from: "e1", to: "g1" }, { from: "h1", to: "f1" }]);
    expect(arrows("L3", white("O-O-O"))).toEqual([{ from: "e1", to: "c1" }, { from: "a1", to: "d1" }]);
    const black = (to: Square) => question("White: king g1, queen b3, pawns f2 and g2. Black: king e8, rooks a8 and h8, pawn f7. Black to move.", "e8", to, { castling: BOTH });
    expect(arrows("L3", black("g8"))).toEqual([{ from: "e8", to: "g8" }, { from: "h8", to: "f8" }]);
    expect(arrows("L3", black("c8"))).toEqual([{ from: "e8", to: "c8" }, { from: "a8", to: "d8" }]);
    // A promotion shows the pawn's movement. A pawn taken in passing, the capturing pawn's, and none from the pawn taken.
    expect(arrows("L3", L3)).toEqual([{ from: "b2", to: "b1" }]);
    expect(arrows("L3", PASSING)).toEqual([{ from: "e5", to: "d6" }]);
    // A capture: none from the piece taken.
    expect(arrows("L2", question("White: king g1, bishop c4. Black: king a8, pawn f7.", "c4", "f7"))).toEqual([{ from: "c4", to: "f7" }]);
    expect(arrows("L4", L4)).toEqual([{ from: "a1", to: "a3" }]);
    // No board at L5: no arrow.
    expect(arrows("L5", L5)).toEqual([]);
    for (const l of LEVELS) expect(questionArrows(l, L5).length > 0, l.id).toBe(l.id !== "L5");
    // The question hands them to its board, with the squares still lit; L5 has no board.
    const board = (id: string, q: Question) => (writeTheMove(level(id), q, seeded("arrows")).first() as Ask).board;
    expect(board("L1", L1)).toMatchObject({ lit: ["g1", "f3"], arrows: [{ from: "g1", to: "f3" }] });
    expect(board("L3", LONG)).toMatchObject({ lit: ["e1", "c1"], arrows: [{ from: "e1", to: "c1" }, { from: "a1", to: "d1" }] });
    expect(board("L5", L5)).toBeNull();
  });

  // Chapter 6 reads moves through findMove, shorthand allowed: it is not 3.2.1's judge.
  it("leaves chapter 6's reading of a move alone: its shorthand still plays", () => {
    const bishop = question("White: king g1, bishop c4. Black: king g8, pawn f7.", "c4", "f7");
    const pawn = question("White: king g1, knight c3, pawns d4 and e4. Black: king g8, knight f6, pawns c5 and d5.", "e4", "d5");
    for (const [q, text] of [[bishop, "Bf7"], [bishop, "Bf7+"], [bishop, "Bxf7"], [pawn, "ed5"], [pawn, "exd5"]] as const) {
      expect(findMove(q.pos, text), text).toMatchObject({ found: { from: q.move.from, to: q.move.to } });
    }
    expect(readMove("Bf7")).toMatchObject([{ piece: "bishop", capture: false, to: "f7" }]);
    expect(readMove("ed5")).toMatchObject([{ piece: "pawn", fromFile: "e", capture: false, to: "d5" }]);
  });

  // Ten rounds of set-up positions: slow while the whole suite runs at once.
  it("makes each level's mix of moves, signs from L4: 3 checks, 1 of them mate", { timeout: 60_000 }, () => {
    const want: Record<string, Record<string, number>> = {
      L1: { move: 10 },
      L2: { capture: 5, move: 5 },
      L3: { castling: 2, promotion: 2, "en passant": 2, capture: 2, move: 2 },
      L4: { move: 5, castling: 1, promotion: 1, "en passant": 1, capture: 2 },
      L5: { move: 5, castling: 1, promotion: 1, "en passant": 1, capture: 2 },
    };
    for (const l of LEVELS) {
      for (const side of ["white", "black"] as const) {
        const items = challenge.makeRound(l, seeded(`3.2.1 ${l.id} ${side}`), { side, back: [] });
        expect(items).toHaveLength(10);
        const count: Record<string, number> = {};
        const signs = { "+": 0, "#": 0 };
        let apart = 0;
        for (const item of items) {
          const ask = item.first() as Ask;
          // "a1" is never right: no pawn lands on a1 without becoming a piece.
          if (l.id !== "L1") expect(ask.input).toEqual({ how: "compose-move" });
          const q = questionOf((play(item, l.id === "L1" ? choose("a1") : composed("a1")).done as Done).back)!;
          expect(q.move.side).toBe(side);
          count[moveKind(q.move)] = (count[moveKind(q.move)] ?? 0) + 1;
          if (q.move.san.endsWith("#")) signs["#"]++;
          else if (q.move.san.endsWith("+")) signs["+"]++;
          if (apartBy(q.move.san).file || apartBy(q.move.san).rank) apart++;
          expect(Object.values(q.pos.board).filter((p) => p!.kind !== "king")).toHaveLength(l.id === "L1" || l.id === "L2" ? 4 : 6);
          if (l.id === "L5") expect(ask.board).toBeNull();
          else {
            expect(ask.board?.lit).toEqual([q.move.from, q.move.to]);
            expect(ask.board?.arrows, q.move.san).toEqual(arrowsOf(q.move));
          }
          // The right written form is right.
          const again = writeTheMove(l, q, seeded("again"));
          again.first();
          const told = again.next(l.id === "L1" ? choose(q.move.san.replace(/[+#]$/, "")) : composed(q.move.san)) as Told;
          expect(told.verdict, q.move.san).toBe("right");
        }
        expect(count).toEqual(want[l.id]);
        if (l.id === "L4" || l.id === "L5") {
          expect(signs).toEqual({ "+": 2, "#": 1 });
          expect(apart).toBe(4);
        }
      }
    }
  });

  // Chess decides who checks and who mates: each sign is checked against the rules, not the written form.
  it("spreads check and mate across the kinds of move, each one real", { timeout: 180_000 }, () => {
    const type = (m: Move) => (moveKind(m) === "move" && (apartBy(m.san).file || apartBy(m.san).rank) ? "two told apart" : moveKind(m) === "move" ? "plain move" : moveKind(m));
    const bump = (o: Record<string, number>, k: string) => void (o[k] = (o[k] ?? 0) + 1);
    const check: Record<string, number> = {};
    const mate: Record<string, number> = {};
    const none: Record<string, number> = {};
    const pieces: Record<string, number> = {};
    const ranks: Record<string, number> = {};
    const kings = new Set<string>();
    const rounds = Number(process.env.SPREAD_ROUNDS ?? 100);
    for (let r = 0; r < rounds; r++) {
      const id = r % 2 ? "L5" : "L4";
      const random = seeded(`3.2.1 spread ${r}`);
      const found = { "+": 0, "#": 0 };
      for (const plan of levelPlans(random, id, true)) {
        const q = makeQuestion(random, r % 3 === 0 ? "black" : "white", 6, plan);
        const after = playMove(q.pos, q.move)!;
        const sign = isCheckmate(after) ? "#" : isCheck(after) ? "+" : "";
        expect(q.move.san.match(/[+#]?$/)![0], `${q.move.san} in ${toFen(q.pos)}`).toBe(sign);
        if (sign === "") bump(none, type(q.move));
        else {
          found[sign]++;
          bump(sign === "#" ? mate : check, type(q.move));
          if (sign === "#") {
            bump(pieces, q.move.promotion ? `${q.move.promotion} by promotion` : q.move.kind);
            bump(ranks, q.move.to[1]!);
            kings.add(kingSquare(after, other(q.move.side))!);
          }
        }
      }
      // 3 of the 10 give check, and 1 of those 3 mates.
      expect(found, `round ${r}`).toEqual({ "+": 2, "#": 1 });
    }
    if (process.env.SPREAD_REPORT) console.log(JSON.stringify({ rounds, check, mate, none, pieces, ranks, kings: [...kings].sort() }, null, 1));
    const share = (o: Record<string, number>, k: string) => (o[k] ?? 0) / Object.values(o).reduce((n, v) => n + v, 0);
    // A check comes with every kind of move, and a mate with every kind that can mate.
    for (const t of ["plain move", "capture", "castling", "promotion", "en passant", "two told apart"]) expect(share(check, t), `check by ${t}`).toBeGreaterThan(0.04);
    for (const t of ["plain move", "capture", "promotion", "two told apart"]) expect(share(mate, t), `mate by ${t}`).toBeGreaterThan(0.08);
    expect(Object.keys(mate)).not.toContain("castling");
    // A capture need not check, a plain move need not mate, a special move may check.
    expect((none.capture ?? 0) / ((none.capture ?? 0) + (check.capture ?? 0) + (mate.capture ?? 0))).toBeGreaterThan(0.5);
    expect(none["plain move"]).toBeGreaterThan(0);
    for (const t of ["castling", "promotion", "en passant"]) expect(none[t], `no check by ${t}`).toBeGreaterThan(0);
    // Mates follow no one pattern: no piece, rank or king square fills most of them.
    expect(Object.keys(pieces).length).toBeGreaterThanOrEqual(5);
    expect(Math.max(...Object.values(pieces)) / rounds).toBeLessThan(0.5);
    expect(Object.keys(ranks)).toHaveLength(8);
    expect(Math.max(...Object.values(ranks)) / rounds).toBeLessThan(0.3);
    expect(kings.size).toBeGreaterThanOrEqual(15);
  });

  it("takes the mixed round's capture judging and check spread from L5 itself", { timeout: 120_000 }, () => {
    const mixed = chapter.path.find((step) => step.kind === "mixed")!;
    expect(mixed).toMatchObject({
      parts: [{ challenge: "3.1.1", level: "L5", count: 5 }, { challenge: "3.2.1", level: "L5", count: 5 }],
      order: "turns",
      oneSide: true,
      questions: 10,
      minutes: 5,
    });
    let captures = 0;
    for (let r = 0; r < 12; r++) {
      const side = r % 2 ? "black" : "white";
      for (const item of challenge.makeRound(level("L5"), seeded(`3.2.1 mixed ${r}`), { side, count: 5, back: [] })) {
        const ask = item.first() as Ask;
        expect(ask.board).toBeNull();
        const q = questionOf((play(item, composed("a1")).done as Done).back)!;
        if (!q.move.captured) continue;
        captures++;
        const written = q.move.san.replace("x", "");
        const wrong = play(writeTheMove(level("L5"), q, seeded("mixed")), composed(written)).told;
        expect(wrong.verdict, written).toBe("wrong");
        expect(wrong.score.mistakes, written).toContain("A capture without its x");
        expect(play(writeTheMove(level("L5"), q, seeded("mixed")), composed(q.move.san)).told.verdict).toBe("right");
      }
    }
    expect(captures).toBeGreaterThan(5);
  });

  it("brings a missed question back, the same position and move", () => {
    const items = challenge.makeRound(level("L4"), seeded("3.2.1 back"), { side: "black", back: [questionFacts(L4), "nonsense"] });
    expect(items).toHaveLength(10);
    const asks = items.map((i) => i.first() as Ask);
    expect(asks.some((a) => a.board?.seat === "white" && a.board.lit.join() === "a1,a3")).toBe(true);
    expect(challenge.makeRound(level("L5"), seeded("mixed"), { side: "white", count: 5, back: [] })).toHaveLength(5);
  });

  // Record line 3-155: a come-back loses a round only in a round that asks it.
  it("says which come-backs a round asks: the side kept, and the count", () => {
    const blacks = question("White: king g1, pawn a2. Black: king g8, rook c3, pawn h7. Black to move.", "c3", "b3");
    const back = [questionFacts(L4), questionFacts(blacks), "nonsense", 7];
    // Its own level's round: the first question back sets the side, White; the question Black plays waits.
    expect(challenge.asks!(level("L4"), { side: "black", back })).toEqual([questionFacts(L4)]);
    // A mixed round keeps the side it drew: White's question waits.
    expect(challenge.asks!(level("L5"), { side: "black", count: 5, back })).toEqual([questionFacts(blacks)]);
    // Past the round's count, a question waits.
    const six = Array.from({ length: 6 }, () => questionFacts(L4));
    expect(challenge.asks!(level("L5"), { side: "white", count: 5, back: six })).toHaveLength(5);
    expect(challenge.makeRound(level("L5"), seeded("3.2.1 asks"), { side: "white", count: 5, back: six })).toHaveLength(5);
  });

  // L1 questions as a round makes them: the question, and the four choices it shows.
  function l1Questions(n: number): { q: Question; choices: string[]; right: number }[] {
    const out: { q: Question; choices: string[]; right: number }[] = [];
    for (let r = 0; out.length < n; r++) {
      const random = seeded(`3.2.1 L1 choices ${r}`);
      for (const plan of levelPlans(random, "L1", false)) {
        const q = makeQuestion(random, r % 2 ? "black" : "white", 4, plan);
        const ask = writeTheMove(level("L1"), q, random).first() as Ask;
        if (ask.input.how !== "choose") throw new Error("L1 picks one of four");
        const choices = ask.input.choices.map((c) => c.words);
        out.push({ q, choices, right: choices.indexOf(q.move.san.replace(/[+#]$/, "")) });
      }
    }
    return out;
  }

  it("L1 offers four different choices: one right, three wrong, no sign and no capture", { timeout: 60_000 }, () => {
    for (const { q, choices, right: at } of l1Questions(400)) {
      expect(choices, q.move.san).toHaveLength(4);
      expect(new Set(choices).size, choices.join(", ")).toBe(4);
      expect(at, `${q.move.san} among ${choices.join(", ")}`).toBeGreaterThanOrEqual(0);
      choices.forEach((c, i) => {
        expect(c, "no sign, no capture, no promotion, no castling").toMatch(/^[KQRBNP]?[a-h][1-8]$/);
        // Exactly one is right, by the judge.
        expect(right(q, c), `${c} for ${q.move.san}`).toBe(i === at);
      });
    }
  });

  // Look at the choices without their boards, as a guesser would. A guesser
  // gives each choice a score and picks the best; a tie is picked at random,
  // so a tie holding the right one scores 1 over the tie's size.
  type Guess = (choices: string[], i: number) => number;
  const letterOf = (c: string) => (/^[KQRBNP]/.test(c) ? c[0]! : "");
  const squareOf = (c: string) => c.slice(-2);
  const fileOf = (c: string) => squareOf(c)[0]!;
  const rankOf = (c: string) => squareOf(c)[1]!;
  const sharing = (of: (c: string) => string): Guess => (cs, i) => cs.filter((c, j) => j !== i && of(c) === of(cs[i]!)).length;
  const oddOneOut = (of: (c: string) => string): Guess => (cs, i) => {
    const seen = cs.map(of);
    return seen.filter((v) => v === seen[i]).length === 1 && new Set(seen.filter((_, j) => j !== i)).size === 1 ? 1 : 0;
  };
  const distance = (a: string, b: string) => Math.max(Math.abs(fileNumber(a as Square) - fileNumber(b as Square)), Math.abs(rankNumber(a as Square) - rankNumber(b as Square)));
  const centre = (c: string) => Math.max(Math.abs(fileNumber(squareOf(c) as Square) - 4.5), Math.abs(rankNumber(squareOf(c) as Square) - 4.5));
  const GUESSERS: Record<string, Guess> = {
    "shares most with the others (letter and square)": (cs, i) => sharing(letterOf)(cs, i) + sharing(squareOf)(cs, i),
    "shares least with the others (letter and square)": (cs, i) => -sharing(letterOf)(cs, i) - sharing(squareOf)(cs, i),
    "most letters in common": sharing(letterOf),
    "most squares in common": sharing(squareOf),
    "most files in common": sharing(fileOf),
    "most ranks in common": sharing(rankOf),
    "odd one out by letter": oddOneOut(letterOf),
    "odd one out by square": oddOneOut(squareOf),
    "odd one out by file": oddOneOut(fileOf),
    "odd one out by rank": oddOneOut(rankOf),
    "odd one out by length": oddOneOut((c) => String(c.length)),
    "the longest": (cs, i) => cs[i]!.length,
    "the shortest": (cs, i) => -cs[i]!.length,
    "the one with no letter": (cs, i) => (letterOf(cs[i]!) === "" ? 1 : 0),
    "alphabetically first": (cs, i) => -[...cs].sort().indexOf(cs[i]!),
    "alphabetically last": (cs, i) => [...cs].sort().indexOf(cs[i]!),
    "squares closest to the others": (cs, i) => -cs.reduce((n, c) => n + distance(squareOf(c), squareOf(cs[i]!)), 0),
    "squares farthest from the others": (cs, i) => cs.reduce((n, c) => n + distance(squareOf(c), squareOf(cs[i]!)), 0),
    "closest to the board's centre": (cs, i) => -centre(cs[i]!),
    "farthest from the board's centre": (cs, i) => centre(cs[i]!),
    "position 1": (_, i) => (i === 0 ? 1 : 0),
    "position 2": (_, i) => (i === 1 ? 1 : 0),
    "position 3": (_, i) => (i === 2 ? 1 : 0),
    "position 4": (_, i) => (i === 3 ? 1 : 0),
    ...Object.fromEntries(["K", "Q", "R", "B", "N", "P"].map((l): [string, Guess] => [`the ${l}`, (cs, i) => (letterOf(cs[i]!) === l ? 1 : 0)])),
    "not the P": (cs, i) => (letterOf(cs[i]!) === "P" ? 0 : 1),
  };
  function hits(guess: Guess, rows: { choices: string[]; right: number }[]): number {
    let total = 0;
    for (const r of rows) {
      const scores = r.choices.map((_, i) => guess(r.choices, i));
      const best = Math.max(...scores);
      const tie = scores.flatMap((x, i) => (x === best ? [i] : []));
      if (tie.includes(r.right)) total += 1 / tie.length;
    }
    return total / rows.length;
  }

  // The 4 points are my engineering limit over 25 percent chance, not a ruling.
  // CHOICE_QUESTIONS=20000 CHOICE_REPORT=1 prints every guesser's score.
  it("L1's choices tell a guesser nothing: none beats chance by more than 4 points", { timeout: 300_000 }, () => {
    const rows = l1Questions(Number(process.env.CHOICE_QUESTIONS ?? 2000));
    const scores = Object.entries(GUESSERS).map(([name, g]) => [name, hits(g, rows)] as const);
    if (process.env.CHOICE_REPORT) {
      console.log(`${rows.length} questions`);
      for (const [name, score] of [...scores].sort((a, b) => b[1] - a[1])) console.log(`${(score * 100).toFixed(1).padStart(5)}%  ${name}`);
    }
    for (const [name, score] of scores) expect(score, name).toBeLessThanOrEqual(0.29);
    // A guesser that learns, from four fifths of the questions, how often each look of a choice was right.
    const look = (cs: string[], i: number) => [sharing(letterOf)(cs, i), sharing(squareOf)(cs, i), sharing(fileOf)(cs, i), sharing(rankOf)(cs, i), cs[i]!.length, letterOf(cs[i]!)].join("/");
    let learned = 0;
    for (let fold = 0; fold < 5; fold++) {
      const table = new Map<string, [number, number]>();
      rows.forEach((r, n) => {
        if (n % 5 !== fold) r.choices.forEach((_, i) => table.set(look(r.choices, i), [(table.get(look(r.choices, i))?.[0] ?? 0) + (i === r.right ? 1 : 0), (table.get(look(r.choices, i))?.[1] ?? 0) + 1]));
      });
      const guess: Guess = (cs, i) => {
        const seen = table.get(look(cs, i));
        return seen && seen[1] >= 10 ? seen[0] / seen[1] : 0.25;
      };
      learned += hits(guess, rows.filter((_, n) => n % 5 === fold)) / 5;
    }
    if (process.env.CHOICE_REPORT) console.log(`${(learned * 100).toFixed(1).padStart(5)}%  learned look of a choice, five folds`);
    expect(learned).toBeLessThanOrEqual(0.29);
    // The right one sits at each position as often as any other.
    for (let k = 0; k < 4; k++) expect(rows.filter((r) => r.right === k).length / rows.length).toBeGreaterThan(0.21);
  });

  it("L1 sometimes offers a letter on a pawn, for a pawn question alone, and never in every one", { timeout: 60_000 }, () => {
    const rows = l1Questions(1500);
    const pawns = rows.filter(({ q }) => q.move.kind === "pawn");
    const withP = pawns.filter(({ choices }) => choices.some((c) => c.startsWith("P")));
    expect(pawns.length).toBeGreaterThan(300);
    expect(withP.length / pawns.length).toBeGreaterThan(0.15);
    expect(withP.length / pawns.length).toBeLessThan(0.6);
    // Pe4, for e4: the very mistake the judge names.
    const same = pawns.filter(({ q, choices }) => choices.includes(`P${q.move.san.replace(/[+#]$/, "")}`));
    expect(same.length).toBeGreaterThan(30);
    for (const { q, choices } of same) {
      const text = `P${q.move.san.replace(/[+#]$/, "")}`;
      expect(choices).toContain(text);
      expect(kinds(q, text)).toEqual(["A letter on a pawn"]);
      expect(line(q, text)).toBe(`No: it is ${q.move.san}. A pawn takes no letter.`);
    }
    // Never for a question of a piece, and never the right one.
    for (const { q, choices, right: at } of rows) {
      if (q.move.kind !== "pawn") expect(choices.some((c) => c.startsWith("P")), q.move.san).toBe(false);
      else expect(choices[at]!.startsWith("P")).toBe(false);
    }
  });

  it("L1's wrong choices vary: no fixed pattern of letters, squares or kinds of mistake", { timeout: 60_000 }, () => {
    const kindOf = (right: string, move: Move, c: string) => {
      const sameLetter = letterOf(c) === letterOf(right);
      if (squareOf(c) === move.from) return "the square it leaves";
      if (squareOf(c) === squareOf(right)) return "a wrong letter";
      return sameLetter ? "a wrong square" : "a wrong letter and square";
    };
    const rows = l1Questions(1000);
    const triples = new Map<string, number>();
    const kinds = new Map<string, number>();
    const shapes = new Set<string>();
    for (const { q, choices } of rows) {
      const right = q.move.san.replace(/[+#]$/, "");
      const wrong = choices.filter((c) => c !== right).map((c) => kindOf(right, q.move, c));
      for (const k of wrong) kinds.set(k, (kinds.get(k) ?? 0) + 1);
      const triple = [...wrong].sort().join(" + ");
      triples.set(triple, (triples.get(triple) ?? 0) + 1);
      shapes.add(`${new Set(choices.map(letterOf)).size} letters, ${new Set(choices.map(squareOf)).size} squares`);
    }
    // Every kind of wrong choice comes, none in every question, and no three kinds fill most questions.
    for (const k of ["a wrong letter", "a wrong square", "the square it leaves", "a wrong letter and square"]) {
      expect((kinds.get(k) ?? 0) / rows.length, k).toBeGreaterThan(0.15);
      const without = rows.filter(({ q, choices }) => !choices.some((c) => c !== q.move.san.replace(/[+#]$/, "") && kindOf(q.move.san.replace(/[+#]$/, ""), q.move, c) === k));
      expect(without.length / rows.length, `${k} missing from some questions`).toBeGreaterThan(0.1);
    }
    expect(Math.max(...triples.values()) / rows.length).toBeLessThan(0.2);
    expect(triples.size).toBeGreaterThan(12);
    expect(shapes.size).toBeGreaterThanOrEqual(7);
  });
});
