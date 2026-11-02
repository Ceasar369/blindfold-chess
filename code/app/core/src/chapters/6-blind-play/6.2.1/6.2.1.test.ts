import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { fromPieces, fromWords, type Position } from "../../../positions/index.ts";
import { seeded } from "../../../random/index.ts";
import { legalMoves, type Move, play as rulesPlay, playLine } from "../../../rules/index.ts";
import type { Ask, Facts, Item, Level, Packs, Show, Side, Square, Step, Told } from "../../../shape/index.ts";
import { challenge, fastest, fewestOf, keySquares, LEVELS, makeItem, MISTAKE, PACKS, randomDefender, replayDefender } from "./index.ts";
import { counts, type Endgame, solve } from "./solver.ts";

const dir = join(import.meta.dirname, "..", "..", "..", "..", "packs");
const packs: Packs = Object.fromEntries(PACKS.map((p) => [p, readFileSync(join(dir, p))]));
const tables = Object.fromEntries(
  (["queen", "rook", "pawn"] as Endgame[]).map((k) => [k, new Uint8Array(readFileSync(join(dir, `endgames/${k}.bin`)))]),
) as Record<Endgame, Uint8Array>;
const ENDGAME: Record<string, Endgame> = { L1: "queen", L2: "queen", L3: "queen", L4: "rook", L5: "rook", L6: "pawn" };
const level = (id: string): Level => LEVELS.find((l) => l.id === id)!;
const tableFor = (id: string) => tables[ENDGAME[id]!];

// Plays an endgame: each move in turn, as the move composer gives it. Returns every step it gave.
function play(item: Item, moves: string[]): Step[] {
  const steps: Step[] = [item.first()];
  if (steps[0]!.step === "show") steps.push(item.next({ did: "press" }));
  for (const text of moves) steps.push(item.next({ did: "answer", answer: { kind: "text", text } }));
  return steps;
}

const asks = (steps: Step[]) => steps.filter((s): s is Ask => s.step === "ask");
const toldOf = (steps: Step[]) => steps.at(-1) as Told;

// An example: its level, its position, my moves, and the lone king's replies.
type Example = { level: string; words: string; mine: string[]; replies: Square[] };

const EXAMPLES: Record<string, Example> = {
  L1: {
    level: "L1", words: "White: king e1, queen d1. Black: king e5. White to move.",
    mine: "Qd7 Ke2 Qd6 Kf3 Qe6 Kf4 Qg4".split(" "), replies: ["f6", "g5", "f5", "g5", "h5", "h4"],
  },
  L2: {
    level: "L2", words: "White: king b4. Black: king g8, queen f7. Black to move.",
    mine: "Qc7 Kf7 Qb7 Ke6 Qb2 Kd6 Kc5 Qa2".split(" "), replies: ["b5", "a4", "a3", "a4", "a5", "a4", "a5"],
  },
  L3: {
    level: "L3", words: "White: king g1, queen c3. Black: king d6. White to move.",
    mine: "Kf2 Kf3 Ke4 Qc6 Qd7 Ke5 Kf6 Qg7".split(" "), replies: ["d5", "d6", "e7", "f8", "g8", "h8", "g8"],
  },
  L4: {
    level: "L4", words: "White: king g1, rook b2. Black: king c5. White to move.",
    mine: "Rd2 Kf2 Rc2 Ke3 Ke4 Rc3 Rb3 Kd5 Rb1 Kc4 Kc5 Kc6 Kc7 Ra1".split(" "),
    replies: ["c6", "b6", "b7", "b6", "b7", "a6", "a5", "a4", "a5", "a6", "a7", "a8", "a7"],
  },
  L5: {
    level: "L5", words: "White: king e1, rook c1. Black: king d4. White to move.",
    mine: "Kd2 Kd3 Re1 Kc3 Kd4 Kc4 Rd1 Rd6+ Kb5 Rd3 Rc3 Rc7 Kb6 Rc8".split(" "),
    replies: ["e5", "d6", "d5", "c6", "d6", "c6", "b6", "b7", "c7", "b7", "a8", "b8", "a8"],
  },
  L6: {
    level: "L6", words: "White: king e6, pawn e5. Black: king e8. White to move.",
    mine: "Kd6 e6 e7 Kd7 e8=Q".split(" "), replies: ["f8", "e8", "f7", "g8"],
  },
};

const item = (ex: Example) => makeItem(level(ex.level), fromWords(ex.words), tableFor(ex.level), replayDefender(ex.replies));

describe("6.2.1's solver and its tables", () => {
  it("counts every position as the references do", () => {
    const q = counts(tables.queen);
    const r = counts(tables.rook);
    const p = counts(tables.pawn);
    expect([q.positions, q.won, r.positions, r.won, p.positions, p.won]).toEqual([144508, 144508, 175168, 175168, 163328, 124954]);
    expect(q.byMoves).toEqual({ 1: 2448, 2: 5012, 3: 9064, 4: 19964, 5: 26164, 6: 32064, 7: 32104, 8: 15000, 9: 2680, 10: 8 });
    expect(Math.max(...Object.keys(r.byMoves).map(Number))).toBe(16);
    expect(Math.max(...Object.keys(p.byMoves).map(Number))).toBe(19);
    const band = (c: ReturnType<typeof counts>, lo: number, hi: number) =>
      Object.entries(c.byMoves).filter(([k]) => Number(k) >= lo && Number(k) <= hi).reduce((n, [, v]) => n + v, 0);
    expect([band(q, 6, 8), band(r, 10, 14), band(p, 5, 10)]).toEqual([79168, 94932, 36054]);
  });

  it("makes the tables the site serves, byte for byte", () => {
    for (const k of ["queen", "rook", "pawn"] as Endgame[]) expect(Buffer.compare(Buffer.from(solve(k)), Buffer.from(tables[k]))).toBe(0);
  }, 60_000);

  it("gives every example its fewest moves, and the pawn's key squares", () => {
    expect(Object.values(EXAMPLES).map((e) => fewestOf(tableFor(e.level), fromWords(e.words), fromWords(e.words).turn))).toEqual([7, 8, 8, 14, 14, 5]);
    // L1's example, mirrored: mate in 7 at best.
    expect(fewestOf(tables.queen, fromWords("White: king d1, queen e1. Black: king d5. White to move."), "white")).toBe(7);
    // 1. Kd6 and 1. Kf6 win fastest; after 1. Kd5 the tables say draw.
    expect(fastest(tables.pawn, fromWords(EXAMPLES.L6!.words), "white", "pawn").map((m) => m.san).sort()).toEqual(["Kd6", "Kf6"]);
    expect(fewestOf(tables.pawn, fromWords("White: king d5, pawn e5. Black: king e7. White to move."), "white")).toBeNull();
    const name = (n: number) => `${"abcdefgh"[n & 7]}${(n >> 3) + 1}`;
    expect(keySquares(4 * 8 + 4).map(name).sort()).toEqual(["d6", "d7", "e6", "e7", "f6", "f7"]);
    expect(keySquares(1 * 8 + 4).map(name).sort()).toEqual(["d4", "e4", "f4"]);
    expect(keySquares(3 * 8 + 0).map(name).sort()).toEqual(["b7", "b8"]);
  });
});

describe("6.2.1 Play out the endgame", () => {
  it("copies the card's level table", () => {
    expect(LEVELS.map((l) => [l.id, l.dials.map((d) => d.value).join(" | "), l.questions, l.minutes, l.seconds, l.seat])).toEqual([
      ["L1", "King and queen v king | A board, renewed after each move | 6 to 8", 2, 5, null, "round"],
      ["L2", "King and queen v king | Words, renewed after each move | 6 to 8", 2, 5, null, "round"],
      ["L3", "King and queen v king | Words until I hide them, then each move alone | 6 to 8", 2, 5, null, "round"],
      ["L4", "King and rook v king | Words, renewed after each move | 10 to 14", 1, 8, null, "round"],
      ["L5", "King and rook v king | Words until I hide them, then each move alone | 10 to 14", 1, 8, null, "round"],
      ["L6", "King and pawn v king | Words until I hide them, then each move alone | 5 to 10", 2, 6, null, "round"],
    ]);
    expect(LEVELS[0]!.passMark).toBe("Pass mark for 6.2.1 L1 to L6: the endgames won in one round, and my illegal moves. My practice sets it.");
    expect(challenge.needs).toBe("1.1.1 L2, 2.3.2 L3, 3.2.1 L4 and 6.1.1 L2. From L2, 3.1.1 L6 and 3.2.1 L5. From L3, 4.2.1 L4 and 5.1.1 L2.");
  });

  it("L1: plays the example on a board renewed after each move, then 1. Qd5+", () => {
    const steps = play(item(EXAMPLES.L1!), EXAMPLES.L1!.mine);
    const [first, second] = asks(steps);
    expect(first!.question).toBe("Mate Black's king, in 14 moves at most.");
    expect(first!.board).toMatchObject({ seat: "white", names: false, lit: [] });
    expect(first!.board!.pieces.map((p) => `${p.side} ${p.kind} ${p.square}`)).toEqual(["white king e1", "white queen d1", "black king e5"]);
    expect(first!.time).toBe("move");
    expect(first!.input).toEqual({ how: "compose-move" });
    // The most moves allowed is the goal's own number, handed over as a fact.
    expect(first!.tally).toEqual({ played: 0, allowed: 14, illegal: 0, hints: null });
    expect(second!.tally).toEqual({ played: 1, allowed: 14, illegal: 0, hints: null });
    expect(second!.question).toBe("Black played 1... Kf6. Your move.");
    expect(second!.notes).toEqual(["You played 1. Qd7."]);
    expect(second!.board!.pieces.map((p) => p.square)).toEqual(["e1", "d7", "f6"]);
    const told = toldOf(steps);
    expect(told.line).toBe("Right: mate in 7 moves, the fewest.");
    expect(told.tally).toEqual({ played: 7, allowed: 14, illegal: 0, hints: null });
    expect(told.score).toEqual({ right: true, mistakes: [], counts: { "Moves played": 7, "Fewest moves": 7, "Illegal moves": 0 } });
    expect(told.again!.moves).toBe("1. Qd7 Kf6 2. Ke2 Kg5 3. Qd6 Kf5 4. Kf3 Kg5 5. Qe6 Kh5 6. Kf4 Kh4 7. Qg4#");
    expect(told.again!.board!.pieces.map((p) => p.square)).toEqual(["f4", "g4", "h4"]);
    const wrong = item(EXAMPLES.L1!);
    const w = play(wrong, ["Qd5"]);
    expect(toldOf(w).line).toBe("No: 1. Qd5+ put your queen next to Black's king, unguarded, and 1... Kxd5 took it. King against king: a draw.");
    expect(toldOf(w).score.mistakes).toEqual([MISTAKE.left]);
    // Shown again to its end: the king taking the queen.
    expect(toldOf(w).again!.replay!.map((r) => r.move)).toEqual(["The first position.", "1. Qd5+", "1... Kxd5"]);
    expect(toldOf(w).again!.replay!.at(-1)!.board.pieces.map((p) => p.square)).toEqual(["e1", "d5"]);
    // It comes back, kept as the tables hold it, and mirrored when it returns.
    expect(wrong.next({ did: "press" })).toEqual({ step: "done", back: { endgame: "queen", start: "White: king e1, queen d1. Black: king e5." } });
  });

  it("L2: sits as Black, words renewed, an illegal move refused and counted", () => {
    const ex = EXAMPLES.L2!;
    const steps = play(item(ex), [...ex.mine.slice(0, 7), "Kb5", ex.mine[7]!]);
    const all = asks(steps);
    expect(all[0]!.question).toBe("Mate White's king, in 16 moves at most.");
    expect(all[0]!.words).toBe("White: king b4. Black: king g8, queen f7. Black to move.");
    expect(all[0]!.board).toBeNull();
    expect(all[1]!.question).toBe("White played 2. Kb5. Your move.");
    expect(all[1]!.notes).toEqual(["You played 1... Qc7."]);
    expect(all[1]!.words).toBe("White: king b5. Black: king g8, queen c7. Black to move.");
    const refused = all.find((a) => a.reopened)!;
    expect(refused.note).toBe("Not counted. The move stays open.");
    expect(refused.question).toBe("White played 8. Ka5. Your move.");
    const told = toldOf(steps);
    expect(told.line).toBe("Right: mate in 8 moves, the fewest. One illegal move: 8... Kb5 would stand next to White's king on a5.");
    expect(told.score.mistakes).toEqual([MISTAKE.illegal]);
    expect(told.score.counts).toEqual({ "Moves played": 8, "Fewest moves": 8, "Illegal moves": 1 });
    expect(told.again!.board!.seat).toBe("black");
    expect(told.again!.moves).toBe("1... Qc7 2. Kb5 Kf7 3. Ka4 Qb7 4. Ka3 Ke6 5. Ka4 Qb2 6. Ka5 Kd6 7. Ka4 Kc5 8. Ka5 Qa2#");
    // The endgame shows again on a board, move by move, the illegal move
    // where I tried it: after 8. Ka5.
    const replay = told.again!.replay!;
    expect(replay.map((r) => r.move)).toEqual([
      "The first position.", "1... Qc7", "2. Kb5", "2... Kf7", "3. Ka4", "3... Qb7", "4. Ka3", "4... Ke6", "5. Ka4",
      "5... Qb2", "6. Ka5", "6... Kd6", "7. Ka4", "7... Kc5", "8. Ka5", "8... Qa2#",
    ]);
    expect(replay[0]!.board).toMatchObject({ seat: "black", lit: [] });
    expect(replay[0]!.board.pieces.map((p) => p.square)).toEqual(["b4", "g8", "f7"]);
    expect(replay[14]!.notes).toEqual(["8... Kb5 would stand next to White's king on a5."]);
    expect(replay.filter((r) => r.notes.length)).toHaveLength(1);
    // The count the screen reads, step by step: the most moves allowed from
    // the first, a move refused counted apart from the moves played.
    expect(all[0]!.tally).toEqual({ played: 0, allowed: 16, illegal: 0, hints: null });
    expect(all[1]!.tally).toEqual({ played: 1, allowed: 16, illegal: 0, hints: null });
    expect(refused.tally).toEqual({ played: 7, allowed: 16, illegal: 1, hints: null });
    expect(told.tally).toEqual({ played: 8, allowed: 16, illegal: 1, hints: null });
    expect(replay.at(-1)!.board).toMatchObject({ lit: ["b2", "a2"] });
    expect(replay.at(-1)!.board.pieces).toEqual(told.again!.board!.pieces);
  });

  it("L3: words until I hide them, then each move alone; 7. Qf7 stalemates", () => {
    const ex = EXAMPLES.L3!;
    const steps = play(item(ex), ex.mine);
    const show = steps[0] as Show;
    expect(show).toEqual({
      step: "show", words: "White: king g1, queen c3. Black: king d6. White to move.", button: "Hide", time: "look",
      tally: { played: 0, allowed: 16, illegal: 0, hints: null },
    });
    const all = asks(steps);
    expect(all[0]!.question).toBe("Mate Black's king, in 16 moves at most.");
    expect(all.every((a) => a.board === null && a.words === undefined)).toBe(true);
    expect(all[1]!.question).toBe("Black played 1... Kd5. Your move.");
    expect(toldOf(steps).line).toBe("Right: mate in 8 moves, the fewest.");
    const wrong = play(item(ex), [...ex.mine.slice(0, 6), "Qf7"]);
    expect(toldOf(wrong).line).toBe("No: 7. Qf7 left Black's king on h8 no move, and not in check: stalemate, a draw. 7. Kf6 kept the win.");
    expect(toldOf(wrong).score.mistakes).toEqual([MISTAKE.stalemate]);
  });

  it("L4: the rook in words; 13. Rb7 stalemates", () => {
    const ex = EXAMPLES.L4!;
    const steps = play(item(ex), ex.mine);
    expect(asks(steps)[0]!.question).toBe("Mate Black's king, in 28 moves at most.");
    expect(asks(steps)[0]!.tally!.allowed).toBe(28);
    expect(asks(steps)[0]!.words).toBe("White: king g1, rook b2. Black: king c5. White to move.");
    expect(toldOf(steps).line).toBe("Right: mate in 14 moves, the fewest.");
    const wrong = play(item(ex), [...ex.mine.slice(0, 12), "Rb7"]);
    expect(toldOf(wrong).line).toBe("No: 13. Rb7 left Black's king on a8 no move, and not in check: stalemate, a draw. 13. Kc7 kept the win.");
  });

  it("L5: the rook held; 1. Rc4+ left to the king", () => {
    const ex = EXAMPLES.L5!;
    const steps = play(item(ex), ex.mine);
    expect((steps[0] as Show).words).toBe("White: king e1, rook c1. Black: king d4. White to move.");
    expect(toldOf(steps).line).toBe("Right: mate in 14 moves, the fewest.");
    const wrong = play(item(ex), ["Rc4"]);
    expect(toldOf(wrong).line).toBe("No: 1. Rc4+ put your rook next to Black's king, unguarded, and 1... Kxc4 took it. King against king: a draw.");
  });

  it("L6: the pawn made a queen; 1. Kd5 lets the win slip", () => {
    const ex = EXAMPLES.L6!;
    const steps = play(item(ex), ex.mine);
    expect(asks(steps)[0]!.question).toBe("Make your pawn a queen, in 10 moves at most.");
    // > Stand-in. The card gives no right line for the pawn.
    expect(toldOf(steps).line).toBe("Right: a queen in 5 moves, the fewest.");
    expect(toldOf(steps).again!.moves).toBe("1. Kd6 Kf8 2. e6 Ke8 3. e7 Kf7 4. Kd7 Kg8 5. e8=Q+");
    const wrong = play(item(ex), ["Kd5"]);
    expect(toldOf(wrong).line).toBe("No: after 1. Kd5, Black draws with 1... Ke7. Your king left e6, a key square for your pawn.");
    expect(toldOf(wrong).score.mistakes).toEqual([MISTAKE.slipped]);
  });

  it("refuses a slip and an unclear promotion, and stops when my moves run out", () => {
    // A knight's key alone names no move.
    const slip = play(item(EXAMPLES.L6!), ["N"]);
    expect(asks(slip)[1]).toMatchObject({ reopened: true, note: "Not counted. The move stays open." });
    const pawn = makeItem(level("L6"), fromWords("White: king d6, pawn e7. Black: king g7. White to move."), tables.pawn, replayDefender([]));
    const steps = play(pawn, ["e8", "e8=Q"]);
    expect(asks(steps)[1]).toMatchObject({ reopened: true, note: "Say which piece your pawn becomes." });
    expect(toldOf(steps).score.counts).toMatchObject({ "Moves left unclear": 1 });
    // Too slow: a move that keeps the win, never the mate, 14 times in L1's example.
    const slow = makeItem(level("L1"), fromWords(EXAMPLES.L1!.words), tables.queen, randomDefender(seeded("slow")));
    let pos = fromWords(EXAMPLES.L1!.words);
    let step = slow.first();
    for (let i = 0; i < 14 && step.step === "ask"; i++) {
      const m = legalMoves(pos).find((x) => {
        const after = rulesPlay(pos, x)!;
        return !x.san.endsWith("#") && legalMoves(after).length > 0 && !legalMoves(after).some((r) => r.captured);
      })!;
      step = slow.next({ did: "answer", answer: { kind: "text", text: m.san } });
      pos = advance(pos, m, step);
    }
    expect((step as Told).line).toBe("No: 14 moves, and no mate. The fewest: 7.");
    expect((step as Told).score.mistakes).toEqual([MISTAKE.slow]);
  });

  it("plays every level's round whole, the lone king's replies always among the longest, my moves the fastest", () => {
    for (const l of LEVELS) {
      for (const side of ["white", "black"] as Side[]) {
        const items = challenge.makeRound(l, seeded(`6.2.1 ${l.id} ${side}`), { side, back: [], packs });
        expect(items).toHaveLength(l.questions);
        for (const it of items) {
          let step = it.first();
          let pos: Position;
          if (step.step === "show") {
            pos = fromWords(step.words!);
            step = it.next({ did: "press" });
          } else pos = step.step === "ask" && step.words ? fromWords(step.words) : fromPieces((step as Ask).board!.pieces, side);
          expect(pos.turn).toBe(side);
          let guard = 0;
          while (step.step === "ask") {
            const best = fastest(tableFor(l.id), pos, side, ENDGAME[l.id]!)[0]!;
            step = it.next({ did: "answer", answer: { kind: "text", text: best.san } });
            pos = advance(pos, best, step);
            if (++guard > 40) throw new Error("No end.");
          }
          const told = step as Told;
          expect(told.line).toMatch(/^Right: (mate|a queen) in \d+ moves, the fewest\.$/);
          const [lo, hi] = l.dials[2]!.value.split(" to ").map(Number);
          expect(told.score.counts["Fewest moves"]).toBeGreaterThanOrEqual(lo!);
          expect(told.score.counts["Fewest moves"]).toBeLessThanOrEqual(hi!);
          expect(it.next({ did: "press" })).toEqual({ step: "done", back: null });
        }
      }
    }
  }, 120_000);

  it("brings a missed endgame back mirrored, among the round's, and gives one seed one round", () => {
    const back: Facts[] = [
      { endgame: "queen", start: "White: king d1, queen e1. Black: king d5." },
      { endgame: "rook", start: "White: king a1, rook b1. Black: king h8." },
    ];
    const items = challenge.makeRound(level("L1"), seeded("back"), { side: "white", back, packs });
    expect(items.map((i) => (i.first() as Ask).board!.pieces.map((p) => p.square).join(" "))).toContain("e1 d1 e5");
    const black = challenge.makeRound(level("L2"), seeded("back"), { side: "black", back, packs });
    expect(black.map((i) => (i.first() as Ask).words)).toContain("White: king e4. Black: king e8, queen d8. Black to move.");
    const qs = (seed: string) => challenge.makeRound(level("L4"), seeded(seed), { side: "white", back: [], packs }).map((i) => (i.first() as Ask).words);
    expect(qs("same")).toEqual(qs("same"));
    expect(qs("same")).not.toEqual(qs("other"));
    expect(challenge.makeRound(level("L6"), seeded("mixed"), { side: "white", count: 1, back: [], packs })).toHaveLength(1);
  });

  // Record line 6-150: a missed endgame comes back only at a level of its own kind, and only a round that asks it counts as one of its two.
  it("says which come-backs a round asks: its own kind alone", () => {
    const queen = { endgame: "queen", start: "White: king d1, queen e1. Black: king d5." };
    const rook = { endgame: "rook", start: "White: king a1, rook b1. Black: king h8." };
    const back: Facts[] = [queen, rook, { endgame: "pawn", start: "nonsense" }, 7];
    const facts = { side: "white" as const, back, packs };
    // The queen levels ask the queen endgame; the rook levels, the rook endgame; the pawn level neither.
    for (const id of ["L1", "L2", "L3"]) expect(challenge.asks!(level(id), facts)).toEqual([queen]);
    for (const id of ["L4", "L5"]) expect(challenge.asks!(level(id), facts)).toEqual([rook]);
    expect(challenge.asks!(level("L6"), facts)).toEqual([]);
    // What it says it asks is what it makes: the queen endgame, mirrored, in an L1 round.
    const items = challenge.makeRound(level("L1"), seeded("6.2.1 asks"), { ...facts, count: 2 });
    expect(items.map((i) => (i.first() as Ask).board!.pieces.map((p) => p.square).join(" "))).toContain("e1 d1 e5");
    // Past the round's count, an endgame waits.
    const six = Array.from({ length: 6 }, () => queen);
    expect(challenge.asks!(level("L1"), { ...facts, count: 2, back: six })).toHaveLength(2);
  });
});

// The position after my move, and the reply the next question names.
function advance(pos: Position, mine: Move, next: Step): Position {
  const after = rulesPlay(pos, mine)!;
  if (next.step !== "ask") return after;
  const reply = next.question.match(/played \d+\.+ (\S+)\. Your move\.$/)![1]!;
  return playLine(after, [reply]).positions[0]!;
}
