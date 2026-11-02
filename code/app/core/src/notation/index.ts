// Block 6, Notation: a move's written forms. Writes a move as the pages show
// it, in the PGN standard's form, with its move number: "3... cxd4". Names the
// squares a move changes, its kind, and the arrows that show it. Reads a move's text, as the move
// composer builds it, and the spoken forms no control sends now. Finds which
// legal move a move's text names, its signs passed over. It never judges
// 3.2.1's written form, which is 3.2.1's own, and never decides whether a move
// is legal: Rules does.
//
// Source: code/blueprint/building-blocks.md, block 6; notation.md, "Notation,
// as this page uses it" and 3.2.1's "What counts as right"; blind-play.md,
// "A move I write".
//
// chess.js reads a move's text too loosely: it takes a needless "Ngf3", and
// passes over + and # (rules.test.ts shows it). So Notation reads a move's
// text itself, and matches it to the legal moves Rules lists.
//
// > Stand-in. Forms the pages do not list, read too: castling as "castle
// > short", "short castle", "long castle", "king side castling"; "take",
// > "capture" and "promote to". And in chapter 6, "Pe4" plays e4: findMove
// > reads a P as a pawn, while 3.2.1 calls it a letter on a pawn.

import { type Position } from "../positions/index.ts";
import { legalMoves, type Move } from "../rules/index.ts";
import type { Arrow, File, Kind, Rank, Side, Square } from "../shape/index.ts";
import { FILE_WORDS, NOT_COUNTED, type NotCounted, RANK_WORDS } from "../typed-answers/index.ts";

// ---------------------------------------------------------------------------
// Writing

// A move with its number: "28. Bxh6" for White's, "28... Nxg3#" for Black's.
export function numbered(san: string, side: Side, moveNumber: number): string {
  return side === "white" ? `${moveNumber}. ${san}` : `${moveNumber}... ${san}`;
}

// A line of moves, numbered as the game numbers them, from the position they
// start in: "3... cxd4 4. Nxd4 Nf6 5. Nc3".
export function numberedLine(start: Position, moves: readonly Move[]): string {
  let number = start.moveNumber;
  const parts: string[] = [];
  moves.forEach((m, i) => {
    if (m.side === "white") parts.push(`${number}. ${m.san}`);
    else parts.push(i === 0 ? `${number}... ${m.san}` : m.san);
    if (m.side === "black") number++;
  });
  return parts.join(" ");
}

// The squares a move changes: where a piece leaves, lands, or is taken from.
// 2 for a move, 4 for castling, 3 for a pawn taken in passing. Black's
// O-O-O changes e8, c8, a8 and d8; Black's exf3 from e4, e4, f3 and f4.
export function changes(move: Move): Square[] {
  if (move.castle) {
    const rank = move.from[1];
    const rook = move.castle === "king" ? [`h${rank}`, `f${rank}`] : [`a${rank}`, `d${rank}`];
    return [move.from, move.to, ...(rook as Square[])];
  }
  if (move.enPassant) return [move.from, move.to, `${move.to[0]}${move.from[1]}` as Square];
  return [move.from, move.to];
}

// The arrows that show a move: one for each piece that moves, from where it
// leaves to where it lands. Castling has two, the king's then the rook's. A
// promotion shows the pawn's movement, and a pawn taken in passing the
// capturing pawn's. A piece that is taken has none.
export function arrowsOf(move: Move): Arrow[] {
  const arrows: Arrow[] = [{ from: move.from, to: move.to }];
  if (move.castle) {
    const [, , from, to] = changes(move);
    arrows.push({ from: from!, to: to! });
  }
  return arrows;
}

export type MoveKind = "move" | "capture" | "castling" | "en passant" | "promotion";

// A move's kind: a move, a capture, castling, a pawn taken in passing, or a
// promotion. A promotion that takes is a promotion.
export function moveKind(move: Move): MoveKind {
  if (move.castle) return "castling";
  if (move.enPassant) return "en passant";
  if (move.promotion) return "promotion";
  if (move.captured) return "capture";
  return "move";
}

// ---------------------------------------------------------------------------
// Reading

// One way to read a move's text as a written move.
export type Written = {
  castle: "king" | "queen" | null;
  piece: Kind; // pawn when no letter names a piece
  pawnLetter: boolean; // a P written on a pawn: "Pe4"
  fromFile: File | null;
  fromRank: Rank | null;
  capture: boolean; // x, "takes" or "captures" written
  to: Square | null; // null for castling
  promotion: Kind | null;
  sign: "+" | "#" | null;
  enPassant: boolean; // "e.p." or "en passant" written
};

const LETTERS: Record<string, Kind> = { K: "king", Q: "queen", R: "rook", B: "bishop", N: "knight", P: "pawn" };
const PIECE_WORDS: Record<string, string> = {
  king: "K", queen: "Q", rook: "R", bishop: "B", knight: "N", night: "N",
};

const KINGSIDE = /\b(?:(?:castles?|castling)\s+(?:king\s?side|short)|(?:king\s?side|short)\s+(?:castles?|castling))\b/gi;
const QUEENSIDE = /\b(?:(?:castles?|castling)\s+(?:queen\s?side|long)|(?:queen\s?side|long)\s+(?:castles?|castling))\b/gi;

// A move's text to one compact string, every word turned to its sign:
// "bishop takes f7 check" to "Bxf7+", "rook to e to" to "Re2",
// "b one queen" to "b1Q", "e8 promotes to queen" to "e8=Q".
function compact(text: string): { text: string; enPassant: boolean } {
  let s = ` ${text.replace(/[’‘]/g, "'").trim()} `;
  let enPassant = false;
  s = s.replace(/\s(?:en\s+passant|e\.\s?p\.?|ep)(?=\s)/gi, () => {
    enPassant = true;
    return " ";
  });
  s = s.replace(/\.+\s*$/, " ");
  s = s.replace(KINGSIDE, " O-O ").replace(QUEENSIDE, " O-O-O ");
  s = s.replace(/\+\+/g, " # ").replace(/\b(?:checkmate|mate)\b/gi, " # ").replace(/\bcheck\b/gi, " + ");
  s = s.replace(/\b(?:promotes|promote)\s+to\b|\b(?:promotes|equals)\b/gi, " = ");
  s = s.replace(/\b(?:takes|take|captures|capture)\b/gi, " x ");
  const out: string[] = [];
  // Whether the last word ends on a file: then "to" is a 2, "for" a 4.
  let afterFile = false;
  for (const raw of s.split(/\s+/).filter(Boolean)) {
    const w = raw.toLowerCase();
    if (PIECE_WORDS[w]) {
      out.push(PIECE_WORDS[w]!);
      afterFile = false;
    } else if (w === "pawn") {
      afterFile = false;
    } else if (afterFile && RANK_WORDS[w]) {
      out.push(RANK_WORDS[w]!);
      afterFile = false;
    } else if (w === "to") {
      continue;
    } else if (w.length > 1 && FILE_WORDS[w]) {
      out.push(FILE_WORDS[w]!);
      afterFile = true;
    } else if (/^(one|two|three|four|five|six|seven|eight)$/.test(w)) {
      out.push(RANK_WORDS[w]!);
      afterFile = false;
    } else {
      out.push(raw);
      // A lone capital names a piece, never a file: "B to f3" is a bishop.
      afterFile = /[a-hA-H]$/.test(raw) && !/^[KQRBNP]$/.test(raw);
    }
  }
  return { text: out.join("").replace(/-/g, ""), enPassant };
}

// What follows a piece's letter, in small letters but for a promotion's piece,
// which follows the square, with = or without: "xd8=n+" to "xd8N+".
function body(text: string): string {
  return text
    .toLowerCase()
    .replace(/=/g, "")
    .replace(/([1-8])([qrbn])([+#]?)$/, (_, rank: string, p: string, sign: string) => `${rank}${p.toUpperCase()}${sign}`);
}

const FORM = /^([a-h])?([1-8])?(x)?([a-h][1-8])([QRBN])?([+#])?$/;

// One reading: the piece's letter, or none for a pawn, then the rest.
function parse(rest: string, letter: string | null, enPassant: boolean): Written | null {
  const m = rest.match(FORM);
  if (!m) return null;
  const [, ff, fr, x, to, promo, sign] = m;
  const piece = letter ? LETTERS[letter.toUpperCase()]! : "pawn";
  return {
    castle: null,
    piece,
    pawnLetter: piece === "pawn" && letter !== null,
    fromFile: (ff as File) ?? null,
    fromRank: (fr as Rank) ?? null,
    capture: !!x,
    to: to as Square,
    promotion: promo ? LETTERS[promo]! : null,
    sign: (sign as "+" | "#") ?? null,
    enPassant,
  };
}

// Every reading of a move's text, or "not counted" when it names
// no move, such as "Zf3" or "N". Forms: "Nf3", "nf3", "N f3", "N-f3",
// "knight f3", "Knight F three", "pawn e4", "knight to f3", "rook to e to",
// "Bxc6", "Bc6", "bishop takes c6", "exd5", "ed5", "e takes d5", "O-O",
// "0-0-0", "castles kingside", "short castling", "e8=Q", "e8Q", "e8 queen",
// "e8 equals queen", "e8 promotes to queen", "exd6 e.p.", "Bxf7+",
// "bishop takes f7 check", "Re8 mate", "Re8++". A small b is always the
// b-file, and B always the bishop: on the move composer, they are two keys.
export function readMove(text: string): Written[] | NotCounted {
  const { text: c, enPassant } = compact(text);
  const castle = c.match(/^([oO0]{2,3})([+#])?$/);
  if (castle) {
    return [{
      castle: castle[1]!.length === 3 ? "queen" : "king", piece: "king", pawnLetter: false,
      fromFile: null, fromRank: null, capture: false, to: null, promotion: null, sign: (castle[2] as "+" | "#") ?? null, enPassant,
    }];
  }
  if (!c) return NOT_COUNTED;
  const head = c[0]!;
  const read = /^[KQRBNPkqrnp]$/.test(head) ? parse(body(c.slice(1)), head, enPassant) : parse(body(c), null, enPassant);
  return read ? [read] : NOT_COUNTED;
}

// ---------------------------------------------------------------------------
// Finding the move a move's text names

export type Found =
  | { found: Move; written: Written }
  | { none: true; readings: Written[] } // it names a move, and no legal move is it
  | { unclear: "pieces"; candidates: Move[]; line: string } // "Two of your rooks reach d1: say which."
  | { unclear: "promotion"; candidates: Move[]; line: string } // "Say which piece your pawn becomes."
  | { notCounted: true };

// Whether a legal move is one a reading names, its signs passed over: x, +
// and #. A pawn named by no file moves straight ahead: a pawn's capture names
// the file it leaves.
export function names(w: Written, m: Move): boolean {
  if (w.castle) return m.castle === w.castle;
  if (m.castle || m.kind !== w.piece || m.to !== w.to) return false;
  if (w.fromFile && m.from[0] !== w.fromFile) return false;
  if (w.fromRank && m.from[1] !== w.fromRank) return false;
  if (w.piece === "pawn" && !w.fromFile && m.from[0] !== m.to[0]) return false;
  if (w.promotion && m.promotion !== w.promotion) return false;
  return true;
}

const COUNT = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
const PLURAL: Record<Kind, string> = { king: "kings", queen: "queens", rook: "rooks", bishop: "bishops", knight: "knights", pawn: "pawns" };

// Which legal move a move's text names, its signs passed over: one move; none;
// a move two of my pieces could make; or a promotion without its piece.
export function findMove(pos: Position, text: string): Found {
  const readings = readMove(text);
  if (readings === NOT_COUNTED) return { notCounted: true };
  const legal = legalMoves(pos);
  for (const w of readings) {
    const candidates = legal.filter((m) => names(w, m));
    if (!candidates.length) continue;
    const froms = [...new Set(candidates.map((m) => m.from))];
    if (froms.length > 1) {
      const m = candidates[0]!;
      return { unclear: "pieces", candidates, line: `${COUNT[froms.length] ?? froms.length} of your ${PLURAL[m.kind]} reach ${m.to}: say which.` };
    }
    if (candidates.length > 1) return { unclear: "promotion", candidates, line: "Say which piece your pawn becomes." };
    return { found: candidates[0]!, written: w };
  }
  return { none: true, readings };
}
