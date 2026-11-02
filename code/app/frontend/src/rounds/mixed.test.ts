// A mixed round, made from two stand-in challenges: no mixed round's
// challenges are all built yet.
import { describe, expect, it, vi } from "vitest";
import type { Ask, Challenge, Chapter, Item, Level, Side } from "../core.ts";

// L1 seats me as White, L2 as Black, in the parts that name a level by its own seat.
function fake(id: string, seats: Side[]): Challenge {
  const level = (lid: string): Level => ({
    id: lid,
    path: `Fake ${id}, ${lid}.`,
    questions: 10,
    minutes: 3,
    seconds: null,
    seat: lid === "L1" ? "white" : "black",
    passMark: "pass",
    dials: [],
  });
  // It asks the first of its count of what comes back, as a real challenge does.
  const asks = (lvl: Level, facts: { count?: number; back: unknown[] }) => facts.back.slice(0, facts.count ?? lvl.questions) as never[];
  return {
    built: true,
    id,
    name: `Fake ${id}`,
    trains: "",
    levels: [level("L1"), level("L2")],
    asks,
    makeRound: (lvl, _random, facts) => {
      seats.push(facts.side);
      const back = asks(lvl, facts);
      return Array.from({ length: facts.count ?? lvl.questions }, (_, i): Item => ({
        challenge: id,
        level: lvl.id,
        questions: 1,
        first: () => ({
          step: "ask",
          question: i < back.length ? `${id} back ${JSON.stringify(back[i])}` : `${id} ${lvl.id} ${i}`,
          board: null,
          notes: [],
          input: { how: "click-one" },
          seconds: null,
          reopened: false,
        }),
        next: () => ({ step: "done", back: null }),
      }));
    },
  };
}

const seats: Side[] = [];
const A = fake("9.1.1", seats);
const B = fake("9.1.2", seats);

vi.mock("../core.ts", async (original) => {
  const core = await original<typeof import("../core.ts")>();
  const nine: Chapter = {
    n: 9,
    name: "Fake",
    trains: "",
    sections: [{ id: "9.1", name: "Fake", trains: "", challenges: [A, B] }],
    path: [
      {
        kind: "mixed",
        words: "The mixed round.",
        parts: [
          { challenge: "9.1.1", level: { white: "L1", black: "L2" }, count: 3 },
          { challenge: "9.1.2", level: "L2", count: 3 },
        ],
        order: "turns",
        oneSide: true,
        questions: 6,
        minutes: 5,
        passMark: "mixed pass",
      },
      {
        // One challenge in two parts, one per level, and no one side for the round.
        kind: "mixed",
        words: "The levels round.",
        parts: [
          { challenge: "9.1.1", level: "L1", count: 2 },
          { challenge: "9.1.1", level: "L2", count: 3 },
          { challenge: "9.1.2", level: "L2", count: 1 },
        ],
        order: "random",
        oneSide: false,
        questions: 6,
        minutes: 5,
        passMark: "levels pass",
      },
    ],
  };
  return { ...core, CHAPTERS: [...core.CHAPTERS, nine] };
});

const { makeRound, scoreSheet, NO_PROGRESS } = await import("./rounds.ts");

describe("a mixed round", () => {
  it("draws one side for the round, picks each part's level by it, and takes turns", () => {
    seats.length = 0;
    const r = makeRound({ chapter: 9, step: 0 }, "mixed-seed", NO_PROGRESS);
    expect(new Set(seats)).toEqual(new Set([r.side]));
    expect(r.parts.map((p) => `${p.challenge.id} ${p.level.id}`)).toEqual([`9.1.1 ${r.side === "white" ? "L1" : "L2"}`, "9.1.2 L2"]);
    expect(r.items.map((i) => i.challenge)).toEqual(["9.1.1", "9.1.2", "9.1.1", "9.1.2", "9.1.1", "9.1.2"]);
    expect([r.questions, r.minutes, r.passMark, r.title]).toEqual([6, 5, "mixed pass", "The mixed round"]);
  });

  it("counts each challenge's share, questions left included", () => {
    const r = makeRound({ chapter: 9, step: 0 }, "mixed-seed", NO_PROGRESS);
    const l = r.parts[0]!.level.id;
    const sheet = scoreSheet(r, {
      answered: [
        { challenge: "9.1.1", level: l, secs: 2, verdict: "right", score: { right: true, mistakes: [], counts: {} } },
        { challenge: "9.1.2", level: "L2", secs: 4, verdict: "wrong", score: { right: false, mistakes: ["X"], counts: { "Pieces right": 2 } } },
      ],
      looks: [3],
      moves: [],
      back: [],
      left: [
        { challenge: "9.1.1", level: l, questions: 2 },
        { challenge: "9.1.2", level: "L2", questions: 2 },
      ],
      ended: "time",
    });
    expect(sheet.shares).toEqual([
      { challenge: "9.1.1", level: l, right: 1, total: 3 },
      { challenge: "9.1.2", level: "L2", right: 0, total: 3 },
    ]);
    expect([sheet.right, sheet.total, sheet.avgAnswer, sheet.avgLook]).toEqual([1, 6, 3, 3]);
    expect(sheet.counts).toEqual([["Pieces right", 2]]);
  });
});

describe("a mixed round with several levels of one challenge", () => {
  const play = { chapter: 9, step: 1 };
  const answer = (level: string, right: boolean) => ({
    challenge: "9.1.1",
    level,
    secs: 1,
    verdict: right ? ("right" as const) : ("wrong" as const),
    score: { right, mistakes: right ? [] : ["X"], counts: {} },
  });

  it("keeps each part's own level and side, and mixes all the parts together", () => {
    seats.length = 0;
    const r = makeRound(play, "levels-seed", NO_PROGRESS);
    expect(r.parts.map((p) => `${p.challenge.id} ${p.level.id}`)).toEqual(["9.1.1 L1", "9.1.1 L2", "9.1.2 L2"]);
    expect(seats).toEqual(["white", "black", "black"]);
    expect(r.oneSide).toBe(false);
    expect(r.items.map((i) => `${i.challenge} ${i.level}`).sort()).toEqual(["9.1.1 L1", "9.1.1 L1", "9.1.1 L2", "9.1.1 L2", "9.1.1 L2", "9.1.2 L2"]);
    expect([r.questions, r.minutes, r.passMark]).toEqual([6, 5, "levels pass"]);
  });

  it("asks a missed item once, the parts of its challenge taking turns", () => {
    const back = [1, 2, 3, 4, 5, 6].map((n) => ({ challenge: "9.1.1", facts: { n }, rounds: 2 }));
    const r = makeRound(play, "levels-back", { back, places: {} });
    // L1 takes the first 2, L2 the next 3, and the sixth waits.
    expect(r.asked.map((a) => a.facts)).toEqual([1, 2, 3, 4, 5].map((n) => ({ n })));
    const questions = r.items.map((i) => (i.first() as Ask).question);
    for (const n of [1, 2, 3, 4, 5, 6]) expect(questions.filter((q) => q === `9.1.1 back {"n":${n}}`), `n ${n}`).toHaveLength(n < 6 ? 1 : 0);
  });

  it("counts each level's share apart from its challenge's other levels", () => {
    const r = makeRound(play, "levels-seed", NO_PROGRESS);
    const sheet = scoreSheet(r, {
      answered: [answer("L1", true), answer("L1", false), answer("L2", true), answer("L2", true), answer("L2", true)],
      looks: [],
      moves: [],
      back: [],
      left: [{ challenge: "9.1.2", level: "L2", questions: 1 }],
      ended: "time",
    });
    expect(sheet.shares).toEqual([
      { challenge: "9.1.1", level: "L1", right: 1, total: 2 },
      { challenge: "9.1.1", level: "L2", right: 3, total: 3 },
      { challenge: "9.1.2", level: "L2", right: 0, total: 1 },
    ]);
  });
});
