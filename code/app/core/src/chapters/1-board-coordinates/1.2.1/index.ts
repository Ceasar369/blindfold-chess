// 1.2.1 Name the colour: its level table, its question maker, its judge, its
// mistake names and its told lines, the colour sum line its own.
//
// Source: code/blueprint/docs/board-coordinates.md, 1.2.1.

import { roundOfSquares } from "../../../random/index.ts";
import type { Ask, Challenge, Did, Item, Level, Square } from "../../../shape/index.ts";
import { colourOf, fileNumber, fileOf, rankNumber } from "../../../squares/index.ts";
import { firstRead } from "../../back.ts";
import { oneQuestion, right, slow, squareFact, wrong } from "../question.ts";

const PASS_MARK =
  "Pass mark for 1.2.1 L1 and L2: the right answers in one round, and my average time per answer. My practice sets it.";

// The card's level table, row by row. No board: no seat.
const TABLE: { id: string; path: string; seconds: number | null; minutes: number }[] = [
  { id: "L1", path: "Name the colour.", seconds: null, minutes: 3 },
  { id: "L2", path: "Name the colour, 2 seconds.", seconds: 2, minutes: 2 },
];

export const LEVELS: Level[] = TABLE.map((row) => ({
  id: row.id,
  path: row.path,
  questions: 20,
  minutes: row.minutes,
  seconds: row.seconds,
  seat: null,
  passMark: PASS_MARK,
  dials: [],
}));

export const MISTAKES = ["The wrong colour", "Too slow"];

// The sum: f5 gives "6 + 5 = 11 is odd".
function sum(square: Square): string {
  const total = fileNumber(square) + rankNumber(square);
  return `${fileNumber(square)} + ${rankNumber(square)} = ${total} is ${total % 2 ? "odd" : "even"}`;
}

// One question: "What colour is f5?", no board, Light or Dark.
export function nameTheColour(level: Level, square: Square): Item {
  const found = TABLE.find((r) => r.id === level.id);
  if (!found) throw new Error(`1.2.1 has no level ${level.id}.`);
  const colour = colourOf(square);
  const ask: Ask = {
    step: "ask",
    question: `What colour is ${square}?`,
    board: null,
    notes: [],
    input: {
      how: "choose",
      choices: [
        { words: "Light", value: "light" },
        { words: "Dark", value: "dark" },
      ],
    },
    seconds: found.seconds,
    reopened: false,
  };

  const judge = (did: Did) => {
    if (did.did === "timeout") return slow(`Too slow. ${square} is ${colour}: ${sum(square)}.`);
    if (did.did !== "answer" || did.answer.kind !== "choice") throw new Error("1.2.1 takes Light or Dark.");
    if (did.answer.value === colour) return right(`Right: ${square} is ${colour}.`);
    return wrong(`No: ${square} is ${colour}. ${fileOf(square)} is file ${fileNumber(square)}, and ${sum(square)}.`, ["The wrong colour"]);
  };

  // A square I miss comes back once in each of my next two rounds.
  return oneQuestion("1.2.1", level.id, ask, judge, { square });
}

export const challenge: Challenge = {
  built: true,
  id: "1.2.1",
  name: "Name the colour",
  trains: "Knowing a square's colour from its name alone.",
  needs: "Nothing.",
  levels: LEVELS,
  // The squares coming back that a round asks: the first of its count; a mixed round's 5 leaves the rest.
  asks(level, facts) {
    return firstRead(facts.back, squareFact, facts.count ?? level.questions);
  },
  makeRound(level, random, facts) {
    const back = facts.back.map(squareFact).filter((s): s is Square => s !== null);
    return roundOfSquares(random, facts.count ?? level.questions, back).map((square) => nameTheColour(level, square));
  },
};
