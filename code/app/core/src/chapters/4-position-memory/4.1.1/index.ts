// 4.1.1 Name what stands there: its level table, its round maker, its judge,
// its mistake names and its told lines. Its own: the five squares asked of a
// position, three holding a piece, at least one a pawn, and two empty squares
// next to a piece.
//
// Source: code/blueprint/docs/position-memory.md, 4.1.1.
//
// > Stand-in. Whether the question, and at L5 the position in words, is also
// > read aloud. I answer it later, with session 10. Every level plays in silence.

import { MISTAKE, NEAR_MISSES, nearMiss, type NearMiss, WORDS } from "../../../near-misses/index.ts";
import { inWords, piecesOf, type Position, samePiece, sideWord, standsFromValue, standsOn, standsValue, standsWords, startingPosition, THIRTEEN } from "../../../positions/index.ts";
import type { Ask, Challenge, Choice, Did, Facts, Item, Level, Random, Show, Square, Stands, Step, Told } from "../../../shape/index.ts";
import { isSquare, mirror, SQUARES, step } from "../../../squares/index.ts";
import { firstRead } from "../../back.ts";
import { drawReal, mirrored, PACKS, positionOf, positionsPack, type Real, realOf } from "../real.ts";

const PASS_MARK = "Pass mark for 4.1.1 L1 to L5: the right answers in one round, and my average look time. My practice sets it.";

// The card's level table, row by row.
const TABLE = [
  { id: "L1", path: "Name what stands there, the starting position.", position: "The starting position, no look", besides: 30, shows: "An empty board, the square lit", how: "Piece picker", minutes: 3 },
  { id: "L2", path: "Name what stands there, 4 pieces.", position: "Real, on a board, until I hide it", besides: 4, shows: "An empty board, the square lit", how: "Piece picker", minutes: 4 },
  { id: "L3", path: "Name what stands there, 7 pieces.", position: "Real, on a board, until I hide it", besides: 7, shows: "An empty board, the square lit", how: "Piece picker", minutes: 5 },
  { id: "L4", path: "Name what stands there, no board once it hides.", position: "Real, on a board, until I hide it", besides: 7, shows: "No board, the square named", how: "Piece picker", minutes: 5 },
  { id: "L5", path: "Name what stands there, read in words.", position: "Real, in words, until I hide them", besides: 7, shows: "No board, the square named", how: "Piece picker", minutes: 5 },
] as const;

export const LEVELS: Level[] = TABLE.map((row) => ({
  id: row.id,
  path: row.path,
  questions: 20,
  minutes: row.minutes,
  seconds: null,
  seat: null,
  passMark: PASS_MARK,
  dials: [
    { name: "The position", value: row.position },
    { name: "Pieces besides the kings", value: String(row.besides) },
    { name: "What shows with each question", value: row.shows },
    { name: "How I answer", value: row.how },
  ],
}));

const rowOf = (level: Level) => TABLE.find((r) => r.id === level.id)!;

// The card's mistakes. A wrong answer takes the first kind it fits.
export const MISTAKES = [
  ...Object.values(MISTAKE),
  "A piece left out",
  "The wrong side",
  "The wrong piece",
  "A piece where nothing stands",
  "Another answer",
];

// The 13 choices: White's king to pawn, Black's the same, then Empty. Each
// carries what it names, so the screen draws them as piece cards.
export const CHOICES: Choice[] = THIRTEEN.map((s) => ({ words: standsWords(s), value: standsValue(s), stands: s }));

// ---------------------------------------------------------------------------
// The judge

// "Black's pawn stands on f6", or "h5 is empty".
function holds(square: Square, s: Stands): string {
  return s ? `${standsWords(s)} stands on ${square}` : `${square} is empty`;
}

// The square one off the asked one where the piece I named stands, by the
// first of chapter 1's five that fits.
function nearest(pos: Position, asked: Square, named: Stands): { square: Square; kind: NearMiss } | null {
  if (!named) return null;
  let best: { square: Square; kind: NearMiss } | null = null;
  for (const p of piecesOf(pos)) {
    if (p.square === asked || !samePiece(p, named)) continue;
    const kind = nearMiss(asked, p.square);
    if (kind && (!best || NEAR_MISSES.indexOf(kind) < NEAR_MISSES.indexOf(best.kind))) best = { square: p.square, kind };
  }
  return best;
}

export function judgeStands(pos: Position, asked: Square, named: Stands): { right: boolean; mistakes: string[]; line: string } {
  const right = standsOn(pos, asked);
  if (samePiece(named, right)) {
    // > Stand-in. The card gives the right line for a piece: an empty square's follows it.
    return { right: true, mistakes: [], line: right ? `Right: ${standsWords(right)} stands on ${asked}.` : `Right: ${asked} is empty.` };
  }
  const head = `No: ${holds(asked, right)}.`;
  const off = nearest(pos, asked, named);
  if (off) return { right: false, mistakes: [MISTAKE[off.kind]], line: `${head} ${standsWords(named)} stands on ${off.square}, ${WORDS[off.kind]}.` };
  if (!named) return { right: false, mistakes: ["A piece left out"], line: `${head} You left it out.` };
  // > Stand-in. The lines the card gives no words for.
  if (right && right.kind === named.kind) return { right: false, mistakes: ["The wrong side"], line: `No: ${holds(asked, right)}, not ${sideWord(named.side)}'s.` };
  if (right && right.side === named.side) return { right: false, mistakes: ["The wrong piece"], line: `No: ${holds(asked, right)}, not ${standsWords(named)}.` };
  if (!right) return { right: false, mistakes: ["A piece where nothing stands"], line: head };
  return { right: false, mistakes: ["Another answer"], line: head };
}

// What an answer names: one of the 13 choices.
function namedBy(did: Did): Stands {
  if (did.did !== "answer") throw new Error("4.1.1 takes an answer.");
  const a = did.answer;
  if (a.kind === "choice") {
    const s = standsFromValue(a.value);
    if (s === undefined) throw new Error(`Not one of the 13: ${a.value}`);
    return s;
  }
  if (a.kind === "stands") return a.stands;
  throw new Error("4.1.1 takes one of 13.");
}

// ---------------------------------------------------------------------------
// The questions

// "What stands on f6?" At L1: "At the start, what stands on c8?"
function asking(level: Level, square: Square): Ask {
  const row = rowOf(level);
  const board = row.shows.startsWith("An empty board");
  return {
    step: "ask",
    question: level.id === "L1" ? `At the start, what stands on ${square}?` : `What stands on ${square}?`,
    board: board ? { seat: "white", names: false, pieces: [], lit: [square] } : null,
    notes: [],
    input: { how: "choose", choices: CHOICES },
    seconds: null,
    reopened: false,
  };
}

// L1: one square of the starting position, nothing to look at first.
export function atTheStart(level: Level, square: Square): Item {
  const pos = startingPosition();
  const ask = asking(level, square);
  let told: Told | null = null;
  return {
    challenge: "4.1.1",
    level: level.id,
    questions: 1,
    first: () => ask,
    next(did: Did): Step {
      if (told) return { step: "done", back: told.score.right ? null : { square } };
      const j = judgeStands(pos, square, namedBy(did));
      told = { step: "told", verdict: j.right ? "right" : "wrong", line: j.line, score: { right: j.right, mistakes: j.mistakes, counts: {} }, rightChoice: standsValue(standsOn(pos, square)) };
      return told;
    },
  };
}

// From L2: one real position, shown until I hide it, then five squares asked.
export type Asked = Real & { squares: Square[] };

export function namePositions(level: Level, real: Asked): Item {
  const pos = positionOf(real);
  const row = rowOf(level);
  const inWordsOnly = row.position.includes("in words");
  const show: Show = {
    step: "show",
    board: inWordsOnly ? undefined : { seat: "white", names: false, pieces: piecesOf(pos), lit: [] },
    words: inWordsOnly ? inWords(pos) : undefined,
    lines: [real.from],
    button: "Hide",
    time: "look",
  };
  const asks = real.squares.map((sq) => asking(level, sq));
  let at = -1; // -1: the Show; then each question
  let told: Told | null = null;
  let missed = false;
  return {
    challenge: "4.1.1",
    level: level.id,
    questions: real.squares.length,
    first: () => show,
    next(did: Did): Step {
      if (at === -1) {
        at = 0;
        return asks[0]!;
      }
      if (told) {
        told = null;
        at++;
        if (at < asks.length) return asks[at]!;
        // A position where I miss a question comes back mirrored, asking the mirrored squares.
        return { step: "done", back: missed ? backOf(real) : null };
      }
      const j = judgeStands(pos, real.squares[at]!, namedBy(did));
      if (!j.right) missed = true;
      told = { step: "told", verdict: j.right ? "right" : "wrong", line: j.line, score: { right: j.right, mistakes: j.mistakes, counts: {} }, rightChoice: standsValue(standsOn(pos, real.squares[at]!)) };
      return told;
    },
  };
}

function backOf(real: Asked): Facts {
  const m = mirrored(real);
  return { fen: m.fen, from: m.from, squares: real.squares.map(mirror) };
}

export function askedOf(facts: Facts): Asked | null {
  const real = realOf(facts);
  if (!real || !facts || typeof facts !== "object" || Array.isArray(facts)) return null;
  const squares = facts.squares;
  if (!Array.isArray(squares) || squares.length !== 5 || !squares.every((s) => typeof s === "string" && isSquare(s))) return null;
  return { ...real, squares: squares as Square[] };
}

// The five squares asked of a position: 3 holding a piece, at least 1 of them
// a pawn when it holds one, and 2 empty squares, each next to a piece.
export function fiveSquares(random: Random, pos: Position): Square[] {
  const pieces = piecesOf(pos);
  const pawns = random.shuffle(pieces.filter((p) => p.kind === "pawn"));
  const held = pawns.length ? [pawns[0]!.square, ...random.shuffle(pieces.filter((p) => p.square !== pawns[0]!.square)).slice(0, 2).map((p) => p.square)] : random.shuffle(pieces).slice(0, 3).map((p) => p.square);
  const near = SQUARES.filter((s) => !pos.board[s] && pieces.some((p) => isNext(s, p.square)));
  const empty = random.shuffle(near).slice(0, 2);
  return random.shuffle([...held, ...empty]);
}

function isNext(a: Square, b: Square): boolean {
  for (const [df, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]] as const) if (step(a, df, dr) === b) return true;
  return false;
}

// L1's squares: 16 of the 32 holding a piece, and 4 empty squares of ranks 3
// to 6, at random, in random order, none twice. Squares coming back take
// places among them.
export function startSquares(random: Random, count: number, back: readonly Square[]): Square[] {
  const start = startingPosition();
  const kept = [...new Set(back)].slice(0, count);
  const held = random.shuffle(SQUARES.filter((s) => start.board[s] && !kept.includes(s)));
  const empty = random.shuffle(SQUARES.filter((s) => "3456".includes(s[1]!) && !kept.includes(s)));
  const wantHeld = Math.round((count * 16) / 20);
  const fresh = [...held.slice(0, wantHeld), ...empty.slice(0, count - wantHeld)];
  return random.shuffle([...kept, ...random.shuffle(fresh).slice(0, count - kept.length)]);
}

// What comes back at L1: { square }. Anything else is passed over.
function squareOf(facts: Facts): Square | null {
  return facts && typeof facts === "object" && !Array.isArray(facts) && typeof facts.square === "string" && isSquare(facts.square) ? facts.square : null;
}

// ---------------------------------------------------------------------------

export const challenge: Challenge = {
  built: true,
  id: "4.1.1",
  name: "Name what stands there",
  trains: "Finding what stands on one square, in a position held in my head.",
  needs: "1.1.1 L2. From L4, 1.1.1 L3. From L5, 2.2.1 L4.",
  levels: LEVELS,
  packs: PACKS,
  // The come-backs a round asks. At L1 a square, each once, the first of its count; a position waits for
  // L2. From L2 a position, the first of its 4; a square waits for L1. A game's square stored twice counts for both.
  asks(level, facts) {
    const count = facts.count ?? level.questions;
    if (level.id === "L1") {
      const taken = [...new Set(facts.back.flatMap((f) => squareOf(f) ?? []))].slice(0, count);
      return facts.back.filter((f) => taken.includes(squareOf(f)!));
    }
    return firstRead(facts.back, (f) => { const a = askedOf(f); return a && positionOf(a); }, Math.ceil(count / 5));
  },
  makeRound(level, random, facts) {
    const count = facts.count ?? level.questions;
    if (level.id === "L1") {
      return startSquares(random, count, facts.back.flatMap((f) => squareOf(f) ?? [])).map((sq) => atTheStart(level, sq));
    }
    // From L2, a round's 20 questions are 4 positions, 5 questions each.
    const positions = Math.ceil(count / 5);
    const back = facts.back.map(askedOf).filter((a): a is Asked => a !== null && positionOf(a) !== null).slice(0, positions);
    const besides = rowOf(level).besides as 4 | 7;
    const fresh = drawReal(random, positionsPack(facts), besides, positions - back.length).map((r) => ({ ...r, squares: fiveSquares(random, positionOf(r)) }));
    return random.shuffle([...back, ...fresh]).map((a) => namePositions(level, a));
  },
};
