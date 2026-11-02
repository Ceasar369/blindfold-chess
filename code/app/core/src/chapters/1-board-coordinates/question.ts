// One question's item, and the pieces every told line of chapters 1 and 2
// shares. An item asks once: its Ask, then its Told, then Done. An answer a
// judge does not count brings the same Ask back, its note on it, its clock
// running on.
//
// Source: code/blueprint/building-blocks.md, block 14; 1.1.1's own item,
// ./1.1.1/index.ts.

import { NOT_COUNTED as UNREAD, type Again, type Answer, type Ask, type BoardView, type Did, type Facts, type Item, type Square, type Told } from "../../shape/index.ts";
import { isSquare } from "../../squares/index.ts";

// A judge gives the told step, or null when the answer is not counted.
export type Judge = (did: Did) => Told | null;

// One question. back: its facts, kept when I miss it, so it comes back.
export function oneQuestion(challenge: string, level: string, ask: Ask, judge: Judge, back: Facts): Item {
  let told: Told | null = null;
  return {
    challenge,
    level,
    questions: 1,
    first: () => ask,
    next(did: Did) {
      if (told) return { step: "done", back: told.score.right ? null : back };
      const verdict = judge(did);
      if (!verdict) return { ...ask, note: UNREAD, reopened: true };
      return (told = verdict);
    },
  };
}

const told = (verdict: Told["verdict"], line: string, mistakes: string[], again?: Again): Told => ({
  step: "told",
  verdict,
  line,
  ...(again ? { again } : {}),
  // > Stand-in. Each kind counts once per answer, in the order first named:
  // > two pieces left out in one answer add 1 to "A piece left out", not 2.
  score: { right: verdict === "right", mistakes: [...new Set(mistakes)], counts: {} },
});

export const right = (line: string, again?: Again) => told("right", line, [], again);
export const wrong = (line: string, mistakes: string[], again?: Again) => told("wrong", line, mistakes, again);
export const slow = (line: string, again?: Again) => told("slow", line, ["Too slow"], again);

// The board a Reveal board button shows, on a level with no board: empty, no
// names on its edge.
export const REVEALED: BoardView = { seat: "white", names: false, pieces: [], lit: [] };

// "c3", "c3 and c5", "c3, c5 and d2".
export function andList(items: readonly string[]): string {
  return items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

// What comes back, when it is a square: { square: "f6" }. Anything else is
// passed over.
export function squareFact(facts: Facts): Square | null {
  if (facts && typeof facts === "object" && !Array.isArray(facts) && typeof facts.square === "string" && isSquare(facts.square)) {
    return facts.square;
  }
  return null;
}

// The squares an answer gives, in the order given, clicked or keyed, or None.
export function givenSquares(answer: Answer): Square[] | "none" {
  if (answer.kind === "squares") return answer.squares;
  if (answer.kind === "none") return "none";
  throw new Error(`A list of squares takes no ${answer.kind} answer.`);
}
