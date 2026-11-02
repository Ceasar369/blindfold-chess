// What the frontend sends and reads. The frontend may import these types by path.
//
// The record is open: no request carries a phrase.
//
// POST /api/rounds        a finished round, as `Round`. 201 kept, 200 kept already, 400 bad shape.
// GET  /api/record        `RecordView`. `?chapter=3` keeps only chapter 3's rounds.
// GET  /api/rounds/:id    the `Round` as kept, or 404.
// GET  /api/health        { ok: true }.

/** One finished round. The backend keeps it as given, and judges nothing. */
export type Round = {
  /** Made once by the browser, before the first send. A resend uses the same id. */
  id: string;
  /** The chapter whose path this round belongs to, 1 to 6. */
  chapter: number;
  /** The path step this round played. */
  step: number;
  /** ISO times. */
  startedAt: string;
  endedAt: string;
  /** The score sheet, kept as given. */
  score: unknown;
  /** One entry per question, kept as given. */
  answers: unknown[];
  /** The whole come-back list after this round, every challenge's. */
  comebacks: unknown[];
  /** The step I stand on now, on this chapter's path. */
  place: number;
};

/** A round as the record lists it: everything but its answers and come-backs. */
export type RoundSummary = Pick<Round, "id" | "chapter" | "step" | "startedAt" | "endedAt" | "score" | "place">;

export type Place = { chapter: number; step: number };

/** What GET /api/record answers. */
export type RecordView = {
  /** Past rounds, newest first, at most 100. */
  rounds: RoundSummary[];
  /** The come-back list of the round that ended last. */
  comebacks: unknown[];
  /** Where I stand on each chapter's path, by the round that ended last on it. */
  places: Place[];
};

const ID = /^[A-Za-z0-9_-]{1,100}$/;
const MAX_ITEMS = 1000;

/** The round, with its times made ISO, or the reason it is refused. */
export function checkRound(body: unknown): Round | string {
  if (typeof body !== "object" || body === null || Array.isArray(body)) return "A round is a JSON object.";
  const r = body as Record<string, unknown>;
  if (typeof r.id !== "string" || !ID.test(r.id)) return "id: 1 to 100 letters, digits, - or _.";
  if (!Number.isInteger(r.chapter) || (r.chapter as number) < 1 || (r.chapter as number) > 6) return "chapter: a whole number, 1 to 6.";
  if (!Number.isInteger(r.step) || (r.step as number) < 0) return "step: a whole number, 0 or more.";
  if (!Number.isInteger(r.place) || (r.place as number) < 0) return "place: a whole number, 0 or more.";
  const startedAt = isoTime(r.startedAt);
  const endedAt = isoTime(r.endedAt);
  if (startedAt === null) return "startedAt: an ISO time.";
  if (endedAt === null) return "endedAt: an ISO time.";
  if (!("score" in r)) return "score: the score sheet.";
  if (!Array.isArray(r.answers) || r.answers.length > MAX_ITEMS) return `answers: a list, at most ${MAX_ITEMS}.`;
  if (!Array.isArray(r.comebacks) || r.comebacks.length > MAX_ITEMS) return `comebacks: a list, at most ${MAX_ITEMS}.`;
  return {
    id: r.id,
    chapter: r.chapter as number,
    step: r.step as number,
    startedAt,
    endedAt,
    score: r.score,
    answers: r.answers,
    comebacks: r.comebacks,
    place: r.place as number,
  };
}

function isoTime(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const time = new Date(value);
  return Number.isNaN(time.getTime()) ? null : time.toISOString();
}

export function isRoundId(id: string): boolean {
  return ID.test(id);
}
