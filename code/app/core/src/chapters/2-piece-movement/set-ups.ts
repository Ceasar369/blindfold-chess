// What chapter 2's set-up cards share, 2.2.1, 2.3.1 and 2.3.2: the pieces a
// set-up draws, a position kept to come back, the board shown, and the
// pages' words for a piece.
//
// Source: code/blueprint/docs/piece-movement.md, "Where its questions come
// from" of 2.2.1, 2.3.1 and 2.3.2.

import { WORDS } from "../../near-misses/index.ts";
import { fromFen, kingSquare, other, piecesOf, type Position, sideWord, SIDES, toFen } from "../../positions/index.ts";
import { attackersOf } from "../../reach/index.ts";
import type { Pair } from "../../set-grader/index.ts";
import type { BoardView, Facts, Kind, Piece, Placed, Random, Side, Square } from "../../shape/index.ts";
import { fileNumber, isSquare, type Line, rankNumber } from "../../squares/index.ts";

// > Stand-in. The pieces besides the kings: each one's side at random, its
// > kind in a starting army's shares, 8 pawns, 2 knights, 2 bishops, 2 rooks
// > and a queen. The card says only "at random".
const ARMY: readonly Kind[] = [
  "pawn", "pawn", "pawn", "pawn", "pawn", "pawn", "pawn", "pawn",
  "knight", "knight", "bishop", "bishop", "rook", "rook", "queen",
];

export function drawPieces(random: Random, count: number): Piece[] {
  return Array.from({ length: count }, () => ({ side: random.pick(SIDES), kind: random.pick(ARMY) }));
}

// True when the pieces besides the kings belong to both sides, as each card
// asks: "of both sides".
export function bothSides(pos: Position): boolean {
  return new Set(piecesOf(pos).filter((p) => p.kind !== "king").map((p) => p.side)).size === 2;
}

// The board shown: I sit as White, no names on the edge.
export function boardOf(pos: Position, lit: Square[]): BoardView {
  return { seat: "white", names: false, pieces: piecesOf(pos), lit };
}

// "White's bishop on c4".
export function pieceOn(p: Placed): string {
  return `${sideWord(p.side)}'s ${p.kind} on ${p.square}`;
}

// The piece standing on a square.
export function placedOn(pos: Position, square: Square): Placed | null {
  const piece = pos.board[square];
  return piece ? { ...piece, square } : null;
}

// Whether a piece moves along a line: a rook along files and ranks, a bishop
// along diagonals, a queen along all three.
export function movesAlong(kind: Kind, line: Line | null): boolean {
  if (!line) return false;
  if (kind === "queen") return true;
  if (kind === "rook") return line !== "diagonal";
  if (kind === "bishop") return line === "diagonal";
  return false;
}

// True when two squares touch, along a line or a corner.
export function nextTo(a: Square, b: Square): boolean {
  return Math.max(Math.abs(fileNumber(a) - fileNumber(b)), Math.abs(rankNumber(a) - rankNumber(b))) === 1;
}

// True when a side's king stands attacked.
export function inCheck(pos: Position, side: Side): boolean {
  const king = kingSquare(pos, side);
  return king !== null && attackersOf(pos.board, king, other(side)).length > 0;
}

// A round's places by kind, before they are shuffled, and the questions
// coming back placed among them. Each takes a place of its own kind, so a
// card's shares hold whatever comes back: one with no place of its kind left
// waits, and the round does not ask it. back: in the order they come, each
// with the facts it was stored as. fresh: the places left, for new questions.
export function placeBack<K extends string, B>(places: readonly K[], back: readonly B[], kindOf: (b: B) => K): { back: B[]; fresh: K[] } {
  const fresh = [...places];
  const placed: B[] = [];
  for (const b of back) {
    const at = fresh.indexOf(kindOf(b));
    if (at < 0) continue;
    fresh.splice(at, 1);
    placed.push(b);
  }
  return { back: placed, fresh };
}

// A wrong square named against a square I left out: "g4 is the rank beside g3."
export function nearMissLine(pair: Pair): string {
  return `${pair.added} is ${WORDS[pair.kind]} ${pair.leftOut}.`;
}

// What comes back: the position, the square asked about, and any word of
// the question's own, such as the side asked. { fen, square, ... }.
export function positionFacts(pos: Position, square: Square, more: { [key: string]: string } = {}): Facts {
  return { fen: toFen(pos), square, ...more };
}

// The position and square kept to come back, or null for anything else.
export function readPositionFacts(facts: Facts): { pos: Position; square: Square; facts: { [key: string]: Facts } } | null {
  if (!facts || typeof facts !== "object" || Array.isArray(facts)) return null;
  const { fen, square } = facts;
  if (typeof fen !== "string" || typeof square !== "string" || !isSquare(square)) return null;
  try {
    return { pos: fromFen(fen), square, facts };
  } catch {
    return null;
  }
}
