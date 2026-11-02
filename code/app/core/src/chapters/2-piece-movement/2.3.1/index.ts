// 2.3.1 Name who attacks a square: its level table, its set-up rules, its
// judge, its mistake names and its told lines. "A pawn straight behind" and
// "a blocked piece" are its own.
//
// Source: code/blueprint/docs/piece-movement.md, 2.3.1.

import { MISTAKE } from "../../../near-misses/index.ts";
import { inWords, kingSquare, other, piecesOf, type Position, sideWord, SIDES } from "../../../positions/index.ts";
import { setUp } from "../../../random/set-up.ts";
import { attackersOf, piecesBetween } from "../../../reach/index.ts";
import { gradeSet } from "../../../set-grader/index.ts";
import type { Ask, BoardView, Challenge, Did, Facts, Item, Level, Placed, Random, RoundFacts, Side, Square } from "../../../shape/index.ts";
import { fileNumber, lineOf, rankNumber, SQUARES, step } from "../../../squares/index.ts";
import { andList, givenSquares, oneQuestion, REVEALED, right, wrong } from "../../1-board-coordinates/question.ts";
import { boardOf, bothSides, drawPieces, inCheck, movesAlong, nearMissLine, placeBack, placedOn, positionFacts, readPositionFacts } from "../set-ups.ts";

const PASS_MARK = "Pass mark for 2.3.1 L1 to L5: the right answers in one round. My practice sets it.";

type Shows = "every piece" | "empty board" | "no board";

// The card's level table, row by row. kings: questions of 10 on the other side's king's square.
const TABLE: { id: string; path: string; others: number; kings: number; shows: Shows; minutes: number }[] = [
  { id: "L1", path: "Name who attacks a square, 4 pieces.", others: 4, kings: 0, shows: "every piece", minutes: 3 },
  { id: "L2", path: "Name who attacks a square, 6 pieces.", others: 6, kings: 0, shows: "every piece", minutes: 4 },
  { id: "L3", path: "Name who attacks a square, kings' squares too.", others: 6, kings: 3, shows: "every piece", minutes: 4 },
  { id: "L4", path: "Name who attacks a square, nothing on the board.", others: 6, kings: 3, shows: "empty board", minutes: 5 },
  { id: "L5", path: "Name who attacks a square, no board.", others: 6, kings: 3, shows: "no board", minutes: 5 },
];

const SHOWS: Record<Shows, string> = {
  "every piece": "Every piece, the square lit",
  "empty board": "An empty board, no edge names: only the square lit, no piece shown",
  "no board": "No board until I reveal it",
};

export const LEVELS: Level[] = TABLE.map((row) => ({
  id: row.id,
  path: row.path,
  questions: 10,
  minutes: row.minutes,
  seconds: null,
  seat: row.shows === "no board" ? null : "white",
  passMark: PASS_MARK,
  dials: [
    { name: "Pieces besides the kings", value: String(row.others) },
    { name: "The square holds the other side's king", value: row.kings ? `${row.kings} of 10` : "Never" },
    { name: "What the board shows", value: SHOWS[row.shows] },
    { name: "How I answer", value: "Click, None allowed" },
  ],
}));

// The card's mistakes. A wrong square takes the first kind it fits.
export const MISTAKES = [
  "An attacker left out",
  ...Object.values(MISTAKE),
  "A pawn straight behind",
  "A blocked piece",
  "A piece off its lines",
  "A piece of the other side",
  "Another square",
];

function row(level: Level) {
  const found = TABLE.find((r) => r.id === level.id);
  if (!found) throw new Error(`2.3.1 has no level ${level.id}.`);
  return found;
}

const forward = (side: Side) => (side === "white" ? 1 : -1);

// The square straight behind another, for a side's pawns: e4 for White's e5.
const behind = (square: Square, side: Side) => step(square, 0, -forward(side));

// The two squares a pawn attacks, diagonally ahead: d5 and f5 for White's e4.
const pawnHits = (square: Square, side: Side) =>
  [step(square, -1, forward(side)), step(square, 1, forward(side))].filter((s): s is Square => s !== null);

// > Stand-in. The order attackers are told in: rank by rank from the first,
// > each rank from the a-file on. The card's lines read so: "the knight on f3
// > and the pawn on d4", "pawn on c5 and knight on f5", "bishop on d3 and
// > knight on g5".
export function inOrder(squares: Square[]): Square[] {
  return [...squares].sort((a, b) => rankNumber(a) - rankNumber(b) || fileNumber(a) - fileNumber(b));
}

// True when a piece of the side asked looks like an attacker and is not:
// blocked on its line, or a pawn straight behind the square.
function decoyed(pos: Position, square: Square, side: Side): boolean {
  return piecesOf(pos).some(
    (p) =>
      p.side === side &&
      ((p.kind === "pawn" && p.square === behind(square, side)) ||
        (movesAlong(p.kind, lineOf(p.square, square)) && piecesBetween(pos.board, p.square, square)!.length > 0)),
  );
}

// One question: "Which of White's pieces attack e5?"
export function whoAttacks(level: Level, pos: Position, square: Square, side: Side): Item {
  const { shows } = row(level);
  const there = pos.board[square];
  if (there?.side === side) throw new Error(`2.3.1 never asks about a square holding a piece of the side asked: ${square}.`);
  const attackers = inOrder(attackersOf(pos.board, square, side)).map((s) => placedOn(pos, s)!);
  const check = there?.kind === "king" && attackers.length ? " That is check." : "";
  // After my answer, the whole position shows with the attackers lit, wherever a board shows.
  const again = shows === "no board" ? undefined : { board: boardOf(pos, [square, ...attackers.map((a) => a.square)]) };
  // The board asked on: every piece, or an empty one with only the square lit.
  const board: BoardView | null = shows === "every piece" ? boardOf(pos, [square]) : shows === "empty board" ? { ...boardOf(pos, [square]), pieces: [] } : null;
  const ask: Ask = {
    step: "ask",
    question: `Which of ${sideWord(side)}'s pieces attack ${square}?`,
    board,
    ...(shows === "every piece" ? {} : { words: inWords(pos) }),
    notes: [],
    input: { how: "click-many", none: "None", ...(shows === "no board" ? { reveal: REVEALED } : {}) },
    seconds: null,
    reopened: false,
  };
  const the = (p: Placed) => `the ${p.kind} on ${p.square}`;
  const own = sideWord(side);
  const head =
    attackers.length === 0
      ? // > Stand-in. The card gives no line for a square no piece attacks.
        `No: none of ${own}'s pieces attacks ${square}.`
      : attackers.length === 1
        ? `No: only ${own}'s ${attackers[0]!.kind} on ${attackers[0]!.square} attacks ${square}.${check}`
        : `No: ${own}'s ${andList(attackers.map((a) => `${a.kind} on ${a.square}`))} attack ${square}.${check}`;

  // Why a square I added is wrong, and its mistake's kind.
  // > Stand-in. The card gives no line for a piece off its lines, a piece of
  // > the other side, or an empty square.
  function why(s: Square): [string, string] {
    const p = placedOn(pos, s);
    if (!p) return [`${s} is empty.`, "Another square"];
    if (p.side !== side) return [`The ${p.kind} on ${s} is ${sideWord(p.side)}'s.`, "A piece of the other side"];
    if (p.kind === "pawn" && s === behind(square, side)) {
      return [`A pawn on ${s} attacks ${andList(pawnHits(s, side))}, never the square ahead.`, "A pawn straight behind"];
    }
    if (movesAlong(p.kind, lineOf(s, square))) {
      // > Stand-in. A pawn in the way blocks; a piece in the way is stood behind.
      const b = piecesBetween(pos.board, s, square)![0]!;
      const whose = `${sideWord(b.side)}'s${b.side === p.side ? " own" : ""}`;
      const line = b.kind === "pawn" ? `is blocked by ${whose} pawn on ${b.square}` : `stands behind ${whose} ${b.kind} on ${b.square}`;
      return [`The ${p.kind} on ${s} ${line}.`, "A blocked piece"];
    }
    const off: Record<Placed["kind"], string> = {
      knight: `The knight on ${s} is no knight's jump from ${square}.`,
      bishop: `The bishop on ${s} shares no diagonal with ${square}.`,
      rook: `The rook on ${s} shares no file or rank with ${square}.`,
      queen: `The queen on ${s} shares no line with ${square}.`,
      king: `The king on ${s} is not next to ${square}.`,
      pawn: `A pawn on ${s} attacks ${andList(pawnHits(s, side))}.`,
    };
    return [off[p.kind], "A piece off its lines"];
  }

  const judge = (did: Did) => {
    if (did.did !== "answer") throw new Error("2.3.1 has no clock: it takes an answer.");
    const given = givenSquares(did.answer);
    if (given === "none") {
      // > Stand-in. The card gives no right line for None.
      if (!attackers.length) return right("Right: none.", again);
      return wrong(head, ["An attacker left out"], again);
    }
    const g = gradeSet(given, attackers.map((a) => a.square));
    if (g.right) return right(`Right: ${andList(attackers.map(the))}.${check}`, again);
    const lines: string[] = [];
    const kinds: string[] = [];
    for (const added of g.added) {
      const pair = g.pairs.find((p) => p.added === added);
      const [line, kind] = pair ? [nearMissLine(pair), MISTAKE[pair.kind]] : why(added);
      lines.push(line);
      kinds.push(kind);
    }
    const leftOut = g.leftOut.filter((s) => !g.pairs.some((p) => p.leftOut === s));
    if (leftOut.length) {
      // > Stand-in. The card gives no line for an attacker left out.
      lines.push(`You left out ${andList(leftOut.map((s) => the(placedOn(pos, s)!)))}.`);
      kinds.unshift("An attacker left out");
    }
    return wrong(`${head} ${lines.join(" ")}`, kinds, again);
  };

  // The same position and question come back.
  return oneQuestion("2.3.1", level.id, ask, judge, positionFacts(pos, square, { side }));
}

// A round's place: the other side's king's square, or any other square.
type Place = "king" | "square";

// A set-up position for the drill: both kings and the level's count of other
// pieces, of both sides. The square is empty or holds a piece of the other
// side. No piece attacks it when none is asked, else 1 to 3 do, at most 2 on
// a king's square. At least one piece of the side asked looks like an
// attacker and is not. The kings never stand side by side, and only the king
// asked about may stand in check.
export function makeQuestion(random: Random, level: Level, place: Place, none: boolean): { pos: Position; square: Square; side: Side } {
  const { others } = row(level);
  const side = random.pick(SIDES);
  const them = other(side);
  const fits = (p: Position, s: Square, most: number) => {
    const n = attackersOf(p.board, s, side).length;
    return (none ? n === 0 : n >= 1 && n <= most) && decoyed(p, s, side);
  };
  const found: { square?: Square } = {};
  const pos = setUp(random, {
    pieces: (r) => drawPieces(r, others),
    // The king asked about may stand in check: then it is its side's move.
    turn: place === "king" ? them : (r) => r.pick(SIDES),
    holds: (p) => {
      if (!bothSides(p)) return false;
      if (place === "king") {
        const k = kingSquare(p, them)!;
        found.square = fits(p, k, 2) ? k : undefined;
        return found.square !== undefined;
      }
      if (inCheck(p, "white") || inCheck(p, "black")) return false;
      const squares = SQUARES.filter((s) => {
        const there = p.board[s];
        if (there && (there.side === side || there.kind === "king")) return false;
        return fits(p, s, 3);
      });
      found.square = squares.length ? random.pick(squares) : undefined;
      return found.square !== undefined;
    },
  });
  return { pos, square: found.square!, side };
}

// What comes back: { fen, square, side }, the square never holding the side's own piece.
function backQuestion(facts: Facts) {
  const read = readPositionFacts(facts);
  const side = read?.facts.side;
  if (!read || (side !== "white" && side !== "black") || read.pos.board[read.square]?.side === side) return null;
  return { pos: read.pos, square: read.square, side: side as Side };
}

export const challenge: Challenge = {
  built: true,
  id: "2.3.1",
  name: "Name who attacks a square",
  trains: "Finding every piece of one side that attacks one square.",
  needs: "2.1.1 L2 and 2.2.1 L2. From L5, 2.2.1 L4.",
  levels: LEVELS,
  asks(level, facts) {
    return takeBack(level, facts).back.map((b) => b.from);
  },
  makeRound(level, random, facts) {
    const { back, fresh } = takeBack(level, facts);
    const items = [
      ...back.map((b) => whoAttacks(level, b.pos, b.square, b.side)),
      // Each fresh question has no attacker one time in five, decided on its own, a king's square too.
      ...random.shuffle(fresh).map((place) => {
        const q = makeQuestion(random, level, place, random.int(5) === 0);
        return whoAttacks(level, q.pos, q.square, q.side);
      }),
    ];
    return random.shuffle(items);
  },
};

// A round's places: the level's kings' squares, the rest other squares. A
// question coming back takes a place of its own kind, and waits when none is
// left: it never pushes out the kings' share. It keeps its own answer, none
// included.
// > Stand-in. A round of another size, such as the mixed round's 3, keeps
// > the card's share of kings' squares, 3 of 10, rounded.
function takeBack(level: Level, facts: RoundFacts) {
  const count = facts.count ?? level.questions;
  const kings = Math.round((count * row(level).kings) / 10);
  const places: Place[] = Array.from({ length: count }, (_, i) => (i < kings ? "king" : "square"));
  const back = facts.back.flatMap((from) => {
    const q = backQuestion(from);
    return q ? [{ ...q, from }] : [];
  });
  const kindOf = (b: (typeof back)[number]): Place => (b.pos.board[b.square]?.kind === "king" ? "king" : "square");
  return placeBack(places, back, kindOf);
}
