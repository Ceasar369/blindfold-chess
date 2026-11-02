// Block 2, Near misses: chapter 1's five, in the pages' order. Given the right
// square and a wrong one, it names the first of the five that fits, or none.
// Given a square, it lists its near misses. It never decides which square was
// right, or pairs a wrong square with a missing one: the graders pair them.
//
// Source: code/blueprint/building-blocks.md, block 2; board-coordinates.md, 1.1.1.

import type { Square } from "../shape/index.ts";
import { fileNumber, filesReversed, rankNumber, ranksReversed, step, turned } from "../squares/index.ts";

export type NearMiss = "file beside" | "rank beside" | "board turned" | "files reversed" | "ranks reversed";

export const NEAR_MISSES: readonly NearMiss[] = ["file beside", "rank beside", "board turned", "files reversed", "ranks reversed"];

// Each one's words in a told line: "e6, the file beside".
export const WORDS: Record<NearMiss, string> = {
  "file beside": "the file beside",
  "rank beside": "the rank beside",
  "board turned": "the board turned",
  "files reversed": "the files reversed",
  "ranks reversed": "the ranks reversed",
};

// Each one's name among a card's mistakes: "The file beside".
export const MISTAKE: Record<NearMiss, string> = {
  "file beside": "The file beside",
  "rank beside": "The rank beside",
  "board turned": "The board turned",
  "files reversed": "The files reversed",
  "ranks reversed": "The ranks reversed",
};

function fits(kind: NearMiss, right: Square, wrong: Square): boolean {
  switch (kind) {
    case "file beside":
      return rankNumber(wrong) === rankNumber(right) && Math.abs(fileNumber(wrong) - fileNumber(right)) === 1;
    case "rank beside":
      return fileNumber(wrong) === fileNumber(right) && Math.abs(rankNumber(wrong) - rankNumber(right)) === 1;
    case "board turned":
      return wrong === turned(right);
    case "files reversed":
      return wrong === filesReversed(right);
    case "ranks reversed":
      return wrong === ranksReversed(right);
  }
}

// The first of the five that fits a wrong square, or null. f6 with e6: the
// file beside. With c3: the board turned. With c6: the files reversed.
// With f3: the ranks reversed.
export function nearMiss(right: Square, wrong: Square): NearMiss | null {
  if (right === wrong) return null;
  return NEAR_MISSES.find((kind) => fits(kind, right, wrong)) ?? null;
}

// A square's near misses, each kind with its squares. The file and the rank
// beside hold one or two squares; the other three, one each: with eight files
// and eight ranks, none is ever the square itself. For the choices of 3.2.1 L1.
export function nearMissesOf(square: Square): Record<NearMiss, Square[]> {
  const beside = (df: number, dr: number) => [step(square, -df, -dr), step(square, df, dr)].filter((s): s is Square => s !== null);
  return {
    "file beside": beside(1, 0),
    "rank beside": beside(0, 1),
    "board turned": [turned(square)],
    "files reversed": [filesReversed(square)],
    "ranks reversed": [ranksReversed(square)],
  };
}
