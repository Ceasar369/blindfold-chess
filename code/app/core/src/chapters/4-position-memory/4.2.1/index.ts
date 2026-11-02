// 4.2.1 Rebuild the position: its level table, its round maker, its judge,
// its mistake names and its told lines.
//
// Source: code/blueprint/docs/position-memory.md, 4.2.1.
//
// > Stand-in. Whether the position in words, at L4 and L5, is also read
// > aloud. I answer it later, with session 10. Every level plays in silence.

import { MISTAKE, WORDS } from "../../../near-misses/index.ts";
import { besidesKings, fromPieces, inWords, KINDS, piecesOf, type Position, sideWord, standsWords } from "../../../positions/index.ts";
import { gradePosition, type PositionGrade } from "../../../position-grader/index.ts";
import type { Ask, BoardView, Cell, Challenge, Did, Facts, Item, Level, Placed, Show, Step, Told } from "../../../shape/index.ts";
import { bySquare } from "../../../squares/index.ts";
import { firstRead } from "../../back.ts";
import { REVEALED } from "../../1-board-coordinates/question.ts";
import { drawReal, mirrored, PACKS, positionOf, positionsPack, type Real, realOf } from "../real.ts";

const PASS_MARK =
  "Pass mark for 4.2.1 L1 to L6: the positions rebuilt whole and the pieces right in one round, and my average look time. My practice sets it.";

// The card's level table, row by row.
const TABLE = [
  { id: "L1", path: "Rebuild the position, 4 pieces.", reaches: "On a board, until I hide it", besides: 4, how: "Place them", questions: 5, minutes: 4 },
  { id: "L2", path: "Rebuild the position, 7 pieces.", reaches: "On a board, until I hide it", besides: 7, how: "Place them", questions: 4, minutes: 5 },
  { id: "L3", path: "Rebuild the position, 10 pieces.", reaches: "On a board, until I hide it", besides: 10, how: "Place them", questions: 3, minutes: 5 },
  { id: "L4", path: "Rebuild the position, read in words, 4 pieces.", reaches: "In words, until I hide them", besides: 4, how: "Place them", questions: 5, minutes: 5 },
  { id: "L5", path: "Rebuild the position, read in words, 7 pieces.", reaches: "In words, until I hide them", besides: 7, how: "Place them", questions: 4, minutes: 5 },
  { id: "L6", path: "Rebuild the position, no board until I reveal it.", reaches: "On a board, until I hide it", besides: 7, how: "Place them, after Reveal board", questions: 3, minutes: 5 },
] as const;

export const LEVELS: Level[] = TABLE.map((row) => ({
  id: row.id,
  path: row.path,
  questions: row.questions,
  minutes: row.minutes,
  seconds: null,
  seat: null,
  passMark: PASS_MARK,
  dials: [
    { name: "How the position reaches me", value: row.reaches },
    { name: "Pieces besides the kings", value: String(row.besides) },
    { name: "How I answer", value: row.how },
  ],
}));

const rowOf = (level: Level) => TABLE.find((r) => r.id === level.id)!;

// The card's mistakes, in its order. One answer can show several.
export const MISTAKES = [
  ...Object.values(MISTAKE),
  "Two pieces swapped",
  "The wrong piece",
  "The wrong side",
  "A piece left out",
  "A piece added",
  "Another square",
];

// ---------------------------------------------------------------------------
// The judge

function boardOf(pieces: readonly Placed[]): Position["board"] {
  return fromPieces(pieces).board;
}

// The card's order of kinds, a piece's in the pages' order.
const byKind = (a: Placed, b: Placed) => KINDS.indexOf(a.kind) - KINDS.indexOf(b.kind);

// Each mistake an answer shows, with its why, in the card's order.
export function mistakesOf(g: PositionGrade): [string, string][] {
  const found: [string, string][] = [];
  for (const [a, b] of g.swaps) {
    const wa = g.wrong.find((w) => w.square === a)!;
    const wb = g.wrong.find((w) => w.square === b)!;
    const [first, second] = [{ ...wa.right!, square: a }, { ...wb.right!, square: b }].sort(byKind) as [Placed, Placed];
    const its = first.side === second.side ? "its" : `${sideWord(second.side)}'s`;
    found.push(["Two pieces swapped", `${standsWords(first)} stands on ${first.square}, and ${its} ${second.kind} on ${second.square}: you swapped them.`]);
  }
  const swapped = new Set(g.swaps.flat());
  const belongs = new Set(g.pairs.map((p) => p.belongs));
  for (const p of g.pairs) {
    if (p.kind) found.push([MISTAKE[p.kind], `${standsWords(p.piece)} stands on ${p.belongs}, not ${p.placed}: ${WORDS[p.kind]}.`]);
    // > Stand-in. The line for another square.
    else found.push(["Another square", `${standsWords(p.piece)} stands on ${p.belongs}, not ${p.placed}.`]);
  }
  const placedAt = new Set(g.pairs.map((p) => p.placed));
  for (const w of g.wrong) {
    if (swapped.has(w.square) || placedAt.has(w.square)) continue;
    const { built, right, square } = w;
    // > Stand-in. The lines the card gives no words for: the wrong piece, a piece added.
    if (built && right && built.side === right.side) found.push(["The wrong piece", `${square} holds ${standsWords(right)}, not its ${built.kind}: the wrong piece.`]);
    else if (built && right && built.kind === right.kind) found.push(["The wrong side", `${square} holds ${standsWords(right)}, not ${sideWord(built.side)}'s: the wrong side.`]);
    else if (built && right) found.push(["Another square", `${square} holds ${standsWords(right)}, not ${standsWords(built)}.`]);
    else if (right && !belongs.has(square)) found.push(["A piece left out", `You left out ${standsWords(right)} on ${square}.`]);
    else if (built) found.push(["A piece added", `Nothing stands on ${square}: you added ${standsWords(built)}.`]);
  }
  const order = (k: string) => MISTAKES.indexOf(k);
  return found.sort((a, b) => order(a[0]) - order(b[0]));
}

export function judgeRebuilt(pos: Position, built: readonly Placed[]): { right: boolean; mistakes: string[]; line: string; piecesRight: number; pieces: number } {
  const g = gradePosition(boardOf(built), pos.board);
  if (g.whole) return { right: true, mistakes: [], line: `Right: all ${g.pieces} pieces.`, piecesRight: g.piecesRight, pieces: g.pieces };
  const found = mistakesOf(g);
  return {
    right: false,
    mistakes: [...new Set(found.map(([k]) => k))],
    line: `No: ${g.piecesRight} of ${g.pieces}. ${found[0]?.[1] ?? ""}`.trim(),
    piecesRight: g.piecesRight,
    pieces: g.pieces,
  };
}

// The board shown after an answer: my reconstruction, each cell marked, found
// square by square against the position. Right: my piece is the right piece
// there. Wrong: my piece stands there and another piece belongs there. Extra:
// my piece stands where nothing belongs. Missing: a piece belongs there and I
// put none; the right piece comes with the cell, to be drawn ghosted. A square
// empty in both has no cell.
export function markedBoard(pos: Position, built: readonly Placed[]): BoardView {
  const mine = fromPieces(built);
  const g = gradePosition(mine.board, pos.board);
  const off = new Map(g.wrong.map((w) => [w.square, w]));
  const pieces = piecesOf(mine);
  const cells: Cell[] = pieces.filter((p) => !off.has(p.square)).map((p) => ({ square: p.square, state: "right" }));
  for (const w of g.wrong) {
    cells.push({ square: w.square, state: w.verdict === "left out" ? "missing" : w.verdict === "added" ? "extra" : "wrong" });
    if (w.verdict === "left out") pieces.push({ ...w.right!, square: w.square });
  }
  return { seat: "white", names: false, pieces, lit: [], cells: cells.sort((a, b) => bySquare(a.square, b.square)) };
}

// ---------------------------------------------------------------------------
// One question: one position

// The question shows with the position, and again once it is hidden.
const QUESTION = "Rebuild this position.";

export function rebuild(level: Level, real: Real): Item {
  const pos = positionOf(real);
  const row = rowOf(level);
  const onBoard = row.reaches.startsWith("On a board");
  const show: Show = {
    step: "show",
    board: onBoard ? { seat: "white", names: false, pieces: piecesOf(pos), lit: [] } : undefined,
    words: onBoard ? undefined : inWords(pos),
    lines: [real.from],
    question: QUESTION,
    button: "Hide",
    time: "look",
  };
  // L6: seen on a board, then no board until I reveal an empty one to place on.
  const hidden = row.id === "L6";
  const ask: Ask = {
    step: "ask",
    question: QUESTION,
    board: hidden ? null : { seat: "white", names: false, pieces: [], lit: [] },
    notes: [],
    input: { how: "place", ...(hidden ? { reveal: REVEALED } : {}) },
    seconds: null,
    reopened: false,
  };
  let at: "show" | "ask" | "told" = "show";
  let told: Told | null = null;
  return {
    challenge: "4.2.1",
    level: level.id,
    questions: 1,
    // A question left when the minutes run out is a miss, and its pieces count as left out.
    unasked: { "Pieces right": 0, "Pieces in all": piecesOf(pos).length },
    first: () => show,
    next(did: Did): Step {
      if (at === "show") {
        at = "ask";
        return ask;
      }
      // A missed position comes back at the level it was missed at.
      if (at === "told") return { step: "done", back: told!.score.right ? null : { ...mirrored(real), level: level.id } };
      if (did.did !== "answer") throw new Error("4.2.1 takes an answer.");
      if (did.answer.kind !== "position") throw new Error("4.2.1 takes placed pieces.");
      const j = judgeRebuilt(pos, did.answer.pieces);
      at = "told";
      // After each answer, one board: my reconstruction, each cell marked. A position read in words shows again in words.
      const again = { board: markedBoard(pos, did.answer.pieces), ...(onBoard ? {} : { words: inWords(pos) }) };
      told = {
        step: "told",
        verdict: j.right ? "right" : "wrong",
        line: j.line,
        again,
        score: { right: j.right, mistakes: j.mistakes, counts: { "Pieces right": j.piecesRight, "Pieces in all": j.pieces } },
      };
      return told;
    },
  };
}

export const challenge: Challenge = {
  built: true,
  id: "4.2.1",
  name: "Rebuild the position",
  trains: "Holding a whole position I have never seen, once it hides.",
  needs: "1.1.1 L2. From L4, 2.2.1 L4.",
  levels: LEVELS,
  packs: PACKS,
  // The positions coming back that a round asks: those missed at its level, the first of its count. The
  // rest wait, and so do those of other levels: they lose no round.
  asks(level, facts) {
    return firstRead(facts.back, hereOf(level), facts.count ?? level.questions);
  },
  makeRound(level, random, facts) {
    const count = facts.count ?? level.questions;
    const back = firstRead(facts.back, hereOf(level), count).map((f) => hereOf(level)(f)!);
    const fresh = drawReal(random, positionsPack(facts), rowOf(level).besides, count - back.length);
    return random.shuffle([...back, ...fresh]).map((r) => rebuild(level, r));
  },
};

// The position back from a come-back's facts when a round of this level asks it, or null. It keeps the level
// it was missed at. A come-back stored with no level has none: it is asked at a level whose count of pieces
// besides the kings is its own, 4 at L1 and L4, 7 at L2, L5 and L6, 10 at L3.
function hereOf(level: Level): (facts: Facts) => Real | null {
  return (facts) => {
    const real = realOf(facts);
    if (!real) return null;
    const missedAt = (facts as { level?: unknown }).level;
    if (missedAt === undefined) return besidesKings(positionOf(real)) === rowOf(level).besides ? real : null;
    return missedAt === level.id ? real : null;
  };
}
