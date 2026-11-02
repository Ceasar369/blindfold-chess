// Block 8, Set grader: compares the set of squares I gave with the right set,
// order never counting. Names the squares I left out and the squares I added.
// Pairs each added square with a left-out one it is a near miss of, for Near
// misses to name. It never names a challenge's own mistake kinds, and never
// grades a route, where order counts: that is 2.1.2's own.
//
// Source: code/blueprint/building-blocks.md, block 8.

import { NEAR_MISSES, nearMiss, type NearMiss } from "../near-misses/index.ts";
import type { Square } from "../shape/index.ts";

export type Pair = { added: Square; leftOut: Square; kind: NearMiss };

export type SetGrade = {
  right: boolean;
  leftOut: Square[]; // in the right set's order
  added: Square[]; // in the order given
  pairs: Pair[];
};

// A knight on e4, with g4 given and g3 left out: wrong, g3 left out, g4
// added, g4 paired with g3, the rank beside. A square given twice counts once.
export function gradeSet(given: readonly Square[], right: readonly Square[]): SetGrade {
  const gave = new Set(given);
  const wanted = new Set(right);
  const leftOut = [...wanted].filter((s) => !gave.has(s));
  const added = [...gave].filter((s) => !wanted.has(s));
  const pairs: Pair[] = [];
  const free = [...leftOut];
  for (const a of added) {
    // The left-out square it fits best: the first of the five, then the first left out.
    let best: { at: number; kind: NearMiss } | null = null;
    for (let at = 0; at < free.length; at++) {
      const kind = nearMiss(free[at]!, a);
      if (kind && (!best || NEAR_MISSES.indexOf(kind) < NEAR_MISSES.indexOf(best.kind))) best = { at, kind };
    }
    if (best) {
      pairs.push({ added: a, leftOut: free[best.at]!, kind: best.kind });
      free.splice(best.at, 1);
    }
  }
  return { right: leftOut.length === 0 && added.length === 0, leftOut, added, pairs };
}
