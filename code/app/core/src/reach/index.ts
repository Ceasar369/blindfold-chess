// Block 4, Reach: where pieces go, on any arrangement, legal or not, with
// kings or none. "Attack" is the pages' word: a square where a piece could
// take an enemy piece. A line stops at the first piece on it, of either side.
// Reach never knows whose move it is, check, a pin, castling, or a pawn taken
// in passing, and never calls a move legal.
//
// Source: code/blueprint/building-blocks.md, block 4; piece-movement.md,
// "Reach, attack, may move to". chessops's attacks, GPL-3, was read as a
// design only, never copied.

import type { Position } from "../positions/index.ts";
import type { Piece, Placed, Side, Square } from "../shape/index.ts";
import { bySquare, lineOf, step } from "../squares/index.ts";

type Board = Position["board"];

const ROOK = [[1, 0], [-1, 0], [0, 1], [0, -1]] as const;
const BISHOP = [[1, 1], [1, -1], [-1, 1], [-1, -1]] as const;
const QUEEN = [...ROOK, ...BISHOP];
const KNIGHT = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]] as const;

const forward = (side: Side) => (side === "white" ? 1 : -1);

function sorted(squares: Iterable<Square>): Square[] {
  return [...new Set(squares)].sort(bySquare);
}

// Each line or jump from a square, as the piece moves, until the board's edge.
// A knight's or a king's line is one square long.
function lines(piece: Piece, from: Square): Square[][] {
  const ray = ([df, dr]: readonly [number, number], long: boolean) => {
    const out: Square[] = [];
    let s = step(from, df, dr);
    while (s) {
      out.push(s);
      if (!long) break;
      s = step(s, df, dr);
    }
    return out;
  };
  switch (piece.kind) {
    case "rook": return ROOK.map((d) => ray(d, true));
    case "bishop": return BISHOP.map((d) => ray(d, true));
    case "queen": return QUEEN.map((d) => ray(d, true));
    case "king": return QUEEN.map((d) => ray(d, false));
    case "knight": return KNIGHT.map((d) => ray(d, false));
    case "pawn": return [ray([-1, forward(piece.side)], false), ray([1, forward(piece.side)], false)];
  }
}

// The squares a piece reaches on an empty board. A knight on e4 reaches c3,
// c5, d2, d6, f2, f6, g3 and g5. A white pawn on e2 reaches e3 and e4: a pawn
// reaches the square ahead, and the one after it from its starting rank.
export function reachOnEmpty(piece: Piece, from: Square): Square[] {
  if (piece.kind !== "pawn") return sorted(lines(piece, from).flat());
  const f = forward(piece.side);
  const one = step(from, 0, f);
  const start = piece.side === "white" ? "2" : "7";
  const two = one && from[1] === start ? step(from, 0, 2 * f) : null;
  return sorted([one, two].filter((s): s is Square => s !== null));
}

// Each line followed to its first piece, of either side, that square included.
function sees(board: Board, piece: Piece, from: Square): Square[] {
  const out: Square[] = [];
  for (const line of lines(piece, from)) {
    for (const s of line) {
      out.push(s);
      if (board[s]) break;
    }
  }
  return out;
}

// The squares the piece on `from` attacks: each line stops at its first piece;
// an enemy piece there is attacked, a piece of its own side is not. A pawn
// attacks the two squares diagonally ahead of it, never the one in front.
// White's bishop on c4, with Black's pawn on f7 and king on g8, attacks f7
// and not g8.
export function attacks(board: Board, from: Square): Square[] {
  const piece = board[from];
  if (!piece) return [];
  return sorted(sees(board, piece, from).filter((s) => board[s]?.side !== piece.side));
}

// The pieces the piece on `from` attacks: the squares it attacks that hold an
// enemy piece.
export function attackedPieces(board: Board, from: Square): Placed[] {
  return attacks(board, from).flatMap((s) => (board[s] ? [{ ...board[s]!, square: s }] : []));
}

// Every piece of one side that attacks a square, whatever stands on it: a
// piece of that side there is guarded, so a king may not take it.
export function attackersOf(board: Board, square: Square, side: Side): Square[] {
  const out: Square[] = [];
  for (const [from, piece] of Object.entries(board) as [Square, Piece][]) {
    if (piece.side === side && from !== square && sees(board, piece, from).includes(square)) out.push(from);
  }
  return out.sort(bySquare);
}

// The pieces standing between two squares on one file, rank or diagonal, from
// a towards b; null when the two share no line.
export function piecesBetween(board: Board, a: Square, b: Square): Placed[] | null {
  if (!lineOf(a, b)) return null;
  const out: Placed[] = [];
  const df = Math.sign(b.charCodeAt(0) - a.charCodeAt(0));
  const dr = Math.sign(Number(b[1]) - Number(a[1]));
  let s = step(a, df, dr);
  while (s && s !== b) {
    const piece = board[s];
    if (piece) out.push({ ...piece, square: s });
    s = step(s, df, dr);
  }
  return out;
}
