// Block 1, Squares: the board's map, in names and numbers. It never knows a piece.
//
// Source: code/blueprint/building-blocks.md, block 1; board-coordinates.md.

import type { File, Rank, Square } from "../shape/index.ts";

export const FILES: readonly File[] = ["a", "b", "c", "d", "e", "f", "g", "h"];
export const RANKS: readonly Rank[] = ["1", "2", "3", "4", "5", "6", "7", "8"];

// a1, a2 ... h8: every square, file by file.
export const SQUARES: readonly Square[] = FILES.flatMap((f) => RANKS.map((r) => `${f}${r}` as Square));

export function isSquare(text: string): text is Square {
  return /^[a-h][1-8]$/.test(text);
}

export function fileOf(square: Square): File {
  return square[0] as File;
}

export function rankOf(square: Square): Rank {
  return square[1] as Rank;
}

// The file's number, a = 1 to h = 8.
export function fileNumber(square: Square): number {
  return FILES.indexOf(fileOf(square)) + 1;
}

export function rankNumber(square: Square): number {
  return Number(rankOf(square));
}

// The square by file and rank numbers, 1 to 8, or null off the board.
export function at(file: number, rank: number): Square | null {
  if (file < 1 || file > 8 || rank < 1 || rank > 8) return null;
  return `${FILES[file - 1]}${rank}` as Square;
}

// The square so many files and ranks away, or null off the board.
export function step(square: Square, files: number, ranks: number): Square | null {
  return at(fileNumber(square) + files, rankNumber(square) + ranks);
}

// a1 is dark. File number plus rank: even is dark, odd is light.
// f5: f is file 6, and 6 + 5 = 11 is odd, so light.
export function colourOf(square: Square): "light" | "dark" {
  return (fileNumber(square) + rankNumber(square)) % 2 === 0 ? "dark" : "light";
}

export type Line = "file" | "rank" | "diagonal";

// The line two squares share, or null when they share none, or are one square.
export function lineOf(a: Square, b: Square): Line | null {
  const df = fileNumber(b) - fileNumber(a);
  const dr = rankNumber(b) - rankNumber(a);
  if (df === 0 && dr === 0) return null;
  if (df === 0) return "file";
  if (dr === 0) return "rank";
  if (Math.abs(df) === Math.abs(dr)) return "diagonal";
  return null;
}

// The squares between two squares on one file, rank or diagonal, from a
// towards b. null when they share no line. c4 and f7 give d5 and e6; c4 and
// e7 give null; d4 and e5 give none between.
export function between(a: Square, b: Square): Square[] | null {
  if (!lineOf(a, b)) return null;
  const df = Math.sign(fileNumber(b) - fileNumber(a));
  const dr = Math.sign(rankNumber(b) - rankNumber(a));
  const out: Square[] = [];
  let s = step(a, df, dr);
  while (s && s !== b) {
    out.push(s);
    s = step(s, df, dr);
  }
  return out;
}

// A square mirrored a to h, as chapter 4 mirrors: it keeps its rank. g1 gives b1.
export function mirror(square: Square): Square {
  return `${FILES[8 - fileNumber(square)]}${rankOf(square)}` as Square;
}

// The square in its place when I sit at the other side. f6 gives c3.
export function turned(square: Square): Square {
  return at(9 - fileNumber(square), 9 - rankNumber(square))!;
}

// The square with its ranks counted from the other edge. f6 gives f3.
export function ranksReversed(square: Square): Square {
  return at(fileNumber(square), 9 - rankNumber(square))!;
}

// The square with its files counted from the other edge. f6 gives c6.
export const filesReversed = mirror;

// Squares in the pages' order, from the a-file on, each file from rank 1 up.
export function bySquare(a: Square, b: Square): number {
  return fileNumber(a) - fileNumber(b) || rankNumber(a) - rankNumber(b);
}
