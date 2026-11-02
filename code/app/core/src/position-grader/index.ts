// Block 9, Position grader: compares a position I built with the right one,
// square by square: right, left out, added, the wrong piece, the wrong side.
// Pairs a piece placed where it does not stand with a left-out piece of its
// kind and side. Finds two pieces swapped. Counts pieces right, as 4.2.1 does,
// and squares right among those that differ from the starting position, as
// 5.2.1 does. It never names where I lost the thread: the Thread finder does.
//
// Source: code/blueprint/building-blocks.md, block 9; position-memory.md,
// 4.2.1's "Scoring" and "Mistakes it names"; updating-a-position.md, 5.2.1's.

import { NEAR_MISSES, nearMiss, type NearMiss } from "../near-misses/index.ts";
import { type Position, samePiece, startingPosition } from "../positions/index.ts";
import type { Piece, Square, Stands } from "../shape/index.ts";
import { bySquare, SQUARES } from "../squares/index.ts";

export type Verdict = "left out" | "added" | "wrong piece" | "wrong side" | "wrong";

// A square that differs: what I built there, and what stands there.
export type Wrong = { square: Square; built: Stands; right: Stands; verdict: Verdict };

// A piece I placed where it does not stand, paired with a left-out piece of
// its kind and side, with the first of chapter 1's five that fits, or none.
export type Paired = { piece: Piece; placed: Square; belongs: Square; kind: NearMiss | null };

export type PositionGrade = {
  whole: boolean;
  wrong: Wrong[]; // every square that differs, from the a-file on
  pairs: Paired[];
  swaps: [Square, Square][]; // two pieces, each on the other's square
  pieces: number; // every piece of the right position, kings included
  piecesRight: number; // 4.2.1's count
};

type Board = Position["board"];

function verdictOf(built: Stands, right: Stands): Verdict {
  if (!built) return "left out";
  if (!right) return "added";
  if (built.side === right.side) return "wrong piece";
  if (built.kind === right.kind) return "wrong side";
  return "wrong";
}

// 4.2.1 L1's position, with Black's rook on a1 for b1: 5 of 6, the rook
// paired with b1, the file beside. 4.2.1 L3's, with Black's rook and bishop
// swapped: 10 of 12, swapped.
export function gradePosition(built: Board, right: Board): PositionGrade {
  const wrong: Wrong[] = [];
  for (const square of SQUARES) {
    const b = built[square] ?? null;
    const r = right[square] ?? null;
    if (!samePiece(b, r)) wrong.push({ square, built: b, right: r, verdict: verdictOf(b, r) });
  }
  wrong.sort((x, y) => bySquare(x.square, y.square));

  // Two pieces swapped: each placed on the other's square.
  const swaps: [Square, Square][] = [];
  const inSwap = new Set<Square>();
  for (const a of wrong) {
    for (const b of wrong) {
      if (bySquare(a.square, b.square) >= 0 || inSwap.has(a.square) || inSwap.has(b.square)) continue;
      if (a.built && b.built && samePiece(a.built, b.right) && samePiece(b.built, a.right)) {
        swaps.push([a.square, b.square]);
        inSwap.add(a.square).add(b.square);
      }
    }
  }

  // Each piece placed where it does not stand, paired with a left-out piece
  // of its kind and side: the one it fits by the first of the five, else the first.
  const placed = wrong.filter((w) => w.built && !inSwap.has(w.square));
  const missing = wrong.filter((w) => w.right && !inSwap.has(w.square));
  const pairs: Paired[] = [];
  const used = new Set<Square>();
  for (const p of placed) {
    const options = missing.filter((m) => !used.has(m.square) && m.square !== p.square && samePiece(m.right, p.built));
    if (!options.length) continue;
    const rank = (m: Wrong) => {
      const k = nearMiss(m.square, p.square);
      return k ? NEAR_MISSES.indexOf(k) : NEAR_MISSES.length;
    };
    const best = options.reduce((a, b) => (rank(b) < rank(a) ? b : a));
    used.add(best.square);
    pairs.push({ piece: p.built!, placed: p.square, belongs: best.square, kind: nearMiss(best.square, p.square) });
  }

  const pieces = Object.keys(right).length;
  const rightPieces = SQUARES.filter((s) => right[s] && samePiece(built[s] ?? null, right[s]!)).length;
  // A piece added where nothing stands, with no piece left out to pair with, takes one more off.
  const pairedAt = new Set(pairs.map((p) => p.placed));
  const loose = wrong.filter((w) => w.verdict === "added" && !pairedAt.has(w.square)).length;
  return { whole: wrong.length === 0, wrong, pairs, swaps, pieces, piecesRight: Math.max(0, rightPieces - loose) };
}

// 5.2.1's count: the squares right among those that differ from the starting
// position after the last move; a square wrong outside them takes one more off.
export function squaresRight(built: Board, right: Board, start: Board = startingPosition().board): { changed: number; right: number } {
  const changed = SQUARES.filter((s) => !samePiece(start[s] ?? null, right[s] ?? null));
  const changedSet = new Set(changed);
  const good = changed.filter((s) => samePiece(built[s] ?? null, right[s] ?? null)).length;
  const outside = SQUARES.filter((s) => !changedSet.has(s) && !samePiece(built[s] ?? null, right[s] ?? null)).length;
  return { changed: changed.length, right: Math.max(0, good - outside) };
}
