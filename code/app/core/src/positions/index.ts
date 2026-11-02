// Block 3, Positions: which piece stands on which square, and whose move it
// is, apart from any drawing. It can also carry what only a legal game needs,
// castling rights and the square a pawn may be taken in passing on, for Rules
// to read. It never checks that a position is legal, and never draws.
//
// Source: code/blueprint/building-blocks.md, block 3; position-memory.md,
// "How a position reaches me" and "Real and set-up positions".

import type { Kind, Piece, Placed, Side, Square, Stands } from "../shape/index.ts";
import { bySquare, FILES, isSquare, mirror, RANKS } from "../squares/index.ts";

export type Castling = { white: { king: boolean; queen: boolean }; black: { king: boolean; queen: boolean } };

export type Position = {
  board: Readonly<Partial<Record<Square, Piece>>>;
  turn: Side;
  castling: Castling;
  enPassant: Square | null; // where a pawn may land taking in passing: d6 after d7 to d5
  halfmoves: number; // half-moves since the last capture or pawn move
  moveNumber: number; // the number of the move to come
};

export const NO_CASTLING: Castling = { white: { king: false, queen: false }, black: { king: false, queen: false } };

// The pages' order: each side's king first, then queen, rooks, bishops, knights and pawns.
export const KINDS: readonly Kind[] = ["king", "queen", "rook", "bishop", "knight", "pawn"];
export const SIDES: readonly Side[] = ["white", "black"];

const PLURAL: Record<Kind, string> = {
  king: "kings", queen: "queens", rook: "rooks", bishop: "bishops", knight: "knights", pawn: "pawns",
};

export function other(side: Side): Side {
  return side === "white" ? "black" : "white";
}

export function samePiece(a: Stands | undefined, b: Stands | undefined): boolean {
  if (!a || !b) return !a && !b;
  return a.side === b.side && a.kind === b.kind;
}

// A position holding these pieces, nobody may castle, nothing taken in passing.
export function fromPieces(pieces: readonly Placed[], turn: Side = "white"): Position {
  const board: Partial<Record<Square, Piece>> = {};
  for (const p of pieces) board[p.square] = { side: p.side, kind: p.kind };
  return { board, turn, castling: NO_CASTLING, enPassant: null, halfmoves: 0, moveNumber: 1 };
}

const START_WORDS =
  "White: king e1, queen d1, rooks a1 and h1, bishops c1 and f1, knights b1 and g1, pawns a2, b2, c2, d2, e2, f2, g2 and h2. Black: king e8, queen d8, rooks a8 and h8, bishops c8 and f8, knights b8 and g8, pawns a7, b7, c7, d7, e7, f7, g7 and h7.";

// The starting position, White to move, both sides free to castle.
export function startingPosition(): Position {
  return { ...fromWords(START_WORDS), castling: { white: { king: true, queen: true }, black: { king: true, queen: true } } };
}

// Every piece, in the pages' order: White first, each side's king first, then
// queen, rooks, bishops, knights and pawns, each kind's squares from the a-file on.
export function piecesOf(pos: Position): Placed[] {
  const out: Placed[] = [];
  for (const [square, piece] of Object.entries(pos.board) as [Square, Piece][]) out.push({ ...piece, square });
  return out.sort(
    (a, b) => SIDES.indexOf(a.side) - SIDES.indexOf(b.side) || KINDS.indexOf(a.kind) - KINDS.indexOf(b.kind) || bySquare(a.square, b.square),
  );
}

// What stands on a square: a piece, or null for Empty.
export function standsOn(pos: Position, square: Square): Stands {
  return pos.board[square] ?? null;
}

export function kingSquare(pos: Position, side: Side): Square | null {
  return piecesOf(pos).find((p) => p.side === side && p.kind === "king")?.square ?? null;
}

// The pieces besides the kings.
export function besidesKings(pos: Position): number {
  return piecesOf(pos).filter((p) => p.kind !== "king").length;
}

function withBoard(pos: Position, change: (board: Partial<Record<Square, Piece>>) => void): Position {
  const board = { ...pos.board };
  change(board);
  return { ...pos, board };
}

// Puts a piece on a square, as a hand does: whatever stood there comes off.
export function put(pos: Position, square: Square, piece: Piece): Position {
  return withBoard(pos, (b) => (b[square] = { side: piece.side, kind: piece.kind }));
}

// Takes a piece off its square.
export function takeOff(pos: Position, square: Square): Position {
  return withBoard(pos, (b) => delete b[square]);
}

// Moves a piece, as a hand does: whatever stood on the square it lands on comes off.
export function moveByHand(pos: Position, from: Square, to: Square): Position {
  const piece = pos.board[from];
  if (!piece) return pos;
  return withBoard(pos, (b) => {
    delete b[from];
    b[to] = piece;
  });
}

// Mirrors a position a to h, as chapter 4 mirrors: each piece keeps its rank
// and moves to the other wing. A king on g1 goes to b1. Nobody may castle.
export function mirrorPosition(pos: Position): Position {
  const board: Partial<Record<Square, Piece>> = {};
  for (const [square, piece] of Object.entries(pos.board) as [Square, Piece][]) board[mirror(square)] = piece;
  return { ...pos, board, castling: NO_CASTLING, enPassant: pos.enPassant ? mirror(pos.enPassant) : null };
}

function list(items: readonly string[]): string {
  return items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

export function sideWord(side: Side): "White" | "Black" {
  return side === "white" ? "White" : "Black";
}

// A position in the pages' words: "White: king g1, queen e2, pawns e4 and f2.
// Black: king g8, rook e8." A side with no piece is left out. toMove adds
// whose move it is, as chapter 6 writes it: "White to move."
export function inWords(pos: Position, { toMove = false }: { toMove?: boolean } = {}): string {
  const pieces = piecesOf(pos);
  const sides = SIDES.flatMap((side) => {
    const parts = KINDS.flatMap((kind) => {
      const squares = pieces.filter((p) => p.side === side && p.kind === kind).map((p) => p.square);
      return squares.length ? [`${squares.length > 1 ? PLURAL[kind] : kind} ${list(squares)}`] : [];
    });
    return parts.length ? [`${sideWord(side)}: ${parts.join(", ")}.`] : [];
  });
  if (toMove) sides.push(`${sideWord(pos.turn)} to move.`);
  return sides.join(" ");
}

const KIND_OF: Record<string, Kind> = Object.fromEntries(KINDS.flatMap((k) => [[k, k], [PLURAL[k], k]]));

// A position from the pages' own words, as inWords writes them, and "White to
// move." when it is there. It throws on any other form.
export function fromWords(text: string): Position {
  const pieces: Placed[] = [];
  let turn: Side = "white";
  const toMove = text.match(/\b(White|Black) to move\.\s*$/);
  if (toMove) turn = toMove[1] === "White" ? "white" : "black";
  const body = toMove ? text.slice(0, toMove.index) : text;
  const sides = [...body.matchAll(/(White|Black): ([^.]*)\./g)];
  if (!sides.length) throw new Error(`Not a position in words: ${text}`);
  for (const [, sideName, rest] of sides) {
    const side: Side = sideName === "White" ? "white" : "black";
    let kind: Kind | null = null;
    for (const word of rest!.split(/,?\s+(?:and\s+)?|,\s*/).filter(Boolean)) {
      if (KIND_OF[word]) kind = KIND_OF[word]!;
      else if (isSquare(word) && kind) pieces.push({ side, kind, square: word });
      else throw new Error(`Not a position in words: "${word}" in ${text}`);
    }
  }
  return fromPieces(pieces, turn);
}

// ---------------------------------------------------------------------------
// FEN, the form Rules and the packs read

const LETTER: Record<Kind, string> = { king: "k", queen: "q", rook: "r", bishop: "b", knight: "n", pawn: "p" };
const KIND_OF_LETTER: Record<string, Kind> = { k: "king", q: "queen", r: "rook", b: "bishop", n: "knight", p: "pawn" };

export function toFen(pos: Position): string {
  const rows = [...RANKS].reverse().map((rank) => {
    let row = "";
    let gap = 0;
    for (const file of FILES) {
      const piece = pos.board[`${file}${rank}` as Square];
      if (!piece) {
        gap++;
        continue;
      }
      if (gap) row += gap;
      gap = 0;
      const letter = LETTER[piece.kind];
      row += piece.side === "white" ? letter.toUpperCase() : letter;
    }
    return gap ? row + gap : row;
  });
  const c = pos.castling;
  const castling = `${c.white.king ? "K" : ""}${c.white.queen ? "Q" : ""}${c.black.king ? "k" : ""}${c.black.queen ? "q" : ""}` || "-";
  return `${rows.join("/")} ${pos.turn === "white" ? "w" : "b"} ${castling} ${pos.enPassant ?? "-"} ${pos.halfmoves} ${pos.moveNumber}`;
}

export function fromFen(fen: string): Position {
  const [placement, turn, castling = "-", ep = "-", half = "0", move = "1"] = fen.trim().split(/\s+/);
  const rows = placement?.split("/") ?? [];
  if (rows.length !== 8 || (turn !== "w" && turn !== "b")) throw new Error(`Not a FEN: ${fen}`);
  const board: Partial<Record<Square, Piece>> = {};
  rows.forEach((row, i) => {
    const rank = 8 - i;
    let file = 0;
    for (const ch of row) {
      if (/[1-8]/.test(ch)) {
        file += Number(ch);
        continue;
      }
      const kind = KIND_OF_LETTER[ch.toLowerCase()];
      if (!kind || file > 7) throw new Error(`Not a FEN: ${fen}`);
      board[`${FILES[file]}${rank}` as Square] = { side: ch === ch.toUpperCase() ? "white" : "black", kind };
      file++;
    }
    if (file !== 8) throw new Error(`Not a FEN: ${fen}`);
  });
  return {
    board,
    turn: turn === "w" ? "white" : "black",
    castling: {
      white: { king: castling.includes("K"), queen: castling.includes("Q") },
      black: { king: castling.includes("k"), queen: castling.includes("q") },
    },
    enPassant: isSquare(ep) ? ep : null,
    halfmoves: Number(half),
    moveNumber: Number(move),
  };
}

// ---------------------------------------------------------------------------
// The 13 answers to "what stands there"

// White's king to pawn, Black's king to pawn, then Empty: the 13 choices.
export const THIRTEEN: readonly Stands[] = [
  ...SIDES.flatMap((side) => KINDS.map((kind) => ({ side, kind }))),
  null,
];

// "White's king", "Black's pawn", or "Empty".
export function standsWords(stands: Stands): string {
  return stands ? `${sideWord(stands.side)}'s ${stands.kind}` : "Empty";
}

// A choice's value: "white-king", "black-pawn", or "empty".
export function standsValue(stands: Stands): string {
  return stands ? `${stands.side}-${stands.kind}` : "empty";
}

export function standsFromValue(value: string): Stands | undefined {
  if (value === "empty") return null;
  const [side, kind] = value.split("-");
  if ((side === "white" || side === "black") && KINDS.includes(kind as Kind)) return { side, kind: kind as Kind };
  return undefined;
}
