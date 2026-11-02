// Chapter 5's real sequences, shared by its two cards: a game's first moves,
// played from where they start and followed piece by piece; the move that
// took my answer off a square; the kinds of move where I lose the thread;
// and the sequences that come back after a miss.
//
// Source: code/blueprint/docs/updating-a-position.md, "Where the moves come
// from", "Where I lost the thread", and each card's "What comes back".

import { type Position, samePiece, startingPosition } from "../../positions/index.ts";
import { type Move, playLine } from "../../rules/index.ts";
import type { Facts, Random, Square, Stands } from "../../shape/index.ts";
import { follow, type Thread } from "../../thread/index.ts";

// A real game's moves, and what the feedback names of it.
export type Line = { game: string; white: number; black: number; sans: string[] };

// A line played from where it starts: its moves, followed piece by piece.
export type Sequence<L extends Line = Line> = L & { start: Position; moves: Move[]; thread: Thread; final: Position };

export function sequence<L extends Line>(line: L, start: Position = startingPosition()): Sequence<L> {
  const { moves, positions } = playLine(start, line.sans);
  return { ...line, start, moves, thread: follow(start, moves), final: positions.at(-1) ?? start };
}

// "From a Lichess game of January 2013, players rated 1352 and 1365."
export function fromLine(line: Line): string {
  return `From a Lichess game of January 2013, players rated ${line.white} and ${line.black}.`;
}

// ---------------------------------------------------------------------------
// Where I lost the thread

// The four kinds the page counts: a move, a capture, castling, or a pawn
// taken in passing. A promotion counts as a capture when it takes, else as a move.
export type LostKind = "move" | "capture" | "castling" | "en passant";

export function lostKind(m: Move): LostKind {
  if (m.castle) return "castling";
  if (m.enPassant) return "en passant";
  return m.captured ? "capture" : "move";
}

const LOST: Record<LostKind, string> = {
  move: "a move",
  capture: "a capture",
  castling: "castling",
  "en passant": "a pawn taken in passing",
};

// The score sheet's row for a move I lost: "Lost the thread at a capture".
export function lostCount(kind: LostKind): string {
  return `Lost the thread at ${LOST[kind]}`;
}

type Frame = Thread["frames"][number];

// The last move, up to `ply`, that took my answer off a square: a piece of
// that side and kind leaving it, or taken from it; or, for Empty, a piece
// landing on it. The half-move's number, from 1, or null when my answer never
// stood there and left.
export function lastOff(t: Thread, square: Square, answer: Stands, ply: number = t.moves.length): number | null {
  for (let k = ply; k >= 1; k--) {
    const before = t.frames[k - 1]![square];
    const after = t.frames[k]![square];
    if (answer ? before && samePiece(before.piece, answer) && after?.id !== before.id : !before && after) return k;
  }
  return null;
}

// Whether the move at `ply` took the piece standing on `square` before it,
// rather than moving it.
export function tookFrom(t: Thread, square: Square, ply: number): boolean {
  const id = t.frames[ply - 1]![square]?.id;
  return id !== undefined && !Object.values(t.frames[ply]!).some((v) => v?.id === id);
}

// Whether a piece, by its number, still stands somewhere after `ply` half-moves.
export function stands(frame: Frame, id: number): boolean {
  return Object.values(frame).some((v) => v?.id === id);
}

// ---------------------------------------------------------------------------
// What comes back

// A missed question's move: its half-move, from 1, and its kind.
export type Miss = { ply: number; kind: LostKind };

// What a sequence with a miss leaves to come back: its game, never asked
// again in its place, and each move a miss named. No move named, as in a
// swap: any other real sequence of the level comes back.
export type Back = { game: string; misses: Miss[] };

const KINDS: readonly string[] = ["move", "capture", "castling", "en passant"];

export function backOf(facts: Facts): Back | null {
  if (!facts || typeof facts !== "object" || Array.isArray(facts) || typeof facts.game !== "string" || !Array.isArray(facts.misses)) return null;
  const misses: Miss[] = [];
  for (const m of facts.misses) {
    if (m && typeof m === "object" && !Array.isArray(m) && typeof m.ply === "number" && typeof m.kind === "string" && KINDS.includes(m.kind)) {
      misses.push({ ply: m.ply, kind: m.kind as LostKind });
    }
  }
  return { game: facts.game, misses };
}

// The come-backs a round asks, each as stored. A miss takes one place of the
// round's `count` and is tried there, met or not: a miss no game can meet is
// let go, so its come-back is asked and ends. A come-back with no miss takes
// one place. One that holds no place of the first `count` waits.
export function askedBacks(back: readonly Facts[], count: number): Facts[] {
  const asked: Facts[] = [];
  let room = count;
  for (const from of back) {
    const b = backOf(from);
    if (!b) continue;
    if (room <= 0) break;
    asked.push(from);
    room -= Math.max(b.misses.length, 1);
  }
  return asked;
}

// Whether a line's half-move `ply` may be of a kind, read from its written
// form: the sequence then plays it to be sure. "exd6" may be a pawn taken in
// passing.
function mayBe(line: Line, miss: Miss): boolean {
  const san = line.sans[miss.ply - 1];
  if (!san) return false;
  const castle = san.startsWith("O-O");
  const takes = san.includes("x");
  if (miss.kind === "castling") return castle;
  if (miss.kind === "move") return !castle && !takes;
  return takes;
}

// A round's lines: `count` of them, no game twice in a round. Each miss
// coming back takes one place, at random among the rest: another real line
// whose half-move `ply` is a move of the same kind. A back with no miss
// brings any other line. `play` plays a line from where it starts. `make`
// turns its sequence into what the round asks, or null when it cannot be
// asked; a miss coming back is handed in.
export function pickLines<L extends Line, T>(
  random: Random,
  pool: readonly L[],
  count: number,
  backs: readonly Back[],
  play: (line: L) => Sequence<L>,
  make: (seq: Sequence<L>, miss: Miss | null) => T | null,
): T[] {
  const shuffled = random.shuffle(pool);
  const used = new Set<string>();
  const out: T[] = [];
  const wants = backs.flatMap((b) => (b.misses.length ? b.misses.map((m) => ({ game: b.game, miss: m as Miss | null })) : [{ game: b.game, miss: null }]));
  for (const want of wants.slice(0, count)) {
    for (const line of shuffled) {
      if (line.game === want.game || used.has(line.game)) continue;
      if (want.miss && !mayBe(line, want.miss)) continue;
      const seq = play(line);
      if (want.miss && lostKind(seq.moves[want.miss.ply - 1]!) !== want.miss.kind) continue;
      const made = make(seq, want.miss);
      if (made === null) continue;
      used.add(line.game);
      out.push(made);
      break;
    }
  }
  for (const line of shuffled) {
    if (out.length >= count) break;
    if (used.has(line.game)) continue;
    const made = make(play(line), null);
    if (made === null) continue;
    used.add(line.game);
    out.push(made);
  }
  return random.shuffle(out);
}
