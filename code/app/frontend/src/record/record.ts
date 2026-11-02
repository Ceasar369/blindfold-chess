// The site's side of block 20, the progress record. Each finished round waits
// in the browser until the record keeps it, and goes again until it does: on
// load, when the network comes back, when the page shows again, and every 30
// seconds while one waits. The site plays with no backend at all.
//
// The backend's contract: code/app/backend/src/contract.ts. A round sent twice
// is kept once, by its id.
//
// The browser also keeps my come-back list and my stats on each level, so a
// round plays on with no backend. The record's copy replaces them when a
// chapter opens and nothing waits to send. It keeps the step I played last,
// too. Where I stand comes from my stats.
//
// Stats, the step I played last and where I stand follow a round's challenge
// and level, never its step number: the path may change, and a step number
// then means another step.

import type { RecordView, Round as Kept } from "../../../backend/src/contract.ts";
import { useSyncExternalStore } from "react";
import { CHAPTERS, type PathStep } from "../core.ts";
import {
  NO_PROGRESS,
  challengeOf,
  playedStep,
  placeOf,
  type Back,
  type Progress,
  type Results,
  type Round,
  type Sheet,
} from "../rounds/rounds.ts";

const KEYS = { progress: "bc.progress", outbox: "bc.outbox", last: "bc.last", stats: "bc.stats" };
const RETRY_MS = 30_000;
// GitHub Pages has no progress server. Its build keeps progress only in the
// browser; the downloadable local edition can still use its file server.
export const LOCAL_RECORD = import.meta.env.VITE_RECORD_MODE === "local";

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

// ---------------------------------------------------------------------------
// What the browser keeps

export function loadProgress(): Progress {
  const p = read<Progress>(KEYS.progress, NO_PROGRESS);
  return { back: Array.isArray(p.back) ? p.back : [], places: placesOf(loadStats()) };
}

export function saveProgress(p: Progress) {
  write(KEYS.progress, { back: p.back });
}

// A path step's name, which a change to the path leaves alone: "1.3.1 L2", or
// "mixed". The step I played last is kept under it.
const stepId = (step: PathStep) => (step.kind === "level" ? `${step.challenge} ${step.level}` : "mixed");

// The path step I played last, for Home's card. null before any.
// > Stand-in. Each device keeps its own: the record does not carry it.
export type Last = { chapter: number; step: number };

export function loadLast(): Last | null {
  const l = read<{ chapter?: unknown; step?: unknown } | null>(KEYS.last, null);
  const c = CHAPTERS.find((x) => x.n === l?.chapter);
  const id = l?.step;
  const step = c && typeof id === "string" ? c.path.findIndex((s) => stepId(s) === id) : -1;
  return c && step >= 0 ? { chapter: c.n, step } : null;
}

export function saveLast(l: Last) {
  const step = CHAPTERS.find((x) => x.n === l.chapter)?.path[l.step];
  if (step) write(KEYS.last, { chapter: l.chapter, step: stepId(step) });
}

// What I did on each level and on each chapter's mixed round, by statsKey,
// from every round there: my last round, my best score, my fastest round, my
// best average, and my best score before the last round. The best three may
// come from three rounds.
// > Stand-in. A round's time runs from its start to its end.
export type Played = { right: number; total: number; avg: number | null; secs: number };
export type StepStats = { rounds: number; last: Played; best: { right: number; secs: number; avg: number | null }; before: number | null };
export type Stats = Record<string, StepStats>;

// A level's stats sit under its challenge, its id and its questions. A level
// with other questions is another level: rounds of 1.3.1's old L1 to L4, of 10
// questions, show on none of its new ones, of 20.
export const levelKey = (chapter: number, challenge: string, level: string, questions: number) =>
  `${chapter}:${challenge}:${level}:${questions}`;

const mixedKey = (chapter: number) => `${chapter}:mixed`;

// Chapter 1's levels were cut and renumbered. A round of chapter 1 kept before
// has no `revision` in its score and counts nowhere, the 30-question mixed round
// too; it stays stored. A round kept since carries this one.
const CHAPTER_1_REVISION = 2;

// The key of a path step: its level, or its chapter's mixed round.
export function statsKey(chapter: number, step: PathStep): string {
  if (step.kind === "mixed") return mixedKey(chapter);
  const level = challengeOf(step.challenge)?.levels.find((l) => l.id === step.level);
  return levelKey(chapter, step.challenge, step.level, level?.questions ?? 0);
}

// The key of a kept round, from the challenge and level its score holds and
// the questions its sheet counts: null when it holds none.
export function keyOfRound(chapter: number, score: unknown): string | null {
  const s = score as { revision?: unknown; parts?: { challenge?: unknown; level?: unknown }[]; sheet?: { total?: unknown } } | null;
  if (chapter === 1 && s?.revision !== CHAPTER_1_REVISION) return null;
  const parts = s?.parts;
  if (!Array.isArray(parts) || parts.length === 0) return null;
  if (parts.length > 1) return mixedKey(chapter);
  const { challenge, level } = parts[0]!;
  const total = s?.sheet?.total;
  return typeof challenge === "string" && typeof level === "string" && typeof total === "number" ? levelKey(chapter, challenge, level, total) : null;
}

// Where I stand on each chapter: its furthest step with a round in my stats.
// A chapter with none, or only its first step, has no place.
export function placesOf(stats: Stats): Record<string, number> {
  const places: Record<string, number> = {};
  for (const c of CHAPTERS) {
    const at = c.path.findLastIndex((s) => stats[statsKey(c.n, s)] !== undefined);
    if (at > 0) places[String(c.n)] = at;
  }
  return places;
}

const lower = (a: number | null, b: number | null) => (a === null ? b : b === null ? a : Math.min(a, b));

// A step's stats after one more round there.
export function addRound(s: StepStats | undefined, p: Played): StepStats {
  if (!s) return { rounds: 1, last: p, best: { right: p.right, secs: p.secs, avg: p.avg }, before: null };
  return {
    rounds: s.rounds + 1,
    last: p,
    best: { right: Math.max(s.best.right, p.right), secs: Math.min(s.best.secs, p.secs), avg: lower(s.best.avg, p.avg) },
    before: s.best.right,
  };
}

export function loadStats(): Stats {
  const s = read<Stats | null>(KEYS.stats, null);
  return s && typeof s === "object" ? s : {};
}

export function saveStats(s: Stats) {
  write(KEYS.stats, s);
}

const outbox = () => read<Kept[]>(KEYS.outbox, []);

// ---------------------------------------------------------------------------
// The state the screens show

export type Status = { waiting: number; sending: boolean; lastSent: boolean };

let status: Status = { waiting: 0, sending: false, lastSent: false };
const listeners = new Set<() => void>();

function set(change: Partial<Status>) {
  status = { ...status, waiting: LOCAL_RECORD ? 0 : outbox().length, ...change };
  listeners.forEach((l) => l());
}

export function useRecordStatus(): Status {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => status,
  );
}

// ---------------------------------------------------------------------------
// Sending

// The round as the record keeps it, or null for a round on no path.
export function keptOf(round: Round, results: Results, sheet: Sheet, after: Progress, startedAt: Date, endedAt: Date): Kept | null {
  const step = playedStep(round);
  if (step === null) return null;
  return {
    id: round.id,
    chapter: round.chapter,
    step,
    startedAt: startedAt.toISOString(),
    endedAt: endedAt.toISOString(),
    score: {
      title: round.title,
      ...(round.chapter === 1 ? { revision: CHAPTER_1_REVISION } : {}),
      side: round.side,
      seed: round.seed,
      parts: round.parts.map((p) => ({ challenge: p.challenge.id, level: p.level.id, count: p.count })),
      ended: results.ended,
      looks: results.looks,
      moves: results.moves,
      left: results.left,
      sheet,
    },
    answers: results.answered,
    comebacks: after.back,
    place: placeOf(after, round.chapter),
  };
}

export function queue(kept: Kept) {
  if (LOCAL_RECORD) {
    // App.tsx has already saved the round's stats and come-back list.
    set({ lastSent: true });
    return;
  }
  write(KEYS.outbox, [...outbox().filter((k) => k.id !== kept.id), kept]);
  set({ lastSent: false });
  void flush();
}

let flushing: Promise<void> | null = null;

// Sends every waiting round, oldest first, until one fails to send. One send
// runs at a time; a call while one runs waits on it.
export function flush(): Promise<void> {
  if (LOCAL_RECORD) return Promise.resolve();
  flushing ??= sendAll().finally(() => {
    flushing = null;
    set({ sending: false });
  });
  return flushing;
}

async function sendAll() {
  set({ sending: true });
  // Read again each time: a round may join while one sends.
  for (let kept = outbox()[0]; kept; kept = outbox()[0]) {
    const answer = await send(kept);
    if (answer === "kept" || answer === "bad") {
      write(KEYS.outbox, outbox().filter((k) => k.id !== kept.id));
      if (answer === "bad") console.warn(`The record refused round ${kept.id}'s shape. It is dropped.`);
      continue;
    }
    return;
  }
  set({ lastSent: true });
}

async function send(kept: Kept): Promise<"kept" | "bad" | "waiting"> {
  try {
    const res = await fetch("/api/rounds", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(kept),
    });
    if (res.status === 400) return "bad";
    if (res.status !== 200 && res.status !== 201) return "waiting";
    // A server that answers every address with the site itself keeps nothing.
    const body = (await res.json().catch(() => null)) as { kept?: unknown } | null;
    return body && (body.kept === "new" || body.kept === "already") ? "kept" : "waiting";
  } catch {
    return "waiting";
  }
}

// ---------------------------------------------------------------------------
// Reading my record

const isBack = (b: unknown): b is Back =>
  !!b && typeof b === "object" && typeof (b as Back).challenge === "string" && typeof (b as Back).rounds === "number";

// A kept round, as its step's stats read it: the score and average its sheet
// carries, and its time, start to end.
export function playedOf(score: unknown, startedAt: string, endedAt: string): Played | null {
  const sheet = (score as { sheet?: { right?: unknown; total?: unknown; avgAnswer?: unknown } } | null)?.sheet;
  if (!sheet || typeof sheet.right !== "number" || typeof sheet.total !== "number") return null;
  const secs = (Date.parse(endedAt) - Date.parse(startedAt)) / 1000;
  return { right: sheet.right, total: sheet.total, avg: typeof sheet.avgAnswer === "number" ? sheet.avgAnswer : null, secs: Number.isFinite(secs) ? secs : 0 };
}

// The record's come-back list, places and stats, when it answers and nothing
// waits. Its rounds come newest first, so they are read in reverse: each
// step's last is its last round.
export async function pull(): Promise<{ progress: Progress; stats: Stats } | null> {
  if (LOCAL_RECORD) return null;
  if (outbox().length > 0) return null;
  try {
    const res = await fetch("/api/record");
    if (res.status !== 200) return null;
    const view = (await res.json().catch(() => null)) as RecordView | null;
    if (!view || !Array.isArray(view.comebacks) || !Array.isArray(view.places)) return null;
    const stats: Stats = {};
    for (const r of Array.isArray(view.rounds) ? [...view.rounds].reverse() : []) {
      const p = playedOf(r.score, r.startedAt, r.endedAt);
      const key = keyOfRound(r.chapter, r.score);
      if (p && key) stats[key] = addRound(stats[key], p);
    }
    return { progress: { back: view.comebacks.filter(isBack), places: placesOf(stats) }, stats };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Going again

let started = false;

export function startSending() {
  if (started) return;
  started = true;
  set({});
  if (LOCAL_RECORD) return;
  void flush();
  window.addEventListener("online", () => void flush());
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void flush();
  });
  window.setInterval(() => {
    if (outbox().length > 0) void flush();
  }, RETRY_MS);
}
