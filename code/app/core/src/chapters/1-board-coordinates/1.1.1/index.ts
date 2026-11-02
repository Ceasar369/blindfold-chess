// 1.1.1 Find the square: its level table, its question maker, its judge, its
// mistake names and its told lines.
//
// Source: code/blueprint/docs/board-coordinates.md, 1.1.1.

import { MISTAKE, nearMiss, WORDS } from "../../../near-misses/index.ts";
import { roundOfSquares } from "../../../random/index.ts";
import type { Challenge, Did, Facts, Item, Level, Side, Square, Step, Told } from "../../../shape/index.ts";
import { isSquare, SQUARES } from "../../../squares/index.ts";
import { firstRead } from "../../back.ts";

const PASS_MARK =
  "Pass mark for 1.1.1 L1 to L3: the right answers in one round, and my average time per answer. My practice sets it.";

// The card's level table, row by row.
const TABLE: { id: string; path: string; seat: Side; names: boolean; seconds: number | null; minutes: number }[] = [
  { id: "L1", path: "Find the square, names on the edge.", seat: "white", names: true, seconds: null, minutes: 3 },
  { id: "L2", path: "Find the square, no names.", seat: "white", names: false, seconds: null, minutes: 3 },
  { id: "L3", path: "Find the square, 2 seconds.", seat: "white", names: false, seconds: 2, minutes: 2 },
];

export const LEVELS: Level[] = TABLE.map((row) => ({
  id: row.id,
  path: row.path,
  questions: 20,
  minutes: row.minutes,
  seconds: row.seconds,
  seat: row.seat,
  passMark: PASS_MARK,
  dials: [{ name: "Names on the edge", value: row.names ? "Yes" : "No" }],
}));

// The card's mistakes, by the first that fits.
export const MISTAKES = [...Object.values(MISTAKE), "Too slow", "Another square"];

function row(level: Level) {
  const found = TABLE.find((r) => r.id === level.id);
  if (!found) throw new Error(`1.1.1 has no level ${level.id}.`);
  return found;
}

// One question: "Find f6." on an empty board, one click.
export function findTheSquare(level: Level, square: Square): Item {
  const { seat, names, seconds } = row(level);
  const empty = (lit: Square[]) => ({ seat, names, pieces: [], lit });
  let told: Told | null = null;

  const ask: Step = {
    step: "ask",
    question: `Find ${square}.`,
    board: empty([]),
    notes: [],
    input: { how: "click-one" },
    seconds,
    reopened: false,
  };

  function judge(did: Did): Told {
    const again = { board: empty([square]) };
    if (did.did === "timeout") {
      return { step: "told", verdict: "slow", line: `Too slow. ${square} is lit.`, again, score: { right: false, mistakes: ["Too slow"], counts: {} } };
    }
    if (did.did !== "answer" || did.answer.kind !== "squares" || did.answer.squares.length !== 1) {
      throw new Error("1.1.1 takes one clicked square.");
    }
    const clicked = did.answer.squares[0]!;
    if (clicked === square) {
      return { step: "told", verdict: "right", line: `Right: ${square}.`, again, score: { right: true, mistakes: [], counts: {} } };
    }
    const kind = nearMiss(square, clicked);
    // > Stand-in. The card gives no line for another square: its pattern, the near miss left out.
    const line = kind ? `No: that is ${clicked}, ${WORDS[kind]}. ${square} is lit.` : `No: that is ${clicked}. ${square} is lit.`;
    return { step: "told", verdict: "wrong", line, again, score: { right: false, mistakes: [kind ? MISTAKE[kind] : "Another square"], counts: {} } };
  }

  return {
    challenge: "1.1.1",
    level: level.id,
    questions: 1,
    first: () => ask,
    next(did: Did): Step {
      if (!told) return (told = judge(did));
      // A square I miss comes back once in each of my next two rounds.
      return { step: "done", back: told.score.right ? null : { square } };
    },
  };
}

// What comes back is a square: { square: "f6" }. Anything else is passed over.
function backSquare(facts: Facts): Square | null {
  if (facts && typeof facts === "object" && !Array.isArray(facts) && typeof facts.square === "string" && isSquare(facts.square)) {
    return facts.square;
  }
  return null;
}

export const challenge: Challenge = {
  built: true,
  id: "1.1.1",
  name: "Find the square",
  trains: "Placing a named square on the board, at once.",
  needs: "Nothing.",
  levels: LEVELS,
  // The squares coming back that a round asks: the first of its count; a mixed round's 5 leaves the rest.
  asks(level, facts) {
    return firstRead(facts.back, backSquare, facts.count ?? level.questions);
  },
  // Every square of a round differs from the others, those coming back included.
  makeRound(level, random, facts) {
    const back = facts.back.map(backSquare).filter((s): s is Square => s !== null);
    return roundOfSquares(random, facts.count ?? level.questions, back, SQUARES, true).map((square) => findTheSquare(level, square));
  },
};
