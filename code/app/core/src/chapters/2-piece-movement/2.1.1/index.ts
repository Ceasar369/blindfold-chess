// 2.1.1 Name the knight's squares: its level table, its question maker, its
// judge, its mistake names and its told lines.
//
// Source: code/blueprint/docs/piece-movement.md, 2.1.1.

import { MISTAKE } from "../../../near-misses/index.ts";
import { roundOfSquares } from "../../../random/index.ts";
import { reachOnEmpty } from "../../../reach/index.ts";
import { gradeSet } from "../../../set-grader/index.ts";
import type { Ask, BoardView, Challenge, Did, Item, Level, Square } from "../../../shape/index.ts";
import { colourOf, fileNumber, rankNumber, SQUARES } from "../../../squares/index.ts";
import { firstRead } from "../../back.ts";
import { andList, givenSquares, oneQuestion, REVEALED, right, slow, squareFact, wrong } from "../../1-board-coordinates/question.ts";
import { nearMissLine, nextTo } from "../set-ups.ts";

const PASS_MARK =
  "Pass mark for 2.1.1 L1 to L5: the right answers in one round, and my average time per answer. My practice sets it.";

type Shows = "knight" | "nothing" | "no board";

// The card's level table, row by row.
const TABLE: { id: string; path: string; shows: Shows; centre: boolean; seconds: number | null; minutes: number }[] = [
  { id: "L1", path: "Name the knight's squares, from the centre.", shows: "knight", centre: true, seconds: null, minutes: 3 },
  { id: "L2", path: "Name the knight's squares, from any square.", shows: "knight", centre: false, seconds: null, minutes: 3 },
  { id: "L3", path: "Name the knight's squares, nothing on the board.", shows: "nothing", centre: false, seconds: null, minutes: 3 },
  { id: "L4", path: "Name the knight's squares, no board.", shows: "no board", centre: false, seconds: null, minutes: 4 },
  { id: "L5", path: "Name the knight's squares, 15 seconds.", shows: "no board", centre: false, seconds: 15, minutes: 3 },
];

const SHOWS: Record<Shows, string> = { knight: "The knight", nothing: "Nothing", "no board": "No board until I reveal it" };

export const LEVELS: Level[] = TABLE.map((row) => ({
  id: row.id,
  path: row.path,
  questions: 10,
  minutes: row.minutes,
  seconds: row.seconds,
  seat: row.shows === "no board" ? null : "white",
  passMark: PASS_MARK,
  dials: [
    { name: "What the board shows", value: SHOWS[row.shows] },
    { name: "Where the knight stands", value: row.centre ? "The centre 16" : "Any of the 64" },
    { name: "How I answer", value: "Click" },
  ],
}));

// The card's mistakes. A wrong square takes the first kind it fits.
export const MISTAKES = [
  "A square left out",
  ...Object.values(MISTAKE),
  "Too slow",
  "A square of the knight's own colour",
  "Another square",
];

// The 16 centre squares, c3 to f6: from each, a knight reaches 8.
export const CENTRE: readonly Square[] = SQUARES.filter((s) => fileNumber(s) >= 3 && fileNumber(s) <= 6 && rankNumber(s) >= 3 && rankNumber(s) <= 6);

function row(level: Level) {
  const found = TABLE.find((r) => r.id === level.id);
  if (!found) throw new Error(`2.1.1 has no level ${level.id}.`);
  return found;
}

// One question: "Which squares can a knight on e4 reach?"
export function knightSquares(level: Level, knight: Square): Item {
  const { shows, seconds } = row(level);
  const reach = reachOnEmpty({ side: "white", kind: "knight" }, knight);
  const list = andList(reach);
  const board = (pieces: boolean, lit: Square[]): BoardView => ({
    seat: "white",
    names: false,
    pieces: pieces ? [{ side: "white", kind: "knight", square: knight }] : [],
    lit,
  });
  // After my answer, the knight shows with its squares lit, where a board shows.
  const again = shows === "no board" ? undefined : { board: board(true, reach) };
  const ask: Ask = {
    step: "ask",
    question: `Which squares can a knight on ${knight} reach?`,
    board: shows === "no board" ? null : board(shows === "knight", []),
    notes: [],
    input: { how: "click-many", none: null, ...(shows === "no board" ? { reveal: REVEALED } : {}) },
    seconds,
    reopened: false,
  };

  // Why a square I added is wrong, and its mistake's kind.
  function why(added: Square): [string, string] {
    // > Stand-in. The card gives no line for the knight's own square.
    if (added === knight) return [`${added} is where the knight stands.`, "Another square"];
    if (colourOf(added) === colourOf(knight)) {
      return [`${added} is ${colourOf(added)}, like ${knight}: a knight always lands on the other colour.`, "A square of the knight's own colour"];
    }
    // > Stand-in. "it sits next to g2" is the card's, for a square beside the
    // > knight. Any other square: "a1 is no knight's square."
    return [`${added} is no knight's square${nextTo(added, knight) ? `: it sits next to ${knight}` : ""}.`, "Another square"];
  }

  const judge = (did: Did) => {
    if (did.did === "timeout") return slow(`Too slow. A knight on ${knight} reaches ${list}.`, again);
    if (did.did !== "answer") throw new Error("2.1.1 takes an answer, or the time running out.");
    const given = givenSquares(did.answer);
    const g = gradeSet(given === "none" ? [] : given, reach);
    if (g.right) return right(`Right: ${list}.`, again);
    const lines: string[] = [];
    const kinds: string[] = [];
    for (const added of g.added) {
      const pair = g.pairs.find((p) => p.added === added);
      const [line, kind] = pair ? [nearMissLine(pair), MISTAKE[pair.kind]] : why(added);
      lines.push(line);
      kinds.push(kind);
    }
    // A left-out square paired with a near miss is told once, with its pair.
    const leftOut = g.leftOut.filter((s) => !g.pairs.some((p) => p.leftOut === s));
    if (leftOut.length) {
      lines.push(`You left out ${andList(leftOut)}.`);
      kinds.unshift("A square left out");
    }
    return wrong(`No: a knight on ${knight} reaches ${list}. ${lines.join(" ")}`, kinds, again);
  };

  // A question I miss comes back once in each of my next two rounds, the knight on the same square.
  return oneQuestion("2.1.1", level.id, ask, judge, { square: knight });
}

export const challenge: Challenge = {
  built: true,
  id: "2.1.1",
  name: "Name the knight's squares",
  trains: "Seeing every square a knight reaches, at once.",
  needs: "1.1.1 L2 and 1.2.1 L1.",
  levels: LEVELS,
  // The squares coming back that a round asks: the first of its count; a mixed round's 3 leaves the rest.
  asks(level, facts) {
    return firstRead(facts.back, squareFact, facts.count ?? level.questions);
  },
  makeRound(level, random, facts) {
    const back = facts.back.map(squareFact).filter((s): s is Square => s !== null);
    const from = row(level).centre ? CENTRE : SQUARES;
    return roundOfSquares(random, facts.count ?? level.questions, back, from).map((square) => knightSquares(level, square));
  },
};
