// 3.1.1 Read the move: its level table, its round maker, its judge, its
// mistake names and its told lines.
//
// Source: code/blueprint/docs/notation.md, 3.1.1.
//
// > Stand-in. Whether the move is also read aloud. I answer it later, with
// > session 10. Every level plays in silence.

import { MISTAKE, WORDS } from "../../../near-misses/index.ts";
import { changes, numbered, numberedLine } from "../../../notation/index.ts";
import { afterWords, type LinesPack, type OpeningsPack, packOf } from "../../../packs/index.ts";
import { fromFen, inWords, other, piecesOf, type Position, sideWord, startingPosition, toFen } from "../../../positions/index.ts";
import { legalMoves, legalProblem, type Move, playLine } from "../../../rules/index.ts";
import { gradeSet } from "../../../set-grader/index.ts";
import type { Ask, Challenge, Did, Facts, Item, Level, Random, RoundFacts, Side, Square, Step, Told } from "../../../shape/index.ts";
import { follow, type Thread } from "../../../thread/index.ts";
import { apartBy, lastLine, levelPlans, makeQuestion, type Question, questionFacts, questionOf } from "../moves.ts";
import { REVEALED } from "../../1-board-coordinates/question.ts";

const PASS_MARK = "Pass mark for 3.1.1 L1 to L6: the right answers in one round. My practice sets it.";

// The card's level table, row by row.
const TABLE = [
  { id: "L1", path: "Read the move, without captures.", see: "A board, every piece", from: "Set up", asked: "Moves without a capture", per: "1", besides: "4", how: "Click", questions: 10, minutes: 3 },
  { id: "L2", path: "Read the move, captures too.", see: "A board, every piece", from: "Set up", asked: "Captures too", per: "1", besides: "6", how: "Click", questions: 10, minutes: 3 },
  { id: "L3", path: "Read the move, castling, promotion and in passing too.", see: "A board, every piece", from: "Set up", asked: "Castling, promotion and a pawn taken in passing too", per: "1", besides: "6", how: "Click", questions: 10, minutes: 3 },
  { id: "L4", path: "Read the move, two pieces told apart.", see: "A board, every piece", from: "Set up", asked: "Two pieces told apart too", per: "1", besides: "6", how: "Click", questions: 10, minutes: 3 },
  { id: "L5", path: "Read the move, no board.", see: "No board until I reveal it, the position in words", from: "Set up", asked: "As at L4", per: "1", besides: "6", how: "Click", questions: 10, minutes: 5 },
  { id: "L6", path: "Read a numbered sequence, no board.", see: "No board until I reveal it, the position in words, renewed after each move", from: "Real play", asked: "Any, as the game played them", per: "4 half-moves, numbered", besides: "16 to 30", how: "Click", questions: 3, minutes: 5 },
] as const;

export const LEVELS: Level[] = TABLE.map((row) => ({
  id: row.id,
  path: row.path,
  questions: row.questions,
  minutes: row.minutes,
  seconds: null,
  seat: row.see.startsWith("A board") ? "round" : null,
  passMark: PASS_MARK,
  dials: [
    { name: "What I see", value: row.see },
    { name: "Where the position comes from", value: row.from },
    { name: "Moves asked", value: row.asked },
    { name: "Moves per question", value: row.per },
    { name: "Pieces besides the kings", value: row.besides },
    { name: "How I answer", value: row.how },
  ],
}));

// The card's mistakes, in its order. A wrong square takes the first kind it fits.
export const MISTAKES = [
  "A square left out",
  ...Object.values(MISTAKE),
  "A piece that cannot go there",
  "The other of two that can",
  "A piece of another kind",
  "The other side's castling",
  "A move read from an old position",
  "Another square",
];

const besidesOf = (level: Level) => Number(TABLE.find((r) => r.id === level.id)!.besides);

function listed(squares: readonly string[]): string {
  return squares.length < 2 ? squares.join("") : `${squares.slice(0, -1).join(", ")} and ${squares[squares.length - 1]}`;
}

function rookSquares(move: Move): [Square, Square] {
  const rank = move.from[1];
  return (move.castle === "king" ? [`h${rank}`, `f${rank}`] : [`a${rank}`, `d${rank}`]) as [Square, Square];
}

// ---------------------------------------------------------------------------
// The judge of one move's squares

// Where a move sits in a game: its number, for 3.1.1 L6, and the thread
// through the moves before it, for "a move read from an old position".
type Context = { pos: Position; move: Move; numbered: string | null; thread: Thread | null; ply: number };

type Verdict = { right: boolean; mistakes: string[]; why: string | null };

// "Nd5 is the knight on f6: f6 and d5", the first half of a wrong line.
function explain(c: Context): string {
  const { move } = c;
  const squares = changes(move);
  const side = sideWord(move.side);
  if (move.castle) {
    const [rf, rt] = rookSquares(move);
    return `${c.numbered ?? move.san} moves ${side}'s king from ${move.from} to ${move.to}, and the rook from ${rf} to ${rt}`;
  }
  if (move.enPassant) return `${c.numbered ?? move.san} takes ${sideWord(other(move.side))}'s pawn on ${squares[2]} in passing: ${listed(squares)}`;
  const pair = `${move.from} and ${move.to}`;
  // > Stand-in. The lines the card gives no words for: a promotion, a piece's
  // > capture, a move told apart by its rank.
  if (c.numbered) {
    const taking = move.captured ? ` taking on ${move.to}` : "";
    const becoming = move.promotion ? `${taking ? " and" : ""} becoming a ${move.promotion}` : "";
    return `${c.numbered} is ${side}'s ${move.kind} on ${move.from}${taking}${becoming}: ${pair}`;
  }
  if (move.promotion) {
    return move.captured
      ? `${move.san} is the pawn on ${move.from} taking on ${move.to} and becoming a ${move.promotion}: ${pair}`
      : `${move.san} is the pawn on ${move.from} becoming a ${move.promotion}: ${pair}`;
  }
  if (move.kind === "pawn" && move.captured) return `${move.san} is the pawn on the ${move.from[0]}-file taking on ${move.to}: ${pair}`;
  const by = apartBy(move.san);
  if (by.file) return `${move.san} is the ${move.kind} on the ${by.file}-file: ${pair}`;
  if (by.rank) return `${move.san} is the ${move.kind} on rank ${by.rank}: ${pair}`;
  if (move.captured) return `${move.san} is the ${move.kind} on ${move.from} taking on ${move.to}: ${pair}`;
  return `${move.san} is the ${move.kind} on ${move.from}: ${pair}`;
}

// "Right: f6 and d5. The knight leaves f6 and lands on d5."
// > Stand-in. The card gives the right line for a move only. A capture, castling,
// > a pawn taken in passing and a promotion follow its pattern.
function rightLine(move: Move): string {
  const squares = changes(move);
  const head = `Right: ${listed(squares)}.`;
  if (move.castle) {
    const [rf, rt] = rookSquares(move);
    return `${head} The king goes from ${move.from} to ${move.to}, and the rook from ${rf} to ${rt}.`;
  }
  if (move.enPassant) return `${head} The pawn leaves ${move.from}, lands on ${move.to}, and takes the pawn on ${squares[2]}.`;
  if (move.promotion) return `${head} The pawn leaves ${move.from} and becomes a ${move.promotion} on ${move.to}.`;
  if (move.captured) return `${head} The ${move.kind} leaves ${move.from} and takes on ${move.to}.`;
  return `${head} The ${move.kind} leaves ${move.from} and lands on ${move.to}.`;
}

// The ply's side and move number, counted from the thread's first position.
function moveNumberAt(thread: Thread, ply: number): number {
  const index = ply - 1 + (thread.start.turn === "white" ? 0 : 1);
  return thread.start.moveNumber + Math.floor(index / 2);
}

// Where the moving piece stood on a square before, and the move that took it off.
function oldSquare(c: Context, square: Square): number | null {
  if (!c.thread) return null;
  const before = c.ply - 1;
  const id = c.thread.frames[before]?.[c.move.from]?.id;
  if (id === undefined) return null;
  for (let j = before - 1; j >= 0; j--) {
    if (c.thread.frames[j]![square]?.id === id) {
      for (let k = j + 1; k <= before; k++) if (c.thread.frames[k]![square]?.id !== id) return moveNumberAt(c.thread, k);
    }
  }
  return null;
}

export function judgeSquares(c: Context, given: readonly Square[]): Verdict {
  const { pos, move } = c;
  const right = changes(move);
  const grade = gradeSet(given, right);
  if (grade.right) return { right: true, mistakes: [], why: null };
  const legal = legalMoves(pos);
  const mistakes: string[] = [];
  const whys: string[] = [];
  const add = (kind: string, why: string) => {
    if (!mistakes.includes(kind)) mistakes.push(kind);
    whys.push(why);
  };
  const otherWing = move.castle
    ? (() => {
        const rank = move.from[1];
        return (move.castle === "king" ? [`c${rank}`, `a${rank}`, `d${rank}`] : [`g${rank}`, `h${rank}`, `f${rank}`]) as Square[];
      })()
    : [];
  for (const a of grade.added) {
    const piece = pos.board[a];
    const pair = grade.pairs.find((p) => p.added === a);
    const old = oldSquare(c, a);
    if (pair) add(MISTAKE[pair.kind], `${a} is ${WORDS[pair.kind]} ${pair.leftOut}.`);
    else if (piece && piece.side === move.side && piece.kind === move.kind && a !== move.from) {
      const can = legal.some((m) => m.from === a && m.to === move.to);
      if (can) {
        const by = apartBy(move.san).rank ? "rank" : "file";
        add("The other of two that can", `The ${piece.kind} on ${a} reaches ${move.to} too, so the move names its ${by}.`);
      } else add("A piece that cannot go there", `The ${piece.kind} on ${a} cannot reach ${move.to}.`);
    } else if (piece && piece.side === move.side && piece.kind !== move.kind && !(move.castle && piece.kind === "rook")) {
      // > Stand-in. The card names this kind, not its line.
      const tail = move.kind === "pawn" ? "a small letter names a pawn's file." : `${move.san[0]} is the ${move.kind}.`;
      add("A piece of another kind", `${sideWord(piece.side)}'s ${piece.kind} on ${a} does not move: ${tail}`);
    } else if (otherWing.includes(a)) add("The other side's castling", `${move.san} castles toward ${rookSquares(move)[0]}.`);
    else if (old !== null) add("A move read from an old position", `That ${move.kind} left ${a} at move ${old}.`);
    // > Stand-in. The line for another square.
    else add("Another square", `${a} does not change.`);
  }
  if (grade.leftOut.length > grade.added.length) {
    mistakes.unshift("A square left out");
    if (!grade.added.length) whys.push(`You left out ${listed(grade.leftOut)}.`);
  }
  return { right: false, mistakes, why: whys[0] ?? `You left out ${listed(grade.leftOut)}.` };
}

// ---------------------------------------------------------------------------
// L1 to L5: one move, from a set-up position

// The squares in an answer, clicked on the board.
function squaresOf(did: Did): Square[] {
  if (did.did !== "answer") throw new Error("3.1.1 takes an answer.");
  const a = did.answer;
  if (a.kind === "squares") return a.squares;
  throw new Error("3.1.1 takes squares, clicked.");
}

export function readTheMove(level: Level, seat: Side, q: Question): Item {
  const board = level.seat !== null;
  const ask: Ask = {
    step: "ask",
    question: `${sideWord(q.move.side)} plays ${q.move.san}. Which squares does it change?`,
    board: board ? { seat, names: false, pieces: piecesOf(q.pos), lit: [] } : null,
    words: board ? undefined : inWords(q.pos),
    notes: [lastLine(q)].filter((n): n is string => n !== null),
    input: { how: "click-many", none: null, ...(board ? {} : { reveal: REVEALED }) },
    seconds: null,
    reopened: false,
  };
  let told: Told | null = null;
  return {
    challenge: "3.1.1",
    level: level.id,
    questions: 1,
    first: () => ask,
    next(did: Did): Step {
      if (told) return { step: "done", back: told.score.right ? null : questionFacts(q) };
      const given = squaresOf(did);
      const v = judgeSquares({ pos: q.pos, move: q.move, numbered: null, thread: null, ply: 1 }, given);
      // > Stand-in. The card says nothing shows again: the board lights the
      // > squares the move changes.
      const again = ask.board ? { board: { ...ask.board, lit: changes(q.move) } } : undefined;
      told = v.right
        ? { step: "told", verdict: "right", line: rightLine(q.move), again, score: { right: true, mistakes: [], counts: {} } }
        : { step: "told", verdict: "wrong", line: `No: ${explain({ pos: q.pos, move: q.move, numbered: null, thread: null, ply: 1 })}. ${v.why}`, again, score: { right: false, mistakes: v.mistakes, counts: {} } };
      return told;
    },
  };
}

// ---------------------------------------------------------------------------
// L6: a numbered sequence of 4 half-moves from real play

// A sequence's own facts. start: the first position known, the starting
// position for an opening's line. before: the moves from it to the
// sequence. from: where it comes from, in words.
export type Sequence = { start: string; before: string[]; sans: string[]; from: string };

export function sequenceOf(facts: Facts): Sequence | null {
  if (!facts || typeof facts !== "object" || Array.isArray(facts)) return null;
  const { start, before, sans, from } = facts;
  const strings = (x: unknown): x is string[] => Array.isArray(x) && x.every((s) => typeof s === "string");
  if (typeof start !== "string" || !strings(before) || !strings(sans) || sans.length !== 4 || typeof from !== "string") return null;
  try {
    const pos = fromFen(start);
    if (legalProblem(pos) !== null) return null;
    playLine(pos, [...before, ...sans]);
  } catch {
    return null;
  }
  return { start, before, sans, from };
}

// "Move 2 of 4: 4. Nxd4."
// > Stand-in. The card says I answer each move in turn. Which move I answer
// > shows as a note, "Move 2 of 4: 4. Nxd4.", under the words.
export function readTheSequence(level: Level, seq: Sequence): Item {
  const first = fromFen(seq.start);
  const all = playLine(first, [...seq.before, ...seq.sans]);
  const thread = follow(first, all.moves);
  const at = seq.before.length;
  const startPos = at === 0 ? first : all.positions[at - 1]!;
  const moves = all.moves.slice(at);
  const positions = [startPos, ...all.positions.slice(at)];
  const line = numberedLine(startPos, moves);
  const tags = moves.map((m, i) => numbered(m.san, m.side, positions[i]!.moveNumber));
  // Before a pawn taken in passing, the move just played is named: the one
  // before it in the sequence, or, for its first move, the one the game
  // played before, read from where a pawn may be taken.
  const lastMove = (i: number): string | null => {
    const m = moves[i]!;
    if (!m.enPassant) return null;
    const who = sideWord(other(m.side));
    if (i > 0) return `${who}'s last move: ${moves[i - 1]!.from} to ${moves[i - 1]!.to}.`;
    const ep = positions[0]!.enPassant;
    return ep ? `${who}'s last move: ${ep[0]}${ep[1] === "3" ? "2" : "7"} to ${ep[0]}${ep[1] === "3" ? "4" : "5"}.` : null;
  };
  const asks: Ask[] = moves.map((_, i) => ({
    step: "ask",
    question: `${line}. Which squares does each move change?`,
    board: null,
    words: inWords(positions[i]!),
    notes: [seq.from, lastMove(i), `Move ${i + 1} of 4: ${tags[i]}.`].filter((n): n is string => n !== null),
    input: { how: "click-many", none: null, reveal: REVEALED },
    seconds: null,
    reopened: false,
  }));
  const answers: Verdict[] = [];
  let told: Told | null = null;
  return {
    challenge: "3.1.1",
    level: level.id,
    questions: 1,
    // A sequence left when the minutes run out is a miss: its 4 moves asked, none right.
    unasked: { "Moves right": 0, "Moves asked": 4 },
    first: () => asks[0]!,
    next(did: Did): Step {
      if (told) return { step: "done", back: told.score.right ? null : { ...seq } };
      const i = answers.length;
      const given = squaresOf(did);
      const context = (k: number): Context => ({ pos: positions[k]!, move: moves[k]!, numbered: tags[k]!, thread, ply: at + k + 1 });
      answers.push(judgeSquares(context(i), given));
      if (answers.length < 4) return asks[answers.length]!;
      const rightMoves = answers.filter((a) => a.right).length;
      const counts = { "Moves right": rightMoves, "Moves asked": 4 };
      const again = { words: inWords(all.positions.at(-1)!), moves: line };
      if (rightMoves === 4) {
        // > Stand-in. The card gives no right line for a sequence.
        told = { step: "told", verdict: "right", line: "Right: all 4 moves.", again, score: { right: true, mistakes: [], counts } };
        return told;
      }
      const k = answers.findIndex((a) => !a.right);
      // > Stand-in. With more than one move wrong: "2 of the 4 moves were right."
      const tail = rightMoves === 3 ? "The other three moves were right." : `${rightMoves} of the 4 moves were right.`;
      const mistakes = [...new Set(answers.flatMap((a) => a.mistakes))];
      told = { step: "told", verdict: "wrong", line: `No: ${explain(context(k))}. ${answers[k]!.why} ${tail}`, again, score: { right: false, mistakes, counts } };
      return told;
    },
  };
}

// Sequences drawn for a round: 1 from move 1, from the Lichess opening list's
// named lines, and the rest from a Black move after White's move 3 to 15,
// from real games.
// > Stand-in. The sequence from move 1 is a named line's first 4 half-moves,
// > never a game's.
// The packs reach the site as their own files, fetched when the challenge
// first plays, and are handed in with the round's facts.
function drawSequences(random: Random, count: number, lines: LinesPack, openings: OpeningsPack): Sequence[] {
  const start = toFen(startingPosition());
  const out: Sequence[] = [];
  const named = random.pick(openings.list.filter((l) => l.sans.length >= 4));
  out.push({ start, before: [], sans: named.sans.slice(0, 4), from: `From the ${named.name}.` });
  for (const m of random.shuffle(lines.mid)) {
    if (out.length >= count) break;
    const pos = fromFen(m.fen);
    out.push({
      start: m.fen,
      before: [],
      sans: m.sans,
      from: `From a Lichess game of January 2013, players rated ${m.white} and ${m.black}, ${afterWords({ moveNumber: pos.moveNumber, moved: "white" })}.`,
    });
  }
  return random.shuffle(out.slice(0, count));
}

// ---------------------------------------------------------------------------

export const challenge: Challenge = {
  built: true,
  id: "3.1.1",
  name: "Read the move",
  trains: "Turning a move's notation into the squares it changes.",
  needs: "1.1.1 L2, 2.1.1 L2, 2.2.1 L2 and 2.3.2 L1. From L5, 2.1.1 L4 and 2.2.1 L4.",
  levels: LEVELS,
  // L6's real play: games' lines, and the opening list's named lines.
  packs: ["lines.json", "openings.json"],
  // The questions coming back that a round asks. At L6 a sequence; at L1 to L5
  // a position and a move, and a sequence waits for an L6 round.
  asks(level, facts) {
    return level.id === "L6" ? takeSequences(level, facts).map((b) => b.from) : takeQuestions(level, facts).back.map((b) => b.from);
  },
  seats(level, facts) {
    return level.id === "L6" ? facts.side : takeQuestions(level, facts).seat;
  },
  makeRound(level, random, facts) {
    const count = facts.count ?? level.questions;
    if (level.id === "L6") {
      const back = takeSequences(level, facts).map((b) => b.sequence);
      const fresh = back.length >= count ? [] : drawSequences(random, count - back.length, packOf<LinesPack>(facts, "lines.json"), packOf<OpeningsPack>(facts, "openings.json"));
      return random.shuffle([...back, ...fresh]).map((s) => readTheSequence(level, s));
    }
    const { seat, mover, back } = takeQuestions(level, facts);
    const fresh = levelPlans(random, level.id, false)
      .slice(0, count - back.length)
      .map((plan) => makeQuestion(random, mover, besidesOf(level), plan));
    return random.shuffle([...back.map((b) => b.question), ...fresh]).map((q) => readTheMove(level, seat, q));
  },
};

// L6's sequences coming back, each with the facts it was stored as.
function takeSequences(level: Level, facts: RoundFacts): { sequence: Sequence; from: Facts }[] {
  const all = facts.back.flatMap((from) => {
    const sequence = sequenceOf(from);
    return sequence ? [{ sequence, from }] : [];
  });
  return all.slice(0, facts.count ?? level.questions);
}

// The round's side is mine, kept for the whole round; each move is my
// opponent's. L1 to L5's questions coming back, each with the facts it was
// stored as.
// > Stand-in. A question coming back is the same position and the same
// > move, so it keeps its side: the first one back sets the side of a
// > round of its own level. A mixed round keeps the side it drew, and a
// > question seated on the other side waits, as does one past the count.
function takeQuestions(level: Level, facts: RoundFacts): { seat: Side; mover: Side; back: { question: Question; from: Facts }[] } {
  const all = facts.back.flatMap((from) => {
    const question = questionOf(from);
    return question ? [{ question, from }] : [];
  });
  const seat = facts.count === undefined && all.length ? other(all[0]!.question.move.side) : facts.side;
  const mover = other(seat);
  return { seat, mover, back: all.filter((b) => b.question.move.side === mover).slice(0, facts.count ?? level.questions) };
}
