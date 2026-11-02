import { describe, expect, it } from "vitest";
import { fromPieces, fromWords, inWords, kingSquare, piecesOf, toFen } from "../../../positions/index.ts";
import { seeded } from "../../../random/index.ts";
import { attackedPieces, piecesBetween } from "../../../reach/index.ts";
import { legalProblem } from "../../../rules/index.ts";
import type { Answer, Ask, Did, Level, Square, Told } from "../../../shape/index.ts";
import { lineOf } from "../../../squares/index.ts";
import { bothSides, movesAlong, nextTo } from "../set-ups.ts";
import { challenge, inOrder, LEVELS, MISTAKES, whatItAttacks } from "./index.ts";

const level = (id: string): Level => LEVELS.find((l) => l.id === id)!;
const answer = (a: Answer): Did => ({ did: "answer", answer: a });
const clicked = (...squares: Square[]) => answer({ kind: "squares", squares });
// L4's input: clicks on the empty board Reveal board shows.
const REVEALED = { how: "click-many", none: "None", reveal: { seat: "white", names: false, pieces: [], lit: [] } };
const none = answer({ kind: "none" });

// The card's three positions. L3 and L4 ask the third: L3 on an empty board, L4 with no board.
const L1 = fromWords("White: king g1, bishop c4. Black: king g8, rook c8, knight a6, pawn f7.");
const L2 = fromWords("White: king g1, queen d2, bishop a8, knight d4, pawn c5. Black: king g8, rook d8, pawn f7.");
const L34 = fromWords("White: king g1, queen e2, pawns e4 and f2. Black: king g8, rook e8, bishop b5, knight h5.");

function play(id: string, pos: typeof L1, square: Square, did: Did) {
  const it = whatItAttacks(level(id), pos, square);
  const ask = it.first() as Ask;
  const told = it.next(did) as Told;
  return { ask, told, done: it.next({ did: "press" }) };
}

describe("2.2.1 Name what it attacks", () => {
  it("copies the card's level table", () => {
    expect(LEVELS.map((l) => [l.id, ...l.dials.map((d) => d.value), l.questions, l.minutes])).toEqual([
      ["L1", "A rook or a bishop", "4", "Every piece, the one asked about lit", "Click", 10, 3],
      ["L2", "A rook, a bishop or a queen", "6", "Every piece, the one asked about lit", "Click", 10, 3],
      ["L3", "A rook, a bishop or a queen", "6", "An empty board, no edge names: only the asked piece's square lit, no piece shown", "Click, None allowed", 10, 4],
      ["L4", "A rook, a bishop or a queen", "6", "No board until I reveal it", "Click, None allowed", 10, 5],
    ]);
    expect(LEVELS.map((l) => [l.id, l.seat, l.seconds])).toEqual([["L1", "white", null], ["L2", "white", null], ["L3", "white", null], ["L4", null, null]]);
    expect(challenge.needs).toBe("1.3.1 L1. From L4, 1.3.1 L3.");
  });

  // Twelve rounds of set-up positions: given time while every other test runs too.
  it("plays a whole round at each level, every answer right, each position to the card's rules", { timeout: 40_000 }, () => {
    for (const l of LEVELS) {
      for (const seed of ["a", "b", "c"]) {
        const items = challenge.makeRound(l, seeded(`2.2.1 ${l.id} ${seed}`), { side: "white", back: [] });
        expect(items).toHaveLength(10);
        for (const it of items) {
          const ask = it.first() as Ask;
          const m = ask.question.match(/^Which of (White|Black)'s pieces does (White|Black)'s (rook|bishop|queen) on ([a-h][1-8]) attack\?$/)!;
          expect(m[1]).not.toBe(m[2]);
          if (l.id === "L1") expect(["rook", "bishop"]).toContain(m[3]);
          const square = m[4] as Square;
          // L1 and L2 show every piece. L3 shows an empty board and L4 none: the position is in words.
          const pos = l.id === "L1" || l.id === "L2" ? fromWords(inWords({ ...L1, board: Object.fromEntries(ask.board!.pieces.map((p) => [p.square, { side: p.side, kind: p.kind }])) })) : fromWords(ask.words!);
          if (l.id === "L1" || l.id === "L2") expect(ask.words).toBeUndefined();
          if (l.id === "L3") expect(ask.board).toEqual({ seat: "white", names: false, pieces: [], lit: [square] });
          if (l.id === "L4") expect(ask.board).toBe(null);
          if (l.id === "L1" || l.id === "L2") expect(ask.board!.lit).toEqual([square]);
          expect(ask.input).toEqual(l.id === "L4" ? REVEALED : { how: "click-many", none: "None" });
          const pieces = piecesOf(pos);
          expect(pieces).toHaveLength(2 + (l.id === "L1" ? 4 : 6));
          expect(bothSides(pos)).toBe(true);
          expect(legalProblem(pos) === null || legalProblem({ ...pos, turn: pos.turn === "white" ? "black" : "white" }) === null).toBe(true);
          expect(nextTo(kingSquare(pos, "white")!, kingSquare(pos, "black")!)).toBe(false);
          const onLines = pieces.filter((p) => p.square !== square && movesAlong(m[3] as "rook", lineOf(square, p.square)));
          expect(onLines.length).toBeGreaterThanOrEqual(2);
          expect(onLines.some((p) => piecesBetween(pos.board, square, p.square)!.length > 0)).toBe(true);
          const hit = attackedPieces(pos.board, square).map((p) => p.square);
          const did = hit.length ? clicked(...hit) : none;
          expect((it.next(did) as Told).verdict).toBe("right");
          expect(it.next({ did: "press" })).toEqual({ step: "done", back: null });
        }
      }
    }
  });

  // Seeded, so the count never drifts: 30 rounds of 10 questions at L1.
  it("makes each fresh question attack nothing one time in five, on its own", { timeout: 30_000 }, () => {
    const nothings = Array.from({ length: 30 }, (_, i) =>
      challenge.makeRound(level("L1"), seeded(`2.2.1 none ${i}`), { side: "white", back: [] }).filter((it) => {
        const ask = it.first() as Ask;
        const square = ask.question.match(/ on ([a-h][1-8]) attack\?$/)![1] as Square;
        return attackedPieces(fromPieces(ask.board!.pieces).board, square).length === 0;
      }).length,
    );
    const total = nothings.reduce((a, b) => a + b, 0);
    expect(total).toBeGreaterThan(300 * 0.1);
    expect(total).toBeLessThan(300 * 0.3);
    // A round may hold no such question, or several.
    expect(nothings).toContain(0);
    expect(Math.max(...nothings)).toBeGreaterThanOrEqual(2);
  });

  it("judges the card's L1 example: White's bishop on c4", () => {
    const { ask, told } = play("L1", L1, "c4", clicked("f7", "a6"));
    expect(ask.question).toBe("Which of Black's pieces does White's bishop on c4 attack?");
    expect(ask.board?.lit).toEqual(["c4"]);
    expect(ask.input).toEqual({ how: "click-many", none: "None" });
    expect(told.line).toBe("Right: f7 and a6.");
    const wrong = play("L1", L1, "c4", clicked("f7", "a6", "g8"));
    expect(wrong.told.line).toBe("No: White's bishop on c4 attacks f7 and a6. g8 stands behind Black's pawn on f7.");
    expect(wrong.told.score.mistakes).toEqual(["A piece behind another"]);
    expect(wrong.done).toEqual({ step: "done", back: { fen: toFen(L1), square: "c4" } });
    expect(play("L1", L1, "c4", none).told.line).toBe(
      "No: White's bishop on c4 attacks f7 and a6. Its lines run c4, d5, e6, f7, and c4, b5, a6.",
    );
  });

  it("judges the card's L2 example: Black's rook on d8", () => {
    expect(play("L2", L2, "d8", clicked("d4", "a8")).told.line).toBe("Right: d4 and a8.");
    const wrong = play("L2", L2, "d8", clicked("d4", "d2")).told;
    expect(wrong.line).toBe("No: Black's rook on d8 attacks d4 and a8. d2 stands behind White's knight on d4. You left out a8.");
    expect(wrong.score.mistakes).toEqual(["A piece left out", "A piece behind another"]);
  });

  it("judges the card's L3 example: White's queen on e2, on an empty board", () => {
    const { ask, told } = play("L3", L34, "e2", clicked("b5", "h5"));
    expect([ask.board, ask.words, ask.input]).toEqual([
      { seat: "white", names: false, pieces: [], lit: ["e2"] },
      "White: king g1, queen e2, pawns e4 and f2. Black: king g8, rook e8, bishop b5, knight h5.",
      { how: "click-many", none: "None" },
    ]);
    expect(told.line).toBe("Right: b5 and h5.");
    // The position shows once I have answered, the lines lit.
    expect(told.again?.board?.lit).toEqual(["e2", "b5", "h5"]);
    expect(told.again?.board?.pieces).toHaveLength(8);
    expect(play("L3", L34, "e2", clicked("b5", "h5", "e8")).told.line).toBe(
      "No: White's queen on e2 attacks b5 and h5. e8 stands behind White's own pawn on e4.",
    );
  });

  it("judges the card's L4 example: White's queen on e2, in words", () => {
    const { ask, told } = play("L4", L34, "e2", clicked("b5", "h5"));
    expect([ask.board, ask.words, ask.input]).toEqual([
      null,
      "White: king g1, queen e2, pawns e4 and f2. Black: king g8, rook e8, bishop b5, knight h5.",
      REVEALED,
    ]);
    expect(told.line).toBe("Right: b5 and h5.");
    expect(told.again).toBeUndefined();
    expect(play("L4", L34, "e2", clicked("b5", "h5", "e8")).told.line).toBe(
      "No: White's queen on e2 attacks b5 and h5. e8 stands behind White's own pawn on e4.",
    );
  });

  it("names each of the card's mistakes", () => {
    expect(play("L1", L1, "c4", clicked("f7")).told).toMatchObject({
      line: "No: White's bishop on c4 attacks f7 and a6. You left out a6.",
      score: { mistakes: ["A piece left out"] },
    });
    // With a8 left out, for Black's rook on d8 at L2.
    const kind = (s: Square) => play("L2", L2, "d8", clicked("d4", s)).told.score.mistakes;
    expect(kind("b8")).toEqual(["The file beside"]);
    expect(kind("a7")).toEqual(["The rank beside"]);
    expect(kind("h1")).toEqual(["The board turned"]);
    expect(kind("h8")).toEqual(["The files reversed"]);
    expect(kind("a1")).toEqual(["The ranks reversed"]);
    expect(play("L2", L2, "d8", clicked("d4", "a8", "g8")).told.line).toBe(
      "No: Black's rook on d8 attacks d4 and a8. g8 is Black's own king: a piece never attacks its own side.",
    );
    expect(play("L3", L34, "e2", clicked("b5", "h5", "e4")).told.score.mistakes).toEqual(["A piece of its own side"]);
    expect(play("L4", L34, "e2", clicked("b5", "h5", "e4")).told.score.mistakes).toEqual(["A piece of its own side"]);
    expect(play("L1", L1, "c4", clicked("f7", "a6", "c8")).told).toMatchObject({
      line: "No: White's bishop on c4 attacks f7 and a6. c8 is off its lines: a bishop never moves along a file.",
      score: { mistakes: ["A piece off its lines"] },
    });
    expect(play("L1", L1, "c4", clicked("f7", "a6", "d5")).told).toMatchObject({
      line: "No: White's bishop on c4 attacks f7 and a6. d5 is empty.",
      score: { mistakes: ["Another square"] },
    });
    expect(MISTAKES).toEqual([
      "A piece left out", "The file beside", "The rank beside", "The board turned", "The files reversed", "The ranks reversed",
      "A piece behind another", "A piece of its own side", "A piece off its lines", "Another square",
    ]);
  });

  it("tells a piece that attacks nothing", () => {
    const pos = fromWords("White: king g1, rook a1, pawn a2. Black: king g8, pawn h7.");
    for (const id of ["L1", "L2", "L3", "L4"]) expect(play(id, pos, "a1", none).told.line).toBe("Right: none.");
    expect(play("L1", pos, "a1", clicked("a2")).told.line).toBe("No: White's rook on a1 attacks nothing. a2 is White's own pawn: a piece never attacks its own side.");
    expect(play("L4", pos, "a1", clicked("a2")).told.line).toBe("No: White's rook on a1 attacks nothing. a2 is White's own pawn: a piece never attacks its own side.");
  });

  it("orders its pieces from the far side of the piece asked about", () => {
    expect(inOrder(["a6", "f7"], "white")).toEqual(["f7", "a6"]);
    expect(inOrder(["a8", "d4"], "black")).toEqual(["d4", "a8"]);
    expect(inOrder(["h5", "b5"], "white")).toEqual(["b5", "h5"]);
  });

  it("brings the same position and question back", () => {
    const items = challenge.makeRound(level("L1"), seeded("back"), { side: "white", back: [{ fen: toFen(L1), square: "c4" }, { fen: "nonsense", square: "c4" }] });
    expect(items).toHaveLength(10);
    expect(items.map((i) => (i.first() as Ask).question)).toContain("Which of Black's pieces does White's bishop on c4 attack?");
    expect(challenge.makeRound(level("L4"), seeded("mixed"), { side: "white", count: 3, back: [] })).toHaveLength(3);
  });

  it("keeps a question coming back as it was, whatever it attacks", { timeout: 30_000 }, () => {
    const hits = { fen: toFen(L1), square: "c4" };
    const second = { fen: toFen(L2), square: "d8" };
    const nothing = { fen: toFen(fromWords("White: king g1, rook a1, pawn a2. Black: king g8, pawn h7.")), square: "a1" };
    // Of an Ask, the position and square it asks.
    const asked = (id: string, back: unknown[], seed: string, count?: number) =>
      challenge.makeRound(level(id), seeded(seed), { side: "white", count, back: back as never }).map((it) => {
        const ask = it.first() as Ask;
        const square = ask.question.match(/ on ([a-h][1-8]) attack\?$/)![1] as Square;
        return { fen: toFen(ask.board?.pieces.length ? fromPieces(ask.board.pieces) : fromWords(ask.words!)), square };
      });
    // All three come back, each as stored, and the round holds 10.
    const round = asked("L1", [hits, second, nothing], "2.2.1 share");
    expect(round).toHaveLength(10);
    for (const b of [hits, second, nothing]) expect(round).toContainEqual(b);
    expect(challenge.asks!(level("L1"), { side: "white", back: [hits, second, nothing] })).toEqual([hits, second, nothing]);
    // More come-backs than the round holds: the first 10 are asked, the rest wait.
    const many = Array.from({ length: 12 }, (_, i) => (i % 2 ? hits : nothing));
    expect(asked("L1", many, "2.2.1 full")).toHaveLength(10);
    expect(challenge.asks!(level("L1"), { side: "white", back: many })).toEqual(many.slice(0, 10));
    // A mixed round's 3 takes the first 3 at L4, and what cannot be read is passed over.
    expect(challenge.asks!(level("L4"), { side: "white", count: 3, back: [{ fen: "nonsense", square: "c4" }, nothing, hits, second, nothing] })).toEqual([nothing, hits, second]);
    // At L3 and L4, a come-back that attacks nothing is still right with None.
    const [back] = challenge.makeRound(level("L3"), seeded("2.2.1 none back"), { side: "white", count: 1, back: [nothing] });
    expect((back!.next(none) as Told).verdict).toBe("right");
  });
});
