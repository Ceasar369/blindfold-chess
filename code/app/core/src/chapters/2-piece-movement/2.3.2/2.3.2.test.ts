import { describe, expect, it } from "vitest";
import { fromFen, fromPieces, fromWords, kingSquare, other, piecesOf, type Position, takeOff, toFen } from "../../../positions/index.ts";
import { seeded } from "../../../random/index.ts";
import { attackersOf, attacks, reachOnEmpty } from "../../../reach/index.ts";
import { legalProblem } from "../../../rules/index.ts";
import type { Answer, Ask, Did, Level, Side, Square, Told } from "../../../shape/index.ts";
import { lineOf } from "../../../squares/index.ts";
import { bothSides, inCheck, nextTo } from "../set-ups.ts";
import { challenge, LEVELS, mayMoveTo, MISTAKES, whereItMayMove } from "./index.ts";

const level = (id: string): Level => LEVELS.find((l) => l.id === id)!;
const answer = (a: Answer): Did => ({ did: "answer", answer: a });
const clicked = (...squares: Square[]) => answer({ kind: "squares", squares });
// L5's input: clicks on the empty board Reveal board shows.
const REVEALED = { how: "click-many", none: "None", reveal: { seat: "white", names: false, pieces: [], lit: [] } };
const none = answer({ kind: "none" });

// The card's five positions. L4 asks the king's on an empty board; L5 asks the king's and the pawn's with no board.
const L1 = fromWords("White: king e1, bishop e3, pawn d2. Black: king e8, knight c3, pawn d4.");
const L2 = fromWords("White: king g1, pawns f2 and g2. Black: king g8, rook h8, bishop c5.");
const L3 = fromWords("White: king e1, rook e4, bishop g4. Black: king e8, knight b8, pawn f7.");
const L45K = fromWords("White: king g1, pawns f2, g2 and h2. Black: king g8, rook e1.");
const L5P = fromWords("White: king g1, bishop f5, knight e6. Black: king g8, rook d8, pawn f7.");

function play(id: string, pos: Position, square: Square, did: Did) {
  const it = whereItMayMove(level(id), pos, square);
  const ask = it.first() as Ask;
  const told = it.next(did) as Told;
  return { ask, told, done: it.next({ did: "press" }) };
}

describe("2.3.2 Name where it may move", () => {
  it("copies the card's level table", () => {
    expect(LEVELS.map((l) => [l.id, ...l.dials.map((d) => d.value), l.questions, l.minutes])).toEqual([
      ["L1", "A pawn", "—", "Every piece, the one asked about lit", "Click, None allowed", 10, 2],
      ["L2", "A king, never in check", "—", "Every piece, the one asked about lit", "Click, None allowed", 10, 3],
      ["L3", "5 pawns and 5 kings, 3 kings in check", "Yes", "Every piece, the one asked about lit", "Click, None allowed", 10, 3],
      ["L4", "5 pawns and 5 kings, 3 kings in check", "Yes", "An empty board, no edge names: only the asked piece's square lit, no piece shown", "Click, None allowed", 10, 5],
      ["L5", "5 pawns and 5 kings, 3 kings in check", "No", "No board until I reveal it", "Click, None allowed", 10, 5],
    ]);
    expect(LEVELS.map((l) => [l.id, l.seat, l.seconds])).toEqual([
      ["L1", "white", null], ["L2", "white", null], ["L3", "white", null], ["L4", "white", null], ["L5", null, null],
    ]);
    expect(challenge.needs).toBe("1.1.1 L2. From L2, 2.3.1 L1. From L3, 2.3.1 L3. From L5, 2.3.1 L5.");
  });

  // Fifteen rounds of set-up positions: given time while every other test runs too.
  it("plays a whole round at each level, every answer right, each position legal and to the card's rules", { timeout: 40_000 }, () => {
    for (const l of LEVELS) {
      for (const seed of ["a", "b", "c"]) {
        const items = challenge.makeRound(l, seeded(`2.3.2 ${l.id} ${seed}`), { side: "white", back: [] });
        expect(items).toHaveLength(10);
        const asked = { pawn: 0, king: 0, check: 0, start: 0 };
        for (const it of items) {
          const ask = it.first() as Ask;
          const m = ask.question.match(/^Which squares may (White|Black)'s (pawn|king) on ([a-h][1-8]) move to\?$/)!;
          const side: Side = m[1] === "White" ? "white" : "black";
          const square = m[3] as Square;
          // L1 to L3 show every piece. L4 shows an empty board and L5 none: the position is in words.
          const inWords = l.id === "L4" || l.id === "L5";
          const pos = { ...(inWords ? fromWords(ask.words!) : fromPieces(ask.board!.pieces)), turn: side };
          if (!inWords) expect([ask.words, ask.board!.lit]).toEqual([undefined, [square]]);
          if (l.id === "L4") expect(ask.board).toEqual({ seat: "white", names: false, pieces: [], lit: [square] });
          if (l.id === "L5") expect(ask.board).toBe(null);
          expect(ask.input).toEqual(l.id === "L5" ? REVEALED : { how: "click-many", none: "None" });
          expect(legalProblem(pos)).toBe(null);
          expect(piecesOf(pos)).toHaveLength(6);
          expect(bothSides(pos)).toBe(true);
          expect(nextTo(kingSquare(pos, "white")!, kingSquare(pos, "black")!)).toBe(false);
          if (m[2] === "pawn") {
            asked.pawn++;
            const rank = Number(square[1]);
            expect(side === "white" ? rank >= 2 && rank <= 6 : rank >= 3 && rank <= 7).toBe(true);
            if (rank === (side === "white" ? 2 : 7)) asked.start++;
            expect(inCheck(pos, side)).toBe(false);
            // No pawn shields its king before L3.
            if (l.id === "L1") expect(inCheck(takeOff(pos, square), side)).toBe(false);
          } else {
            asked.king++;
            if (inCheck(pos, side)) asked.check++;
          }
          // A king in check says so, and from where, where a board shows; any other question says nothing.
          const checkers = ask.board && m[2] === "king" ? attackersOf(pos.board, square, other(side)) : [];
          expect(ask.check).toEqual(checkers.length ? { king: square, from: checkers.map((s) => ({ ...pos.board[s]!, square: s })) } : undefined);
          const may = mayMoveTo(pos, square);
          const did = may.length ? clicked(...may) : none;
          expect((it.next(did) as Told).verdict).toBe("right");
          expect(it.next({ did: "press" })).toEqual({ step: "done", back: null });
        }
        const want = { L1: [10, 0, 0, 3], L2: [0, 10, 0, 0], L3: [5, 5, 3, 2], L4: [5, 5, 3, 2], L5: [5, 5, 3, 2] }[l.id]!;
        expect([asked.pawn, asked.king, asked.check, asked.start]).toEqual(want);
      }
    }
  });

  // Seeded, so the counts never drift: 30 rounds at L3, 150 pawn questions.
  it("pins a pawn to its king one time in three from L3, on its own, along files, ranks and diagonals, of both sides", { timeout: 60_000 }, () => {
    const pins = Array.from({ length: 30 }, (_, i) =>
      challenge.makeRound(level("L3"), seeded(`2.3.2 pins ${i}`), { side: "white", back: [] }).flatMap((it) => {
        const ask = it.first() as Ask;
        const m = ask.question.match(/^Which squares may (White|Black)'s (pawn|king) on ([a-h][1-8]) move to\?$/)!;
        if (m[2] !== "pawn") return [];
        const side: Side = m[1] === "White" ? "white" : "black";
        const square = m[3] as Square;
        const pos = fromPieces(ask.board!.pieces, side);
        const king = kingSquare(pos, side)!;
        // The piece the pawn shields its king from, if any, and the line between them.
        const from = attackersOf(takeOff(pos, square).board, king, other(side));
        // Every answer right, whatever the pin leaves: the rules engine decides.
        const may = mayMoveTo(pos, square);
        expect((it.next(may.length ? clicked(...may) : none) as Told).verdict).toBe("right");
        return [{ side, line: from.length ? lineOf(from[0]!, king) : null, none: may.length === 0 }];
      }),
    );
    expect(pins.every((r) => r.length === 5)).toBe(true);
    const pinned = pins.flat().filter((p) => p.line);
    expect(pinned.length).toBeGreaterThan(150 * 0.2);
    expect(pinned.length).toBeLessThan(150 * 0.47);
    // A round may hold no pinned pawn, or several.
    expect(pins.map((r) => r.filter((p) => p.line).length)).toContain(0);
    expect(Math.max(...pins.map((r) => r.filter((p) => p.line).length))).toBeGreaterThanOrEqual(2);
    expect(new Set(pinned.map((p) => p.line))).toEqual(new Set(["file", "rank", "diagonal"]));
    expect(new Set(pinned.map((p) => p.side))).toEqual(new Set(["white", "black"]));
    expect(pinned.some((p) => p.none)).toBe(true);
  });

  it("lets the rules decide a pinned pawn's moves, and names the line a wrong one opens", () => {
    // The card's L3 example: White's pawn on d2 shields its king on e1 from Black's bishop on a5. Neither d3 nor d4 is legal.
    const diagonal = fromWords("White: king e1, knight b1, pawn d2. Black: king h8, bishop a5, pawn h7.");
    expect(mayMoveTo(diagonal, "d2")).toEqual([]);
    expect(play("L3", diagonal, "d2", none).told.line).toBe("Right: none.");
    expect(play("L3", diagonal, "d2", clicked("d3")).told).toMatchObject({
      line: "No: White's pawn on d2 may move nowhere. d3 leaves White's king on e1 open to Black's bishop on a5, along the diagonal.",
      score: { mistakes: ["A pawn leaving its king open"] },
    });
    expect(play("L5", diagonal, "d2", clicked("d3", "d4")).told.line).toBe(
      "No: White's pawn on d2 may move nowhere. d3 leaves White's king on e1 open to Black's bishop on a5, along the diagonal. d4 leaves White's king on e1 open to Black's bishop on a5, along the diagonal.",
    );
    // It may still take the piece pinning it.
    const take = fromWords("White: king e1, pawn d2. Black: king h8, bishop c3.");
    expect(mayMoveTo(take, "d2")).toEqual(["c3"]);
    // Black's pawn on e7, pinned along the e-file, still moves along it, never off it.
    const file = fromWords("White: king a1, rook e1, bishop f6. Black: king e8, pawn e7. Black to move.");
    expect(mayMoveTo(file, "e7")).toEqual(["e5", "e6"]);
    expect(play("L3", file, "e7", clicked("e5", "e6", "f6")).told.line).toBe(
      "No: Black's pawn on e7 may move to e5 and e6. f6 leaves Black's king on e8 open to White's rook on e1, along the e-file.",
    );
    // Along a rank, a pawn never moves.
    const rank = fromWords("White: king a4, pawn c4. Black: king h8, rook h4.");
    expect(play("L3", rank, "c4", clicked("c5")).told.line).toBe(
      "No: White's pawn on c4 may move nowhere. c5 leaves White's king on a4 open to Black's rook on h4, along the fourth rank.",
    );
    // Black's pawn on f7, pinned along the diagonal by White's bishop on c4: None is right.
    const black = fromWords("White: king a1, bishop c4. Black: king g8, pawn f7. Black to move.");
    expect(play("L4", black, "f7", none).told.line).toBe("Right: none.");
  });

  it("keeps a king off the square behind it on a checking line, once its own square is empty", () => {
    // White's king on e2, checked along the e-file: e1 is not attacked now, and is once the king leaves e2.
    const back = fromWords("White: king e2. Black: king a8, rook e8.");
    expect(mayMoveTo(back, "e2")).toEqual(["d1", "d2", "d3", "f1", "f2", "f3"]);
    expect(play("L3", back, "e2", clicked("d1", "d2", "d3", "f1", "f2", "f3", "e1")).told).toMatchObject({
      line: "No: White's king on e2 may move to d1, d2, d3, f1, f2 and f3. Once it stands on e1, Black's rook on e8 attacks it along the e-file.",
      score: { mistakes: ["A square behind the king on a checking line"] },
    });
  });

  it("judges the card's L1 example: White's pawn on d2", () => {
    const { ask, told } = play("L1", L1, "d2", clicked("d3", "c3"));
    expect([ask.question, ask.board?.lit]).toEqual(["Which squares may White's pawn on d2 move to?", ["d2"]]);
    expect(told.line).toBe("Right: c3 and d3.");
    const wrong = play("L1", L1, "d2", clicked("d3", "d4"));
    expect(wrong.told.line).toBe("No: White's pawn on d2 may move to c3 and d3. d4 holds Black's pawn: a pawn never takes straight ahead. You left out c3.");
    expect(wrong.told.score.mistakes).toEqual(["A square left out", "A pawn straight onto a piece"]);
    expect(wrong.done).toEqual({ step: "done", back: { fen: toFen(L1), square: "d2" } });
  });

  it("says nothing of check when the king is not in check, nor of a pawn", () => {
    // L2's king is not attacked; L1's question is a pawn's, with a king of its own side not in check.
    expect(play("L2", L2, "g1", clicked("f1")).ask.check).toBeUndefined();
    expect(play("L1", L1, "d2", clicked("d3", "c3")).ask.check).toBeUndefined();
    // The same L3 position with the king on its own side not attacked: the bishop and rook gone from e-file.
    const quiet = fromWords("White: king e1, rook a4, bishop g4. Black: king e8, knight b8, pawn f7.");
    expect(play("L3", quiet, "e8", clicked("d8", "f8")).ask.check).toBeUndefined();
  });

  it("names every piece giving check, in square order, where a board shows, and says nothing at L5", () => {
    const double = fromWords("White: king e1, rook e4, bishop g6. Black: king e8, pawn a7.");
    const both = play("L3", double, "e8", clicked("d8")).ask.check!;
    expect(both).toEqual({
      king: "e8",
      from: [
        { side: "white", kind: "rook", square: "e4" },
        { side: "white", kind: "bishop", square: "g6" },
      ],
    });
    // L4's empty board still says so: the rook on e1 checks the king on g1.
    expect(play("L4", L45K, "g1", none).ask.check).toEqual({ king: "g1", from: [{ side: "black", kind: "rook", square: "e1" }] });
    // L5 shows no board, only the position in words: finding the check is its work, and the Ask does not say so.
    const words = play("L5", L45K, "g1", none).ask;
    expect(words.board).toBeNull();
    expect(words.check).toBeUndefined();
  });

  it("judges the card's L2 example: White's king on g1", () => {
    expect(play("L2", L2, "g1", clicked("f1")).told.verdict).toBe("right");
    const wrong = play("L2", L2, "g1", clicked("f1", "h2")).told;
    expect(wrong.line).toBe("No: White's king on g1 may move to f1 only. h2 is attacked by Black's rook on h8.");
    expect(wrong.score.mistakes).toEqual(["An attacked square"]);
  });

  it("judges the card's L3 example: Black's king on e8, in check", () => {
    const { ask, told } = play("L3", L3, "e8", clicked("d8", "f8"));
    expect(ask.check).toEqual({ king: "e8", from: [{ side: "white", kind: "rook", square: "e4" }] });
    expect(told.line).toBe("Right: d8 and f8.");
    expect(play("L3", L3, "e8", clicked("d8", "f8", "d7")).told.line).toBe(
      "No: Black's king on e8 may move to d8 and f8. d7 is attacked by White's bishop on g4.",
    );
  });

  it("judges the card's L4 example: White's king on g1, on an empty board", () => {
    const king = play("L4", L45K, "g1", none);
    expect([king.ask.board, king.ask.words, king.ask.input]).toEqual([
      { seat: "white", names: false, pieces: [], lit: ["g1"] },
      "White: king g1, pawns f2, g2 and h2. Black: king g8, rook e1.",
      { how: "click-many", none: "None" },
    ]);
    expect(king.told.line).toBe("Right: none.");
    // The position shows once I have answered.
    expect(king.told.again?.board?.pieces).toHaveLength(6);
    expect(play("L4", L45K, "g1", clicked("h1")).told.line).toBe(
      "No: White's king on g1 may move nowhere. Once it stands on h1, Black's rook on e1 attacks it along the first rank.",
    );
  });

  it("judges the card's L5 examples: a king, then a pawn, in words", () => {
    const king = play("L5", L45K, "g1", none);
    expect([king.ask.board, king.ask.words]).toEqual([null, "White: king g1, pawns f2, g2 and h2. Black: king g8, rook e1."]);
    expect(king.ask.input).toEqual(REVEALED);
    expect(king.told.line).toBe("Right: none.");
    expect(king.told.again).toBeUndefined();
    const wrongKing = play("L5", L45K, "g1", clicked("h1")).told;
    expect(wrongKing.line).toBe("No: White's king on g1 may move nowhere. Once it stands on h1, Black's rook on e1 attacks it along the first rank.");
    expect(wrongKing.score.mistakes).toEqual(["A square behind the king on a checking line"]);
    expect(play("L5", L5P, "f7", clicked("e6", "f6")).told.verdict).toBe("right");
    expect(play("L5", L5P, "f7", clicked("f6", "g6")).told.line).toBe(
      "No: Black's pawn on f7 may move to e6 and f6. g6 is empty: a pawn moves diagonally only to take. You left out e6.",
    );
  });

  it("names each of the card's mistakes", () => {
    expect(play("L3", L3, "e8", clicked("d8")).told).toMatchObject({
      line: "No: Black's king on e8 may move to d8 and f8. You left out f8.",
      score: { mistakes: ["A square left out"] },
    });
    // With f8 left out, at L3.
    const kind = (s: Square) => play("L3", L3, "e8", clicked("d8", s)).told.score.mistakes;
    expect(kind("g8")).toEqual(["The file beside"]);
    expect(kind("f7")).toEqual(["The rank beside"]);
    expect(kind("c1")).toEqual(["The board turned"]);
    expect(kind("c8")).toEqual(["The files reversed"]);
    expect(kind("f1")).toEqual(["The ranks reversed"]);
    expect(play("L3", L3, "e8", clicked("d8", "f8", "e7")).told.score.mistakes).toEqual(["An attacked square"]);
    const guarded = fromWords("White: king g1. Black: king a8, knight f2, bishop c5.");
    expect(play("L2", guarded, "g1", clicked("f1", "g2", "h2", "f2")).told).toMatchObject({
      line: "No: White's king on g1 may move to f1, g2 and h2. f2 holds Black's knight, guarded by Black's bishop on c5.",
      score: { mistakes: ["A guarded piece taken"] },
    });
    const kings = fromWords("White: king e6. Black: king e8, pawn a7.");
    expect(play("L2", kings, "e6", clicked("e7")).told).toMatchObject({
      line: "No: White's king on e6 may move to d5, d6, e5, f5 and f6. e7 stands next to Black's king on e8: kings never stand side by side. You left out d5, d6, e5, f5 and f6.",
    });
    expect(play("L2", L2, "g1", clicked("f1", "g2")).told).toMatchObject({
      line: "No: White's king on g1 may move to f1 only. g2 holds White's own pawn.",
      score: { mistakes: ["A square holding its own side's piece"] },
    });
    const pawns = fromWords("White: king a1, pawn e4. Black: king h8, pawn d6.");
    expect(play("L1", { ...pawns, turn: "black" }, "d6", clicked("d5", "d7")).told).toMatchObject({
      line: "No: Black's pawn on d6 may move to d5 only. d7 is behind it: Black's pawns move down the ranks.",
      score: { mistakes: ["A pawn the wrong way"] },
    });
    expect(play("L1", pawns, "e4", clicked("e5", "e6")).told).toMatchObject({
      line: "No: White's pawn on e4 may move to e5 only. e6 is two squares ahead: a pawn moves two only from its starting rank.",
      score: { mistakes: ["A pawn two squares ahead, past its starting rank"] },
    });
    expect(play("L1", pawns, "e4", clicked("e5", "a5")).told.score.mistakes).toEqual(["Another square"]);
    expect(MISTAKES).toHaveLength(17);
  });

  it("moves as the page's one real case says", () => {
    // White's pawn on e4 faces Black's knight on d5 and pawn on e5: it reaches
    // e5, attacks d5 and f5, and may move to d5 only.
    const pawn = fromWords("White: king g1, pawn e4. Black: king g8, knight d5, pawn e5.");
    expect(mayMoveTo(pawn, "e4")).toEqual(["d5"]);
    expect(attacks(pawn.board, "e4")).toEqual(["d5", "f5"]);
    expect(reachOnEmpty({ side: "white", kind: "pawn" }, "e4")).toEqual(["e5"]);
    // Take those away, and put Black's rook on a2: the king reaches five squares, and may move to f1 and h1.
    const king = fromWords("White: king g1. Black: king g8, rook a2.");
    expect(reachOnEmpty({ side: "white", kind: "king" }, "g1")).toEqual(["f1", "f2", "g2", "h1", "h2"]);
    expect(mayMoveTo(king, "g1")).toEqual(["f1", "h1"]);
  });

  it("never counts castling or a pawn taken in passing", () => {
    // A king on e1 beside its rook lists only the squares next to it.
    const rook = fromFen("4k3/8/8/8/8/8/8/4K2R w K - 0 1");
    expect(mayMoveTo(rook, "e1")).toEqual(["d1", "d2", "e2", "f1", "f2"]);
    const passing = fromFen("4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1");
    expect(mayMoveTo(passing, "e5")).toEqual(["e6"]);
  });

  it("tells None wrong when it may move", () => {
    expect(play("L1", L1, "d2", none).told.line).toBe("No: White's pawn on d2 may move to c3 and d3.");
  });

  it("brings the same position and question back, a legal one only", () => {
    const back = [{ fen: toFen(L3), square: "e8" }, { fen: toFen({ ...L3, turn: "white" }), square: "e4" }];
    const items = challenge.makeRound(level("L3"), seeded("back"), { side: "white", back });
    expect(items).toHaveLength(10);
    expect(items.map((i) => (i.first() as Ask).question)).toContain("Which squares may Black's king on e8 move to?");
    expect(challenge.makeRound(level("L5"), seeded("mixed"), { side: "white", count: 3, back: [] })).toHaveLength(3);
  });

  // Record lines 2-210 and 2-214: a question coming back never pushes out its
  // card's shares, of pawns, pawns on their starting rank, kings and kings in check.
  it("keeps its shares of pawns and kings, and kings in check, whatever comes back", { timeout: 60_000 }, () => {
    const fact = (pos: Position, square: Square) => ({ fen: toFen(pos), square });
    const pawn = fact(L1, "d4"); // Black's pawn, off its starting rank
    const start = fact(L1, "d2"); // White's pawn, on its starting rank
    const king = fact(L2, "g1"); // a king not in check
    const check = fact(L3, "e8"); // Black's king, in check from the rook on e4
    // Of a round, its questions by kind.
    const shares = (items: ReturnType<typeof challenge.makeRound>) => {
      const out = { pawn: 0, start: 0, king: 0, check: 0 };
      for (const it of items) {
        const ask = it.first() as Ask;
        const m = ask.question.match(/^Which squares may (White|Black)'s (pawn|king) on ([a-h][1-8]) move to\?$/)!;
        const side: Side = m[1] === "White" ? "white" : "black";
        const pos = fromPieces(ask.board!.pieces, side);
        if (m[2] === "king") out[inCheck(pos, side) ? "check" : "king"]++;
        else out[m[3]![1] === (side === "white" ? "2" : "7") ? "start" : "pawn"]++;
      }
      return out;
    };
    // L3's card: of 10, 5 kings, 3 of them in check, and 5 pawns, 2 of them on their starting rank.
    const full = [pawn, pawn, pawn, pawn, check, check, check, check, king, king, king, start, start, start];
    expect(shares(challenge.makeRound(level("L3"), seeded("2.3.2 full"), { side: "white", back: full }))).toEqual({ pawn: 3, start: 2, king: 2, check: 3 });
    // What does not fit waits: ten are asked, four are not.
    expect(challenge.asks!(level("L3"), { side: "white", back: full })).toHaveLength(10);
    // Two come back, as in the record: the shares hold in every round.
    for (let i = 0; i < 4; i++) {
      expect(shares(challenge.makeRound(level("L3"), seeded(`2.3.2 two ${i}`), { side: "white", back: [pawn, check] }))).toEqual({ pawn: 3, start: 2, king: 2, check: 3 });
    }
    expect(challenge.asks!(level("L3"), { side: "white", back: [pawn, check] })).toEqual([pawn, check]);
    // L1 asks pawns alone: 3 of 10 on their starting rank. L2 asks kings, none in check.
    expect(challenge.asks!(level("L1"), { side: "white", back: [king, check, start, pawn, start, start, start] })).toEqual([start, pawn, start, start]);
    expect(challenge.asks!(level("L2"), { side: "white", back: [pawn, check, king, start] })).toEqual([king]);
  });
});
