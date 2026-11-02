import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { changes, moveKind } from "../../../notation/index.ts";
import { fromWords, kingSquare, other, type Position, startingPosition, toFen } from "../../../positions/index.ts";
import { seeded } from "../../../random/index.ts";
import { moveBetween, playLine } from "../../../rules/index.ts";
import type { Ask, Did, Done, Facts, Item, Level, Square, Step, Told } from "../../../shape/index.ts";
import { apartBy, pinned, type Question, questionFacts, questionOf } from "../moves.ts";
import { challenge, LEVELS, MISTAKES, readTheMove, readTheSequence, type Sequence, sequenceOf } from "./index.ts";

// The packs L6 reads, as the site fetches them and hands them in.
const pack = (name: string) => JSON.parse(readFileSync(join(import.meta.dirname, "..", "..", "..", "..", "packs", name), "utf8"));
const PACKS = { "lines.json": pack("lines.json"), "openings.json": pack("openings.json") };

const level = (id: string): Level => LEVELS.find((l) => l.id === id)!;
const click = (...squares: Square[]): Did => ({ did: "answer", answer: { kind: "squares", squares } });
// L5's and L6's input: clicks on the empty board Reveal board shows.
const REVEALED = { how: "click-many", none: null, reveal: { seat: "white", names: false, pieces: [], lit: [] } };

function question(words: string, from: Square, to: Square, extra: Partial<Position> = {}, last: Question["last"] = null): Question {
  const pos = { ...fromWords(words), ...extra };
  const move = moveBetween(pos, from, to)!;
  expect(move, `${from}-${to} in ${words}`).not.toBeNull();
  return { pos, move, last };
}

const backOf = (step: Step): Facts => (step as Done).back;

// Plays one item to its Told, then Done.
function play(item: Item, ...dids: Did[]): { asks: Ask[]; told: Told; done: Step } {
  const asks: Ask[] = [item.first() as Ask];
  let step: Step = asks[0]!;
  for (const did of dids) {
    step = item.next(did);
    if (step.step === "ask") asks.push(step);
  }
  expect(step.step).toBe("told");
  return { asks, told: step as Told, done: item.next({ did: "press" }) };
}

// The card's examples, each a position and a move.
const L1 = question("White: king g1, rook e1, pawn g2. Black: king g8, knights b8 and f6. Black to move.", "f6", "d5");
const L2 = question("White: king g1, knight c3, pawns d4 and e4. Black: king g8, knight f6, pawns c5 and d5.", "e4", "d5");
const L3 = question("White: king g1, queen b3, pawns f2 and g2. Black: king e8, rooks a8 and h8, pawn f7. Black to move.", "e8", "c8", {
  castling: { white: { king: false, queen: false }, black: { king: true, queen: true } },
});
const L4 = question("White: king g1, knights b1 and f3, pawn e4. Black: king g8, rook e8, knight c6, pawn d6.", "b1", "d2");
const L5 = question("White: king g1, rook d1, pawns f4 and g2. Black: king g8, rook d8, pawns e4 and h7. Black to move.", "e4", "f3", { enPassant: "f3" }, { from: "f2", to: "f4" });

const NAJDORF: Sequence = {
  start: toFen(startingPosition()),
  before: ["e4", "c5", "Nf3", "d6", "d4"],
  sans: ["cxd4", "Nxd4", "Nf6", "Nc3"],
  from: "From the Sicilian Defense, Najdorf Variation, after White's third move.",
};

describe("3.1.1 Read the move", () => {
  it("copies the card's level table", () => {
    expect(LEVELS.map((l) => [l.id, l.seat, l.questions, l.minutes, l.dials.map((d) => d.value).join(" | ")])).toEqual([
      ["L1", "round", 10, 3, "A board, every piece | Set up | Moves without a capture | 1 | 4 | Click"],
      ["L2", "round", 10, 3, "A board, every piece | Set up | Captures too | 1 | 6 | Click"],
      ["L3", "round", 10, 3, "A board, every piece | Set up | Castling, promotion and a pawn taken in passing too | 1 | 6 | Click"],
      ["L4", "round", 10, 3, "A board, every piece | Set up | Two pieces told apart too | 1 | 6 | Click"],
      ["L5", null, 10, 5, "No board until I reveal it, the position in words | Set up | As at L4 | 1 | 6 | Click"],
      ["L6", null, 3, 5, "No board until I reveal it, the position in words, renewed after each move | Real play | Any, as the game played them | 4 half-moves, numbered | 16 to 30 | Click"],
    ]);
    expect(LEVELS.every((l) => l.passMark === "Pass mark for 3.1.1 L1 to L6: the right answers in one round. My practice sets it.")).toBe(true);
  });

  it("judges the card's L1 example: Nd5, as White", () => {
    const right = play(readTheMove(level("L1"), "white", L1), click("f6", "d5"));
    expect(right.asks[0]!.question).toBe("Black plays Nd5. Which squares does it change?");
    expect(right.asks[0]!.board).toMatchObject({ seat: "white", names: false, lit: [] });
    expect(right.asks[0]!.input).toEqual({ how: "click-many", none: null });
    expect(right.told.line).toBe("Right: f6 and d5. The knight leaves f6 and lands on d5.");
    expect(right.done).toEqual({ step: "done", back: null });
    const { told, done } = play(readTheMove(level("L1"), "white", L1), click("b8", "d5"));
    expect(told.line).toBe("No: Nd5 is the knight on f6: f6 and d5. The knight on b8 cannot reach d5.");
    expect(told.score.mistakes).toEqual(["A piece that cannot go there"]);
    expect(questionOf(backOf(done))).toMatchObject({ move: { san: "Nd5" } });
  });

  it("judges the card's L2 example: exd5, as Black", () => {
    expect(play(readTheMove(level("L2"), "black", L2), click("d5", "e4")).told.verdict).toBe("right");
    const { asks, told } = play(readTheMove(level("L2"), "black", L2), click("e4", "e5"));
    expect(asks[0]!.question).toBe("White plays exd5. Which squares does it change?");
    expect(asks[0]!.board?.seat).toBe("black");
    expect(told.line).toBe("No: exd5 is the pawn on the e-file taking on d5: e4 and d5. e5 is the file beside d5.");
    expect(told.score.mistakes).toEqual(["The file beside"]);
  });

  it("judges the card's L3 example: Black's O-O-O", () => {
    expect(play(readTheMove(level("L3"), "white", L3), click("e8", "c8", "a8", "d8")).told.verdict).toBe("right");
    const { told } = play(readTheMove(level("L3"), "white", L3), click("e8", "c8"));
    expect(told.line).toBe("No: O-O-O moves Black's king from e8 to c8, and the rook from a8 to d8. You left out a8 and d8.");
    expect(told.score.mistakes).toEqual(["A square left out"]);
  });

  it("judges the card's L4 example: Nbd2, as Black", () => {
    expect(play(readTheMove(level("L4"), "black", L4), click("b1", "d2")).told.verdict).toBe("right");
    const { told } = play(readTheMove(level("L4"), "black", L4), click("f3", "d2"));
    expect(told.line).toBe("No: Nbd2 is the knight on the b-file: b1 and d2. The knight on f3 reaches d2 too, so the move names its file.");
    expect(told.score.mistakes).toEqual(["The other of two that can"]);
  });

  it("judges the card's L5 example: exf3 in passing, on the revealed board", () => {
    const right = play(readTheMove(level("L5"), "white", L5), click("e4", "f3", "f4"));
    const ask = right.asks[0]!;
    expect(ask.board).toBeNull();
    expect(ask.words).toBe("White: king g1, rook d1, pawns f4 and g2. Black: king g8, rook d8, pawns e4 and h7.");
    expect(ask.notes).toEqual(["White's last move: f2 to f4."]);
    expect(ask.question).toBe("Black plays exf3. Which squares does it change?");
    expect(ask.input).toEqual(REVEALED);
    expect(right.told.verdict).toBe("right");
    // Their order never counts.
    expect(play(readTheMove(level("L5"), "white", L5), click("f4", "e4", "f3")).told.verdict).toBe("right");
    const { told } = play(readTheMove(level("L5"), "white", L5), click("e4", "f3"));
    expect(told.line).toBe("No: exf3 takes White's pawn on f4 in passing: e4, f3 and f4. You left out f4.");
    expect(told.score.mistakes).toEqual(["A square left out"]);
  });

  it("judges the card's L6 example: the Najdorf's 3... cxd4 4. Nxd4 Nf6 5. Nc3", () => {
    const right = play(readTheSequence(level("L6"), NAJDORF), click("c5", "d4"), click("f3", "d4"), click("g8", "f6"), click("b1", "c3"));
    expect(right.asks).toHaveLength(4);
    expect(right.asks.map((a) => a.input)).toEqual(Array(4).fill(REVEALED));
    expect(right.asks[0]!.question).toBe("3... cxd4 4. Nxd4 Nf6 5. Nc3. Which squares does each move change?");
    expect(right.asks[0]!.words).toBe(
      "White: king e1, queen d1, rooks a1 and h1, bishops c1 and f1, knights b1 and f3, pawns a2, b2, c2, d4, e4, f2, g2 and h2. Black: king e8, queen d8, rooks a8 and h8, bishops c8 and f8, knights b8 and g8, pawns a7, b7, c5, d6, e7, f7, g7 and h7.",
    );
    expect(right.asks[0]!.notes).toEqual(["From the Sicilian Defense, Najdorf Variation, after White's third move.", "Move 1 of 4: 3... cxd4."]);
    // The words are renewed after each move.
    expect(right.asks[1]!.words).toBe(
      "White: king e1, queen d1, rooks a1 and h1, bishops c1 and f1, knights b1 and f3, pawns a2, b2, c2, e4, f2, g2 and h2. Black: king e8, queen d8, rooks a8 and h8, bishops c8 and f8, knights b8 and g8, pawns a7, b7, d4, d6, e7, f7, g7 and h7.",
    );
    expect(right.asks[3]!.notes[1]).toBe("Move 4 of 4: 5. Nc3.");
    expect(right.told).toMatchObject({ verdict: "right", line: "Right: all 4 moves.", score: { counts: { "Moves right": 4, "Moves asked": 4 } } });
    const { told, done } = play(readTheSequence(level("L6"), NAJDORF), click("c7", "d4"), click("f3", "d4"), click("g8", "f6"), click("b1", "c3"));
    expect(told.line).toBe("No: 3... cxd4 is Black's pawn on c5 taking on d4: c5 and d4. That pawn left c7 at move 1. The other three moves were right.");
    expect(told.score).toMatchObject({ right: false, mistakes: ["A move read from an old position"], counts: { "Moves right": 3, "Moves asked": 4 } });
    expect(sequenceOf(backOf(done))).toEqual(NAJDORF);
    // A sequence left when the minutes run out: its 4 moves asked, none right.
    expect(readTheSequence(level("L6"), NAJDORF).unasked).toEqual({ "Moves right": 0, "Moves asked": 4 });
  });

  it("names each mistake on the card", () => {
    const wrong = (q: Question, l: string, ...s: Square[]) => play(readTheMove(level(l), other(q.move.side), q), click(...s)).told.score.mistakes;
    expect(wrong(L1, "L1", "e6", "d5")).toEqual(["The file beside"]);
    expect(wrong(L1, "L1", "f5", "d5")).toEqual(["The rank beside"]);
    expect(wrong(L1, "L1", "c3", "d5")).toEqual(["The board turned"]);
    expect(wrong(L1, "L1", "c6", "d5")).toEqual(["The files reversed"]);
    expect(wrong(L1, "L1", "f3", "d5")).toEqual(["The ranks reversed"]);
    expect(wrong(L2, "L2", "c3", "d5")).toEqual(["A piece of another kind"]);
    expect(wrong(L3, "L3", "e8", "g8")).toEqual(["A square left out", "The other side's castling"]);
    expect(play(readTheMove(level("L3"), "white", L3), click("e8", "g8")).told.line).toBe(
      "No: O-O-O moves Black's king from e8 to c8, and the rook from a8 to d8. O-O-O castles toward a8.",
    );
    expect(wrong(L1, "L1", "f6", "d5", "a1")).toEqual(["Another square"]);
    expect(MISTAKES).toEqual([
      "A square left out", "The file beside", "The rank beside", "The board turned", "The files reversed", "The ranks reversed",
      "A piece that cannot go there", "The other of two that can", "A piece of another kind", "The other side's castling",
      "A move read from an old position", "Another square",
    ]);
  });

  // Ten rounds of set-up positions: slow while the whole suite runs at once.
  it("makes each level's mix of moves, every position by the card's rules", { timeout: 60_000 }, () => {
    const want: Record<string, Record<string, number>> = {
      L1: { move: 10 },
      L2: { capture: 5, move: 5 },
      L3: { castling: 2, promotion: 2, "en passant": 2, capture: 2, move: 2 },
      L4: { move: 5, castling: 1, promotion: 1, "en passant": 1, capture: 2 },
    };
    for (const id of ["L1", "L2", "L3", "L4", "L5"]) {
      for (const side of ["white", "black"] as const) {
        const items = challenge.makeRound(level(id), seeded(`3.1.1 ${id} ${side}`), { side, back: [] });
        expect(items).toHaveLength(10);
        const kinds: Record<string, number> = {};
        let twins = 0;
        let pawnMoves = 0;
        let apart = { file: 0, rank: 0 };
        for (const item of items) {
          const ask = item.first() as Ask;
          const back = backOf(play(item, click("a1")).done);
          const q = questionOf(back)!;
          expect(q.move.side).toBe(other(side));
          const kind = moveKind(q.move);
          kinds[kind] = (kinds[kind] ?? 0) + 1;
          if (q.move.kind === "pawn" && kind === "move") pawnMoves++;
          const by = apartBy(q.move.san);
          if (by.file) apart.file++;
          if (by.rank) apart.rank++;
          const besides = Object.values(q.pos.board).filter((p) => p!.kind !== "king");
          expect(besides).toHaveLength(id === "L1" ? 4 : 6);
          // Both kings, and other pieces of both sides.
          expect(new Set(besides.map((p) => p!.side)).size).toBe(2);
          const mine = (Object.entries(q.pos.board) as [Square, { side: string; kind: string }][]).filter(([, p]) => p.side === q.move.side && p.kind === q.move.kind);
          if (mine.length > 1) twins++;
          for (const [sq] of mine) expect(pinned(q.pos, sq)).toBe(false);
          if (id === "L5") {
            expect(ask.board).toBeNull();
            expect(ask.words).toBeTruthy();
            expect(ask.input).toEqual(REVEALED);
          } else expect(ask.board?.seat).toBe(side);
          expect(kingSquare(q.pos, side)).not.toBeNull();
          // Right: exactly the squares it changes.
          const again = readTheMove(level(id), side, q);
          again.first();
          const told = again.next(click(...changes(q.move))) as Told;
          expect(told.verdict).toBe("right");
        }
        if (id === "L1") expect(pawnMoves).toBe(3);
        if (id === "L2") expect(pawnMoves).toBe(2);
        expect(kinds).toEqual(want[id === "L5" ? "L4" : id]);
        if (id === "L4" || id === "L5") expect(apart).toEqual({ file: 3, rank: 1 });
        expect(twins).toBeGreaterThanOrEqual(7);
      }
    }
  });

  it("asks 3 sequences at L6: 1 from move 1, 2 from a Black move after White's move 3 to 15", () => {
    const items = challenge.makeRound(level("L6"), seeded("3.1.1 L6"), { side: "white", back: [], packs: PACKS });
    expect(items).toHaveLength(3);
    const firsts = items.map((i) => (i.first() as Ask).notes.at(-1)!);
    expect(firsts.filter((n) => /^Move 1 of 4: 1\. /.test(n))).toHaveLength(1);
    for (const n of firsts.filter((x) => !/^Move 1 of 4: 1\. /.test(x))) {
      const m = n.match(/^Move 1 of 4: (\d+)\.\.\. /)!;
      expect(Number(m[1])).toBeGreaterThanOrEqual(3);
      expect(Number(m[1])).toBeLessThanOrEqual(15);
    }
    for (const item of items) {
      const ask = item.first() as Ask;
      const pieces = (ask.words!.match(/[a-h][1-8]/g) ?? []).length - 2;
      if (!/Move 1 of 4: 1\. /.test(ask.notes.at(-1)!)) {
        expect(pieces).toBeGreaterThanOrEqual(16);
        expect(pieces).toBeLessThanOrEqual(30);
      }
    }
  });

  it("names the move just played before a sequence's first move takes in passing", () => {
    const start = playLine(startingPosition(), ["e4", "a6", "e5", "d5"]).positions.at(-1)!;
    const seq: Sequence = { start: toFen(start), before: [], sans: ["exd6", "e6", "dxc7", "Qxc7"], from: "From a test line." };
    const ask = readTheSequence(level("L6"), seq).first() as Ask;
    expect(ask.notes).toEqual(["From a test line.", "Black's last move: d7 to d5.", "Move 1 of 4: 3. exd6."]);
    // Within a sequence, the move before it.
    const mid: Sequence = { start: toFen(playLine(startingPosition(), ["e4", "a6", "e5"]).positions.at(-1)!), before: [], sans: ["d5", "exd6", "e6", "dxc7"], from: "From a test line." };
    const item = readTheSequence(level("L6"), mid);
    item.first();
    const second = item.next(click("d7", "d5")) as Ask;
    expect(second.notes).toEqual(["From a test line.", "Black's last move: d7 to d5.", "Move 2 of 4: 3. exd6."]);
  });

  it("brings a missed question back, the same position and move, one side kept for the round", () => {
    const back = [questionFacts(L4), questionFacts(L1), { fen: "nonsense" }, 7];
    // Its own level's round: the first question back sets the side, Black.
    const items = challenge.makeRound(level("L2"), seeded("3.1.1 back"), { side: "white", back });
    expect(items).toHaveLength(10);
    const asks = items.map((i) => i.first() as Ask);
    expect(asks.map((a) => a.board?.seat)).toEqual(Array(10).fill("black"));
    expect(asks.some((a) => a.question === "White plays Nbd2. Which squares does it change?")).toBe(true);
    expect(asks.some((a) => a.question === "Black plays Nd5. Which squares does it change?")).toBe(false);
    // A mixed round keeps its side: the question seated as Black waits.
    const mixed = challenge.makeRound(level("L5"), seeded("3.1.1 back mixed"), { side: "white", count: 5, back });
    const questions = mixed.map((i) => (i.first() as Ask).question);
    expect(questions).toContain("Black plays Nd5. Which squares does it change?");
    expect(questions.every((q) => q.startsWith("Black plays"))).toBe(true);
    const seqs = challenge.makeRound(level("L6"), seeded("3.1.1 back 6"), { side: "white", back: [{ ...NAJDORF }], packs: PACKS });
    expect(seqs.map((i) => (i.first() as Ask).question)).toContain("3... cxd4 4. Nxd4 Nf6 5. Nc3. Which squares does each move change?");
  });

  // Record line 3-088: a come-back loses a round only in a round that asks it.
  it("says which come-backs a round asks: the side kept, the count, and its own level's kind", () => {
    const back = [questionFacts(L4), questionFacts(L1), { ...NAJDORF }, { fen: "nonsense" }, 7];
    // Its own level's round: the first question back sets the side, Black, so the question Black plays waits, and so does the sequence.
    expect(challenge.asks!(level("L2"), { side: "white", back })).toEqual([questionFacts(L4)]);
    // A mixed round keeps the side it drew: White's question waits.
    expect(challenge.asks!(level("L5"), { side: "white", count: 5, back })).toEqual([questionFacts(L1)]);
    // L6 asks the sequence alone: no question of L1 to L5.
    expect(challenge.asks!(level("L6"), { side: "white", back })).toEqual([{ ...NAJDORF }]);
    // Past the round's count, a question waits.
    const six = Array.from({ length: 6 }, () => questionFacts(L1));
    expect(challenge.asks!(level("L5"), { side: "white", count: 5, back: six })).toHaveLength(5);
    // What it says it asks is what it makes: each asked question is in the round.
    const items = challenge.makeRound(level("L5"), seeded("3.1.1 asks"), { side: "white", count: 5, back: six });
    expect(items.map((i) => (i.first() as Ask).question).filter((q) => q === "Black plays Nd5. Which squares does it change?")).toHaveLength(5);
  });

  it("asks a mixed round's count, and gives one seed one round", () => {
    expect(challenge.makeRound(level("L5"), seeded("mixed"), { side: "black", count: 5, back: [] })).toHaveLength(5);
    const qs = (seed: string) => challenge.makeRound(level("L3"), seeded(seed), { side: "white", back: [] }).map((i) => (i.first() as Ask).question);
    expect(qs("same")).toEqual(qs("same"));
  });
});
