import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Round as Kept } from "../../../backend/src/contract.ts";

describe("the public browser-only edition", () => {
  let saved: Map<string, string>;
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("VITE_RECORD_MODE", "local");
    saved = new Map();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => saved.get(key) ?? null,
      setItem: (key: string, value: string) => saved.set(key, value),
    });
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("No server exists on Pages."))));
    vi.stubGlobal("window", { addEventListener: vi.fn(), setInterval: vi.fn() });
    vi.stubGlobal("document", { addEventListener: vi.fn() });
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("keeps scores and the last exercise through a reload", async () => {
    const record = await import("./record.ts");
    const stats = { "1:1.1.1:L1:20": { rounds: 1, last: { right: 20, total: 20, avg: 1, secs: 20 }, best: { right: 20, avg: 1, secs: 20 }, before: null } };
    record.saveStats(stats);
    record.saveProgress({ back: [{ challenge: "1.1.1", facts: { square: "b3" }, rounds: 2 }], places: {} });
    record.saveLast({ chapter: 1, step: 0 });
    vi.resetModules();
    const reloaded = await import("./record.ts");
    expect(reloaded.loadStats()).toEqual(stats);
    expect(reloaded.loadProgress().back).toEqual([{ challenge: "1.1.1", facts: { square: "b3" }, rounds: 2 }]);
    expect(reloaded.loadLast()).toEqual({ chapter: 1, step: 0 });
  });

  it("never sends rounds, retries, or replaces local scores", async () => {
    // A queued round from a previous server-backed build must stay intact.
    saved.set("bc.outbox", JSON.stringify([{ id: "existing-round" }]));
    const record = await import("./record.ts");
    record.startSending();
    record.queue({ id: "new-round" } as Kept);
    await record.flush();
    expect(await record.pull()).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
    expect(window.setInterval).not.toHaveBeenCalled();
    expect(window.addEventListener).not.toHaveBeenCalled();
    expect(document.addEventListener).not.toHaveBeenCalled();
    expect(JSON.parse(saved.get("bc.outbox")!)).toEqual([{ id: "existing-round" }]);
  });
});
