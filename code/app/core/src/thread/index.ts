// Block 10, Thread finder: follows every piece through a run of moves from its
// first position, piece by piece. Says what stood on a square after any move,
// the last move that took a given piece off a square, and where a piece went
// and which move took it. It never decides a mistake's kind alone: each
// challenge orders its own kinds.
//
// Source: code/blueprint/building-blocks.md, block 10; updating-a-position.md,
// "Where I lost the thread"; blind-play.md, the same.

import { numbered } from "../notation/index.ts";
import { type Position, samePiece } from "../positions/index.ts";
import type { Move } from "../rules/index.ts";
import type { Piece, Side, Square, Stands } from "../shape/index.ts";

// What stands at one moment: each square's piece, and that piece's own number,
// kept as it moves, so one piece can be followed.
type Frame = Partial<Record<Square, { piece: Piece; id: number }>>;

export type Thread = {
  start: Position;
  moves: Move[];
  frames: Frame[]; // frames[0] is the first position; frames[k], after k half-moves
};

function apply(frame: Frame, move: Move): Frame {
  const next: Frame = { ...frame };
  const mover = next[move.from]!;
  delete next[move.from];
  if (move.enPassant) delete next[`${move.to[0]}${move.from[1]}` as Square];
  next[move.to] = move.promotion ? { piece: { side: mover.piece.side, kind: move.promotion }, id: mover.id } : mover;
  if (move.castle) {
    const rank = move.from[1];
    const [rookFrom, rookTo] = move.castle === "king" ? [`h${rank}`, `f${rank}`] : [`a${rank}`, `d${rank}`];
    next[rookTo as Square] = next[rookFrom as Square]!;
    delete next[rookFrom as Square];
  }
  return next;
}

export function follow(start: Position, moves: readonly Move[]): Thread {
  let id = 0;
  const first: Frame = {};
  for (const [square, piece] of Object.entries(start.board) as [Square, Piece][]) first[square] = { piece, id: id++ };
  const frames = [first];
  for (const m of moves) frames.push(apply(frames[frames.length - 1]!, m));
  return { start, moves: [...moves], frames };
}

// What stood on a square after so many half-moves: 0 is the first position.
export function standsAfter(t: Thread, square: Square, ply: number = t.moves.length): Stands {
  return t.frames[ply]?.[square]?.piece ?? null;
}

// What stood on a square at each moment, from the first position on.
export function historyOf(t: Thread, square: Square): Stands[] {
  return t.frames.map((f) => f[square]?.piece ?? null);
}

// The half-move's number, from 1: the move that made frames[ply].
export type Taken = { ply: number; move: Move };

// The last move, up to `ply`, that took a piece of this side and kind off a
// square, or null. In 1. e4 e5 2. Nf3 d6 3. d4 Nc6 4. dxe5 dxe5, "White's
// pawn" for e5 gives 4... dxe5.
export function lastTakenOff(t: Thread, square: Square, piece: Piece, ply: number = t.moves.length): Taken | null {
  for (let k = ply; k >= 1; k--) {
    const before = t.frames[k - 1]![square];
    const after = t.frames[k]![square];
    if (before && samePiece(before.piece, piece) && after?.id !== before.id) return { ply: k, move: t.moves[k - 1]! };
  }
  return null;
}

// The last move, up to `ply`, that changed a square: a piece left it, landed
// on it, or was taken from it. null when no move did. "Black's knight stands
// on c6, since 3... Nc6."
export function lastChange(t: Thread, square: Square, ply: number = t.moves.length): Taken | null {
  for (let k = ply; k >= 1; k--) {
    if (t.frames[k - 1]![square]?.id !== t.frames[k]![square]?.id) return { ply: k, move: t.moves[k - 1]! };
  }
  return null;
}

// Where the piece standing on a square after `ply` half-moves went: each move
// it made, the move that took it, if one did, and where it stands at the end.
export type Path = { piece: Piece; moved: Taken[]; takenBy: Taken | null; takenOn: Square | null; standsOn: Square | null };

export function pathOf(t: Thread, square: Square, ply: number): Path | null {
  const at = t.frames[ply]?.[square];
  if (!at) return null;
  const moved: Taken[] = [];
  let where: Square = square;
  for (let k = ply + 1; k < t.frames.length; k++) {
    const found = (Object.entries(t.frames[k]!) as [Square, { id: number }][]).find(([, v]) => v.id === at.id);
    if (!found) return { piece: at.piece, moved, takenBy: { ply: k, move: t.moves[k - 1]! }, takenOn: where, standsOn: null };
    if (found[0] !== where) {
      moved.push({ ply: k, move: t.moves[k - 1]! });
      where = found[0];
    }
  }
  return { piece: at.piece, moved, takenBy: null, takenOn: null, standsOn: where };
}

// The side and the number of the half-move that made frames[ply].
function numberOf(t: Thread, ply: number): { side: Side; moveNumber: number } {
  const offset = t.start.turn === "white" ? 0 : 1;
  const index = ply - 1 + offset;
  return { side: index % 2 === 0 ? "white" : "black", moveNumber: t.start.moveNumber + Math.floor(index / 2) };
}

// A half-move in the pages' words: "4... dxe5", "13. Bxf3".
export function moveWords(t: Thread, ply: number): string {
  const { side, moveNumber } = numberOf(t, ply);
  return numbered(t.moves[ply - 1]!.san, side, moveNumber);
}
