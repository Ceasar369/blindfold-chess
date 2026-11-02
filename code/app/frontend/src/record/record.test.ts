import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CHAPTERS } from "../core.ts";
import { NO_PROGRESS, challengeOf, makeRound, packsOf, scoreSheet, type Play } from "../rounds/rounds.ts";
import { addRound, keptOf, keyOfRound, levelKey, placesOf, pull, statsKey, type Stats } from "./record.ts";

// A round kept since chapter 1's levels were cut carries revision 2.
const one = (challenge: string, level: string, total: number) => ({ revision: 2, parts: [{ challenge, level, count: total }], sheet: { total } });
const played = { right: 18, total: 20, avg: 3, secs: 90 };
const stat = (...steps: number[]): Stats =>
  Object.fromEntries(steps.map((i) => [statsKey(1, CHAPTERS[0]!.path[i]!), addRound(undefined, played)]));

describe("the keys stats are kept under", () => {
  it("name a level by its challenge, its id and its questions, from a kept round or from the path", () => {
    const l1 = CHAPTERS[0]!.path[6]!;
    expect(l1).toMatchObject({ challenge: "1.3.1", level: "L1" });
    expect(statsKey(1, l1)).toBe(levelKey(1, "1.3.1", "L1", 20));
    expect(keyOfRound(1, one("1.3.1", "L1", 20))).toBe(statsKey(1, l1));
  });

  it("show a round of 1.3.1's old levels on none of its new ones", () => {
    const keys = CHAPTERS[0]!.path.map((s) => statsKey(1, s));
    for (const level of ["L1", "L2", "L3", "L4"]) expect(keys).not.toContain(keyOfRound(1, one("1.3.1", level, 10)));
  });

  // 4.3.1's old rounds asked 6 questions, key 4:4.3.1:L1:6. Each opening's levels ask 1, so the old results stay stored and show on none.
  it("show a round of 4.3.1's old levels, of 6 questions, on none of the nine openings' levels, which ask 1", () => {
    const path = CHAPTERS[3]!.path;
    const keys = path.map((s) => statsKey(4, s));
    expect(keyOfRound(4, one("4.3.1", "L1", 6))).toBe("4:4.3.1:L1:6");
    for (const level of ["L1", "L2", "L3"]) {
      expect(keys).not.toContain(keyOfRound(4, one("4.3.1", level, 6)));
      expect(keys).toContain(keyOfRound(4, one("4.3.1", level, 1)));
    }
    const openings = path.slice(11);
    expect(openings).toHaveLength(27);
    for (const step of openings) expect(statsKey(4, step)).toMatch(/^4:4\.3\.[1-9]:L[1-3]:1$/);
  });

  // The nine levels moved off the keypad and the composer onto Reveal board: a round kept before still shows on each.
  it("keep the nine Reveal board levels' keys, so their kept rounds still show", () => {
    const nine: [number, string, string, string][] = [
      [2, "2.1.1", "L4", "2:2.1.1:L4:10"],
      [2, "2.1.1", "L5", "2:2.1.1:L5:10"],
      [2, "2.1.2", "L5", "2:2.1.2:L5:8"],
      [2, "2.2.1", "L4", "2:2.2.1:L4:10"],
      [2, "2.3.1", "L5", "2:2.3.1:L5:10"],
      [2, "2.3.2", "L5", "2:2.3.2:L5:10"],
      [3, "3.1.1", "L5", "3:3.1.1:L5:10"],
      [3, "3.1.1", "L6", "3:3.1.1:L6:3"],
      [4, "4.2.1", "L6", "4:4.2.1:L6:3"],
    ];
    for (const [chapter, challenge, level, key] of nine) {
      const step = CHAPTERS[chapter - 1]!.path.find((s) => s.kind === "level" && s.challenge === challenge && s.level === level)!;
      expect(statsKey(chapter, step), `${challenge} ${level}`).toBe(key);
      const total = Number(key.split(":")[3]);
      expect(keyOfRound(chapter, { parts: [{ challenge, level, count: total }], sheet: { total } })).toBe(key);
    }
  });

  it("name a chapter's mixed round by the chapter alone", () => {
    const mixed = CHAPTERS[0]!.path.at(-1)!;
    const parts = ["1.1.1", "1.1.2", "1.2.1", "1.3.1"].map((challenge) => ({ challenge, level: "L1", count: 5 }));
    expect(keyOfRound(1, { revision: 2, parts, sheet: { total: 20 } })).toBe(statsKey(1, mixed));
  });

  it("pass over a round that holds no parts or no count", () => {
    expect(keyOfRound(1, null)).toBe(null);
    expect(keyOfRound(1, { revision: 2, sheet: { total: 20 } })).toBe(null);
    expect(keyOfRound(1, { revision: 2, parts: [{ challenge: "1.1.1", level: "L1" }], sheet: {} })).toBe(null);
  });

  it("count a chapter 1 round kept before the cut nowhere, the 30-question mixed round too, and leave every other chapter's alone", () => {
    const level = { parts: [{ challenge: "1.1.1", level: "L1", count: 20 }], sheet: { total: 20 } };
    const mixed = { parts: ["1.1.1", "1.1.2", "1.2.1", "1.3.1"].map((challenge) => ({ challenge, level: "L1", count: 5 })), sheet: { total: 30 } };
    expect(keyOfRound(1, level)).toBe(null);
    expect(keyOfRound(1, mixed)).toBe(null);
    expect(keyOfRound(1, { ...level, revision: 1 })).toBe(null);
    expect(keyOfRound(4, { parts: [{ challenge: "4.1.1", level: "L1", count: 20 }], sheet: { total: 20 } })).toBe("4:4.1.1:L1:20");
  });

  it("keep every new chapter 1 round with its revision, so it counts", () => {
    const round = makeRound({ chapter: 1, step: 0 }, "kept", NO_PROGRESS);
    const results = { answered: [], looks: [], moves: [], back: [], left: [], ended: "done" as const };
    const kept = keptOf(round, results, scoreSheet(round, results), NO_PROGRESS, new Date(0), new Date(1000))!;
    expect(keyOfRound(kept.chapter, kept.score)).toMatch(/^1:1\.1\.1:L1:\d+$/);
  });

  // The chapter page finds a level's stats by the questions the level says.
  it("find every level's stats: its round asks as many questions as its level says", () => {
    const packs = join(import.meta.dirname, "..", "..", "..", "core", "packs");
    const load = (name: string) => (name.endsWith(".json") ? JSON.parse(readFileSync(join(packs, name), "utf8")) : readFileSync(join(packs, name)));
    for (const c of CHAPTERS) {
      c.path.forEach((step, i) => {
        const play: Play = { chapter: c.n, step: i };
        const round = makeRound(play, `questions ${c.n} ${i}`, NO_PROGRESS, "id", Object.fromEntries(packsOf(play).map((name) => [name, load(name)])));
        const asked = step.kind === "mixed" ? step.questions : challengeOf(step.challenge)!.levels.find((l) => l.id === step.level)!.questions;
        expect(round.questions, `chapter ${c.n}, step ${i + 1}`).toBe(asked);
      });
    }
  });
});

describe("where I stand", () => {
  it("is the furthest step with a round in my stats, never a step number", () => {
    const path = CHAPTERS[0]!.path;
    expect(path).toHaveLength(12);
    expect(placesOf({})).toEqual({});
    expect(placesOf(stat(0))).toEqual({});
    expect(placesOf(stat(1, 8))).toEqual({ "1": 8 });
    expect(path[8]).toMatchObject({ challenge: "1.3.1", level: "L2" });
    expect(placesOf(stat(3, 11, 5))).toEqual({ "1": 11 });
  });
});

describe("pulling my record", () => {
  afterEach(() => vi.unstubAllGlobals());

  // The record answers its rounds newest first.
  it("reads a level's rounds newest first: its last is the newest round", async () => {
    const level = CHAPTERS[0]!.path[6]!;
    const round = (id: string, right: number, endedAt: string) => ({
      id,
      chapter: 1,
      step: 7,
      startedAt: "2026-10-20T09:00:00.000Z",
      endedAt,
      score: { revision: 2, parts: [{ challenge: "1.3.1", level: "L1", count: 20 }], sheet: { right, total: 20 } },
      place: 6,
    });
    const view = { rounds: [round("b", 20, "2026-10-20T10:00:00.000Z"), round("a", 12, "2026-10-19T10:00:00.000Z")], comebacks: [], places: [] };
    vi.stubGlobal("fetch", async () => new Response(JSON.stringify(view)));
    const pulled = await pull();
    const stats = pulled!.stats[statsKey(1, level)]!;
    expect(stats.rounds).toBe(2);
    expect(stats.last.right).toBe(20);
    expect(stats.before).toBe(12);
  });
});
