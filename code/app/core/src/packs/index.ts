// Block 13, Real-play packs: small files of real chess, made once on my Mac
// from Lichess's free files by scripts/make-packs.ts, and served with the app.
// Four packs: positions, lines, openings, puzzles. Each item keeps what the
// feedback names: the game's id and its players' ratings, its move number, a
// puzzle's id and rating. Players' names are never kept. A level's filter
// gives the items a round picks from. It never reaches Lichess while I play.
//
// Source: code/blueprint/building-blocks.md, block 13; position-memory.md,
// "Real and set-up positions"; updating-a-position.md, "Where the moves come
// from"; notation.md, 3.1.1's "Where its questions come from"; blind-play.md,
// 6.1.1's and 6.3.1's.
//
// > Stand-in. How many items each pack keeps: every item its filter keeps,
// > up to 2,000 per kind and size.

import type { RoundFacts, Side } from "../shape/index.ts";

export const CAP = 2000;

// A pack the round was handed, by its path under packs/: "lines.json".
export function packOf<T>(facts: RoundFacts, name: string): T {
  const pack = facts.packs?.[name];
  if (pack === undefined) throw new Error(`The pack ${name} was not handed in.`);
  return pack as T;
}

// A real game's facts: its Lichess id, and its players' ratings.
export type FromGame = { game: string; white: number; black: number };

// A position right after the move that first leaves `besides` pieces besides
// the kings: 4, 7 or 10, for 4.1.1 and 4.2.1.
export type MemoryPosition = FromGame & { fen: string; besides: number; moveNumber: number; moved: Side };

// A position of 6 besides the kings, even sides, nothing to take at once,
// no castling, nothing taken in passing: for 6.3.1 L1 and L2.
export type EvenPosition = FromGame & { fen: string; moveNumber: number; moved: Side };

export type PositionsPack = { memory: MemoryPosition[]; even: EvenPosition[] };

// A game's first 20 half-moves, from a game that goes on past them.
// plies: the whole game's half-moves.
export type FirstLine = FromGame & { sans: string[]; plies: number };

// The 6 half-moves right after a game reaches one of the openings pack's 13, by
// its position and the side to move. reachedAt: the half-moves it took.
export type AfterOpening = FromGame & { opening: string; reachedAt: number; sans: string[] };

// 4 half-moves from a Black move after White's move 3 to 15, with 16 to 30
// pieces besides the kings: fen is the position before them. For 3.1.1 L6.
export type MidLine = FromGame & { fen: string; sans: string[] };

export type LinesPack = { first: FirstLine[]; afterOpening: AfterOpening[]; mid: MidLine[] };

// A named line of the Lichess opening list.
export type NamedLine = { eco: string; name: string; sans: string[] };

// One of the 13 openings 5.2.1 L3 starts from: its line, whether it takes, and its position.
export type Opening = NamedLine & { captures: boolean; fen: string };

// list: the Lichess list's named lines of 4 half-moves or more, for 3.1.1 L6.
export type OpeningsPack = { list: NamedLine[]; thirteen: Opening[] };

export type PuzzleKind = "mate in one" | "mate in two" | "fork";

// A Lichess puzzle rated under 1000. fen: the position before my opponent's
// move. moves: in UCI, my opponent's first, then mine and the replies.
// besides: the pieces besides the kings, before my opponent's move.
export type Puzzle = { id: string; rating: number; kind: PuzzleKind; fen: string; moves: string[]; besides: number };

export type PuzzlesPack = { puzzles: Puzzle[] };

// ---------------------------------------------------------------------------
// Each level's filter

export function memoryPositions(pack: PositionsPack, besides: 4 | 7 | 10): MemoryPosition[] {
  return pack.memory.filter((p) => p.besides === besides);
}

// A game's first `halfMoves`, 6, 8, 12 or 20, from games that go on past them.
export function firstLines(pack: LinesPack, halfMoves: number): FirstLine[] {
  return pack.first.filter((l) => l.plies > halfMoves).map((l) => ({ ...l, sans: l.sans.slice(0, halfMoves) }));
}

export function afterOpenings(pack: LinesPack, opening?: string): AfterOpening[] {
  return opening ? pack.afterOpening.filter((l) => l.opening === opening) : pack.afterOpening;
}

// 6.1.1's puzzles of a kind, with at most so many pieces besides the kings.
export function puzzles(pack: PuzzlesPack, kind: PuzzleKind, mostBesides = Infinity): Puzzle[] {
  return pack.puzzles.filter((p) => p.kind === kind && p.besides <= mostBesides);
}

function ordinal(n: number): string {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${n}th`;
  return `${n}${["th", "st", "nd", "rd"][n % 10] ?? "th"}`;
}

// When a position was taken, in the pages' words: "after White's 46th move".
export function afterWords(p: { moveNumber: number; moved: Side }): string {
  return `after ${p.moved === "white" ? "White" : "Black"}'s ${ordinal(p.moveNumber)} move`;
}
