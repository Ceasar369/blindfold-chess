// 5.2.1 Rebuild after the moves: its level table, its round maker, its judge,
// its mistake names and its told lines.
//
// Source: code/blueprint/docs/updating-a-position.md, 5.2.1.
//
// > Stand-in. Whether each move, and at L3 the opening's name, is also read
// > aloud. I answer it later, with session 10. Every level plays in silence.

import { MISTAKE, NEAR_MISSES } from "../../../near-misses/index.ts";
import { numberedLine } from "../../../notation/index.ts";
import { afterOpenings, type AfterOpening, firstLines, type LinesPack, type OpeningsPack, packOf } from "../../../packs/index.ts";
import { gradePosition, type PositionGrade, squaresRight } from "../../../position-grader/index.ts";
import { fromFen, fromPieces, KINDS, other, type Position, piecesOf, samePiece, sideWord, startingPosition } from "../../../positions/index.ts";
import type { Challenge, Did, Item, Level, Piece, Side, Square, Step, Told } from "../../../shape/index.ts";
import { moveWords } from "../../../thread/index.ts";
import { askedBacks, backOf, fromLine, type Line, lastOff, lostCount, lostKind, type Miss, pickLines, sequence, type Sequence, stands } from "../sequences.ts";

const PASS_MARK =
  "Pass mark for 5.2.1 L1 to L5: the positions rebuilt whole and the squares right in one round, and my average time per move. My practice sets it.";

// The card's level table, row by row.
const TABLE = [
  { id: "L1", path: "Rebuild after the moves, the list read whole.", first: "The starting position", halfMoves: "6", reach: "The whole list, until I hide it", questions: 5, minutes: 4 },
  { id: "L2", path: "Rebuild after the moves, one at a time.", first: "The starting position", halfMoves: "6", reach: "One at a time", questions: 5, minutes: 5 },
  { id: "L3", path: "Rebuild after the moves, from an opening by its name.", first: "An opening, by its name", halfMoves: "6 after it", reach: "One at a time", questions: 3, minutes: 4 },
  { id: "L4", path: "Rebuild after the moves, 12 half-moves.", first: "The starting position", halfMoves: "12", reach: "One at a time", questions: 2, minutes: 5 },
  { id: "L5", path: "Rebuild after the moves, through move 10.", first: "The starting position", halfMoves: "20", reach: "One at a time", questions: 1, minutes: 4 },
] as const;

type Row = (typeof TABLE)[number];

export const LEVELS: Level[] = TABLE.map((row) => ({
  id: row.id,
  path: row.path,
  questions: row.questions,
  minutes: row.minutes,
  seconds: null,
  seat: "round",
  passMark: PASS_MARK,
  dials: [
    { name: "The first position", value: row.first },
    { name: "Half-moves", value: row.halfMoves },
    { name: "How the moves reach me", value: row.reach },
  ],
}));

// The card's mistakes, in its order. A piece placed where it does not stand
// takes the first kind it fits.
export const MISTAKES = [
  ...NEAR_MISSES.map((k) => MISTAKE[k]),
  "An old square",
  "A piece taken, left on",
  "A piece moved that stays home",
  "Two pieces swapped",
  "The wrong piece",
  "The wrong side",
  "A piece left out",
  "Another square",
];

function rowOf(level: Level): Row {
  const row = TABLE.find((r) => r.id === level.id);
  if (!row) throw new Error(`5.2.1 has no level ${level.id}.`);
  return row;
}

// ---------------------------------------------------------------------------
// Where I lost the thread

type Board = Position["board"];

const placedWords = (p: Piece) => `${sideWord(p.side)}'s ${p.kind}`;

// The move at `ply`, in the words that say what it did. `wrong`: the squares
// I got wrong, so castling names the piece I lost.
// > Stand-in. A plain first move, castling's king, a pawn taken in passing and
// > a promotion: the card gives no words for them.
export function whatItDid(seq: Sequence, ply: number, wrong: readonly Square[]): string {
  const t = seq.thread;
  const m = seq.moves[ply - 1]!;
  const side = sideWord(m.side);
  const them = sideWord(other(m.side));
  if (m.castle) {
    const rank = m.from[1];
    const [from, to] = m.castle === "king" ? [`h${rank}`, `f${rank}`] : [`a${rank}`, `d${rank}`];
    const rook = wrong.some((s) => s === from || s === to);
    return `castling on the ${m.castle}'s side takes ${side}'s ${rook ? `rook from ${from} to ${to}` : `king from ${m.from} to ${m.to}`}.`;
  }
  if (m.enPassant) return `${side}'s pawn took ${them}'s pawn on ${m.to[0]}${m.from[1]} in passing.`;
  if (m.promotion) {
    return m.captured
      ? `${side}'s pawn from ${m.from} took ${them}'s ${m.captured} on ${m.to}, and became a ${m.promotion}.`
      : `${side}'s pawn went from ${m.from} to ${m.to}, and became a ${m.promotion}.`;
  }
  if (m.captured) return `${side}'s ${m.kind}${m.captured === m.kind ? ` from ${m.from}` : ""} took ${them}'s ${m.captured} on ${m.to}.`;
  // Every square the piece stood on before this move.
  const id = t.frames[ply - 1]![m.from]!.id;
  const held = new Set<Square>();
  for (let k = 0; k < ply; k++) {
    for (const [square, at] of Object.entries(t.frames[k]!) as [Square, { id: number }][]) if (at.id === id) held.add(square);
  }
  if (held.has(m.to)) return `${side}'s ${m.kind} went back from ${m.from} to ${m.to}.`;
  if (held.size > 1) return `${side}'s ${m.kind} went on from ${m.from} to ${m.to}.`;
  return `${side}'s ${m.kind} went from ${m.from} to ${m.to}.`;
}

// For each square I got wrong, the last move that took my answer off it;
// the earliest of those, or null when no square held my answer before.
export function lostAt(seq: Sequence, grade: PositionGrade): number | null {
  const plies = grade.wrong.map((w) => lastOff(seq.thread, w.square, w.built)).filter((p): p is number => p !== null);
  return plies.length ? Math.min(...plies) : null;
}

// ---------------------------------------------------------------------------
// The mistakes

// Each mistake one answer shows, as the card names them.
export function mistakesOf(seq: Sequence, built: Board, grade: PositionGrade): string[] {
  const t = seq.thread;
  const end = t.frames[seq.moves.length]!;
  const right = seq.final.board;
  const swapped = new Set(grade.swaps.flat());
  const pairedAt = new Map(grade.pairs.map((p) => [p.placed, p]));
  const belongs = new Set(grade.pairs.map((p) => p.belongs));
  const out: string[] = [];

  const placedKind = (square: Square, piece: Piece): string => {
    const pair = pairedAt.get(square);
    if (pair?.kind) return MISTAKE[pair.kind];
    // The last piece of this side and kind on this square before the end.
    let id: number | null = null;
    for (let k = seq.moves.length - 1; k >= 0 && id === null; k--) {
      const at = t.frames[k]![square];
      if (at && samePiece(at.piece, piece)) id = at.id;
    }
    if (id !== null) return stands(end, id) ? "An old square" : "A piece taken, left on";
    if (pair) {
      const home = end[pair.belongs]!.id;
      if (t.frames.every((f) => f[pair.belongs]?.id === home)) return "A piece moved that stays home";
    }
    const there = right[square];
    if (there && there.side === piece.side && there.kind !== piece.kind) return "The wrong piece";
    if (there && there.kind === piece.kind && there.side !== piece.side) return "The wrong side";
    return "Another square";
  };

  for (const _ of grade.swaps) out.push("Two pieces swapped");
  for (const w of grade.wrong) {
    if (swapped.has(w.square)) continue;
    if (w.built) out.push(placedKind(w.square, w.built));
    else if (!belongs.has(w.square)) out.push("A piece left out");
  }
  // Sorted in the card's order.
  return out.sort((a, b) => MISTAKES.indexOf(a) - MISTAKES.indexOf(b));
}

// ---------------------------------------------------------------------------
// The judge

// "Black's queen stands on f6, and its bishop on c5: you swapped them."
function swapLine(right: Board, [a, b]: [Square, Square]): string {
  const order = (s: Square) => KINDS.indexOf(right[s]!.kind) + (right[s]!.side === "white" ? 0 : 10);
  const [x, y] = order(a) <= order(b) ? [a, b] : [b, a];
  const px = right[x]!;
  const py = right[y]!;
  return `${placedWords(px)} stands on ${x}, and ${py.side === px.side ? "its" : `${sideWord(py.side)}'s`} ${py.kind} on ${y}: you swapped them.`;
}

export type Judged = { told: Told; miss: Miss | null };

export function judge(seq: Sequence, built: Board, side: Side): Judged {
  const right = seq.final.board;
  const grade = gradePosition(built, right);
  const { changed, right: good } = squaresRight(built, right);
  const again = { board: { seat: side, names: false, pieces: piecesOf(seq.final), lit: [] }, moves: numberedLine(seq.start, seq.moves) };
  const counts: Record<string, number> = { "Squares right": good, "Squares that changed": changed };
  if (grade.whole) {
    return { told: { step: "told", verdict: "right", line: `Right: all ${changed} squares.`, again, score: { right: true, mistakes: [], counts } }, miss: null };
  }
  const at = lostAt(seq, grade);
  let line = `No: ${good} of ${changed} squares.`;
  let miss: Miss | null = null;
  if (at !== null) {
    const kind = lostKind(seq.moves[at - 1]!);
    miss = { ply: at, kind };
    counts[lostCount(kind)] = 1;
    line += ` You lost the thread at ${moveWords(seq.thread, at)}: ${whatItDid(seq, at, grade.wrong.map((w) => w.square))}`;
  } else if (grade.swaps.length) {
    line += ` ${swapLine(right, grade.swaps[0]!)}`;
  }
  // > Stand-in. No move named and no swap: the count alone.
  return { told: { step: "told", verdict: "wrong", line, again, score: { right: false, mistakes: mistakesOf(seq, built, grade), counts } }, miss };
}

// ---------------------------------------------------------------------------
// One sequence

// > Stand-in. An opening's name, as it shows: "The Italian Game.", every one of
// > the 13 with "The" before it.
export function openingName(name: string): string {
  return `The ${name}.`;
}

// One sequence: the moves as the level brings them, then the board in the
// starting position to change into the position now.
export function rebuildItem(level: Level, seq: Sequence, side: Side, opening: string | null = null): Item {
  const row = rowOf(level);
  const from = fromLine(seq);
  const shows: Step[] = [];
  if (row.id === "L1") {
    // The list's time counts as my time per move, once per move in it.
    shows.push({ step: "show", words: numberedLine(seq.start, seq.moves), lines: [from], button: "Hide", time: "move", moves: seq.moves.length });
  } else {
    if (opening) shows.push({ step: "show", name: openingName(opening), lines: [from], button: "Next", time: "look" });
    seq.moves.forEach((_, i) =>
      shows.push({ step: "show", move: moveWords(seq.thread, i + 1), ...(i === 0 && !opening ? { lines: [from] } : {}), button: "Next", time: "move" }),
    );
  }
  const ask: Step = {
    step: "ask",
    question: `Rebuild the position after ${moveWords(seq.thread, seq.moves.length)}.`,
    board: { seat: side, names: false, pieces: piecesOf(startingPosition()), lit: [] },
    notes: [],
    // A pawn the moves promoted is set out as the piece it became.
    input: { how: "move", promotes: true },
    seconds: null,
    reopened: false,
  };
  const steps = [...shows, ask];
  let at = 0;
  let told: Judged | null = null;
  // A question left when the minutes run out: its squares count as wrong.
  const { changed } = squaresRight(seq.final.board, seq.final.board);
  return {
    challenge: "5.2.1",
    level: level.id,
    questions: 1,
    unasked: { "Squares right": 0, "Squares that changed": changed },
    first: () => steps[0]!,
    next(did: Did): Step {
      if (at < steps.length - 1) return steps[++at]!;
      if (!told) {
        if (did.did !== "answer" || did.answer.kind !== "position") throw new Error("5.2.1 takes a whole position.");
        told = judge(seq, fromPieces(did.answer.pieces).board, side);
        return told.told;
      }
      // A sequence I miss leaves its move's kind and half-move to come back.
      return { step: "done", back: told.told.score.right ? null : { game: seq.game, misses: told.miss ? [told.miss] : [] } };
    },
  };
}

// ---------------------------------------------------------------------------
// The round

// An opening's line: the game from the position the opening reached.
export function fromOpening(line: AfterOpening, openings: OpeningsPack): Sequence<AfterOpening> {
  const opening = openings.thirteen.find((o) => o.name === line.opening);
  if (!opening) throw new Error(`No opening ${line.opening}.`);
  const start = { ...fromFen(opening.fen), moveNumber: Math.floor(line.reachedAt / 2) + 1, halfmoves: 0 };
  return sequence(line, start);
}

export const challenge: Challenge = {
  built: true,
  id: "5.2.1",
  name: "Rebuild after the moves",
  trains: "Holding a whole position in my head while moves change it, then setting it out.",
  needs: "3.1.1 L6, 4.3.1 L1 and 1.1.1 L2. From L3, 4.3.1 L3.",
  levels: LEVELS,
  packs: ["lines.json", "openings.json"],
  // The come-backs a round asks: the first of its count's places, a miss no game can meet let go, the rest waiting.
  asks(level, facts) {
    return askedBacks(facts.back, facts.count ?? level.questions);
  },
  makeRound(level, random, facts) {
    const row = rowOf(level);
    const lines = packOf<LinesPack>(facts, "lines.json");
    const count = facts.count ?? level.questions;
    const backs = facts.back.map(backOf).filter((b) => b !== null);
    if (row.id === "L3") {
      const openings = packOf<OpeningsPack>(facts, "openings.json");
      return pickLines<AfterOpening, Item>(random, afterOpenings(lines), count, backs, (l) => fromOpening(l, openings), (seq) =>
        rebuildItem(level, seq, facts.side, seq.opening),
      );
    }
    const pool: Line[] = firstLines(lines, Number(row.halfMoves)).filter((l) => l.sans.length === Number(row.halfMoves));
    return pickLines<Line, Item>(random, pool, count, backs, (l) => sequence(l), (seq) => rebuildItem(level, seq, facts.side));
  },
};
