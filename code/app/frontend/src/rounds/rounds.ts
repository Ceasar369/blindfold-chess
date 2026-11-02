// Block 15, Rounds: plays a chapter's path. It makes a round from one step of
// the path, or from one level on no path, a trial's; draws the round's side
// once; mixes in what comes back; fills the score sheet; keeps the come-back
// rule and where I stand on each chapter's path.
//
// It draws, times and stores nothing. The runner times and hands the times
// in; the progress record stores. Tested with no screen: rounds.test.ts.
//
// Next plays the levels in the chapter's own order, never the path's: nextOf.
// > Stand-in. No level is locked. Where I stand moves forward
// > only: playing a step later than where I stand moves it there, playing an
// > earlier one, or the same one, moves nothing. A level is exactly one step,
// > so a level I pick plays as its step.
// > Stand-in. A later step moves me there even when I skipped the steps
// > between.

import {
  CHAPTERS,
  seeded,
  type Challenge,
  type Chapter,
  type Facts,
  type Item,
  type Level,
  type Packs,
  type PathStep,
  type RoundFacts,
  type Score,
  type Side,
} from "../core.ts";

// ---------------------------------------------------------------------------
// What Rounds keeps

// An item I missed, and how many of my next rounds holding its challenge it
// still comes back in.
export type Back = { challenge: string; facts: Facts; rounds: number };

// My come-back list, and where I stand on each chapter's path: the index of
// its step, by chapter number.
export type Progress = { back: Back[]; places: Record<string, number> };

export const NO_PROGRESS: Progress = { back: [], places: {} };

// How many of my next rounds holding its challenge a missed item comes back in.
export const COMES_BACK = 2;

// ---------------------------------------------------------------------------
// Finding what a path names

export function chapterOf(n: number): Chapter {
  const c = CHAPTERS.find((x) => x.n === n);
  if (!c) throw new Error(`No chapter ${n}.`);
  return c;
}

export function challengeOf(id: string): Challenge | null {
  for (const ch of CHAPTERS)
    for (const s of ch.sections)
      for (const c of s.challenges) if (c.id === id) return c.built ? c : null;
  return trials.find((c) => c.id === id) ?? null;
}

// Trial challenges: fixtures that play each input, added by the dev server
// alone (src/fixtures/trials.ts). They sit on no path, so no round of theirs
// reaches the record.
const trials: Challenge[] = [];

export function addTrials(cs: Challenge[]) {
  trials.push(...cs.filter((c) => !trials.some((t) => t.id === c.id)));
}

export function levelOf(challenge: Challenge, id: string): Level {
  const l = challenge.levels.find((x) => x.id === id);
  if (!l) throw new Error(`${challenge.id} has no ${id}.`);
  return l;
}

// The challenges a path step plays.
export function stepChallenges(step: PathStep): string[] {
  return step.kind === "level" ? [step.challenge] : step.parts.map((p) => p.challenge);
}

// A step plays once every challenge it names is built.
export function playable(step: PathStep): boolean {
  return stepChallenges(step).every((id) => challengeOf(id) !== null);
}

// Where I stand on a chapter's path: its step's index.
export function placeOf(progress: Progress, n: number): number {
  const at = progress.places[String(n)] ?? 0;
  return Math.min(Math.max(at, 0), chapterOf(n).path.length - 1);
}

// The path step that plays one challenge's level, or -1.
export function pathIndex(n: number, challenge: string, level: string): number {
  return chapterOf(n).path.findIndex((s) => s.kind === "level" && s.challenge === challenge && s.level === level);
}

// "1.1.1 L1 — Find the square, names on the edge." / "The mixed round."
export function stepWords(step: PathStep): string {
  return step.kind === "level" ? `${step.challenge} ${step.level} — ${step.words}` : step.words;
}

// A level's own words, its challenge's name taken off: "names on the edge".
export function levelLabel(challenge: { name: string }, level: Level): string {
  const words = level.path.replace(/\.$/, "");
  if (words === challenge.name) return "";
  return words.startsWith(`${challenge.name}, `) ? words.slice(challenge.name.length + 2) : words;
}

// ---------------------------------------------------------------------------
// A round

// What I play: one step of a chapter's path, or one level named on its own,
// which the screens use for a trial only. A level on the chapters page is a step.
export type Play =
  | { chapter: number; step: number }
  | { chapter: number; challenge: string; level: string };

export type Part = { challenge: Challenge; level: Level; count: number };

export type Round = {
  id: string;
  seed: string;
  chapter: number;
  step: number | null; // the path step played, when played from the path
  title: string; // "1.1.1 Find the square", or "The mixed round"
  side: Side;
  minutes: number | null;
  questions: number;
  passMark: string;
  parts: Part[];
  oneSide: boolean; // a mixed round whose one side, drawn for the round, holds for every part
  items: Item[];
  // The come-backs this round asks. Only these lose a round afterwards.
  asked: { challenge: string; facts: Facts }[];
};

const SIDES: Side[] = ["white", "black"];

// The packs a play's challenges read, each once: packs.ts fetches them.
export function packsOf(play: Play): string[] {
  const chapter = chapterOf(play.chapter);
  const step = "step" in play ? chapter.path[play.step] : null;
  const ids = step ? stepChallenges(step) : "challenge" in play ? [play.challenge] : [];
  return [...new Set(ids.flatMap((id) => challengeOf(id)?.packs ?? []))];
}

export function makeRound(play: Play, seed: string, progress: Progress, id = seed, packs: Packs = {}): Round {
  const chapter = chapterOf(play.chapter);
  const random = seeded(seed);
  const drawn = random.pick(SIDES);
  const backFor = (c: Challenge) => progress.back.filter((b) => b.challenge === c.id).map((b) => b.facts);
  const need = (cid: string) => {
    const c = challengeOf(cid);
    if (!c) throw new Error(`${cid} is not built.`);
    return c;
  };

  // The come-backs a challenge's round asks: all its own, unless it says which.
  const askedBy = (c: Challenge, level: Level, facts: RoundFacts) =>
    (c.asks ? c.asks(level, facts) : facts.back).map((f) => ({ challenge: c.id, facts: f }));

  const step = "step" in play ? chapter.path[play.step] : null;
  if ("step" in play && !step) throw new Error(`Chapter ${chapter.n} has no step ${play.step + 1}.`);

  if (step && step.kind === "mixed") {
    const side = drawn;
    const parts: Part[] = step.parts.map((p) => {
      const c = need(p.challenge);
      return { challenge: c, level: levelOf(c, typeof p.level === "string" ? p.level : p.level[side]), count: p.count };
    });
    // Where the round holds no one side, a part keeps the side its level names.
    const sideOf = (p: Part): Side => (!step.oneSide && (p.level.seat === "white" || p.level.seat === "black") ? p.level.seat : side);
    // A challenge's come-backs go to its parts in turn: a part asks the ones the
    // parts before it left, so a missed square is asked once.
    const unasked = new Map<string, Facts[]>();
    const factsFor = new Map<Part, RoundFacts>();
    for (const p of parts) {
      const back = unasked.get(p.challenge.id) ?? backFor(p.challenge);
      const facts: RoundFacts = { side: sideOf(p), count: p.count, back, packs };
      factsFor.set(p, facts);
      const taken = askedBy(p.challenge, p.level, facts).map((a) => JSON.stringify(a.facts));
      unasked.set(p.challenge.id, back.filter((b) => !taken.includes(JSON.stringify(b))));
    }
    const factsOf = (p: Part) => factsFor.get(p)!;
    // The parts of one challenge draw apart: a part draws again when it asks a
    // question an earlier part of its challenge asks. A challenge with one part
    // draws once.
    const keyOf = (it: Item) => {
      const ask = it.first();
      return ask.step === "ask" ? `${ask.question}|${ask.board?.lit.join()}` : "";
    };
    const askedBefore = new Map<string, Set<string>>();
    const made = parts.map((p) => {
      const several = parts.filter((q) => q.challenge.id === p.challenge.id).length > 1;
      let items = p.challenge.makeRound(p.level, random, factsOf(p));
      if (!several) return items;
      const earlier = askedBefore.get(p.challenge.id) ?? new Set<string>();
      for (let tries = 0; tries < 20 && items.some((it) => earlier.has(keyOf(it))); tries++) {
        items = p.challenge.makeRound(p.level, random, factsOf(p));
      }
      for (const it of items) earlier.add(keyOf(it));
      askedBefore.set(p.challenge.id, earlier);
      return items;
    });
    const items =
      step.order === "turns"
        ? Array.from({ length: Math.max(...made.map((m) => m.length)) }, (_, i) => made.flatMap((m) => (m[i] ? [m[i]] : []))).flat()
        : random.shuffle(made.flat());
    return {
      id,
      seed,
      chapter: chapter.n,
      step: "step" in play ? play.step : null,
      title: step.words.replace(/\.$/, ""),
      side,
      minutes: step.minutes,
      questions: count(items),
      passMark: step.passMark,
      parts,
      oneSide: step.oneSide,
      items,
      asked: parts.flatMap((p) => askedBy(p.challenge, p.level, factsOf(p))),
    };
  }

  const cid = step && step.kind === "level" ? step.challenge : "challenge" in play ? play.challenge : "";
  const lid = step && step.kind === "level" ? step.level : "level" in play ? play.level : "";
  const c = need(cid);
  const level = levelOf(c, lid);
  const drawnSide = level.seat === "white" || level.seat === "black" ? level.seat : drawn;
  // Where a come-back decides the side, the round names that one.
  const side = c.seats ? c.seats(level, { side: drawnSide, back: backFor(c), packs }) : drawnSide;
  const facts: RoundFacts = { side, back: backFor(c), packs };
  const items = c.makeRound(level, random, facts);
  return {
    id,
    seed,
    chapter: chapter.n,
    step: "step" in play ? play.step : null,
    title: `${c.id} ${c.name}`,
    side,
    minutes: level.minutes,
    questions: count(items),
    passMark: level.passMark,
    parts: [{ challenge: c, level, count: items.length }],
    oneSide: false,
    items,
    asked: askedBy(c, level, facts),
  };
}

const count = (items: Item[]) => items.reduce((n, i) => n + i.questions, 0);

// ---------------------------------------------------------------------------
// What the runner hands back

// One question told: its challenge and level, my answer time, and its score.
export type Answered = {
  challenge: string;
  level: string;
  secs: number;
  verdict: "right" | "wrong" | "slow";
  score: Score;
};

export type Results = {
  answered: Answered[];
  looks: number[]; // seconds per look
  moves: number[]; // seconds per move shown alone
  back: { challenge: string; facts: Facts }[]; // each item I missed
  // left when the minutes ran out; counts: what each adds to the round's own counts
  left: { challenge: string; level: string; questions: number; counts?: Record<string, number> }[];
  ended: "done" | "time";
};

// ---------------------------------------------------------------------------
// The score sheet

export type Sheet = {
  right: number;
  total: number;
  avgAnswer: number | null;
  avgLook: number | null;
  avgMove: number | null;
  mistakes: [string, number][]; // by kind, in the order first made
  counts: [string, number][]; // a challenge's own counts, summed
  left: number; // questions left when the minutes ran out, each a miss
  shares: { challenge: string; level: string; right: number; total: number }[]; // a mixed round's parts
};

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

function tally(into: Map<string, number>, key: string, n = 1) {
  into.set(key, (into.get(key) ?? 0) + n);
}

export function scoreSheet(round: Round, results: Results): Sheet {
  const mistakes = new Map<string, number>();
  const counts = new Map<string, number>();
  for (const a of results.answered) {
    for (const k of a.score.mistakes) tally(mistakes, k);
    for (const [k, n] of Object.entries(a.score.counts)) tally(counts, k, n);
  }
  for (const l of results.left) for (const [k, n] of Object.entries(l.counts ?? {})) tally(counts, k, n);
  const left = results.left.reduce((n, l) => n + l.questions, 0);
  const shares =
    round.parts.length > 1
      ? round.parts.map((p) => {
          // A challenge with several parts, one per level, counts each level's answers apart.
          const apart = round.parts.filter((q) => q.challenge.id === p.challenge.id).length > 1;
          const mineOf = (x: { challenge: string; level: string }) => x.challenge === p.challenge.id && (!apart || x.level === p.level.id);
          const mine = results.answered.filter(mineOf);
          const unasked = results.left.filter(mineOf).reduce((n, l) => n + l.questions, 0);
          return {
            challenge: p.challenge.id,
            level: p.level.id,
            right: mine.filter((a) => a.score.right).length,
            total: mine.length + unasked,
          };
        })
      : [];
  return {
    right: results.answered.filter((a) => a.score.right).length,
    total: results.answered.length + left,
    avgAnswer: mean(results.answered.map((a) => a.secs)),
    avgLook: mean(results.looks),
    avgMove: mean(results.moves),
    mistakes: [...mistakes],
    counts: [...counts],
    left,
    shares,
  };
}

// ---------------------------------------------------------------------------
// After a round

const sameBack = (a: { challenge: string; facts: Facts }, b: { challenge: string; facts: Facts }) =>
  a.challenge === b.challenge && JSON.stringify(a.facts) === JSON.stringify(b.facts);

// My new come-back list, and where I stand. Each item the round asked has one
// round fewer to come back in; one the round left out keeps both. Each item I
// missed comes back in my next two. Where I stand moves to the step played
// only when that step is later; a round on no path, a trial's, moves nothing.
export function afterRound(progress: Progress, round: Round, results: Results): Progress {
  const aged = progress.back
    .map((b) => (round.asked.some((a) => sameBack(a, b)) ? { ...b, rounds: b.rounds - 1 } : b))
    .filter((b) => b.rounds > 0);
  const missed = results.back.filter((m, i, all) => all.findIndex((x) => sameBack(x, m)) === i);
  const back = [
    ...aged.filter((b) => !missed.some((m) => sameBack(m, b))),
    ...missed.map((m) => ({ challenge: m.challenge, facts: m.facts, rounds: COMES_BACK })),
  ];
  const played = playedStep(round);
  const places =
    played !== null && played > placeOf(progress, round.chapter)
      ? { ...progress.places, [String(round.chapter)]: played }
      : progress.places;
  return { back, places };
}

// What Next plays: the same challenge's next level. After its last, the next
// challenge's first, in the chapter's order, section after section.
// > Stand-in. After the chapter's last challenge, and after a mixed round,
// > the path's next step.
export type Next = { play: Play; step: number | null; label: string; words: string; ok: boolean };

export function nextAfter(n: number, played: { challenge: Challenge; level: string } | null, step: number | null): Next | null {
  const chapter = chapterOf(n);
  if (played) {
    const all = chapter.sections.flatMap((s) => s.challenges);
    const levels = played.challenge.levels;
    const i = levels.findIndex((l) => l.id === played.level);
    const at = all.findIndex((c) => c.id === played.challenge.id);
    const after = at >= 0 ? all[at + 1] : undefined;
    const to =
      i + 1 < levels.length
        ? { challenge: played.challenge, level: levels[i + 1]! }
        : after?.built
          ? { challenge: after, level: after.levels[0]! }
          : null;
    if (to) {
      const s = pathIndex(n, to.challenge.id, to.level.id);
      return {
        play: s >= 0 ? { chapter: n, step: s } : { chapter: n, challenge: to.challenge.id, level: to.level.id },
        step: s >= 0 ? s : null,
        label: `${to.challenge.id} ${to.level.id}`,
        words: to.level.path,
        ok: true,
      };
    }
  }
  const next = step === null ? null : step + 1;
  const at = next !== null && next < chapter.path.length ? chapter.path[next]! : null;
  if (next === null || at === null) return null;
  return {
    play: { chapter: n, step: next },
    step: next,
    label: at.kind === "level" ? `${at.challenge} ${at.level}` : "The mixed round",
    words: at.words,
    ok: playable(at),
  };
}

export function nextOf(round: Round): Next | null {
  const p = round.parts.length === 1 ? round.parts[0]! : null;
  return nextAfter(round.chapter, p && { challenge: p.challenge, level: p.level.id }, playedStep(round));
}

// The path step a round played: its own, or the step of the level I picked;
// null for a level on no path.
export function playedStep(round: Round): number | null {
  if (round.step !== null) return round.step;
  const p = round.parts[0]!;
  const at = pathIndex(round.chapter, p.challenge.id, p.level.id);
  return at >= 0 ? at : null;
}
