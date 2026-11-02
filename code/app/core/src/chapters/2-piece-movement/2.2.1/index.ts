// 2.2.1 Name what it attacks: its level table, its set-up rules, its judge,
// its mistake names and its told lines. "A piece behind another" is its own.
//
// Source: code/blueprint/docs/piece-movement.md, 2.2.1.

import { MISTAKE } from "../../../near-misses/index.ts";
import { inWords, other, piecesOf, type Position, sideWord, SIDES } from "../../../positions/index.ts";
import { setUp } from "../../../random/set-up.ts";
import { attackedPieces, piecesBetween } from "../../../reach/index.ts";
import { gradeSet } from "../../../set-grader/index.ts";
import type { Ask, BoardView, Challenge, Did, Item, Kind, Level, Random, RoundFacts, Side, Square } from "../../../shape/index.ts";
import { between, fileNumber, lineOf, rankNumber } from "../../../squares/index.ts";
import { firstRead } from "../../back.ts";
import { andList, givenSquares, oneQuestion, REVEALED, right, wrong } from "../../1-board-coordinates/question.ts";
import { boardOf, bothSides, drawPieces, movesAlong, nearMissLine, pieceOn, placedOn, positionFacts, readPositionFacts } from "../set-ups.ts";

const PASS_MARK = "Pass mark for 2.2.1 L1 to L4: the right answers in one round. My practice sets it.";

type Shows = "every piece" | "empty board" | "no board";

// The card's level table, row by row.
const TABLE: { id: string; path: string; kinds: Kind[]; others: number; shows: Shows; answer: string; minutes: number }[] = [
  { id: "L1", path: "Name what it attacks, a rook or a bishop.", kinds: ["rook", "bishop"], others: 4, shows: "every piece", answer: "Click", minutes: 3 },
  { id: "L2", path: "Name what it attacks, the queen too.", kinds: ["rook", "bishop", "queen"], others: 6, shows: "every piece", answer: "Click", minutes: 3 },
  { id: "L3", path: "Name what it attacks, nothing on the board.", kinds: ["rook", "bishop", "queen"], others: 6, shows: "empty board", answer: "Click, None allowed", minutes: 4 },
  { id: "L4", path: "Name what it attacks, no board.", kinds: ["rook", "bishop", "queen"], others: 6, shows: "no board", answer: "Click, None allowed", minutes: 5 },
];

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
    { name: "Piece asked about", value: row.kinds.length === 2 ? "A rook or a bishop" : "A rook, a bishop or a queen" },
    { name: "Pieces besides the kings", value: String(row.others) },
    { name: "What the board shows", value: SHOWS[row.shows] },
    { name: "How I answer", value: row.answer },
  ],
}));

// The card's mistakes. A wrong square takes the first kind it fits.
export const MISTAKES = [
  "A piece left out",
  ...Object.values(MISTAKE),
  "A piece behind another",
  "A piece of its own side",
  "A piece off its lines",
  "Another square",
];

function row(level: Level) {
  const found = TABLE.find((r) => r.id === level.id);
  if (!found) throw new Error(`2.2.1 has no level ${level.id}.`);
  return found;
}

// > Stand-in. The order its pieces are told in: rank by rank from the far
// > side of the piece asked about, each rank from the a-file on. The card's
// > three lines read so: "f7 and a6", "d4 and a8", "b5 and h5".
export function inOrder(squares: Square[], side: Side): Square[] {
  const far = side === "white" ? -1 : 1;
  return [...squares].sort((a, b) => far * (rankNumber(a) - rankNumber(b)) || fileNumber(a) - fileNumber(b));
}

// One question: "Which of Black's pieces does White's bishop on c4 attack?"
export function whatItAttacks(level: Level, pos: Position, square: Square): Item {
  const { shows } = row(level);
  const me = placedOn(pos, square);
  if (!me || !["rook", "bishop", "queen"].includes(me.kind)) throw new Error(`2.2.1 asks of a rook, a bishop or a queen, not ${square}.`);
  const attacked = inOrder(attackedPieces(pos.board, square).map((p) => p.square), me.side);
  // After my answer, the whole position shows with the lines lit, wherever a board shows.
  const again = shows === "no board" ? undefined : { board: boardOf(pos, [square, ...attacked]) };
  // The board asked on: every piece, or an empty one with only the asked square lit.
  const board: BoardView | null = shows === "every piece" ? boardOf(pos, [square]) : shows === "empty board" ? { ...boardOf(pos, [square]), pieces: [] } : null;
  const ask: Ask = {
    step: "ask",
    question: `Which of ${sideWord(other(me.side))}'s pieces does ${pieceOn(me)} attack?`,
    board,
    ...(shows === "every piece" ? {} : { words: inWords(pos) }),
    notes: [],
    input: { how: "click-many", none: "None", ...(shows === "no board" ? { reveal: REVEALED } : {}) },
    seconds: null,
    reopened: false,
  };
  const head = `No: ${pieceOn(me)} attacks ${attacked.length ? andList(attacked) : "nothing"}.`;

  // Why a square I added is wrong, and its mistake's kind.
  function why(s: Square): [string, string] {
    const p = placedOn(pos, s);
    // > Stand-in. The card gives no line for the piece asked about, an empty
    // > square, or a piece off its lines.
    if (s === square) return [`${s} is the ${me!.kind} asked about.`, "Another square"];
    const line = lineOf(square, s);
    const before = movesAlong(me!.kind, line) ? piecesBetween(pos.board, square, s)! : [];
    if (p && before.length) {
      const b = before[0]!;
      return [`${s} stands behind ${sideWord(b.side)}'s${b.side === me!.side ? " own" : ""} ${b.kind} on ${b.square}.`, "A piece behind another"];
    }
    if (p && p.side === me!.side) return [`${s} is ${sideWord(p.side)}'s own ${p.kind}: a piece never attacks its own side.`, "A piece of its own side"];
    if (p) {
      if (me!.kind === "bishop" && (line === "file" || line === "rank")) return [`${s} is off its lines: a bishop never moves along a ${line}.`, "A piece off its lines"];
      if (me!.kind === "rook" && line === "diagonal") return [`${s} is off its lines: a rook never moves along a diagonal.`, "A piece off its lines"];
      return [`${s} is off its lines.`, "A piece off its lines"];
    }
    return [`${s} is empty.`, "Another square"];
  }

  const judge = (did: Did) => {
    if (did.did !== "answer") throw new Error("2.2.1 has no clock: it takes an answer.");
    const given = givenSquares(did.answer);
    if (given === "none") {
      // > Stand-in. The card gives no right line for None.
      if (!attacked.length) return right("Right: none.", again);
      const lines = attacked.map((t) => [square, ...between(square, t)!, t].join(", "));
      return wrong(`${head} ${lines.length === 1 ? "Its line runs" : "Its lines run"} ${lines.join(", and ")}.`, ["A piece left out"], again);
    }
    const g = gradeSet(given, attacked);
    if (g.right) return right(`Right: ${andList(attacked)}.`, again);
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
      kinds.unshift("A piece left out");
    }
    return wrong(`${head} ${lines.join(" ")}`, kinds, again);
  };

  // The same position and question come back.
  return oneQuestion("2.2.1", level.id, ask, judge, positionFacts(pos, square));
}

// True when the piece on a square fits the card's rules: at least two other
// pieces on its lines, one behind another, and something attacked, or nothing.
function fits(pos: Position, square: Square, nothing: boolean): boolean {
  const me = pos.board[square]!;
  const onLines = piecesOf(pos).filter((p) => p.square !== square && movesAlong(me.kind, lineOf(square, p.square)));
  if (onLines.length < 2) return false;
  if (!onLines.some((p) => piecesBetween(pos.board, square, p.square)!.length > 0)) return false;
  return (attackedPieces(pos.board, square).length === 0) === nothing;
}

// A set-up position for the drill: both kings and the level's count of other
// pieces, the one asked about among them, White's or Black's at random. The
// kings never stand side by side, never both in check. No pawn on the first
// or eighth rank.
export function makePosition(random: Random, level: Level, nothing: boolean): { pos: Position; square: Square } {
  const { kinds, others } = row(level);
  const asked = { side: random.pick(SIDES), kind: random.pick(kinds) };
  const found: { square?: Square } = {};
  const pos = setUp(random, {
    pieces: (r) => [asked, ...drawPieces(r, others - 1)],
    turn: (r) => r.pick(SIDES),
    holds: (p) => {
      if (!bothSides(p)) return false;
      found.square = piecesOf(p).find((x) => x.side === asked.side && x.kind === asked.kind && fits(p, x.square, nothing))?.square;
      return found.square !== undefined;
    },
  });
  return { pos, square: found.square! };
}

// What comes back: { fen, square }, a rook, bishop or queen on the square.
function backQuestion(facts: Parameters<typeof readPositionFacts>[0]) {
  const read = readPositionFacts(facts);
  const kind = read && read.pos.board[read.square]?.kind;
  return read && (kind === "rook" || kind === "bishop" || kind === "queen") ? read : null;
}

// The come-backs a round asks: the first of its count that it can read.
// A question coming back keeps its own answer, nothing included.
function takeBack(level: Level, facts: RoundFacts) {
  return firstRead(facts.back, backQuestion, facts.count ?? level.questions).flatMap((from) => {
    const q = backQuestion(from);
    return q ? [{ ...q, from }] : [];
  });
}

export const challenge: Challenge = {
  built: true,
  id: "2.2.1",
  name: "Name what it attacks",
  trains: "Following a rook's, bishop's or queen's lines to the first piece on each.",
  needs: "1.3.1 L1. From L4, 1.3.1 L3.",
  levels: LEVELS,
  asks(level, facts) {
    return takeBack(level, facts).map((b) => b.from);
  },
  makeRound(level, random, facts) {
    const back = takeBack(level, facts);
    // Each fresh question attacks nothing one time in five, decided on its own.
    const fresh = Array.from({ length: (facts.count ?? level.questions) - back.length }, () => {
      const { pos, square } = makePosition(random, level, random.int(5) === 0);
      return whatItAttacks(level, pos, square);
    });
    return random.shuffle([...back.map((b) => whatItAttacks(level, b.pos, b.square)), ...fresh]);
  },
};
