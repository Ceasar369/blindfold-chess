import type { Place, RecordView, Round, RoundSummary } from "./contract.ts";
import type { Store } from "./store.ts";

// The record is two kinds of file.
// rounds/<id>.json: one finished round, whole, written once and never changed.
// record.json: every round's summary, the latest come-back list, and my place on each path.

type RecordFile = {
  rounds: RoundSummary[];
  comebacks: unknown[];
  /** When the round that set `comebacks` ended. */
  comebacksAt: string | null;
  places: Array<Place & { endedAt: string }>;
};

const RECORD = "record.json";
const roundKey = (id: string) => `rounds/${id}.json`;
const TRIES = 5;

function empty(): RecordFile {
  return { rounds: [], comebacks: [], comebacksAt: null, places: [] };
}

function summary(round: Round): RoundSummary {
  const { id, chapter, step, startedAt, endedAt, score, place } = round;
  return { id, chapter, step, startedAt, endedAt, score, place };
}

/** Keeps a finished round once. A resend of the same id answers "already". */
export async function keepRound(store: Store, round: Round): Promise<"new" | "already"> {
  await store.create(roundKey(round.id), JSON.stringify(round));
  const changed = await changeRecord(store, (record) => {
    if (record.rounds.some((kept) => kept.id === round.id)) return null;
    record.rounds.push(summary(round));
    record.rounds.sort((a, b) => a.endedAt.localeCompare(b.endedAt));
    // A round sent late, from a device that was offline, never undoes a newer one.
    if (record.comebacksAt === null || round.endedAt >= record.comebacksAt) {
      record.comebacks = round.comebacks;
      record.comebacksAt = round.endedAt;
    }
    const place = record.places.find((p) => p.chapter === round.chapter);
    if (place === undefined) record.places.push({ chapter: round.chapter, step: round.place, endedAt: round.endedAt });
    else if (round.endedAt >= place.endedAt) Object.assign(place, { step: round.place, endedAt: round.endedAt });
    return record;
  });
  return changed ? "new" : "already";
}

/** Takes a round out of the record, as if it was never sent. */
export async function forgetRound(store: Store, id: string): Promise<boolean> {
  let latest: RoundSummary | undefined;
  const changed = await changeRecord(store, (record) => {
    const before = record.rounds.length;
    record.rounds = record.rounds.filter((kept) => kept.id !== id);
    if (record.rounds.length === before) return null;
    record.places = [];
    for (const kept of record.rounds) {
      const place = record.places.find((p) => p.chapter === kept.chapter);
      if (place === undefined) record.places.push({ chapter: kept.chapter, step: kept.place, endedAt: kept.endedAt });
      else Object.assign(place, { step: kept.place, endedAt: kept.endedAt });
    }
    latest = record.rounds.at(-1);
    record.comebacks = [];
    record.comebacksAt = null;
    return record;
  });
  await store.remove(roundKey(id));
  if (changed && latest !== undefined) {
    const round = await readRound(store, latest.id);
    if (round !== null) {
      await changeRecord(store, (record) => {
        if (record.comebacksAt !== null && record.comebacksAt > round.endedAt) return null;
        record.comebacks = round.comebacks;
        record.comebacksAt = round.endedAt;
        return record;
      });
    }
  }
  return changed;
}

export async function readRecord(store: Store, chapter?: number): Promise<RecordView> {
  const found = await store.read(RECORD);
  const record: RecordFile = found === null ? empty() : JSON.parse(found.text);
  const rounds = record.rounds.filter((r) => chapter === undefined || r.chapter === chapter);
  return {
    rounds: rounds.slice(-100).reverse(),
    comebacks: record.comebacks,
    places: record.places.map(({ chapter, step }) => ({ chapter, step })),
  };
}

export async function readRound(store: Store, id: string): Promise<Round | null> {
  const found = await store.read(roundKey(id));
  return found === null ? null : JSON.parse(found.text);
}

/** Reads record.json, changes it, and writes it back unless another write landed first; then tries again. */
async function changeRecord(store: Store, change: (record: RecordFile) => RecordFile | null): Promise<boolean> {
  for (let i = 0; i < TRIES; i++) {
    const found = await store.read(RECORD);
    const next = change(found === null ? empty() : JSON.parse(found.text));
    if (next === null) return false;
    if (await store.replace(RECORD, JSON.stringify(next), found?.etag ?? null)) return true;
  }
  throw new Error(`record.json kept changing under ${TRIES} tries.`);
}
