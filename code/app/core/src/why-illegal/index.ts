// Block 11, Why a move is illegal: names what made a move illegal, the first
// that fits. No such piece there, with the Thread finder's move when one took
// it; its line blocked, naming the piece between; my king left in check, or
// stepped next to the other king; castling not allowed, naming why; another
// reason. It never refuses the move: the challenge does. Its reason never
// shows before the endgame or game ends: the reason would show me the board.
//
// Source: code/blueprint/building-blocks.md, block 11; blind-play.md,
// "Illegal moves", "Where I lost the thread", and 6.3.1's mistakes.

import type { Written } from "../notation/index.ts";
import { kingSquare, other, type Position, sideWord } from "../positions/index.ts";
import { attackersOf, piecesBetween, reachOnEmpty } from "../reach/index.ts";
import type { Kind, Piece, Placed, Side, Square } from "../shape/index.ts";
import { bySquare, step } from "../squares/index.ts";
import { moveWords, pathOf, type Taken, type Thread } from "../thread/index.ts";

export type Why =
  // No piece of mine of that kind could make the move. Where one stood
  // earlier, where the move would have worked: the square, and what became of it.
  | { why: "no piece"; kind: Kind; to: Square; stood: { square: Square; takenBy: Taken | null; takenOn: Square | null; movedBy: Taken | null } | null }
  | { why: "blocked"; from: Square; to: Square; between: Placed }
  | { why: "stays in check"; king: Square; by: Placed[] }
  | { why: "into check"; king: Square; by: Placed[] }
  | { why: "next to king"; to: Square; king: Square }
  | { why: "castling"; because: "king moved" | "rook moved" | "between" | "in check" | "attacked"; square: Square; piece: Placed | null }
  | { why: "other" };

type Board = Position["board"];

const placed = (board: Board, square: Square): Placed => ({ ...board[square]!, square });

// Where a piece on `from` could go on an empty board, and whether it lands
// there taking: a pawn moves straight, and takes diagonally.
function reaches(piece: Piece, from: Square, to: Square): boolean {
  if (piece.kind !== "pawn") return reachOnEmpty(piece, from).includes(to);
  if (from[0] === to[0]) return reachOnEmpty(piece, from).includes(to);
  const ahead = piece.side === "white" ? 1 : -1;
  return [step(from, -1, ahead), step(from, 1, ahead)].includes(to);
}

// The board after a move, played by hand: what the king would face.
function afterMove(board: Board, from: Square, to: Square, enPassant: boolean): Board {
  const next = { ...board };
  next[to] = next[from];
  delete next[from];
  if (enPassant) delete next[`${to[0]}${from[1]}` as Square];
  return next;
}

// How far a piece's move gets before it fails: 1, another reason; 2, its line
// blocked; 3, it would be legal but for my king.
type Try = { stage: 1 } | { stage: 2; between: Placed } | { stage: 3; board: Board };

function attempt(pos: Position, from: Square, to: Square, piece: Piece): Try {
  const board = pos.board;
  const target = board[to];
  const between = piecesBetween(board, from, to);
  if (piece.kind !== "knight" && piece.kind !== "king" && between && between.length) return { stage: 2, between: between[0]! };
  if (target?.side === piece.side) return { stage: 1 };
  let enPassant = false;
  if (piece.kind === "pawn") {
    if (from[0] === to[0] && target) return { stage: 1 };
    if (from[0] !== to[0] && !target) {
      if (pos.enPassant !== to) return { stage: 1 };
      enPassant = true;
    }
  }
  return { stage: 3, board: afterMove(board, from, to, enPassant) };
}

function castlingWhy(pos: Position, wing: "king" | "queen"): Why {
  const side = pos.turn;
  const rank = side === "white" ? "1" : "8";
  const board = pos.board;
  const kingAt = `e${rank}` as Square;
  const rookAt = `${wing === "king" ? "h" : "a"}${rank}` as Square;
  const king = board[kingAt];
  const rook = board[rookAt];
  const kingMoved: Why = { why: "castling", because: "king moved", square: kingAt, piece: null };
  const rookMoved: Why = { why: "castling", because: "rook moved", square: rookAt, piece: null };
  if (!(king?.side === side && king.kind === "king")) return kingMoved;
  if (!(rook?.side === side && rook.kind === "rook")) return rookMoved;
  // Both back on their squares, the right gone: the king moved when both
  // rights are gone, the rook when only its own is.
  if (!pos.castling[side][wing]) return pos.castling[side].king || pos.castling[side].queen ? rookMoved : kingMoved;
  const between = piecesBetween(board, kingAt, rookAt)!;
  if (between.length) return { why: "castling", because: "between", square: between[0]!.square, piece: between[0]! };
  const enemy = other(side);
  if (attackersOf(board, kingAt, enemy).length) return { why: "castling", because: "in check", square: kingAt, piece: placed(board, kingAt) };
  for (const s of wing === "king" ? [`f${rank}`, `g${rank}`] : [`d${rank}`, `c${rank}`]) {
    const by = attackersOf(board, s as Square, enemy);
    if (by.length) return { why: "castling", because: "attacked", square: s as Square, piece: placed(board, by[0]!) };
  }
  return { why: "other" };
}

// Where a piece of my side and kind stood, earlier in the thread, on a square
// from which the move would have worked: the square it stood on longest, and
// what became of it.
function stoodEarlier(t: Thread, side: Side, kind: Kind, to: Square): Extract<Why, { why: "no piece" }>["stood"] {
  const stays = new Map<string, { square: Square; ply: number; frames: number }>();
  t.frames.forEach((frame, ply) => {
    for (const [square, at] of Object.entries(frame) as [Square, { piece: Piece; id: number }][]) {
      if (at.piece.side !== side || at.piece.kind !== kind || !reaches(at.piece, square, to)) continue;
      const key = `${at.id}@${square}`;
      const stay = stays.get(key);
      if (stay) stay.frames++;
      else stays.set(key, { square, ply, frames: 1 });
    }
  });
  const best = [...stays.values()].sort((a, b) => b.frames - a.frames || b.ply - a.ply)[0];
  if (!best) return null;
  const path = pathOf(t, best.square, best.ply)!;
  return { square: best.square, takenBy: path.takenBy, takenOn: path.takenOn, movedBy: path.moved[0] ?? null };
}

// Why a move I typed is not legal in a position, the first reason that fits.
// The thread, when given, ends in this position: it finds where a missing
// piece went.
export function whyIllegal(pos: Position, written: Written, thread?: Thread): Why {
  if (written.castle) return castlingWhy(pos, written.castle);
  const side = pos.turn;
  const to = written.to!;
  const mine = (Object.entries(pos.board) as [Square, Piece][])
    .filter(([, p]) => p.side === side && p.kind === written.piece)
    .filter(([s]) => (!written.fromFile || s[0] === written.fromFile) && (!written.fromRank || s[1] === written.fromRank))
    .filter(([s, p]) => s !== to && reaches(p, s, to))
    .sort(([a], [b]) => bySquare(a, b));
  if (!mine.length) {
    return { why: "no piece", kind: written.piece, to, stood: thread ? stoodEarlier(thread, side, written.piece, to) : null };
  }
  const tries = mine.map(([from, piece]) => ({ from, piece, t: attempt(pos, from, to, piece) }));
  const best = tries.reduce((a, b) => (b.t.stage > a.t.stage ? b : a));
  if (best.t.stage === 2) return { why: "blocked", from: best.from, to, between: best.t.between };
  if (best.t.stage === 1) return { why: "other" };
  const after = best.t.board;
  const enemy = other(side);
  if (best.piece.kind === "king") {
    const theirs = kingSquare(pos, enemy)!;
    if (Math.abs(theirs.charCodeAt(0) - to.charCodeAt(0)) <= 1 && Math.abs(Number(theirs[1]) - Number(to[1])) <= 1) {
      return { why: "next to king", to, king: theirs };
    }
  }
  const king = best.piece.kind === "king" ? to : kingSquare(pos, side)!;
  const by = attackersOf(after, king, enemy).map((s) => placed(after, s));
  const wasInCheck = attackersOf(pos.board, kingSquare(pos, side)!, enemy).length > 0;
  return wasInCheck ? { why: "stays in check", king: kingSquare(pos, side)!, by } : { why: "into check", king, by };
}

// A piece in the reader's words: "your pawn on d4", "Black's pawn on f4".
function whose(p: Placed, me: Side): string {
  return `${p.side === me ? "your" : `${sideWord(p.side)}'s`} ${p.kind} on ${p.square}`;
}

// The reason, said after the game, as the pages say it. `move` is the move as
// I typed it, numbered: "15. Bxe5". `me` is my side. The thread gives the
// moves' numbers.
//
// > Stand-in. The lines the pages give no words for: a piece moved away, no
// > piece at all, a king walking into check, castling after the king or rook
// > moved, through check or an attacked square, and another reason. Each is
// > built on the pages' pattern.
export function whyLine(why: Why, move: string, me: Side, thread?: Thread): string {
  const said = (t: Taken) => (thread ? moveWords(thread, t.ply) : t.move.san);
  switch (why.why) {
    case "no piece": {
      const s = why.stood;
      const kind = why.kind;
      if (s?.takenBy && s.takenOn === s.square) return `${move} was not legal: your ${kind} on ${s.square} was taken by ${said(s.takenBy)}.`;
      if (s?.takenBy) return `${move} was not legal: your ${kind} from ${s.square} was taken on ${s.takenOn} at ${said(s.takenBy)}.`;
      if (s?.movedBy) return `${move} was not legal: your ${kind} left ${s.square} at ${said(s.movedBy)}.`;
      return `${move} was not legal: no ${kind} of yours reaches ${why.to}.`;
    }
    case "blocked":
      return `${move} was not legal: ${whose(why.between, me)} stands between ${why.from} and ${why.to}.`;
    case "next to king":
      return `${move} would stand next to ${sideWord(other(me))}'s king on ${why.king}.`;
    case "stays in check": {
      const last = thread && thread.moves.length ? `${moveWords(thread, thread.moves.length)} gave check, and ` : "";
      return `${move} was not legal: ${last}your king on ${why.king} stayed in it.`;
    }
    case "into check":
      return `${move} was not legal: your king on ${why.king} would stand in check from ${why.by.map((p) => whose(p, me)).join(" and ")}.`;
    case "castling":
      switch (why.because) {
        case "between": return `${move} was not legal: ${whose(why.piece!, me)} stands between your king and your rook.`;
        case "king moved": return `${move} was not legal: your king has moved.`;
        case "rook moved": return `${move} was not legal: your rook from ${why.square} has moved.`;
        case "in check": return `${move} was not legal: your king stands in check.`;
        case "attacked": return `${move} was not legal: ${whose(why.piece!, me)} attacks ${why.square}, where your king would pass or land.`;
      }
    // falls through: every castling reason returns above
    case "other":
      return `${move} was not legal.`;
  }
}
