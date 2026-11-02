// 2.1.2 Find the knight's route: its level table, its question maker, its
// judge, its mistake names and its told lines. The shortest route around my
// pawns and the colour count line are its own.
//
// Source: code/blueprint/docs/piece-movement.md, 2.1.2.

import { MISTAKE, NEAR_MISSES, nearMiss, type NearMiss, WORDS } from "../../../near-misses/index.ts";
import { setUp } from "../../../random/set-up.ts";
import { reachOnEmpty } from "../../../reach/index.ts";
import type { Ask, BoardView, Challenge, Did, Facts, Item, Level, Piece, Placed, Random, Square } from "../../../shape/index.ts";
import { bySquare, colourOf, isSquare, SQUARES } from "../../../squares/index.ts";
import { firstRead } from "../../back.ts";
import { andList, givenSquares, oneQuestion, REVEALED, right, wrong } from "../../1-board-coordinates/question.ts";

const PASS_MARK = "Pass mark for 2.1.2 L1 to L5: the right answers in one round. My practice sets it.";

const QUESTIONS = 8;

type Shows = "knight" | "nothing" | "no board";

// The card's level table, row by row. moves: the fewest moves a pair takes.
// share: the part of a round whose questions hold my two pawns. A pawn
// question takes 3 moves or more: two pawns that each block a route and leave
// one free need 3 routes, and 2 moves has 2 at most.
const TABLE: { id: string; path: string; shows: Shows; sees: string; moves: number[]; share: number; minutes: number }[] = [
  { id: "L1", path: "Find the knight's route, 2 moves.", shows: "knight", sees: "My knight and the target", moves: [2], share: 0, minutes: 2 },
  { id: "L2", path: "Find the knight's route, 3 moves.", shows: "knight", sees: "My knight and the target", moves: [3], share: 0, minutes: 3 },
  {
    id: "L3",
    path: "Find the knight's route, around my pawns.",
    shows: "knight",
    sees: "My knight, the target and my two pawns, all question long",
    moves: [3],
    share: 1,
    minutes: 4,
  },
  {
    id: "L4",
    path: "Find the knight's route, nothing on the board.",
    shows: "nothing",
    sees: "An empty board, no edge names: never the knight, the target or the pawns",
    moves: [2, 3],
    share: 0.5,
    minutes: 5,
  },
  { id: "L5", path: "Find the knight's route, no board.", shows: "no board", sees: "No board until I reveal it", moves: [3, 4], share: 0.5, minutes: 5 },
];

const pawnsDial = (share: number) => (share === 0 ? "None" : share === 1 ? "2, in every question" : `2, in ${QUESTIONS * share} of ${QUESTIONS} questions`);

export const LEVELS: Level[] = TABLE.map((row) => ({
  id: row.id,
  path: row.path,
  questions: QUESTIONS,
  minutes: row.minutes,
  seconds: null,
  seat: row.shows === "no board" ? null : "white",
  passMark: PASS_MARK,
  dials: [
    { name: "What the board shows", value: row.sees },
    { name: "Fewest moves", value: row.moves.join(" or ") },
    { name: "My pawns in the way", value: pawnsDial(row.share) },
    { name: "How I answer", value: "Click" },
  ],
}));

// The card's mistakes. A wrong route takes the first kind it fits.
export const MISTAKES = [
  "A jump that is no knight move",
  ...Object.values(MISTAKE),
  "A landing on my pawn",
  "A route ending elsewhere",
  "A longer route",
];

// A pair asked: my knight's start, its target, and my pawns when it holds some.
export type Route = { from: Square; to: Square; pawns: Square[] };

function row(level: Level) {
  const found = TABLE.find((r) => r.id === level.id);
  if (!found) throw new Error(`2.1.2 has no level ${level.id}.`);
  return found;
}

const jumps = (s: Square) => reachOnEmpty({ side: "white", kind: "knight" }, s);
const isJump = (a: Square, b: Square) => jumps(a).includes(b);

// Each square's fewest moves to the target, landing on no pawn: my own
// pieces block a landing, never a jump. A square missing can never get there.
export function movesTo(to: Square, pawns: readonly Square[] = []): Map<Square, number> {
  const out = new Map<Square, number>([[to, 0]]);
  let ring = [to];
  while (ring.length) {
    const next: Square[] = [];
    for (const s of ring) {
      for (const j of jumps(s)) {
        if (out.has(j) || pawns.includes(j)) continue;
        out.set(j, out.get(s)! + 1);
        next.push(j);
      }
    }
    ring = next;
  }
  return out;
}

// Every shortest route from a square to the target, each as its landings in order.
function waysFrom(from: Square, dist: Map<Square, number>): Square[][] {
  const d = dist.get(from);
  if (d === undefined) return [];
  if (d === 0) return [[]];
  return jumps(from)
    .filter((j) => dist.get(j) === d - 1)
    .flatMap((j) => waysFrom(j, dist).map((rest) => [j, ...rest]));
}

// A shortest way on from a square, each landing the first by square that keeps it shortest.
function onFrom(from: Square, dist: Map<Square, number>): Square[] {
  const out: Square[] = [];
  let at = from;
  while (dist.get(at)! > 0) {
    at = jumps(at).find((j) => dist.get(j) === dist.get(at)! - 1)!;
    out.push(at);
  }
  return out;
}

// "b1 is light and d4 dark, so the count is odd."
function countLine(from: Square, to: Square): string {
  const [a, b] = [colourOf(from), colourOf(to)];
  // > Stand-in. The card gives the line for two colours only.
  if (a === b) return `${from} and ${to} are both ${a}, so the count is even.`;
  return `${from} is ${a} and ${to} ${b}, so the count is odd.`;
}

// One question: "Take your knight from b1 to d4 in the fewest moves."
export function knightRoute(level: Level, route: Route): Item {
  const { shows } = row(level);
  const { from, to, pawns } = route;
  const dist = movesTo(to, pawns);
  const fewest = dist.get(from)!;
  const only = waysFrom(from, dist).length === 1;
  const board = (pieces: boolean, lit: Square[]): BoardView => ({
    seat: "white",
    names: false,
    pieces: pieces
      ? [{ side: "white", kind: "knight", square: from }, ...pawns.map((s): Placed => ({ side: "white", kind: "pawn", square: s }))]
      : [],
    lit,
  });
  const again = shows === "no board" ? undefined : { board: board(true, [to]) };
  const ask: Ask = {
    step: "ask",
    question: `Take your knight from ${from} to ${to} in the fewest moves.${pawns.length ? ` Your pawns stand on ${andList(pawns)}.` : ""}`,
    board: shows === "no board" ? null : board(shows === "knight", shows === "knight" ? [to] : []),
    notes: [],
    input: { how: "click-route", ...(shows === "no board" ? { reveal: REVEALED } : {}) },
    seconds: null,
    reopened: false,
  };

  // "One route: b1, d2, f3, d4.", through the start of mine that stays shortest.
  const routeLine = (start: Square[]) => `${only ? "The only route" : "One route"}: ${[...start, ...onFrom(start[start.length - 1]!, dist)].join(", ")}.`;

  const judge = (did: Did) => {
    if (did.did !== "answer") throw new Error("2.1.2 has no clock: it takes an answer.");
    const given = givenSquares(did.answer);
    if (given === "none") throw new Error("2.1.2 offers no None button.");
    // The start square may lead, or not.
    const mine = given[0] === from ? given.slice(1) : given;
    const path = [from, ...mine];
    // How far my route stays on a shortest one: path[0] to path[kept].
    let kept = 0;
    while (kept + 1 < path.length && isJump(path[kept]!, path[kept + 1]!) && dist.get(path[kept + 1]!) === fewest - kept - 1) kept++;
    const start = path.slice(0, kept + 1);

    const bad = path.findIndex((s, i) => i > 0 && !isJump(path[i - 1]!, s));
    if (bad > 0) {
      const [at, landed] = [path[bad - 1]!, path[bad]!];
      // Squares that work from the same place, while my route was still shortest.
      const works = bad - 1 <= kept ? jumps(at).filter((j) => dist.get(j) === fewest - bad) : [];
      let best: { square: Square; kind: NearMiss } | null = null;
      for (const w of works) {
        const kind = nearMiss(w, landed);
        if (kind && (!best || NEAR_MISSES.indexOf(kind) < NEAR_MISSES.indexOf(best.kind))) best = { square: w, kind };
      }
      const was = best ? ` ${best.square}, ${WORDS[best.kind]}, was.` : "";
      const shown = best ? [...path.slice(0, bad), best.square] : start;
      return wrong(`No: ${at} to ${landed} is no knight move.${was} ${routeLine(shown)}`, [best ? MISTAKE[best.kind] : "A jump that is no knight move"], again);
    }
    const onPawn = mine.find((s) => pawns.includes(s));
    if (onPawn) return wrong(`No: ${onPawn} holds your pawn. ${routeLine(start)}`, ["A landing on my pawn"], again);
    const end = path[path.length - 1]!;
    if (end !== to) return wrong(`No: your route ends on ${end}, not ${to}. ${routeLine(start)}`, ["A route ending elsewhere"], again);
    if (mine.length > fewest) {
      return wrong(
        `No: ${from} to ${to} takes ${fewest} moves, and yours took ${mine.length}. ${routeLine(start)} ${countLine(from, to)}`,
        ["A longer route"],
        again,
      );
    }
    return right(`Right: ${mine.join(", ")}, in ${fewest} moves.`, again);
  };

  // A pair I miss comes back once in each of my next two rounds.
  return oneQuestion("2.1.2", level.id, ask, judge, pawns.length ? { from, to, pawns } : { from, to });
}

// Two squares at random, as many knight moves apart on an empty board as the level sets.
function pair(random: Random, moves: number[]): { from: Square; to: Square } {
  for (;;) {
    const from = random.pick(SQUARES);
    const d = random.pick(moves);
    const dist = movesTo(from);
    const tos = SQUARES.filter((s) => dist.get(s) === d);
    if (tos.length) return { from, to: random.pick(tos) };
  }
}

// Two pawns for a pair: each stands on a shortest route the other leaves open,
// so neither is decorative, and one shortest route stays free of both, so they
// never make the way longer. Never on rank 1 or 8; the start and the target
// are no landing in between. null when the pair has no such two squares.
function twoPawns(random: Random, from: Square, to: Square): [Square, Square] | null {
  const ways = waysFrom(from, movesTo(to)).map((w) => w.slice(0, -1));
  const spots = [...new Set(ways.flat())].filter((s) => s[1] !== "1" && s[1] !== "8");
  const blocks = (s: Square, other: Square) => ways.some((w) => w.includes(s) && !w.includes(other));
  const pairs: [Square, Square][] = [];
  for (const [i, a] of spots.entries()) {
    for (const b of spots.slice(i + 1)) {
      if (blocks(a, b) && blocks(b, a) && ways.some((w) => !w.includes(a) && !w.includes(b))) pairs.push([a, b]);
    }
  }
  return pairs.length ? random.pick(pairs) : null;
}

// A pair with two pawns, the fewest moves around them as many as the pair
// takes on an empty board. setUp puts them on a legal board with my knight
// and both kings.
// > Stand-in. The kings setUp adds are passed over: the question names only my pawns.
function pawnRoute(random: Random, moves: number[]): Route {
  for (;;) {
    const { from, to } = pair(random, moves);
    const two = twoPawns(random, from, to);
    if (!two) continue;
    const knight: Piece = { side: "white", kind: "knight" };
    const p1: Piece = { side: "white", kind: "pawn" };
    const p2: Piece = { side: "white", kind: "pawn" };
    const at = new Map<Piece, Square>([[knight, from], [p1, two[0]!], [p2, two[1]!]]);
    const pos = setUp(random, {
      pieces: [knight, p1, p2],
      turn: "white",
      where: (piece) => (at.has(piece) ? [at.get(piece)!] : SQUARES.filter((s) => s !== to && ![...at.values()].includes(s))),
      tries: 200,
    });
    const pawns = SQUARES.filter((s) => pos.board[s]?.kind === "pawn").sort(bySquare);
    return { from, to, pawns };
  }
}

// What comes back: a pair, { from, to }, with its { pawns } when it held some. Anything else is passed over.
export function routeFact(facts: Facts): Route | null {
  if (!facts || typeof facts !== "object" || Array.isArray(facts)) return null;
  const { from, to, pawns = [] } = facts;
  if (typeof from !== "string" || typeof to !== "string" || !isSquare(from) || !isSquare(to) || from === to) return null;
  if (!Array.isArray(pawns) || !pawns.every((p): p is Square => typeof p === "string" && isSquare(p) && p !== from && p !== to)) return null;
  return movesTo(to, pawns).has(from) ? { from, to, pawns } : null;
}

export const challenge: Challenge = {
  built: true,
  id: "2.1.2",
  name: "Find the knight's route",
  trains: "Steering a knight between two squares in the fewest moves.",
  needs: "2.1.1 L3. From L5, 2.1.1 L4.",
  levels: LEVELS,
  // The routes coming back that a round asks: the first of its count; a mixed round leaves the rest.
  asks(level, facts) {
    return firstRead(facts.back, routeFact, facts.count ?? level.questions);
  },
  makeRound(level, random, facts) {
    const { moves, share } = row(level);
    const count = facts.count ?? level.questions;
    const routes = facts.back.map(routeFact).filter((r): r is Route => r !== null).slice(0, count);
    const seen = new Set(routes.map((r) => `${r.from}${r.to}`));
    // The round's pawn questions are the level's share of it; pairs coming back count among them.
    let pawnQuestions = Math.round(count * share) - routes.filter((r) => r.pawns.length).length;
    while (routes.length < count) {
      const r = pawnQuestions > 0 ? pawnRoute(random, moves.filter((m) => m >= 3)) : { ...pair(random, moves), pawns: [] };
      if (seen.has(`${r.from}${r.to}`)) continue;
      seen.add(`${r.from}${r.to}`);
      routes.push(r);
      pawnQuestions--;
    }
    return random.shuffle(routes).map((r) => knightRoute(level, r));
  },
};
