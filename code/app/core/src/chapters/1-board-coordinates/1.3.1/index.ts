// 1.3.1 Name the squares between: its level table, its question maker, its
// judge, its mistake names and its told lines. The three kinds of pair on no
// diagonal are its own.
//
// Source: code/blueprint/docs/board-coordinates.md, 1.3.1.

import type { Ask, BoardView, Challenge, Did, Facts, Item, Level, Random, Square } from "../../../shape/index.ts";
import { gradeSet } from "../../../set-grader/index.ts";
import { between, fileNumber, isSquare, lineOf, rankNumber, SQUARES, step } from "../../../squares/index.ts";
import { firstRead } from "../../back.ts";
import { andList, givenSquares, oneQuestion, right, wrong } from "../question.ts";

const PASS_MARK = "Pass mark for 1.3.1 L1 to L3: the right answers in one round. My practice sets it.";

type Shows = "both" | "nothing" | "no board";

// The card's level table, row by row. Every level asks 20 questions, 6 of
// them on a pair on no diagonal.
const QUESTIONS = 20;
const OFFS = 6;
const TABLE: { id: string; path: string; shows: Shows; minutes: number }[] = [
  { id: "L1", path: "Name the squares between, both lit.", shows: "both", minutes: 6 },
  { id: "L2", path: "Name the squares between, nothing lit.", shows: "nothing", minutes: 8 },
  { id: "L3", path: "Name the squares between, no board.", shows: "no board", minutes: 10 },
];

const SHOWS: Record<Shows, string> = { both: "Both squares lit", nothing: "Nothing lit", "no board": "No board until I reveal it" };

export const LEVELS: Level[] = TABLE.map((row) => ({
  id: row.id,
  path: row.path,
  questions: QUESTIONS,
  minutes: row.minutes,
  seconds: null,
  seat: "white",
  passMark: PASS_MARK,
  dials: [
    { name: "What the board shows", value: SHOWS[row.shows] },
    { name: "Pairs on no diagonal", value: `${OFFS} of ${QUESTIONS}` },
    { name: "How I answer", value: "Click" },
  ],
}));

export const MISTAKES = ["A square left out", "A square off the diagonal", "A diagonal that is not there", "A diagonal missed"];

const NO_DIAGONAL = "No diagonal";

// A pair asked: a and b. Moved a file or a rank off a diagonal, reach is the
// square b was moved from: c4 and e7 come from c4 and f7.
export type Pair = { a: Square; b: Square; reach?: Square };

function row(level: Level) {
  const found = TABLE.find((r) => r.id === level.id);
  if (!found) throw new Error(`1.3.1 has no level ${level.id}.`);
  return found;
}

// Every pair on one line, 2 to 7 steps apart: 1 to 6 squares between.
const pairsAlong = (directions: number[][]): Pair[] =>
  SQUARES.flatMap((a) =>
    directions.flatMap(([df, dr]) =>
      [2, 3, 4, 5, 6, 7].flatMap((d) => {
        const b = step(a, df! * d, dr! * d);
        return b ? [{ a, b }] : [];
      }),
    ),
  );

const DIAGONAL_PAIRS = pairsAlong([[1, 1], [1, -1], [-1, 1], [-1, -1]]);
const LINE_PAIRS = pairsAlong([[1, 0], [-1, 0], [0, 1], [0, -1]]);

export function diagonalPair(random: Random): Pair {
  return random.pick(DIAGONAL_PAIRS);
}

// Two squares on one file or rank.
export function linePair(random: Random): Pair {
  return random.pick(LINE_PAIRS);
}

// One on a diagonal, its second square moved one square over. It then shares
// no file, rank or diagonal.
function movedPair(random: Random, moves: number[][]): Pair {
  const { a, b: reach } = diagonalPair(random);
  const b = random.pick(moves.flatMap(([df, dr]) => step(reach, df!, dr!) ?? []));
  return { a, b, reach };
}

export const pairOffFile = (random: Random) => movedPair(random, [[-1, 0], [1, 0]]);
export const pairOffRank = (random: Random) => movedPair(random, [[0, -1], [0, 1]]);

// The three kinds of pair on no diagonal, a third each.
const OFF_KINDS = [pairOffFile, pairOffRank, linePair];

// True when s lies on the line through a and b, beyond them or on them.
function onTheLine(pair: Pair, s: Square): boolean {
  const df = fileNumber(s) - fileNumber(pair.a);
  const dr = rankNumber(s) - rankNumber(pair.a);
  return df * (rankNumber(pair.b) - rankNumber(pair.a)) === dr * (fileNumber(pair.b) - fileNumber(pair.a));
}

const isOrAre = (squares: Square[]) => (squares.length === 1 ? "is" : "are");

const count = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

// "You left out f5, and f6 is off the diagonal."
function clauses(parts: string[]): string {
  if (parts.length < 2) return parts.join("");
  return `${parts.slice(0, -1).join(", ")}, and ${parts[parts.length - 1]}`;
}

// Why a pair shares no diagonal, by counting.
function whyNone({ a, b }: Pair): string {
  const line = lineOf(a, b);
  if (line === "file" || line === "rank") return `${a} and ${b} share a ${line}, not a diagonal.`;
  const files = count(Math.abs(fileNumber(b) - fileNumber(a)), "file");
  const ranks = count(Math.abs(rankNumber(b) - rankNumber(a)), "rank");
  return `${a} and ${b} share no diagonal. They sit ${files} and ${ranks} apart; a diagonal needs both equal.`;
}

// One question: "Which squares lie between c4 and f7 on their diagonal?"
export function squaresBetween(level: Level, pair: Pair): Item {
  const { shows } = row(level);
  const { a, b, reach } = pair;
  const inBetween = lineOf(a, b) === "diagonal" ? between(a, b)! : null;
  const board = (lit: Square[]): BoardView => ({ seat: "white", names: false, pieces: [], lit });
  // After my answer, the board shows lit: the pair and the squares between, or
  // the pair alone.
  const shown = { board: board(inBetween ? [a, b, ...inBetween] : [a, b]) };
  const ask: Ask = {
    step: "ask",
    question: `Which squares lie between ${a} and ${b} on their diagonal?`,
    board: shows === "both" ? board([a, b]) : shows === "nothing" ? board([]) : null,
    notes: [],
    input: { how: "click-many", none: NO_DIAGONAL, ...(shows === "no board" ? { reveal: board([]) } : {}) },
    seconds: null,
    reopened: false,
  };

  const judge = (did: Did) => {
    if (did.did !== "answer") throw new Error("1.3.1 has no clock: it takes an answer.");
    const given = givenSquares(did.answer);
    if (given === null) return null;
    if (!inBetween) {
      // > Stand-in. The card gives no right line for a pair on no diagonal.
      if (given === "none") return right(`Right: ${a} and ${b} share no diagonal.`, shown);
      return wrong(`No: ${whyNone(pair)}`, ["A diagonal that is not there"], shown);
    }
    const lie = `between ${a} and ${b} lie ${andList(inBetween)}`;
    // > Stand-in. The card gives no line for "No diagonal" on a pair that shares one.
    if (given === "none") return wrong(`No: ${lie}.`, ["A diagonal missed"], shown);
    const g = gradeSet(given, inBetween);
    if (g.right) return right(`Right: ${andList(inBetween)}.`, shown);
    // > Stand-in. A square given on the pair's own line, past either end or
    // > on one, is not between them: "off the diagonal" would be untrue.
    const off = g.added.filter((s) => !onTheLine(pair, s));
    const past = g.added.filter((s) => onTheLine(pair, s));
    const parts = [
      ...(g.leftOut.length ? [`You left out ${andList(g.leftOut)}`] : []),
      ...(off.length ? [`${andList(off)} ${isOrAre(off)} off the diagonal`] : []),
      ...(past.length ? [`${andList(past)} ${isOrAre(past)} not between them`] : []),
    ];
    const kinds = [...(g.leftOut.length ? ["A square left out"] : []), ...(g.added.length ? ["A square off the diagonal"] : [])];
    return wrong(`No: ${lie}. ${clauses(parts)}.`, kinds, shown);
  };

  // A pair I miss comes back once in each of my next two rounds.
  return oneQuestion("1.3.1", level.id, ask, judge, reach ? { a, b, reach } : { a, b });
}

// What comes back: a pair on a diagonal, or on one file or rank, { a, b }, or
// one moved off a diagonal, { a, b, reach }. Anything else is passed over.
export function pairFact(facts: Facts): Pair | null {
  if (!facts || typeof facts !== "object" || Array.isArray(facts)) return null;
  const { a, b, reach } = facts;
  if (typeof a !== "string" || typeof b !== "string" || !isSquare(a) || !isSquare(b)) return null;
  if (reach === undefined) return lineOf(a, b) !== null && between(a, b)!.length >= 1 ? { a, b } : null;
  if (typeof reach !== "string" || !isSquare(reach) || lineOf(a, reach) !== "diagonal") return null;
  const moved = Math.abs(fileNumber(reach) - fileNumber(b)) + Math.abs(rankNumber(reach) - rankNumber(b));
  return moved === 1 ? { a, b, reach } : null;
}

const key = (p: Pair) => `${p.a}${p.b}`;

export const challenge: Challenge = {
  built: true,
  id: "1.3.1",
  name: "Name the squares between",
  trains: "Seeing a diagonal whole: the squares it runs through between two squares.",
  needs: "1.1.1 L2.",
  levels: LEVELS,
  // The pairs coming back that a round asks: the first of its count; a mixed round's 5 leaves the rest.
  asks(level, facts) {
    return firstRead(facts.back, pairFact, facts.count ?? level.questions);
  },
  makeRound(level, random, facts) {
    const size = facts.count ?? level.questions;
    const back = facts.back.map(pairFact).filter((p): p is Pair => p !== null).slice(0, size);
    // > Stand-in. A round of another size, such as the mixed round's 5, keeps
    // > the card's share of pairs on no diagonal, rounded: 2 of 5.
    const offs = Math.max(0, Math.round((size * OFFS) / QUESTIONS) - back.filter((p) => lineOf(p.a, p.b) !== "diagonal").length);
    // The three kinds in turn from a random one: 6 of 20 are 2 of each.
    const first = random.int(OFF_KINDS.length);
    const kinds = Array.from({ length: offs }, (_, i) => OFF_KINDS[(first + i) % OFF_KINDS.length]!);
    const seen = new Set(back.map(key));
    const pairs = [...back];
    while (pairs.length < size) {
      const make = kinds[0] ?? diagonalPair;
      const pair = make(random);
      if (seen.has(key(pair))) continue;
      seen.add(key(pair));
      kinds.shift();
      pairs.push(pair);
    }
    return random.shuffle(pairs).map((p) => squaresBetween(level, p));
  },
};
