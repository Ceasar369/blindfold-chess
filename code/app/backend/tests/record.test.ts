import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import type { RecordView, Round } from "../src/contract.ts";
import { d1Store } from "../src/d1-store.ts";
import { createHandler } from "../src/handle.ts";
import { forgetRound } from "../src/record.ts";
import { fileStore, type Store } from "../src/store.ts";
import { fakeD1 } from "./fake-d1.ts";

const folders: string[] = [];
afterAll(() => folders.forEach((f) => rmSync(f, { recursive: true, force: true })));

const stores: Array<[string, () => Store]> = [
  ["the local store", () => {
    const folder = mkdtempSync(join(tmpdir(), "record-"));
    folders.push(folder);
    return fileStore(folder);
  }],
  ["the D1 store, on a fake", () => d1Store(fakeD1())],
];

function round(id: string, endedAt: string, more: Partial<Round> = {}): Round {
  return {
    id, chapter: 1, step: 0, place: 0,
    startedAt: "2026-10-19T08:00:00.000Z", endedAt,
    score: { right: 18, total: 20 },
    answers: [{ challenge: "1.1.1", level: "L1", asked: "f6", given: "f6", right: true }],
    comebacks: [], ...more,
  };
}

describe.each(stores)("on %s", (_, makeStore) => {
  const setUp = (store: Store | null = makeStore()) => {
    const handle = createHandler({ store });
    const call = (method: string, path: string, options: { headers?: Record<string, string>; body?: unknown } = {}) => {
      const body = options.body === undefined ? undefined : JSON.stringify(options.body);
      return handle(new Request(`http://localhost${path}`, { method, headers: options.headers, body }));
    };
    const record = async (): Promise<RecordView> => (await call("GET", "/api/record")).json();
    return { call, record };
  };

  it("keeps a round", async () => {
    const { call, record } = setUp();
    const sent = round("r1", "2026-10-19T08:05:00Z");
    const response = await call("POST", "/api/rounds", { body: sent });
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ kept: "new" });
    const kept = await call("GET", "/api/rounds/r1");
    expect(await kept.json()).toEqual({ ...sent, endedAt: "2026-10-19T08:05:00.000Z" });
    expect((await record()).rounds.map((r) => r.id)).toEqual(["r1"]);
  });

  it("keeps a round from a browser that still sends an old phrase", async () => {
    const { call, record } = setUp();
    const response = await call("POST", "/api/rounds", { headers: { "x-phrase": "apple river stone" }, body: round("r1", "2026-10-19T08:05:00Z") });
    expect(response.status).toBe(201);
    expect((await record()).rounds.map((r) => r.id)).toEqual(["r1"]);
  });

  it("keeps a round sent twice only once", async () => {
    const { call, record } = setUp();
    const sent = round("r1", "2026-10-19T08:05:00Z");
    expect((await call("POST", "/api/rounds", { body: sent })).status).toBe(201);
    const again = await call("POST", "/api/rounds", { body: sent });
    expect(again.status).toBe(200);
    expect(await again.json()).toEqual({ kept: "already" });
    expect((await record()).rounds.map((r) => r.id)).toEqual(["r1"]);
  });

  it("never lets a round sent late undo a newer one", async () => {
    const { call, record } = setUp();
    const newer = round("phone", "2026-10-19T10:00:00Z", { place: 3, comebacks: [{ challenge: "1.1.1", square: "c6", roundsLeft: 2 }] });
    const older = round("mac", "2026-10-19T09:00:00Z", { place: 1, comebacks: [{ challenge: "1.1.1", square: "f3", roundsLeft: 2 }] });
    await call("POST", "/api/rounds", { body: newer });
    await call("POST", "/api/rounds", { body: older });
    const now = await record();
    expect(now.rounds.map((r) => r.id)).toEqual(["phone", "mac"]);
    expect(now.comebacks).toEqual(newer.comebacks);
    expect(now.places).toEqual([{ chapter: 1, step: 3 }]);
  });

  it("keeps each chapter's place apart, and filters rounds by chapter", async () => {
    const { call, record } = setUp();
    await call("POST", "/api/rounds", { body: round("one", "2026-10-19T09:00:00Z", { chapter: 1, place: 4 }) });
    await call("POST", "/api/rounds", { body: round("two", "2026-10-19T09:10:00Z", { chapter: 2, place: 1 }) });
    expect((await record()).places).toEqual([{ chapter: 1, step: 4 }, { chapter: 2, step: 1 }]);
    const two: RecordView = await (await call("GET", "/api/record?chapter=2")).json();
    expect(two.rounds.map((r) => r.id)).toEqual(["two"]);
  });

  it("keeps every round of five sent at once", async () => {
    const { call, record } = setUp();
    const sent = [1, 2, 3, 4, 5].map((n) => round(`r${n}`, `2026-10-19T09:0${n}:00Z`));
    const answers = await Promise.all(sent.map((body) => call("POST", "/api/rounds", { body })));
    expect(answers.map((a) => a.status)).toEqual([201, 201, 201, 201, 201]);
    expect((await record()).rounds.map((r) => r.id)).toEqual(["r5", "r4", "r3", "r2", "r1"]);
  });

  it("refuses a round of the wrong shape", async () => {
    const { call } = setUp();
    expect((await call("POST", "/api/rounds", { body: { ...round("r1", "2026-10-19T08:05:00Z"), chapter: 7 } })).status).toBe(400);
    expect((await call("POST", "/api/rounds", { body: { ...round("../x", "2026-10-19T08:05:00Z") } })).status).toBe(400);
    expect((await call("POST", "/api/rounds", { body: { ...round("r1", "yesterday") } })).status).toBe(400);
  });

  it("answers health, and refuses the rest when the server holds no store", async () => {
    const { call } = setUp(null);
    expect((await call("GET", "/api/health")).status).toBe(200);
    expect((await call("POST", "/api/rounds", { body: round("r1", "2026-10-19T08:05:00Z") })).status).toBe(503);
  });

  it("forgets a round, as if it was never sent", async () => {
    const store = makeStore();
    const handle = createHandler({ store });
    const post = (body: Round) => handle(new Request("http://localhost/api/rounds", { method: "POST", body: JSON.stringify(body) }));
    const get = (path: string) => handle(new Request(`http://localhost${path}`));
    const first = round("first", "2026-10-19T09:00:00Z", { place: 2, comebacks: [{ square: "f3" }] });
    await post(first);
    await post(round("test", "2026-10-19T09:30:00Z", { place: 5, comebacks: [{ square: "c6" }] }));
    expect(await forgetRound(store, "test")).toBe(true);
    const now: RecordView = await (await get("/api/record")).json();
    expect(now.rounds.map((r) => r.id)).toEqual(["first"]);
    expect(now.comebacks).toEqual(first.comebacks);
    expect(now.places).toEqual([{ chapter: 1, step: 2 }]);
    expect((await get("/api/rounds/test")).status).toBe(404);
  });
});
