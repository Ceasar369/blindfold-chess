// Chapter 4's real positions, shared by 4.1.1 and 4.2.1: drawn from the
// positions pack at a level's count of pieces besides the kings, each with
// the line saying where it comes from, and mirrored a to h when it comes back.
//
// Source: code/blueprint/docs/position-memory.md, "Real and set-up positions".
//
// The positions pack reaches the site as its own file, fetched when the
// challenge first plays, and is handed in with the round's facts.

import { afterWords, type MemoryPosition, memoryPositions, packOf, type PositionsPack } from "../../packs/index.ts";
import { fromFen, mirrorPosition, type Position, toFen } from "../../positions/index.ts";
import type { Facts, Random, RoundFacts } from "../../shape/index.ts";

export const PACKS = ["positions.json"] as const;

export function positionsPack(facts: RoundFacts): PositionsPack {
  return packOf<PositionsPack>(facts, "positions.json");
}

// A position, and where it comes from in words.
export type Real = { fen: string; from: string };

// "From a Lichess game of January 2013, players rated 1415 and 1500, after White's 46th move."
export function fromLine(p: MemoryPosition): string {
  return `From a Lichess game of January 2013, players rated ${p.white} and ${p.black}, ${afterWords(p)}.`;
}

// `count` positions of `besides` pieces besides the kings, none twice.
export function drawReal(random: Random, pack: PositionsPack, besides: 4 | 7 | 10, count: number): Real[] {
  if (count <= 0) return [];
  return random
    .shuffle(memoryPositions(pack, besides))
    .slice(0, count)
    .map((p) => ({ fen: p.fen, from: fromLine(p) }));
}

export function positionOf(r: Real): Position {
  return fromFen(r.fen);
}

// A missed position, to come back mirrored: each piece keeps its rank and
// moves to the other wing. Mirrored again, it is the real one.
// > Stand-in. The line a mirrored position shows: "Mirrored, a to h, from a
// > Lichess game of January 2013, ...".
const MIRRORED = "Mirrored, a to h, from ";

export function mirrored(r: Real): Real {
  const from = r.from.startsWith(MIRRORED) ? `From ${r.from.slice(MIRRORED.length)}` : `${MIRRORED}${r.from.replace(/^From /, "")}`;
  return { fen: toFen(mirrorPosition(fromFen(r.fen))), from };
}

// The position back from its facts, or null.
export function realOf(facts: Facts): Real | null {
  if (!facts || typeof facts !== "object" || Array.isArray(facts)) return null;
  const { fen, from } = facts;
  if (typeof fen !== "string" || typeof from !== "string") return null;
  try {
    fromFen(fen);
  } catch {
    return null;
  }
  return { fen, from };
}
