import { describe, expect, it } from "vitest";
import { fromPieces, fromWords, kingSquare, piecesOf, type Position, toFen } from "../../../positions/index.ts";
import { seeded } from "../../../random/index.ts";
import { attackersOf } from "../../../reach/index.ts";
import type { Answer, Ask, Did, Level, Side, Square, Told } from "../../../shape/index.ts";
import { SQUARES } from "../../../squares/index.ts";
import { bothSides, inCheck, nextTo } from "../set-ups.ts";
import { challenge, inOrder, LEVELS, MISTAKES, whoAttacks } from "./index.ts";

const level = (id: string): Level => LEVELS.find((l) => l.id === id)!;
const answer = (a: Answer): Did => ({ did: "answer", answer: a });
const clicked = (...squares: Square[]) => answer({ kind: "squares", squares });
// L5's input: clicks on the empty board Reveal board shows.
const REVEALED = { how: "click-many", none: "None", reveal: { seat: "white", names: false, pieces: [], lit: [] } };
const none = answer({ kind: "none" });

// The card's four positions. L4 and L5 ask the fourth: L4 on an empty board, L5 with no board.
const L1 = fromWords("White: king g1, knight f3, pawns d4 and e4. Black: king g8, knight c6.");
const L2 = fromWords("White: king g1, knight d4. Black: king g8, queen d8, bishop b6, knight f5, pawns c5 and d5.");
const L3 = fromWords("White: king c1, rook g3, bishop b3, knight e7. Black: king g8, rook a8, pawns f7 and g6. Black to move.");
const L45 = fromWords("White: king g1, queen c2, rook h1, bishop d3, knight g5, pawn h2. Black: king g8, pawn h7.");

function play(id: string, pos: Position, square: Square, side: Side, did: Did) {
  const it = whoAttacks(level(id), pos, square, side);
  const ask = it.first() as Ask;
  const told = it.next(did) as Told;
  return { ask, told, done: it.next({ did: "press" }) };
}

describe("2.3.1 Name who attacks a square", () => {
  it("copies the card's level table", () => {
    expect(LEVELS.map((l) => [l.id, ...l.dials.map((d) => d.value), l.questions, l.minutes])).toEqual([
      ["L1", "4", "Never", "Every piece, the square lit", "Click, None allowed", 10, 3],
      ["L2", "6", "Never", "Every piece, the square lit", "Click, None allowed", 10, 4],
      ["L3", "6", "3 of 10", "Every piece, the square lit", "Click, None allowed", 10, 4],
      ["L4", "6", "3 of 10", "An empty board, no edge names: only the square lit, no piece shown", "Click, None allowed", 10, 5],
      ["L5", "6", "3 of 10", "No board until I reveal it", "Click, None allowed", 10, 5],
    ]);
    expect(LEVELS.map((l) => [l.id, l.seat, l.seconds])).toEqual([
      ["L1", "white", null], ["L2", "white", null], ["L3", "white", null], ["L4", "white", null], ["L5", null, null],
    ]);
    expect(challenge.needs).toBe("2.1.1 L2 and 2.2.1 L2. From L5, 2.2.1 L4.");
  });

  // Fifteen rounds of set-up positions: given time while every other test runs too.
  it("plays a whole round at each level, every answer right, each position to the card's rules", { timeout: 40_000 }, () => {
    for (const l of LEVELS) {
      for (const seed of ["a", "b", "c"]) {
        const items = challenge.makeRound(l, seeded(`2.3.1 ${l.id} ${seed}`), { side: "white", back: [] });
        expect(items).toHaveLength(10);
        let kings = 0;
        for (const it of items) {
          const ask = it.first() as Ask;
          const m = ask.question.match(/^Which of (White|Black)'s pieces attack ([a-h][1-8])\?$/)!;
          const side: Side = m[1] === "White" ? "white" : "black";
          const square = m[2] as Square;
          // L1 to L3 show every piece. L4 shows an empty board and L5 none: the position is in words.
          const inWords = l.id === "L4" || l.id === "L5";
          const pos = inWords ? fromWords(ask.words!) : fromPieces(ask.board!.pieces);
          if (!inWords) expect([ask.words, ask.board!.lit]).toEqual([undefined, [square]]);
          if (l.id === "L4") expect(ask.board).toEqual({ seat: "white", names: false, pieces: [], lit: [square] });
          if (l.id === "L5") expect(ask.board).toBe(null);
          expect(ask.input).toEqual(l.id === "L5" ? REVEALED : { how: "click-many", none: "None" });
          expect(piecesOf(pos)).toHaveLength(2 + (l.id === "L1" ? 4 : 6));
          expect(pos.board[square]?.side).not.toBe(side);
          expect(nextTo(kingSquare(pos, "white")!, kingSquare(pos, "black")!)).toBe(false);
          const by = attackersOf(pos.board, square, side);
          const onKing = pos.board[square]?.kind === "king";
          if (onKing) kings++;
          else expect(inCheck(pos, "white") || inCheck(pos, "black")).toBe(false);
          expect(inCheck(pos, side)).toBe(false);
          expect(by.length).toBeLessThanOrEqual(onKing ? 2 : 3);
          expect(bothSides(pos)).toBe(true);
          const did = by.length ? clicked(...by) : none;
          expect((it.next(did) as Told).verdict).toBe("right");
          expect(it.next({ did: "press" })).toEqual({ step: "done", back: null });
        }
        expect(kings).toBe(l.id === "L1" || l.id === "L2" ? 0 : 3);
      }
    }
  });

  // Seeded, so the counts never drift: 30 rounds of 10 questions at L3, 90 of them on a king's square.
  it("has each fresh question attacked by none one time in five, on its own, a king's square too", { timeout: 60_000 }, () => {
    const rounds = Array.from({ length: 30 }, (_, i) =>
      challenge.makeRound(level("L3"), seeded(`2.3.1 none ${i}`), { side: "white", back: [] }).map((it) => {
        const ask = it.first() as Ask;
        const m = ask.question.match(/^Which of (White|Black)'s pieces attack ([a-h][1-8])\?$/)!;
        const pos = fromPieces(ask.board!.pieces);
        const square = m[2] as Square;
        return { king: pos.board[square]?.kind === "king", none: attackersOf(pos.board, square, m[1] === "White" ? "white" : "black").length === 0 };
      }),
    );
    const nones = rounds.map((r) => r.filter((q) => q.none).length);
    const total = nones.reduce((a, b) => a + b, 0);
    expect(total).toBeGreaterThan(300 * 0.1);
    expect(total).toBeLessThan(300 * 0.3);
    // A round may hold no such question, or several.
    expect(nones).toContain(0);
    expect(Math.max(...nones)).toBeGreaterThanOrEqual(2);
    // A king may stand unattacked, and its share stays 3 of 10.
    expect(rounds.every((r) => r.filter((q) => q.king).length === 3)).toBe(true);
    const kingNones = rounds.flat().filter((q) => q.king && q.none).length;
    expect(kingNones).toBeGreaterThan(90 * 0.05);
    expect(kingNones).toBeLessThan(90 * 0.35);
  });

  it("judges the card's L1 example: White's attackers of e5", () => {
    const { ask, told } = play("L1", L1, "e5", "white", clicked("d4", "f3"));
    expect([ask.question, ask.board?.lit]).toEqual(["Which of White's pieces attack e5?", ["e5"]]);
    expect(told.line).toBe("Right: the knight on f3 and the pawn on d4.");
    const wrong = play("L1", L1, "e5", "white", clicked("f3", "d4", "e4"));
    expect(wrong.told.line).toBe("No: White's knight on f3 and pawn on d4 attack e5. A pawn on e4 attacks d5 and f5, never the square ahead.");
    expect(wrong.told.score.mistakes).toEqual(["A pawn straight behind"]);
    expect(wrong.done).toEqual({ step: "done", back: { fen: toFen(L1), square: "e5", side: "white" } });
  });

  it("judges the card's L2 example: Black's attackers of d4", () => {
    expect(play("L2", L2, "d4", "black", clicked("c5", "f5")).told.verdict).toBe("right");
    const wrong = play("L2", L2, "d4", "black", clicked("c5", "f5", "b6")).told;
    expect(wrong.line).toBe("No: Black's pawn on c5 and knight on f5 attack d4. The bishop on b6 is blocked by Black's own pawn on c5.");
    expect(wrong.score.mistakes).toEqual(["A blocked piece"]);
  });

  it("judges the card's L3 example: White's attackers of g8, a check", () => {
    expect(play("L3", L3, "g8", "white", clicked("e7")).told.line).toBe("Right: the knight on e7. That is check.");
    expect(play("L3", L3, "g8", "white", clicked("e7", "g3")).told.line).toBe(
      "No: only White's knight on e7 attacks g8. That is check. The rook on g3 is blocked by Black's pawn on g6.",
    );
  });

  it("judges the card's L4 example: White's attackers of h7, on an empty board", () => {
    const { ask, told } = play("L4", L45, "h7", "white", clicked("d3", "g5"));
    expect([ask.board, ask.words, ask.input]).toEqual([
      { seat: "white", names: false, pieces: [], lit: ["h7"] },
      "White: king g1, queen c2, rook h1, bishop d3, knight g5, pawn h2. Black: king g8, pawn h7.",
      { how: "click-many", none: "None" },
    ]);
    expect(told.line).toBe("Right: the bishop on d3 and the knight on g5.");
    // The position shows once I have answered, the attackers lit.
    expect(told.again?.board?.lit).toEqual(["h7", "d3", "g5"]);
    expect(told.again?.board?.pieces).toHaveLength(8);
    expect(play("L4", L45, "h7", "white", clicked("d3", "g5", "c2")).told.line).toBe(
      "No: White's bishop on d3 and knight on g5 attack h7. The queen on c2 stands behind White's own bishop on d3.",
    );
  });

  it("judges the card's L5 example: White's attackers of h7, in words", () => {
    const { ask, told } = play("L5", L45, "h7", "white", clicked("d3", "g5"));
    expect([ask.board, ask.words]).toEqual([null, "White: king g1, queen c2, rook h1, bishop d3, knight g5, pawn h2. Black: king g8, pawn h7."]);
    expect(ask.input).toEqual(REVEALED);
    expect(told.verdict).toBe("right");
    expect(told.again).toBeUndefined();
    expect(play("L5", L45, "h7", "white", clicked("d3", "g5", "c2")).told.line).toBe(
      "No: White's bishop on d3 and knight on g5 attack h7. The queen on c2 stands behind White's own bishop on d3.",
    );
  });

  it("names each of the card's mistakes", () => {
    // With f3 left out, at L1.
    const kind = (s: Square) => play("L1", L1, "e5", "white", clicked("d4", s)).told.score.mistakes;
    expect(kind("g3")).toEqual(["The file beside"]);
    expect(kind("f2")).toEqual(["The rank beside"]);
    expect(kind("c6")).toEqual(["The board turned"]);
    expect(kind("c3")).toEqual(["The files reversed"]);
    expect(kind("f6")).toEqual(["The ranks reversed"]);
    expect(play("L1", L1, "e5", "white", clicked("d4")).told).toMatchObject({
      line: "No: White's knight on f3 and pawn on d4 attack e5. You left out the knight on f3.",
      score: { mistakes: ["An attacker left out"] },
    });
    expect(play("L1", L1, "e5", "white", clicked("f3")).told.line).toBe(
      "No: White's knight on f3 and pawn on d4 attack e5. You left out the pawn on d4.",
    );
    expect(play("L1", L1, "e5", "black", clicked("c6")).told.line).toBe("Right: the knight on c6.");
    const bishop = fromWords("White: king g1, bishop c4, knight f3. Black: king g8, knight c6.");
    expect(play("L1", bishop, "e5", "white", clicked("f3", "c4")).told).toMatchObject({
      line: "No: only White's knight on f3 attacks e5. The bishop on c4 shares no diagonal with e5.",
      score: { mistakes: ["A piece off its lines"] },
    });
    expect(play("L1", bishop, "e5", "white", clicked("f3", "c6")).told).toMatchObject({
      line: "No: only White's knight on f3 attacks e5. The knight on c6 is Black's.",
      score: { mistakes: ["A piece of the other side"] },
    });
    expect(play("L1", bishop, "e5", "white", clicked("f3", "a1")).told.score.mistakes).toEqual(["Another square"]);
    expect(MISTAKES).toEqual([
      "An attacker left out", "The file beside", "The rank beside", "The board turned", "The files reversed", "The ranks reversed",
      "A pawn straight behind", "A blocked piece", "A piece off its lines", "A piece of the other side", "Another square",
    ]);
  });

  it("tells a square no piece attacks", () => {
    expect(play("L1", L1, "a5", "white", none).told.line).toBe("Right: none.");
    expect(play("L1", L1, "a5", "white", clicked("d4")).told.line).toBe("No: none of White's pieces attacks a5. A pawn on d4 attacks c5 and e5.");
    expect(play("L1", L1, "e5", "white", none).told.line).toBe("No: White's knight on f3 and pawn on d4 attack e5.");
    // A king's square no piece attacks: no check is told.
    const lone = fromWords("White: king a1, pawn e4. Black: king g8. Black to move.");
    expect(play("L3", lone, "g8", "white", none).told.line).toBe("Right: none.");
    expect(play("L3", lone, "g8", "white", clicked("e4")).told.line).toBe("No: none of White's pieces attacks g8. A pawn on e4 attacks d5 and f5.");
  });

  it("counts the attackers the card names", () => {
    // White's pawns on d4 and f4 attack e5, Black's on d6 and f6; a pawn straight behind never does.
    const pawns = fromWords("White: king a1, pawns d4, e4 and f4. Black: king h8, pawns d6, e6 and f6.");
    expect(play("L1", pawns, "e5", "white", clicked("d4", "f4")).told.line).toBe("Right: the pawn on d4 and the pawn on f4.");
    expect(play("L1", pawns, "e5", "black", clicked("d6", "f6")).told.line).toBe("Right: the pawn on d6 and the pawn on f6.");
    // A pawn's attack on a last-rank square still counts: here, check.
    const last = fromWords("White: king a1, pawn g7. Black: king h8. Black to move.");
    expect(play("L3", last, "h8", "white", clicked("g7")).told.line).toBe("Right: the pawn on g7. That is check.");
  });

  it("orders attackers rank by rank", () => {
    expect(inOrder(["d4", "f3"])).toEqual(["f3", "d4"]);
    expect(inOrder(["f5", "c5"])).toEqual(["c5", "f5"]);
  });

  it("brings the same position and question back", () => {
    const items = challenge.makeRound(level("L1"), seeded("back"), { side: "white", back: [{ fen: toFen(L1), square: "e5", side: "white" }, { fen: toFen(L1), square: "e4", side: "white" }] });
    expect(items).toHaveLength(10);
    expect(items.map((i) => (i.first() as Ask).question).filter((q) => q === "Which of White's pieces attack e5?").length).toBeGreaterThanOrEqual(1);
    expect(challenge.makeRound(level("L5"), seeded("mixed"), { side: "white", count: 3, back: [] })).toHaveLength(3);
  });

  // Record lines 2-167 and 2-169: a question coming back never pushes out its
  // card's share of the other king's square, and keeps its own answer.
  it("keeps its share of kings' squares, whatever comes back, each keeping its own answer", { timeout: 60_000 }, () => {
    const free = (pos: Position, n: (count: number) => boolean) =>
      SQUARES.filter((s) => pos.board[s]?.side !== "white" && pos.board[s]?.kind !== "king" && n(attackersOf(pos.board, s, "white").length) && !pos.board[s]);
    const fact = (pos: Position, square: Square) => ({ fen: toFen(pos), square, side: "white" });
    const some = free(L1, (n) => n >= 1).slice(0, 8).map((s) => fact(L1, s));
    const nones = free(L1, (n) => n === 0).slice(0, 4).map((s) => fact(L1, s));
    const kings = [fact(L3, "g8")];
    // Of a round, how many of its questions are on a king's square, attacked by none, attacked by some.
    const shares = (items: ReturnType<typeof challenge.makeRound>) => {
      const out = { king: 0, none: 0, some: 0 };
      for (const it of items) {
        const ask = it.first() as Ask;
        const m = ask.question.match(/^Which of (White|Black)'s pieces attack ([a-h][1-8])\?$/)!;
        const pos = ask.board ? fromPieces(ask.board.pieces) : fromWords(ask.words!);
        const square = m[2] as Square;
        if (pos.board[square]?.kind === "king") out.king++;
        else if (attackersOf(pos.board, square, m[1] === "White" ? "white" : "black").length === 0) out.none++;
        else out.some++;
      }
      return out;
    };
    expect(some).toHaveLength(8);
    expect(nones).toHaveLength(4);
    // L3's card: 3 kings' squares, 7 other squares. Five come back that are attacked by some, two by none,
    // three on a king's square: the round is theirs, each with its own answer, and nothing is generated.
    const all = [...some.slice(0, 5), ...nones.slice(0, 2), ...kings, ...kings, ...kings];
    expect(shares(challenge.makeRound(level("L3"), seeded("2.3.1 full"), { side: "white", back: all }))).toEqual({ king: 3, none: 2, some: 5 });
    expect(challenge.asks!(level("L3"), { side: "white", back: all })).toEqual(all);
    // Eight come back that are attacked by some: seven are asked, one waits, and the kings' squares are drawn.
    expect(challenge.asks!(level("L3"), { side: "white", back: some })).toEqual(some.slice(0, 7));
    expect(shares(challenge.makeRound(level("L3"), seeded("2.3.1 eight"), { side: "white", back: some }))).toMatchObject({ king: 3 });
    // Three come back, as in the record: the kings' share holds in every round.
    for (let i = 0; i < 4; i++) {
      expect(shares(challenge.makeRound(level("L5"), seeded(`2.3.1 three ${i}`), { side: "white", back: some.slice(0, 3) }))).toMatchObject({ king: 3 });
    }
    // Four come back that no piece attacks: all four are asked, each still attacked by none.
    expect(challenge.asks!(level("L1"), { side: "white", back: nones })).toEqual(nones);
    expect(shares(challenge.makeRound(level("L1"), seeded("2.3.1 four"), { side: "white", back: nones })).none).toBeGreaterThanOrEqual(4);
    // A king's square waits at a level that asks none; a mixed round's 3 keeps its share, one king's square.
    expect(challenge.asks!(level("L2"), { side: "white", back: kings })).toEqual([]);
    const mixed = challenge.makeRound(level("L5"), seeded("2.3.1 mixed"), { side: "white", count: 3, back: some.slice(0, 2) });
    expect(shares(mixed)).toMatchObject({ king: 1 });
    expect(challenge.asks!(level("L5"), { side: "white", count: 3, back: some.slice(0, 2) })).toEqual(some.slice(0, 2));
  });
});
