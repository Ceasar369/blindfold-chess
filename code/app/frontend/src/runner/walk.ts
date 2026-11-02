// The runner's walk through one round, apart from the screen: each item's
// steps in turn, each step's time counted, and the round ended when its
// minutes run out. Runner.tsx draws it; walk.test.ts tests it with no screen.
//
// Times are milliseconds from any one clock, handed in, so a test sets them.

import type { Ask, Did, Step } from "../core.ts";
import type { Results, Round } from "../rounds/rounds.ts";

export type Walk = {
  round: Round;
  index: number; // the item playing
  step: Step; // its step on screen
  asked: Ask | null; // the question asked last, shown again with its told line
  stepAt: number; // when that step showed
  askAt: number; // when the open question was first asked
  moveAt: number; // when my turn opened: the Ask that opens it, not one reopened
  startedAt: number;
  toldInItem: number; // the item's questions told so far
  results: Results;
  ended: boolean;
};

const fresh = (): Results => ({ answered: [], looks: [], moves: [], back: [], left: [], ended: "done" });

export function begin(round: Round, now: number): Walk {
  if (round.items.length === 0) throw new Error("A round holds no item.");
  const first = round.items[0]!.first();
  return {
    round,
    index: 0,
    step: first,
    asked: first.step === "ask" ? first : null,
    stepAt: now,
    askAt: now,
    moveAt: now,
    startedAt: now,
    toldInItem: 0,
    results: fresh(),
    ended: false,
  };
}

// What I did on the step on screen: a press, an answer, time running out, or a
// lesson's jump.
export function act(w: Walk, did: Did, now: number): Walk {
  if (w.ended) return w;
  const item = w.round.items[w.index]!;
  const results: Results = { ...w.results };
  const at = w.step;
  if (at.step === "show") {
    const secs = (now - w.stepAt) / 1000;
    if (at.time === "look") results.looks = [...results.looks, secs];
    else {
      // A list of moves shown whole counts its time once per move.
      const n = at.moves ?? 1;
      results.moves = [...results.moves, ...Array.from({ length: n }, () => secs / n)];
    }
  }
  const next = item.next(did);
  // My own move, played: its time counts as time per move, from the Ask that
  // opened my turn. A move refused keeps the question open, and counts
  // nothing; neither does a note, a hint, nor the time they take.
  const played = next.step === "told" || (next.step === "ask" && !next.reopened);
  const mine = at.step === "ask" && at.time === "move" && did.did === "answer";
  if (mine && played) {
    results.moves = [...results.moves, (now - w.moveAt) / 1000];
  }
  if (next.step === "told") {
    const asked = at.step === "ask" ? at : null;
    const secs = did.did === "timeout" && asked?.seconds ? asked.seconds : (now - w.askAt) / 1000;
    results.answered = [
      ...results.answered,
      { challenge: item.challenge, level: item.level, secs, verdict: next.verdict, score: next.score },
    ];
  }
  return enter({ ...w, results, toldInItem: w.toldInItem + (next.step === "told" ? 1 : 0) }, next, now);
}

function enter(w: Walk, next: Step, now: number): Walk {
  if (next.step !== "done") {
    // An Ask after an Ask is the same question's next move: its time runs on.
    const fresh = next.step === "ask" && !next.reopened && w.step.step !== "ask";
    const asked = next.step === "ask" ? next : next.step === "show" ? null : w.asked;
    const turn = next.step === "ask" && next.time === "move" && !next.reopened;
    return {
      ...w,
      step: next,
      asked,
      stepAt: now,
      askAt: fresh ? now : w.askAt,
      moveAt: turn ? now : w.moveAt,
    };
  }
  const item = w.round.items[w.index]!;
  const results = next.back === null ? w.results : { ...w.results, back: [...w.results.back, { challenge: item.challenge, facts: next.back }] };
  const index = w.index + 1;
  if (index >= w.round.items.length) return { ...w, results, step: next, ended: true };
  const first = w.round.items[index]!.first();
  return enter({ ...w, results, index, toldInItem: 0 }, first, now);
}

// The round's minutes ran out: every question not yet told is a miss. An
// item not yet told adds its own counts for that, such as its pieces.
export function endByTime(w: Walk): Walk {
  if (w.ended) return w;
  const items = w.round.items;
  const left = items.slice(w.index).flatMap((item, i) => {
    const questions = item.questions - (i === 0 ? w.toldInItem : 0);
    const counts = item.unasked && (i > 0 || w.toldInItem === 0) ? { counts: { ...item.unasked } } : {};
    return questions > 0 ? [{ challenge: item.challenge, level: item.level, questions, ...counts }] : [];
  });
  return { ...w, ended: true, results: { ...w.results, left, ended: "time" } };
}

// Seconds left in the round, or null when it runs to its end.
export function roundLeft(w: Walk, now: number): number | null {
  return w.round.minutes === null ? null : w.round.minutes * 60 - (now - w.startedAt) / 1000;
}

// Seconds left on the open question, or null when it has no limit.
export function askLeft(w: Walk, now: number): number | null {
  const s = w.step;
  return s.step === "ask" && s.seconds !== null ? s.seconds - (now - w.askAt) / 1000 : null;
}

// Seconds left on a Show that ends on its own, or null.
export function showLeft(w: Walk, now: number): number | null {
  const s = w.step;
  return s.step === "show" && s.seconds ? s.seconds - (now - w.stepAt) / 1000 : null;
}

// The question's number in the round: the one on screen. Its told line shows
// under its own number, until Continue; a look shows the number of the
// question it is for.
export function questionNumber(w: Walk): number {
  const told = w.step.step === "told" ? 1 : 0;
  return Math.min(w.results.answered.length + 1 - told, w.round.questions);
}
