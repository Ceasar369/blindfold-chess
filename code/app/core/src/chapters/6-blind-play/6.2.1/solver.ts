// 6.2.1's own small solver: every king and queen, king and rook, and king and
// pawn against a lone king, worked back from the goal. Its tables are made
// once, by make-tables.ts, into code/app/core/packs/endgames/, and the site
// serves them. The card reads them to pick its positions, to count the fewest
// moves, and to defend.
//
// Source: code/blueprint/building-blocks.md, "What it is built with", 6.2.1's
// endgame tables; blind-play.md, 6.2.1. Its counts must match
// blindfold-chess-references/blind-play-lookups/basic-endgames.md: 144,508
// queen positions, 175,168 rook, and 124,954 won of 163,328 pawn.
//
// The stronger side is always White here, its pawn moving up the board. A
// square is a number, a1 = 0, b1 = 1 ... h8 = 63. A table holds one byte per
// position with White to move, at at(White's king, White's piece, Black's
// king): the fewest White moves to the goal, DRAW, or NOT_SET_UP.
//
// The goal: mate, with a queen or a rook. With a pawn: the pawn becomes a
// queen that Black cannot take at once, with Black not stalemated. A mate a
// pawn gives on its way counts as the goal too. Only a queen is counted: a
// pawn made a rook, a bishop or a knight leaves the table.

export type Endgame = "queen" | "rook" | "pawn";

export const DRAW = 254;
export const NOT_SET_UP = 255;
const UNKNOWN = 253;

export const SIZE = 64 * 64 * 64;

// A position's place in a table.
export const at = (wk: number, piece: number, bk: number): number => (wk << 12) | (piece << 6) | bk;

export const fileOf = (s: number) => s & 7;
export const rankOf = (s: number) => s >> 3;

// Two squares side by side, or one square.
export function near(a: number, b: number): boolean {
  return Math.abs(fileOf(a) - fileOf(b)) <= 1 && Math.abs(rankOf(a) - rankOf(b)) <= 1;
}

const KING_STEPS: number[][] = Array.from({ length: 64 }, (_, s) => {
  const out: number[] = [];
  for (let df = -1; df <= 1; df++)
    for (let dr = -1; dr <= 1; dr++) {
      const f = fileOf(s) + df;
      const r = rankOf(s) + dr;
      if ((df || dr) && f >= 0 && f < 8 && r >= 0 && r < 8) out.push(r * 8 + f);
    }
  return out;
});

const ROOK_LINES = [[1, 0], [-1, 0], [0, 1], [0, -1]] as const;
const QUEEN_LINES = [...ROOK_LINES, [1, 1], [1, -1], [-1, 1], [-1, -1]] as const;

// Whether White's piece on `from` attacks `to`, White's king the only piece
// between that can stop a line: Black's king is the one moving, or the one attacked.
export function attacks(kind: Endgame, from: number, to: number, wk: number): boolean {
  if (from === to) return false;
  const df = fileOf(to) - fileOf(from);
  const dr = rankOf(to) - rankOf(from);
  if (kind === "pawn") return dr === 1 && Math.abs(df) === 1;
  const straight = df === 0 || dr === 0;
  const diagonal = Math.abs(df) === Math.abs(dr);
  if (!straight && !(kind === "queen" && diagonal)) return false;
  const sf = Math.sign(df);
  const sr = Math.sign(dr);
  for (let f = fileOf(from) + sf, r = rankOf(from) + sr; f !== fileOf(to) || r !== rankOf(to); f += sf, r += sr) {
    if (r * 8 + f === wk) return false;
  }
  return true;
}

export function inCheck(kind: Endgame, wk: number, piece: number, bk: number): boolean {
  return attacks(kind, piece, bk, wk);
}

// Every square Black's king may move to. takes: it takes White's piece,
// which only White's king could guard.
export function blackMoves(kind: Endgame, wk: number, piece: number, bk: number): { to: number; takes: boolean }[] {
  const out: { to: number; takes: boolean }[] = [];
  for (const to of KING_STEPS[bk]!) {
    if (near(to, wk)) continue;
    if (to === piece) out.push({ to, takes: true });
    else if (!attacks(kind, piece, to, wk)) out.push({ to, takes: false });
  }
  return out;
}

// Every move of White's: the king, or the piece. promotes: the pawn reaches
// the eighth rank, as a queen.
export function whiteMoves(kind: Endgame, wk: number, piece: number, bk: number): { wk: number; piece: number; promotes: boolean }[] {
  const out: { wk: number; piece: number; promotes: boolean }[] = [];
  for (const to of KING_STEPS[wk]!) if (to !== piece && !near(to, bk)) out.push({ wk: to, piece, promotes: false });
  if (kind === "pawn") {
    const one = piece + 8;
    if (one !== wk && one !== bk) {
      out.push({ wk, piece: one, promotes: rankOf(one) === 7 });
      const two = piece + 16;
      if (rankOf(piece) === 1 && two !== wk && two !== bk) out.push({ wk, piece: two, promotes: false });
    }
    return out;
  }
  for (const [df, dr] of kind === "queen" ? QUEEN_LINES : ROOK_LINES) {
    for (let f = fileOf(piece) + df, r = rankOf(piece) + dr; f >= 0 && f < 8 && r >= 0 && r < 8; f += df, r += dr) {
      const to = r * 8 + f;
      if (to === wk || to === bk) break;
      out.push({ wk, piece: to, promotes: false });
    }
  }
  return out;
}

// The three on distinct squares, the kings apart, a pawn on ranks 2 to 7.
export function placed(kind: Endgame, wk: number, piece: number, bk: number): boolean {
  if (wk === piece || wk === bk || piece === bk || near(wk, bk)) return false;
  return kind !== "pawn" || (rankOf(piece) >= 1 && rankOf(piece) <= 6);
}

// A set-up position with White to move: Black, not to move, never in check.
export function setUp(kind: Endgame, wk: number, piece: number, bk: number): boolean {
  return placed(kind, wk, piece, bk) && !inCheck(kind, wk, piece, bk);
}

// A pawn made a queen on `queen`, Black to move: the goal, unless Black takes
// it at once, or is stalemated.
export function queenHolds(wk: number, queen: number, bk: number): boolean {
  const moves = blackMoves("queen", wk, queen, bk);
  if (!moves.length) return inCheck("queen", wk, queen, bk);
  return !moves.some((m) => m.takes);
}

// Black to move, after a move of White's: mated, stalemated, or each reply
// with the table's value after it. A reply taking White's piece is a draw.
export type BlackToMove = { mated: true } | { stalemated: true } | { replies: { to: number; value: number }[] };

export function blackToMove(kind: Endgame, table: Uint8Array, wk: number, piece: number, bk: number): BlackToMove {
  const moves = blackMoves(kind, wk, piece, bk);
  if (!moves.length) return inCheck(kind, wk, piece, bk) ? { mated: true } : { stalemated: true };
  return { replies: moves.map((m) => ({ to: m.to, value: m.takes ? DRAW : table[at(wk, piece, m.to)]! })) };
}

// The whole table, worked back from the goal.
export function solve(kind: Endgame): Uint8Array {
  const W = new Uint8Array(SIZE).fill(NOT_SET_UP);
  const B = new Uint8Array(SIZE).fill(NOT_SET_UP);
  for (let wk = 0; wk < 64; wk++)
    for (let p = 0; p < 64; p++)
      for (let bk = 0; bk < 64; bk++) {
        if (!placed(kind, wk, p, bk)) continue;
        const i = at(wk, p, bk);
        W[i] = inCheck(kind, wk, p, bk) ? NOT_SET_UP : UNKNOWN;
        const moves = blackMoves(kind, wk, p, bk);
        if (!moves.length) B[i] = inCheck(kind, wk, p, bk) ? 0 : DRAW;
        else B[i] = moves.some((m) => m.takes) ? DRAW : UNKNOWN;
      }
  for (let d = 1; ; d++) {
    let changed = false;
    for (let i = 0; i < SIZE; i++) {
      if (W[i] !== UNKNOWN) continue;
      const wk = i >> 12;
      const p = (i >> 6) & 63;
      const bk = i & 63;
      for (const m of whiteMoves(kind, wk, p, bk)) {
        const reached = m.promotes ? d === 1 && queenHolds(m.wk, m.piece, bk) : B[at(m.wk, m.piece, bk)] === d - 1;
        if (reached) {
          W[i] = d;
          changed = true;
          break;
        }
      }
    }
    for (let i = 0; i < SIZE; i++) {
      if (B[i] !== UNKNOWN) continue;
      const wk = i >> 12;
      const p = (i >> 6) & 63;
      let most = 0;
      let known = true;
      for (const m of blackMoves(kind, wk, p, i & 63)) {
        const v = W[at(wk, p, m.to)]!;
        if (v === UNKNOWN || v === DRAW) {
          known = false;
          break;
        }
        most = Math.max(most, v);
      }
      if (known) {
        B[i] = most;
        changed = true;
      }
    }
    if (!changed) break;
  }
  for (let i = 0; i < SIZE; i++) if (W[i] === UNKNOWN) W[i] = DRAW;
  return W;
}

// How many set-up positions a table holds, how many it wins, and how many
// need each number of moves.
export function counts(table: Uint8Array): { positions: number; won: number; byMoves: Record<number, number> } {
  let positions = 0;
  let won = 0;
  const byMoves: Record<number, number> = {};
  for (const v of table) {
    if (v === NOT_SET_UP) continue;
    positions++;
    if (v === DRAW) continue;
    won++;
    byMoves[v] = (byMoves[v] ?? 0) + 1;
  }
  return { positions, won, byMoves };
}
