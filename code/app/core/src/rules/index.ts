// Block 5, Rules: the laws of chess, on a legal position with both kings.
// Lists the legal moves, plays a move, tells check, checkmate, stalemate, a
// dead position, a position's third appearance and 50 moves with no capture
// or pawn move. Handles castling, a pawn taken in passing and promotion. Lists
// the moves that mate at once. It never reads a move's text: Notation does.
//
// Source: code/blueprint/building-blocks.md, block 5. Built on chess.js 1.4.0,
// BSD-2-Clause, Copyright (c) 2025, Jeff Hlywa: its notice stays with it, in
// node_modules/chess.js/LICENSE.
//
// chess.js's holes, each tested in rules.test.ts:
// - A pawn on the first or eighth rank: its own check refuses one, but a
//   load that skips the check, or a piece put there, crashes it (#577).
// - It loads a position whose side not to move is in check (#558).
// So Rules loads no position that fails legalProblem, below.

import { Chess, type Move as ChessMove, type PieceSymbol } from "chess.js";
import { fromFen, kingSquare, other, type Position, piecesOf, toFen } from "../positions/index.ts";
import { attackersOf } from "../reach/index.ts";
import type { Kind, Side, Square } from "../shape/index.ts";

export type Move = {
  from: Square;
  to: Square;
  side: Side;
  kind: Kind; // the piece that moves
  captured: Kind | null;
  promotion: Kind | null;
  castle: "king" | "queen" | null;
  enPassant: boolean;
  san: string; // its written form, as the PGN standard writes it: "Bxf7+", "O-O-O", "e8=Q#"
};

const KIND: Record<PieceSymbol, Kind> = { k: "king", q: "queen", r: "rook", b: "bishop", n: "knight", p: "pawn" };
const SYMBOL: Record<Kind, PieceSymbol> = { king: "k", queen: "q", rook: "r", bishop: "b", knight: "n", pawn: "p" };

// Why Rules cannot take a position, or null when it can: both kings, one
// each; no pawn on the first or eighth rank; the side not to move not in check;
// the side to move in check from two pieces at most, as no move gives three.
export function legalProblem(pos: Position): string | null {
  const pieces = piecesOf(pos);
  for (const side of ["white", "black"] as const) {
    const kings = pieces.filter((p) => p.side === side && p.kind === "king").length;
    if (kings !== 1) return `${side} has ${kings} kings`;
  }
  const edge = pieces.find((p) => p.kind === "pawn" && (p.square[1] === "1" || p.square[1] === "8"));
  if (edge) return `a pawn stands on ${edge.square}`;
  const waiting = kingSquare(pos, other(pos.turn))!;
  if (attackersOf(pos.board, waiting, pos.turn).length) return `the side not to move stands in check on ${waiting}`;
  const moving = kingSquare(pos, pos.turn)!;
  const checks = attackersOf(pos.board, moving, other(pos.turn)).length;
  if (checks > 2) return `the side to move stands in check from ${checks} pieces on ${moving}`;
  return null;
}

export function isLegalPosition(pos: Position): boolean {
  return legalProblem(pos) === null;
}

// Castling rights a position may hold: its king and that rook on their first
// squares. A pawn taken in passing only where a pawn just moved two squares.
function cleaned(pos: Position): Position {
  const at = (s: Square, side: Side, kind: Kind) => pos.board[s]?.side === side && pos.board[s]?.kind === kind;
  const rights = (side: Side, rank: "1" | "8") => ({
    king: pos.castling[side].king && at(`e${rank}`, side, "king") && at(`h${rank}`, side, "rook"),
    queen: pos.castling[side].queen && at(`e${rank}`, side, "king") && at(`a${rank}`, side, "rook"),
  });
  let enPassant = pos.enPassant;
  if (enPassant) {
    const mover = other(pos.turn);
    const [file, rank] = [enPassant[0], enPassant[1]];
    const wantRank = pos.turn === "white" ? "6" : "3";
    const pawnAt = `${file}${pos.turn === "white" ? "5" : "4"}` as Square;
    if (rank !== wantRank || pos.board[enPassant] || !at(pawnAt, mover, "pawn")) enPassant = null;
  }
  return { ...pos, castling: { white: rights("white", "1"), black: rights("black", "8") }, enPassant };
}

function load(pos: Position): Chess {
  const problem = legalProblem(pos);
  if (problem) throw new Error(`Rules takes no position where ${problem}: ${toFen(pos)}`);
  return new Chess(toFen(cleaned(pos)));
}

function ours(m: ChessMove): Move {
  return {
    from: m.from,
    to: m.to,
    side: m.color === "w" ? "white" : "black",
    kind: KIND[m.piece],
    captured: m.captured ? KIND[m.captured] : null,
    promotion: m.promotion ? KIND[m.promotion] : null,
    castle: m.isKingsideCastle() ? "king" : m.isQueensideCastle() ? "queen" : null,
    enPassant: m.isEnPassant(),
    san: m.san,
  };
}

// Every legal move, in chess.js's order.
export function legalMoves(pos: Position): Move[] {
  return load(pos).moves({ verbose: true }).map(ours);
}

// The position after a move, or null when the move is not legal.
export function play(pos: Position, move: { from: Square; to: Square; promotion?: Kind | null }): Position | null {
  const chess = load(pos);
  try {
    chess.move({ from: move.from, to: move.to, promotion: move.promotion ? SYMBOL[move.promotion] : undefined });
  } catch {
    return null;
  }
  return fromFen(chess.fen());
}

// The legal move from one square to another, or null.
export function moveBetween(pos: Position, from: Square, to: Square, promotion: Kind | null = null): Move | null {
  return legalMoves(pos).find((m) => m.from === from && m.to === to && m.promotion === promotion) ?? null;
}

export function isCheck(pos: Position): boolean {
  return load(pos).inCheck();
}

export function isCheckmate(pos: Position): boolean {
  return load(pos).isCheckmate();
}

export function isStalemate(pos: Position): boolean {
  return load(pos).isStalemate();
}

// > Stand-in. A dead position, as chess.js tells it: king against king, a king
// > and one bishop or knight against a king, and bishops all on one colour.
// > FIDE's dead position is wider, such as pawns locked with no way through:
// > those end no game here.
export function isDead(pos: Position): boolean {
  return load(pos).isInsufficientMaterial();
}

// The moves that mate at once. After 33. Rd8+ Ne8, 34. Rxe8 among them.
export function matingMoves(pos: Position): Move[] {
  return legalMoves(pos).filter((m) => m.san.endsWith("#"));
}

// How a game ends, or null while it goes on: checkmate, stalemate, a dead
// position, a position's third appearance, or 50 moves each with no capture
// and no pawn move. Here no one claims a draw: it comes at once.
export type End = "checkmate" | "stalemate" | "dead" | "repetition" | "fifty moves";

export function gameEnd(start: Position, moves: readonly Move[]): End | null {
  const chess = load(start);
  for (const m of moves) chess.move({ from: m.from, to: m.to, promotion: m.promotion ? SYMBOL[m.promotion] : undefined });
  if (chess.isCheckmate()) return "checkmate";
  if (chess.isStalemate()) return "stalemate";
  if (chess.isInsufficientMaterial()) return "dead";
  if (chess.isThreefoldRepetition()) return "repetition";
  if (chess.isDrawByFiftyMoves()) return "fifty moves";
  return null;
}

// A line of written moves, played from a position: each move and the position
// after it. It reads the forms game files write, long ones too ("Qe8e5+"), so
// it serves the pack scripts and the pages' examples. A move I write goes
// through Notation instead. Throws on a move that is not legal.
export function playLine(start: Position, sans: readonly string[]): { moves: Move[]; positions: Position[] } {
  const chess = load(start);
  const moves: Move[] = [];
  const positions: Position[] = [];
  for (const san of sans) {
    let m: ChessMove;
    try {
      m = chess.move(san);
    } catch {
      throw new Error(`Not a legal move: ${san} in ${chess.fen()}`);
    }
    moves.push(ours(m));
    positions.push(fromFen(chess.fen()));
  }
  return { moves, positions };
}
