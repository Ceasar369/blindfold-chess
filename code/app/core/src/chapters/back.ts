// What comes back, as a round maker reads it. A round asks only the come-backs
// its maker takes: it reads those it can, and keeps the first `count`. Rounds
// takes one of a come-back's two rounds only in a round that asks it
// (Challenge.asks, shape/index.ts), so each card says which it takes.

import type { Facts } from "../shape/index.ts";

// The stored come-backs a reader can read, the first `count` of them, each as
// stored. `read` gives null for what it cannot read.
export function firstRead(back: readonly Facts[], read: (facts: Facts) => unknown, count: number): Facts[] {
  return back.filter((f) => read(f) !== null).slice(0, count);
}
