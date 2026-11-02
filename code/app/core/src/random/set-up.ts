// Block 12, Random draws: the set-up maker. Makes a set-up position to a
// challenge's rules: both kings, never side by side, the side not to move
// never in check, no pawn on the first or eighth rank, plus the challenge's
// own rules, drawn again until every rule holds. It never knows a challenge's
// rules itself: each challenge hands them in.
//
// Source: code/blueprint/building-blocks.md, block 12; piece-movement.md,
// 2.2.1's "Where its questions come from".

import { fromPieces, type Position } from "../positions/index.ts";
import { legalProblem } from "../rules/index.ts";
import type { Piece, Placed, Random, Side, Square } from "../shape/index.ts";
import { SQUARES } from "../squares/index.ts";

export type SetUp = {
  // The pieces besides the kings, drawn afresh for each try when a function.
  pieces: readonly Piece[] | ((random: Random) => Piece[]);
  turn: Side | ((random: Random) => Side);
  // Where a piece may stand, kings included. By default any square, and a
  // pawn on ranks 2 to 7 only.
  where?: (piece: Piece, random: Random) => readonly Square[];
  // The challenge's own rules.
  holds?: (pos: Position) => boolean;
  tries?: number;
};

const PAWN_SQUARES = SQUARES.filter((s) => s[1] !== "1" && s[1] !== "8");

function anywhere(piece: Piece): readonly Square[] {
  return piece.kind === "pawn" ? PAWN_SQUARES : SQUARES;
}

// One position, or an error naming the rules when no try in `tries` meets them.
export function setUp(random: Random, rules: SetUp): Position {
  const tries = rules.tries ?? 10000;
  const where = rules.where ?? anywhere;
  for (let i = 0; i < tries; i++) {
    const others = typeof rules.pieces === "function" ? rules.pieces(random) : rules.pieces;
    const turn = typeof rules.turn === "function" ? rules.turn(random) : rules.turn;
    const kings: Piece[] = [{ side: "white", kind: "king" }, { side: "black", kind: "king" }];
    const placed: Placed[] = [];
    let stuck = false;
    for (const piece of [...kings, ...others]) {
      const taken = new Set(placed.map((p) => p.square));
      const free = where(piece, random).filter((s) => !taken.has(s) && (piece.kind !== "pawn" || PAWN_SQUARES.includes(s)));
      if (!free.length) {
        stuck = true;
        break;
      }
      placed.push({ ...piece, square: random.pick(free) });
    }
    if (stuck) continue;
    const pos = fromPieces(placed, turn);
    if (legalProblem(pos) === null && (!rules.holds || rules.holds(pos))) return pos;
  }
  throw new Error(`No set-up position met its rules in ${tries} tries.`);
}
