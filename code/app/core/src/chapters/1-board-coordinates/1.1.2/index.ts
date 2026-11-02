// 1.1.2 Name the square: its level table, its question maker, its judge, its
// mistake names and its told lines.
//
// Source: code/blueprint/docs/board-coordinates.md, 1.1.2.

import { MISTAKE, nearMiss, WORDS } from "../../../near-misses/index.ts";
import { roundOfSquares } from "../../../random/index.ts";
import type { Ask, Challenge, Choice, Did, Item, Level, Random, Side, Square } from "../../../shape/index.ts";
import { isSquare, step } from "../../../squares/index.ts";
import { firstRead } from "../../back.ts";
import { oneQuestion, right, slow, squareFact, wrong } from "../question.ts";

const PASS_MARK =
  "Pass mark for 1.1.2 L1 to L3: the right answers in one round, and my average time per answer. My practice sets it.";

// The card's level table, row by row.
const TABLE: { id: string; path: string; seat: Side; choose: boolean; seconds: number | null; minutes: number }[] = [
  { id: "L1", path: "Name the square, from four choices.", seat: "white", choose: true, seconds: null, minutes: 3 },
  { id: "L2", path: "Name the square, on the keypad.", seat: "white", choose: false, seconds: null, minutes: 4 },
  { id: "L3", path: "Name the square, 5 seconds.", seat: "white", choose: false, seconds: 5, minutes: 3 },
];

export const LEVELS: Level[] = TABLE.map((row) => ({
  id: row.id,
  path: row.path,
  questions: 20,
  minutes: row.minutes,
  seconds: row.seconds,
  seat: row.seat,
  passMark: PASS_MARK,
  dials: [{ name: "How I answer", value: row.choose ? "Pick one of four" : "Square keypad" }],
}));

// The card's mistakes, by the first that fits.
export const MISTAKES = [...Object.values(MISTAKE), "Too slow", "Another square"];

function row(level: Level) {
  const found = TABLE.find((r) => r.id === level.id);
  if (!found) throw new Error(`1.1.2 has no level ${level.id}.`);
  return found;
}

const BLOCK: [number, number][] = [[0, 0], [1, 0], [0, 1], [1, 1]];

// The 2×2 blocks holding a square: four inside the board, two on its edge,
// one in its corner. b3 sits in b3 c3 b4 c4, a3 b3 a4 b4, b2 c2 b3 c3 and
// a2 b2 a3 b3; h8 in g7 h7 g8 h8 alone.
export function blocksHolding(square: Square): Square[][] {
  return BLOCK.map(([df, dr]) => BLOCK.map(([f, r]) => step(square, f - df, r - dr))).filter(
    (block): block is Square[] => block.every((s) => s !== null),
  );
}

// L1's four: one of the blocks holding the lit square, at random. Each
// choice sits next to it, so only its exact name picks it.
export function fourChoices(square: Square, random: Random): Square[] {
  return random.pick(blocksHolding(square));
}

// One question: "Which square is lit?" on an empty board, the square lit.
// L1's four choices show in random order. From L2, the keypad: a file, then a
// rank, two clicks.
export function nameTheSquare(level: Level, square: Square, random: Random): Item {
  const { seat, choose, seconds } = row(level);
  const choices: Choice[] = random.shuffle(fourChoices(square, random)).map((s) => ({ words: s, value: s }));
  const ask: Ask = {
    step: "ask",
    question: "Which square is lit?",
    board: { seat, names: false, pieces: [], lit: [square] },
    notes: [],
    input: choose ? { how: "choose", choices } : { how: "keypad", many: "one", none: null },
    seconds,
    reopened: false,
  };

  function named(did: Did): Square {
    if (did.did !== "answer") throw new Error("1.1.2 takes an answer, or the time running out.");
    const a = did.answer;
    if (a.kind === "choice" && isSquare(a.value)) return a.value;
    if (a.kind === "squares" && a.squares.length === 1) return a.squares[0]!;
    throw new Error("1.1.2 takes a choice, or one square from the keypad.");
  }

  const judge = (did: Did) => {
    if (did.did === "timeout") return slow(`Too slow. It is ${square}.`);
    const given = named(did);
    if (given === square) return right(`Right: ${square}.`);
    const kind = nearMiss(square, given);
    // > Stand-in. The card gives no line for another square: its pattern, the near miss left out.
    if (!kind) return wrong(`No: it is ${square}.`, ["Another square"]);
    return wrong(`No: it is ${square}. ${given} is ${WORDS[kind]}.`, [MISTAKE[kind]]);
  };

  // A square I miss comes back once in each of my next two rounds.
  return oneQuestion("1.1.2", level.id, ask, judge, { square });
}

export const challenge: Challenge = {
  built: true,
  id: "1.1.2",
  name: "Name the square",
  trains: "Naming a square from its place, at once.",
  needs: "1.1.1 L2.",
  levels: LEVELS,
  // The squares coming back that a round asks: the first of its count; a mixed round's 5 leaves the rest.
  asks(level, facts) {
    return firstRead(facts.back, squareFact, facts.count ?? level.questions);
  },
  makeRound(level, random, facts) {
    const back = facts.back.map(squareFact).filter((s): s is Square => s !== null);
    return roundOfSquares(random, facts.count ?? level.questions, back).map((square) => nameTheSquare(level, square, random));
  },
};
