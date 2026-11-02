// 2.3.2 Name where it may move: its level table, its set-up rules, its judge,
// its twelve mistake kinds and its told lines. It asks only on a legal
// position: Rules lists the moves, and a position the set-up maker cannot
// make legal is never asked.
//
// Source: code/blueprint/docs/piece-movement.md, 2.3.2.

import { MISTAKE } from "../../../near-misses/index.ts";
import { inWords, kingSquare, moveByHand, NO_CASTLING, other, type Position, sideWord, SIDES, takeOff } from "../../../positions/index.ts";
import { setUp } from "../../../random/set-up.ts";
import { attackersOf } from "../../../reach/index.ts";
import { legalMoves, legalProblem } from "../../../rules/index.ts";
import { gradeSet } from "../../../set-grader/index.ts";
import type { Ask, BoardView, Challenge, Did, Facts, Item, Level, Piece, Random, RoundFacts, Side, Square } from "../../../shape/index.ts";
import { between, bySquare, fileNumber, fileOf, lineOf, rankNumber, SQUARES, step } from "../../../squares/index.ts";
import { andList, givenSquares, oneQuestion, REVEALED, right, wrong } from "../../1-board-coordinates/question.ts";
import { boardOf, bothSides, drawPieces, inCheck, movesAlong, nearMissLine, nextTo, pieceOn, placeBack, placedOn, positionFacts, readPositionFacts } from "../set-ups.ts";

const PASS_MARK = "Pass mark for 2.3.2 L1 to L5: the right answers in one round. My practice sets it.";

type Asks = "pawn" | "king" | "both";
type Shows = "every piece" | "empty board" | "no board";

// The card's level table, row by row. checks: king questions in check, of 5.
// pins: a pawn question may hold a pawn shielding its king.
const TABLE: { id: string; path: string; asks: Asks; checks: number; pins: boolean; shows: Shows; minutes: number }[] = [
  { id: "L1", path: "Name where it may move, a pawn.", asks: "pawn", checks: 0, pins: false, shows: "every piece", minutes: 2 },
  { id: "L2", path: "Name where it may move, a king.", asks: "king", checks: 0, pins: false, shows: "every piece", minutes: 3 },
  { id: "L3", path: "Name where it may move, pawns and kings, check too.", asks: "both", checks: 3, pins: true, shows: "every piece", minutes: 3 },
  { id: "L4", path: "Name where it may move, nothing on the board.", asks: "both", checks: 3, pins: true, shows: "empty board", minutes: 5 },
  { id: "L5", path: "Name where it may move, no board.", asks: "both", checks: 3, pins: true, shows: "no board", minutes: 5 },
];

const ASKS: Record<Asks, string> = { pawn: "A pawn", king: "A king, never in check", both: "5 pawns and 5 kings, 3 kings in check" };

const SHOWS: Record<Shows, string> = {
  "every piece": "Every piece, the one asked about lit",
  "empty board": "An empty board, no edge names: only the asked piece's square lit, no piece shown",
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
    { name: "Piece asked about", value: ASKS[row.asks] },
    { name: "Check announced", value: row.checks ? (row.shows === "no board" ? "No" : "Yes") : "—" },
    { name: "What the board shows", value: SHOWS[row.shows] },
    { name: "How I answer", value: "Click, None allowed" },
  ],
}));

// The card's mistakes. A wrong square takes the first kind it fits.
export const MISTAKES = [
  "A square left out",
  ...Object.values(MISTAKE),
  "An attacked square",
  "A square behind the king on a checking line",
  "A guarded piece taken",
  "A square next to the other king",
  "A square holding its own side's piece",
  "A pawn straight onto a piece",
  "A pawn diagonally onto an empty square",
  "A pawn the wrong way",
  "A pawn two squares ahead, past its starting rank",
  "A pawn leaving its king open",
  "Another square",
];

function row(level: Level) {
  const found = TABLE.find((r) => r.id === level.id);
  if (!found) throw new Error(`2.3.2 has no level ${level.id}.`);
  return found;
}

const forward = (side: Side) => (side === "white" ? 1 : -1);
const startRank = (side: Side) => (side === "white" ? 2 : 7);
const ORDINAL = ["first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth"];

// "the first rank", "the e-file", "the diagonal".
function lineName(a: Square, b: Square): string {
  const line = lineOf(a, b);
  if (line === "file") return `the ${fileOf(a)}-file`;
  if (line === "rank") return `the ${ORDINAL[rankNumber(a) - 1]} rank`;
  return "the diagonal";
}

// "Black's bishop on g4 and rook on d1": pieces of one side, named once.
function ofOneSide(pos: Position, squares: Square[]): string {
  const ps = squares.map((s) => placedOn(pos, s)!);
  return `${sideWord(ps[0]!.side)}'s ${andList(ps.map((p) => `${p.kind} on ${p.square}`))}`;
}

const notKings = (pos: Position, squares: Square[]) => squares.filter((s) => pos.board[s]?.kind !== "king");

// The squares the piece on a square may move to, by the laws of chess.
// Castling never counts, nor a pawn taken in passing: the page leaves both out.
export function mayMoveTo(pos: Position, square: Square): Square[] {
  const side = pos.board[square]!.side;
  const plain: Position = { ...pos, turn: side, castling: NO_CASTLING, enPassant: null };
  return [...new Set(legalMoves(plain).filter((m) => m.from === square).map((m) => m.to))].sort(bySquare);
}

// One question: "Which squares may White's pawn on d2 move to?"
export function whereItMayMove(level: Level, start: Position, square: Square): Item {
  const { shows } = row(level);
  const me = placedOn(start, square);
  if (!me || (me.kind !== "pawn" && me.kind !== "king")) throw new Error(`2.3.2 asks of a pawn or a king, not ${square}.`);
  const pos: Position = { ...start, turn: me.side };
  const may = mayMoveTo(pos, square);
  const enemy = other(me.side);
  // After my answer, the whole position shows with its squares lit, wherever a board shows.
  const again = shows === "no board" ? undefined : { board: boardOf(pos, [square, ...may]) };
  // A king in check says so, and from where: the pieces giving check, in
  // square order. Only where a board shows, empty or not: with no board,
  // finding the check is the level's work.
  const checkers = shows !== "no board" && me.kind === "king" ? attackersOf(pos.board, square, enemy) : [];
  // The board asked on: every piece, or an empty one with only the piece's square lit.
  const board: BoardView | null = shows === "every piece" ? boardOf(pos, [square]) : shows === "empty board" ? { ...boardOf(pos, [square]), pieces: [] } : null;
  const ask: Ask = {
    step: "ask",
    question: `Which squares may ${pieceOn(me)} move to?`,
    board,
    ...(shows === "every piece" ? {} : { words: inWords(pos) }),
    notes: [],
    input: { how: "click-many", none: "None", ...(shows === "no board" ? { reveal: REVEALED } : {}) },
    seconds: null,
    reopened: false,
    ...(checkers.length ? { check: { king: square, from: checkers.map((s) => placedOn(pos, s)!) } } : {}),
  };
  const head = `No: ${pieceOn(me)} may move ${may.length === 0 ? "nowhere" : may.length === 1 ? `to ${may[0]} only` : `to ${andList(may)}`}.`;

  // Why a square I added is wrong, for a king.
  // > Stand-in. The card gives no line for a guarded piece taken, a square
  // > next to the other king, a square holding its own side's piece, or
  // > another square.
  function kingWhy(s: Square): [string, string] {
    const p = placedOn(pos, s);
    if (nextTo(s, square) && p?.side !== me!.side) {
      const attacked = notKings(pos, attackersOf(pos.board, s, enemy));
      if (!p && attacked.length) return [`${s} is attacked by ${ofOneSide(pos, attacked)}.`, "An attacked square"];
      const checker = attackersOf(pos.board, square, enemy).find((c) => movesAlong(pos.board[c]!.kind, lineOf(c, s)) && between(c, s)!.includes(square));
      if (checker) {
        return [`Once it stands on ${s}, ${pieceOn(placedOn(pos, checker)!)} attacks it along ${lineName(checker, s)}.`, "A square behind the king on a checking line"];
      }
      const guards = notKings(pos, attackersOf(takeOff(pos, square).board, s, enemy));
      if (p && guards.length) return [`${s} holds ${sideWord(p.side)}'s ${p.kind}, guarded by ${ofOneSide(pos, guards)}.`, "A guarded piece taken"];
      const king = kingSquare(pos, enemy)!;
      if (nextTo(s, king)) return [`${s} stands next to ${sideWord(enemy)}'s king on ${king}: kings never stand side by side.`, "A square next to the other king"];
    }
    if (p?.side === me!.side) return [`${s} holds ${sideWord(p.side)}'s own ${p.kind}.`, "A square holding its own side's piece"];
    return [`${s} is no king's step from ${square}.`, "Another square"];
  }

  // Why a square I added is wrong, for a pawn.
  // > Stand-in. The card gives no line for a square holding its own side's
  // > piece, a pawn the wrong way, two squares past its starting rank, or
  // > another square.
  function pawnWhy(s: Square): [string, string] {
    const p = placedOn(pos, s);
    const files = fileNumber(s) - fileNumber(square);
    const ahead = (rankNumber(s) - rankNumber(square)) * forward(me!.side);
    if (p?.side === me!.side) return [`${s} holds ${sideWord(p.side)}'s own ${p.kind}.`, "A square holding its own side's piece"];
    if (p && files === 0 && (ahead === 1 || ahead === 2)) {
      return [`${s} holds ${sideWord(p.side)}'s ${p.kind}: a pawn never takes straight ahead.`, "A pawn straight onto a piece"];
    }
    if (!p && Math.abs(files) === 1 && ahead === 1) return [`${s} is empty: a pawn moves diagonally only to take.`, "A pawn diagonally onto an empty square"];
    if (ahead < 0) {
      return [`${s} is behind it: ${sideWord(me!.side)}'s pawns move ${me!.side === "white" ? "up" : "down"} the ranks.`, "A pawn the wrong way"];
    }
    // A pawn's own move, the kinds above ruled out: one square ahead, two from
    // its starting rank over an empty square, or a capture. When the rules
    // refuse one, it leaves the king open to the piece the pawn shielded it from.
    const one = step(square, 0, forward(me!.side))!;
    const pawnMove = files === 0 ? ahead === 1 || (ahead === 2 && rankNumber(square) === startRank(me!.side) && !pos.board[one]) : Math.abs(files) === 1 && ahead === 1;
    if (pawnMove) {
      const king = kingSquare(pos, me!.side)!;
      const before = attackersOf(pos.board, king, enemy);
      const opened = attackersOf(moveByHand(pos, square, s).board, king, enemy).find((a) => !before.includes(a));
      if (opened) {
        return [
          `${s} leaves ${sideWord(me!.side)}'s king on ${king} open to ${pieceOn(placedOn(pos, opened)!)}, along ${lineName(opened, king)}.`,
          "A pawn leaving its king open",
        ];
      }
    }
    if (files === 0 && ahead === 2) {
      if (rankNumber(square) !== startRank(me!.side)) {
        return [`${s} is two squares ahead: a pawn moves two only from its starting rank.`, "A pawn two squares ahead, past its starting rank"];
      }
      // > Stand-in. Two squares from the starting rank, the square between taken.
      return [`${s} is out of reach: ${step(square, 0, forward(me!.side))} is not empty.`, "Another square"];
    }
    return [`${s} is no move for a pawn on ${square}.`, "Another square"];
  }

  const why = (s: Square): [string, string] =>
    s === square ? [`${s} is where it stands.`, "Another square"] : me.kind === "king" ? kingWhy(s) : pawnWhy(s);

  const judge = (did: Did) => {
    if (did.did !== "answer") throw new Error("2.3.2 has no clock: it takes an answer.");
    const given = givenSquares(did.answer);
    if (given === "none") {
      // > Stand-in. The card gives no right line for None.
      if (!may.length) return right("Right: none.", again);
      return wrong(head, ["A square left out"], again);
    }
    const g = gradeSet(given, may);
    if (g.right) return right(`Right: ${andList(may)}.`, again);
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
      lines.push(`You left out ${andList(leftOut)}.`);
      kinds.unshift("A square left out");
    }
    return wrong(`${head} ${lines.join(" ")}`, kinds, again);
  };

  // The same position and question come back.
  return oneQuestion("2.3.2", level.id, ask, judge, positionFacts(pos, square));
}

// True when the pawn on a square shields its own king: taken off, its king stands in check.
function shields(pos: Position, square: Square, side: Side): boolean {
  return inCheck(takeOff(pos, square), side);
}

// A pawn question: the pawn on White's ranks 2 to 6 or Black's 7 to 3, on its
// starting rank when asked, pieces of both sides ahead of it and diagonally
// ahead, at random. Its king is not in check. The pawn shields its king from
// a rook, bishop or queen only when a pinned pawn is asked.
export function pawnQuestion(random: Random, onStart: boolean, pinned: boolean): { pos: Position; square: Square } {
  const side = random.pick(SIDES);
  const f = forward(side);
  const ranks = onStart ? [startRank(side)] : side === "white" ? [3, 4, 5, 6] : [6, 5, 4, 3];
  const pawn: Piece = { side, kind: "pawn" };
  const at = random.pick(SQUARES.filter((s) => ranks.includes(rankNumber(s))));
  const front = [step(at, 0, f), onStart ? step(at, 0, 2 * f) : null, step(at, -1, f), step(at, 1, f)].filter((s): s is Square => s !== null);
  // > Stand-in. How many pieces stand ahead: each of the other three, by a coin, at least one.
  const ahead = new Set<Piece>();
  const pos = setUp(random, {
    pieces: (r) => {
      const others = drawPieces(r, 3);
      ahead.clear();
      for (const p of others) if (r.int(2) === 0) ahead.add(p);
      if (!ahead.size) ahead.add(others[0]!);
      return [pawn, ...others];
    },
    turn: side,
    where: (piece) => (piece === pawn ? [at] : ahead.has(piece) ? front : SQUARES),
    holds: (p) => bothSides(p) && !inCheck(p, side) && shields(p, at, side) === pinned,
  });
  return { pos, square: at };
}

// A king question: enemy pieces attack some of its squares, pieces of its own
// side stand on some. In check, or not, as asked.
export function kingQuestion(random: Random, check: boolean): { pos: Position; square: Square } {
  const side = random.pick(SIDES);
  const enemy = other(side);
  const pos = setUp(random, {
    pieces: (r) => drawPieces(r, 4),
    turn: side,
    holds: (p) => {
      const k = kingSquare(p, side)!;
      if (!bothSides(p) || inCheck(p, side) !== check) return false;
      const near = SQUARES.filter((s) => nextTo(s, k));
      return near.some((s) => p.board[s]?.side === side) && near.some((s) => notKings(p, attackersOf(p.board, s, enemy)).length > 0);
    },
  });
  return { pos, square: kingSquare(pos, side)! };
}

// What comes back: { fen, square }, a pawn or a king, on a legal position with its side to move.
function backQuestion(facts: Facts) {
  const read = readPositionFacts(facts);
  const piece = read && read.pos.board[read.square];
  if (!read || !piece || (piece.kind !== "pawn" && piece.kind !== "king")) return null;
  const pos: Position = { ...read.pos, turn: piece.side };
  return legalProblem(pos) === null ? { pos, square: read.square } : null;
}

type Kind232 = "pawn" | "start" | "king" | "check";

// A round's questions by kind, before they are shuffled.
// > Stand-in. A round of another size, such as the mixed round's 3, keeps
// > the card's shares, rounded: half kings, 3 of 5 kings in check, 3 of 10
// > pawns on their starting rank.
function kindsOf(asks: Asks, checks: number, count: number): Kind232[] {
  const kings = asks === "king" ? count : asks === "pawn" ? 0 : Math.round(count / 2);
  const pawns = count - kings;
  const checked = Math.round((kings * checks) / 5);
  const starts = Math.round((pawns * 3) / 10);
  return [
    ...Array<Kind232>(checked).fill("check"),
    ...Array<Kind232>(kings - checked).fill("king"),
    ...Array<Kind232>(starts).fill("start"),
    ...Array<Kind232>(pawns - starts).fill("pawn"),
  ];
}

// A round's places by kind, and the questions coming back placed among them.
// A question coming back takes a place of its own kind, and waits when none
// is left: it never pushes out the level's shares of pawns, pawns on their
// starting rank, kings and kings in check.
function takeBack(level: Level, facts: RoundFacts) {
  const { asks, checks } = row(level);
  const back = facts.back.flatMap((from) => {
    const q = backQuestion(from);
    return q ? [{ ...q, from }] : [];
  });
  const kindOf = (b: (typeof back)[number]): Kind232 => {
    const piece = b.pos.board[b.square]!;
    if (piece.kind === "pawn") return rankNumber(b.square) === startRank(piece.side) ? "start" : "pawn";
    return inCheck(b.pos, piece.side) ? "check" : "king";
  };
  return placeBack(kindsOf(asks, checks, facts.count ?? level.questions), back, kindOf);
}

export const challenge: Challenge = {
  built: true,
  id: "2.3.2",
  name: "Name where it may move",
  trains: "Knowing every square a pawn or a king may move to, among other pieces.",
  needs: "1.1.1 L2. From L2, 2.3.1 L1. From L3, 2.3.1 L3. From L5, 2.3.1 L5.",
  levels: LEVELS,
  asks(level, facts) {
    return takeBack(level, facts).back.map((b) => b.from);
  },
  makeRound(level, random, facts) {
    const { back, fresh } = takeBack(level, facts);
    const { pins } = row(level);
    const items = [
      ...back.map((b) => whereItMayMove(level, b.pos, b.square)),
      // From L3, each fresh pawn question holds a pinned pawn one time in three, decided on its own.
      ...random.shuffle(fresh).map((kind) => {
        const q = kind === "pawn" || kind === "start" ? pawnQuestion(random, kind === "start", pins && random.int(3) === 0) : kingQuestion(random, kind === "check");
        return whereItMayMove(level, q.pos, q.square);
      }),
    ];
    return random.shuffle(items);
  },
};
