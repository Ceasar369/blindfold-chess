// 5.1.1 Name what stands there now: its level table, its round maker, its
// judge, its mistake names and its told lines.
//
// Source: code/blueprint/docs/updating-a-position.md, 5.1.1.
//
// > Stand-in. Whether each move, and the question, is also read aloud. I
// > answer it later, with session 10. Every level plays in silence.

import { MISTAKE, nearMiss, NEAR_MISSES, WORDS } from "../../../near-misses/index.ts";
import { changes } from "../../../notation/index.ts";
import { firstLines, type FirstLine, type LinesPack, packOf } from "../../../packs/index.ts";
import { samePiece, sideWord, standsFromValue, standsValue, standsWords, THIRTEEN } from "../../../positions/index.ts";
import {
  type Ask,
  type Challenge,
  type Did,
  type Item,
  type Level,
  type Random,
  type RoundFacts,
  type Side,
  type Square,
  type Stands,
  type Step,
  type Told,
} from "../../../shape/index.ts";
import { bySquare } from "../../../squares/index.ts";
import { lastChange, moveWords, standsAfter } from "../../../thread/index.ts";
import { askedBacks, backOf, fromLine, lastOff, lostCount, lostKind, type Miss, pickLines, sequence, type Sequence, tookFrom } from "../sequences.ts";

const PASS_MARK =
  "Pass mark for 5.1.1 L1 to L4: the right answers in one round, and my average time per move. My practice sets it.";

// The card's level table, row by row. Sequences per round follow from it:
// 3 of 4 checkpoints at L1 and L2, 2 of 2 at L3, one game at L4.
const TABLE = [
  { id: "L1", path: "Name what stands there now, a checkpoint every full move.", halfMoves: 8, every: 2, shows: "An empty board, the square lit", how: "Piece picker", questions: 12, minutes: 4 },
  { id: "L2", path: "Name what stands there now, no board.", halfMoves: 8, every: 2, shows: "No board, the square named", how: "Piece picker", questions: 12, minutes: 5 },
  { id: "L3", path: "Name what stands there now, 12 half-moves.", halfMoves: 12, every: 6, shows: "No board, the square named", how: "Piece picker", questions: 12, minutes: 5 },
  { id: "L4", path: "Name what stands there now, through move 10.", halfMoves: 20, every: 10, shows: "No board, the square named", how: "Piece picker", questions: 10, minutes: 5 },
] as const;

type Row = (typeof TABLE)[number];

export const LEVELS: Level[] = TABLE.map((row) => ({
  id: row.id,
  path: row.path,
  questions: row.questions,
  minutes: row.minutes,
  seconds: null,
  seat: row.id === "L1" ? "round" : null,
  passMark: PASS_MARK,
  dials: [
    { name: "Half-moves", value: String(row.halfMoves) },
    { name: "A checkpoint after every", value: `${row.every} half-moves` },
    { name: "What shows with each question", value: row.shows },
    { name: "How I answer", value: row.how },
  ],
}));

// The card's mistakes, in its order. A wrong answer takes the first kind it fits.
export const MISTAKES = [
  "An old square",
  ...NEAR_MISSES.map((k) => MISTAKE[k]),
  "A piece left out",
  "The wrong side",
  "The wrong piece",
  "A piece where nothing stands",
  "Another answer",
];

function rowOf(level: Level): Row {
  const row = TABLE.find((r) => r.id === level.id);
  if (!row) throw new Error(`5.1.1 has no level ${level.id}.`);
  return row;
}

// ---------------------------------------------------------------------------
// The checkpoints

// A checkpoint: after so many half-moves, the squares it asks, in order.
export type Checkpoint = { after: number; squares: Square[] };

// The squares the moves from half-move `from` to `to` changed, each once.
function changedBy(seq: Sequence, from: number, to: number): Square[] {
  return [...new Set(seq.moves.slice(from - 1, to).flatMap((m) => changes(m)))];
}

// Each checkpoint asks one square for every two half-moves since the one
// before. Half of them, rounded up, are squares the moves since the last
// checkpoint changed; the rest, squares earlier moves changed, and none
// since. At the first checkpoint, all are its own. No square is asked twice in
// one sequence. A miss coming back: the checkpoint after its move asks a
// square that move changed. A draw that leaves a later checkpoint short is
// drawn again. null when the sequence cannot give them.
export function checkpoints(seq: Sequence, every: number, random: Random, miss: Miss | null = null): Checkpoint[] | null {
  for (let tries = 0; tries < 20; tries++) {
    const plan = drawCheckpoints(seq, every, random, miss);
    if (plan) return plan;
  }
  return null;
}

function drawCheckpoints(seq: Sequence, every: number, random: Random, miss: Miss | null): Checkpoint[] | null {
  const asked = new Set<Square>();
  const out: Checkpoint[] = [];
  for (let after = every; after <= seq.moves.length; after += every) {
    const from = after - every + 1;
    const n = every / 2;
    const ownCount = from === 1 ? n : Math.ceil(n / 2);
    const own = changedBy(seq, from, after);
    const earlier = from === 1 ? [] : changedBy(seq, 1, from - 1).filter((s) => !own.includes(s));
    const ownFree = own.filter((s) => !asked.has(s));
    const earlierFree = earlier.filter((s) => !asked.has(s));
    const picked: Square[] = [];
    if (miss && miss.ply >= from && miss.ply <= after) {
      const forced = changes(seq.moves[miss.ply - 1]!).filter((s) => ownFree.includes(s));
      if (!forced.length) return null;
      picked.push(random.pick(forced));
    }
    picked.push(...random.shuffle(ownFree.filter((s) => !picked.includes(s))).slice(0, ownCount - picked.length));
    picked.push(...random.shuffle(earlierFree).slice(0, n - ownCount));
    if (picked.length !== n) return null;
    for (const s of picked) asked.add(s);
    out.push({ after, squares: random.shuffle(picked) });
  }
  return out;
}

// ---------------------------------------------------------------------------
// The judge

// "Black's pawn stands on e5, since 4... dxe5." or "f3 is empty since 4. Nxd4."
function standsLine(seq: Sequence, square: Square, after: number): string {
  const right = standsAfter(seq.thread, square, after);
  const since = moveWords(seq.thread, lastChange(seq.thread, square, after)!.ply);
  return right ? `${standsWords(right)} stands on ${square}, since ${since}.` : `${square} is empty since ${since}.`;
}

export type Judged = { told: Told; miss: Miss | null };

// One answer to "What stands on e5 now?", after so many half-moves.
export function judge(seq: Sequence, square: Square, after: number, answer: Stands): Judged {
  const t = seq.thread;
  const right = standsAfter(t, square, after);
  const said = standsLine(seq, square, after);
  const since = lastChange(t, square, after)!.ply;
  if (samePiece(answer, right)) {
    return { told: { step: "told", verdict: "right", line: `Right: ${said}`, score: { right: true, mistakes: [], counts: {} } }, miss: null };
  }
  const wrong = (mistake: string, line: string, ply: number, lost = false): Judged => {
    const kind = lostKind(seq.moves[ply - 1]!);
    return {
      told: { step: "told", verdict: "wrong", line, score: { right: false, mistakes: [mistake], counts: lost ? { [lostCount(kind)]: 1 } : {} } },
      miss: { ply, kind },
    };
  };

  // An old square: my answer stood there before a later move changed it. The
  // move counted is the last one that took it off the square.
  const off = lastOff(t, square, answer, after);
  if (off !== null) {
    const by = moveWords(t, off);
    // > Stand-in. Empty answered for a square empty earlier: "e4 was empty until 1. e4."
    const why = answer
      ? `${standsWords(answer)} stood there until ${by} ${tookFrom(t, square, off) ? "took it" : "moved it"}.`
      : `${square} was empty until ${by}.`;
    return wrong("An old square", `No: ${said} ${why}`, off, true);
  }

  // Chapter 1's five, by where the piece I named stands now.
  if (answer) {
    const where = (Object.entries(t.frames[after]!) as [Square, { piece: Stands }][])
      .filter(([, at]) => samePiece(at.piece, answer))
      .flatMap(([there]) => {
        const kind = nearMiss(square, there);
        return kind ? [{ square: there, kind }] : [];
      })
      .sort((a, b) => NEAR_MISSES.indexOf(a.kind) - NEAR_MISSES.indexOf(b.kind) || bySquare(a.square, b.square));
    const near = where[0];
    if (near) return wrong(MISTAKE[near.kind], `No: ${said} ${standsWords(answer)} stands on ${near.square}, ${WORDS[near.kind]}.`, since);
  }
  // A miss says why, by its kind. "A piece where nothing stands" in the
  // card's own words: "d7 is empty since 2... d6, and no Black knight stood
  // there or stands one square off it."
  // > Stand-in. The reasons the card gives no words for: "d8 was never
  // > empty.", "It is Black's queen, not White's.", "It is a knight, not a
  // > bishop.", "Black's bishop never stood there."
  if (!answer) return wrong("A piece left out", `No: ${said} ${square} was never empty.`, since);
  if (right && right.kind === answer.kind) {
    return wrong("The wrong side", `No: ${said} It is ${sideWord(right.side)}'s ${right.kind}, not ${sideWord(answer.side)}'s.`, since);
  }
  if (right && right.side === answer.side) return wrong("The wrong piece", `No: ${said} It is a ${right.kind}, not a ${answer.kind}.`, since);
  if (!right) {
    const empty = `${square} is empty since ${moveWords(t, since)}`;
    return wrong("A piece where nothing stands", `No: ${empty}, and no ${sideWord(answer.side)} ${answer.kind} stood there or stands one square off it.`, since);
  }
  return wrong("Another answer", `No: ${said} ${standsWords(answer)} never stood there.`, since);
}

// ---------------------------------------------------------------------------
// One sequence

type Plan = { kind: "show"; ply: number } | { kind: "ask"; square: Square; after: number };

const CHOICES = THIRTEEN.map((s) => ({ words: standsWords(s), value: standsValue(s), stands: s }));

// One sequence: each move alone until I ask for the next, its checkpoints'
// questions one at a time, then the moves go on.
export function nameItem(level: Level, seq: Sequence, plan: Checkpoint[], side: Side): Item {
  const board = rowOf(level).id === "L1";
  const steps: Plan[] = [];
  for (let ply = 1; ply <= seq.moves.length; ply++) {
    steps.push({ kind: "show", ply });
    for (const cp of plan.filter((c) => c.after === ply)) for (const square of cp.squares) steps.push({ kind: "ask", square, after: ply });
  }
  const misses: Miss[] = [];
  let at = 0;
  let told = false;

  const ask = (square: Square): Ask => ({
    step: "ask",
    question: `What stands on ${square} now?`,
    board: board ? { seat: side, names: false, pieces: [], lit: [square] } : null,
    notes: [],
    input: { how: "choose", choices: CHOICES },
    seconds: null,
    reopened: false,
  });

  const stepAt = (i: number): Step => {
    const s = steps[i];
    if (!s) return { step: "done", back: misses.length ? { game: seq.game, misses } : null };
    if (s.kind === "ask") return ask(s.square);
    return {
      step: "show",
      move: moveWords(seq.thread, s.ply),
      ...(s.ply === 1 ? { lines: [fromLine(seq)] } : {}),
      button: "Next",
      time: "move",
    };
  };

  return {
    challenge: "5.1.1",
    level: level.id,
    questions: plan.reduce((n, c) => n + c.squares.length, 0),
    first: () => stepAt(0),
    next(did: Did): Step {
      const s = steps[at]!;
      if (s.kind === "ask" && !told) {
        if (did.did !== "answer") throw new Error("5.1.1 takes an answer.");
        let answer: Stands | undefined;
        if (did.answer.kind === "choice") answer = standsFromValue(did.answer.value);
        else if (did.answer.kind === "stands") answer = did.answer.stands;
        if (answer === undefined) throw new Error("5.1.1 takes one of the 13.");
        const judged = judge(seq, s.square, s.after, answer);
        if (judged.miss && !judged.told.score.right) misses.push(judged.miss);
        told = true;
        // The piece cards ring the right card after a wrong pick.
        return { ...judged.told, rightChoice: standsValue(standsAfter(seq.thread, s.square, s.after)) };
      }
      told = false;
      return stepAt(++at);
    },
  };
}

// ---------------------------------------------------------------------------
// The round

// How many sequences a round holds: its questions, a sequence asking several.
function sequencesOf(level: Level, facts: RoundFacts): number {
  const row = rowOf(level);
  const perSequence = (row.halfMoves / row.every) * (row.every / 2);
  return Math.ceil((facts.count ?? level.questions) / perSequence);
}

export const challenge: Challenge = {
  built: true,
  id: "5.1.1",
  name: "Name what stands there now",
  trains: "Finding what stands on one square, in a position held in my head while moves change it.",
  needs: "3.1.1 L6, 4.1.1 L1 and 1.1.1 L2. From L2, 4.1.1 L4.",
  levels: LEVELS,
  packs: ["lines.json"],
  // The come-backs a round asks: the first of its sequences' places, a miss no game can meet let go, the rest waiting.
  asks(level, facts) {
    return askedBacks(facts.back, sequencesOf(level, facts));
  },
  makeRound(level, random, facts) {
    const row = rowOf(level);
    const count = sequencesOf(level, facts);
    const pool = firstLines(packOf<LinesPack>(facts, "lines.json"), row.halfMoves).filter((l) => l.sans.length === row.halfMoves);
    const backs = facts.back.map(backOf).filter((b) => b !== null);
    const made = pickLines<FirstLine, { seq: Sequence; plan: Checkpoint[] }>(
      random,
      pool,
      count,
      backs,
      (line) => sequence(line),
      (seq, miss) => {
        const plan = checkpoints(seq, row.every, random, miss);
        return plan ? { seq, plan } : null;
      },
    );
    return made.map(({ seq, plan }) => nameItem(level, seq, plan, facts.side));
  },
};
