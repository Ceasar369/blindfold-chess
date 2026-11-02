import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { Ask, Challenge } from "../core.ts";
import { act, begin } from "../runner/walk.ts";
import {
  NO_PROGRESS,
  addTrials,
  afterRound,
  chapterOf,
  makeRound,
  nextOf,
  packsOf,
  pathIndex,
  placeOf,
  playable,
  playedStep,
  scoreSheet,
  type Progress,
  type Results,
} from "./rounds.ts";

const asked = (round: ReturnType<typeof makeRound>) => round.items.map((i) => (i.first() as Ask).question);

describe("making a round of 1.1.1", () => {
  it("plays a path step at its level's seat, questions and minutes", () => {
    const r = makeRound({ chapter: 1, step: 0 }, "seed-1", NO_PROGRESS);
    expect(r.title).toBe("1.1.1 Find the square");
    expect(r.parts.map((p) => p.level.id)).toEqual(["L1"]);
    expect(r.side).toBe("white");
    expect(r.questions).toBe(20);
    expect(r.minutes).toBe(3);
    expect(r.step).toBe(0);
  });

  it("seats me as White at L3, and runs 2 minutes", () => {
    const l3 = makeRound({ chapter: 1, step: 9 }, "s", NO_PROGRESS);
    expect([l3.parts[0]!.level.id, l3.side, l3.minutes]).toEqual(["L3", "white", 2]);
  });

  it("gives the same round for the same seed", () => {
    const a = makeRound({ chapter: 1, step: 1 }, "same", NO_PROGRESS);
    const b = makeRound({ chapter: 1, step: 1 }, "same", NO_PROGRESS);
    expect(asked(a)).toEqual(asked(b));
  });

  it("mixes in what comes back for its challenge alone", () => {
    const p: Progress = {
      back: [
        { challenge: "1.1.1", facts: { square: "g3" }, rounds: 2 },
        { challenge: "1.1.2", facts: { square: "a1" }, rounds: 2 },
      ],
      places: {},
    };
    for (const seed of ["x", "y", "z"]) {
      const r = makeRound({ chapter: 1, challenge: "1.1.1", level: "L2" }, seed, p);
      expect(asked(r)).toContain("Find g3.");
      expect(r.questions).toBe(20);
    }
  });
});

describe("the path", () => {
  it("knows which steps play: chapter 1's whole path, its four challenges built; a step on a challenge not built, never", () => {
    expect(chapterOf(1).path.every(playable)).toBe(true);
    expect(playable({ kind: "level", challenge: "9.9.9", level: "L1", words: "A challenge not built." })).toBe(false);
  });

  it("plays the chapter's own order next: the challenge's next level, then the next challenge's first, never the path's next step", () => {
    const next = (challenge: string, level: string) => nextOf(makeRound({ chapter: 1, challenge, level }, "s", NO_PROGRESS))?.label;
    expect(next("1.1.1", "L2")).toBe("1.1.1 L3");
    expect(next("1.1.1", "L3")).toBe("1.1.2 L1");
    expect(next("1.1.2", "L3")).toBe("1.2.1 L1");
    expect(next("1.3.1", "L3")).toBe("The mixed round");
    // A path step plays the same: step 2 is 1.1.1 L2, and the path's step 3 is 1.2.1 L1.
    expect(nextOf(makeRound({ chapter: 1, step: 1 }, "s", NO_PROGRESS))).toMatchObject({ label: "1.1.1 L3", step: 9 });
    expect(playedStep(makeRound({ chapter: 1, challenge: "1.1.1", level: "L3" }, "s", NO_PROGRESS))).toBe(9);
  });

  // The agreed table: every level at least once, the extras on the later levels.
  it("makes chapter 1's mixed round 23 questions, the agreed number from each level, every board facing White", () => {
    const r = makeRound({ chapter: 1, step: 11 }, "mixed-23", NO_PROGRESS);
    expect([r.questions, r.items.length, r.minutes, r.oneSide]).toEqual([23, 23, 5, false]);
    const perLevel: Record<string, number> = {};
    for (const it of r.items) perLevel[`${it.challenge} ${it.level}`] = (perLevel[`${it.challenge} ${it.level}`] ?? 0) + 1;
    expect(perLevel).toEqual({
      "1.1.1 L1": 1, "1.1.1 L2": 1, "1.1.1 L3": 2,
      "1.1.2 L1": 1, "1.1.2 L2": 1, "1.1.2 L3": 2,
      "1.2.1 L1": 3, "1.2.1 L2": 4,
      "1.3.1 L1": 2, "1.3.1 L2": 3, "1.3.1 L3": 3,
    });
    for (const it of r.items) {
      const board = (it.first() as Ask).board;
      if (board) expect(board.seat, `${it.challenge} ${it.level}`).toBe("white");
    }
  });

  // Each level draws its own questions, so the levels of one challenge draw apart.
  // 1.2.1 is left out: its card lets one square come twice in a level.
  it("asks no question twice in chapter 1's mixed round", () => {
    for (let i = 0; i < 100; i++) {
      const r = makeRound({ chapter: 1, step: 11 }, `no-repeat-${i}`, NO_PROGRESS);
      const keys = r.items
        .filter((it) => it.challenge !== "1.2.1")
        .map((it) => {
          const ask = it.first() as Ask;
          return `${it.challenge}|${ask.question}|${ask.board?.lit.join()}`;
        });
      expect(keys.filter((k, at) => keys.indexOf(k) !== at), `seed ${i}`).toEqual([]);
    }
  });

  it("stands on step 1 of each chapter with no progress", () => {
    expect(placeOf(NO_PROGRESS, 1)).toBe(0);
    expect(placeOf({ back: [], places: { "1": 99 } }, 1)).toBe(11);
  });
});

function results(round: ReturnType<typeof makeRound>, rightFirst: number, missed: string[]): Results {
  return {
    answered: round.items.slice(0, rightFirst + missed.length).map((item, i) => ({
      challenge: item.challenge,
      level: item.level,
      secs: 1,
      verdict: i < rightFirst ? "right" : "wrong",
      score: { right: i < rightFirst, mistakes: i < rightFirst ? [] : ["The file beside"], counts: {} },
    })),
    looks: [],
    moves: [],
    back: missed.map((sq) => ({ challenge: "1.1.1", facts: { square: sq } })),
    left: [],
    ended: "done",
  };
}

describe("the score sheet", () => {
  it("counts right answers, average time, mistakes by kind, and questions left", () => {
    const r = makeRound({ chapter: 1, step: 0 }, "s", NO_PROGRESS);
    const res = { ...results(r, 15, ["a1", "b2"]), left: [{ challenge: "1.1.1", level: "L1", questions: 3 }], ended: "time" as const };
    const sheet = scoreSheet(r, res);
    expect(sheet.right).toBe(15);
    expect(sheet.total).toBe(20);
    expect(sheet.left).toBe(3);
    expect(sheet.avgAnswer).toBe(1);
    expect(sheet.avgLook).toBeNull();
    expect(sheet.mistakes).toEqual([["The file beside", 2]]);
    expect(sheet.shares).toEqual([]);
  });
});

describe("where I stand", () => {
  const at = (n: number): Progress => ({ back: [], places: { "1": n } });
  const stand = (from: Progress, step: number) => {
    const r = makeRound({ chapter: 1, step }, `s${step}`, from);
    return afterRound(from, r, results(r, 20, [])).places;
  };

  it("moves to a later step, even when steps between were skipped", () => {
    expect(stand(NO_PROGRESS, 1)).toEqual({ "1": 1 });
    expect(stand(at(2), 7)).toEqual({ "1": 7 });
  });

  it("stays when the step played is earlier, or the same one", () => {
    expect(stand(at(5), 2)).toEqual({ "1": 5 });
    expect(stand(at(5), 5)).toEqual({ "1": 5 });
    expect(stand(NO_PROGRESS, 0)).toEqual({});
  });

  it("plays a level I pick as its step, and moves there when it is later", () => {
    const step = pathIndex(1, "1.1.1", "L3");
    expect(step).toBe(9);
    const picked = makeRound({ chapter: 1, step }, "s", NO_PROGRESS);
    expect(picked.title).toBe("1.1.1 Find the square");
    expect(picked.parts.map((p) => p.level.id)).toEqual(["L3"]);
    expect(playedStep(picked)).toBe(9);
    expect(afterRound(NO_PROGRESS, picked, results(picked, 20, [])).places).toEqual({ "1": 9 });
    expect(afterRound(at(10), picked, results(picked, 20, [])).places).toEqual({ "1": 10 });
  });

  it("moves nothing in a trial round, on no path", () => {
    const trial: Challenge = {
      built: true,
      id: "trial-stand",
      name: "Trial",
      trains: "A trial.",
      levels: [{ id: "L1", path: "Trial.", questions: 1, minutes: 1, seconds: null, seat: null, passMark: "", dials: [] }],
      makeRound: () => [],
    };
    addTrials([trial]);
    const r = makeRound({ chapter: 1, challenge: "trial-stand", level: "L1" }, "s", NO_PROGRESS);
    expect(playedStep(r)).toBeNull();
    expect(afterRound(NO_PROGRESS, r, results(r, 0, [])).places).toEqual({});
    expect(afterRound(at(5), r, results(r, 0, [])).places).toEqual({ "1": 5 });
  });
});

describe("the come-back rule", () => {
  it("brings a missed item back in my next two rounds holding its challenge", () => {
    let p: Progress = NO_PROGRESS;
    const r1 = makeRound({ chapter: 1, step: 0 }, "r1", p);
    p = afterRound(p, r1, results(r1, 19, ["g3"]));
    expect(p.back).toEqual([{ challenge: "1.1.1", facts: { square: "g3" }, rounds: 2 }]);
    expect(p.places).toEqual({}); // step 1 is where I stand already: nothing moves

    const r2 = makeRound({ chapter: 1, step: 1 }, "r2", p);
    expect(asked(r2)).toContain("Find g3.");
    p = afterRound(p, r2, results(r2, 20, []));
    expect(p.back).toEqual([{ challenge: "1.1.1", facts: { square: "g3" }, rounds: 1 }]);
    expect(p.places).toEqual({ "1": 1 });

    const r3 = makeRound({ chapter: 1, step: 0 }, "r3", p);
    expect(asked(r3)).toContain("Find g3.");
    p = afterRound(p, r3, results(r3, 20, []));
    expect(p.back).toEqual([]);
    expect(p.places).toEqual({ "1": 1 }); // an earlier step moves nothing
  });

  it("starts the count again when a returning item is missed again", () => {
    const p: Progress = { back: [{ challenge: "1.1.1", facts: { square: "g3" }, rounds: 1 }], places: {} };
    const r = makeRound({ chapter: 1, step: 0 }, "s", p);
    expect(afterRound(p, r, results(r, 19, ["g3"])).back).toEqual([{ challenge: "1.1.1", facts: { square: "g3" }, rounds: 2 }]);
  });

  it("leaves another challenge's items alone", () => {
    const p: Progress = { back: [{ challenge: "1.2.1", facts: { square: "f5" }, rounds: 2 }], places: {} };
    const r = makeRound({ chapter: 1, step: 0 }, "s", p);
    expect(afterRound(p, r, results(r, 20, [])).back).toEqual(p.back);
  });
});

// Record lines 3-088, 3-155, 6-150 and 6-201: a come-back loses one of its two
// rounds only in a round that asks it.
describe("the come-back rule, in rounds that ask", () => {
  const CORE_PACKS = join(import.meta.dirname, "..", "..", "..", "core", "packs");
  const packsFor = (play: Parameters<typeof packsOf>[0]) =>
    Object.fromEntries(packsOf(play).map((name) => [name, name.endsWith(".json") ? JSON.parse(readFileSync(join(CORE_PACKS, name), "utf8")) : readFileSync(join(CORE_PACKS, name))]));
  const nothing: Results = { answered: [], looks: [], moves: [], back: [], left: [], ended: "done" };
  const left = (p: Progress, play: Parameters<typeof makeRound>[0], seed: string) => {
    const round = makeRound(play, seed, p, seed, packsFor(play));
    return afterRound(p, round, nothing).back;
  };

  it("leaves a come-back alone in a round whose challenge asks others, and ages the ones it asks", () => {
    const ask = (level: string, ids: string[]): Challenge => ({
      built: true,
      id: "trial-asks",
      name: "Trial",
      trains: "Asking some come-backs.",
      levels: [{ id: level, path: "Trial.", questions: 1, minutes: 1, seconds: null, seat: null, passMark: "", dials: [] }],
      asks: (_level, facts) => facts.back.filter((f) => ids.includes((f as { id: string }).id)),
      makeRound: () => [],
    });
    addTrials([ask("L1", ["a"])]);
    const p: Progress = {
      back: [
        { challenge: "trial-asks", facts: { id: "a" }, rounds: 2 },
        { challenge: "trial-asks", facts: { id: "b" }, rounds: 2 },
      ],
      places: {},
    };
    const round = makeRound({ chapter: 1, challenge: "trial-asks", level: "L1" }, "s", p);
    expect(round.asked).toEqual([{ challenge: "trial-asks", facts: { id: "a" } }]);
    expect(afterRound(p, round, nothing).back).toEqual([
      { challenge: "trial-asks", facts: { id: "a" }, rounds: 1 },
      { challenge: "trial-asks", facts: { id: "b" }, rounds: 2 },
    ]);
  });

  it("3.1.1: a sequence missed at L6 waits through a round of L1 to L5 and the chapter's mixed round, and is asked in two rounds of L6", () => {
    const sequence = { start: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", before: [], sans: ["e4", "e5", "Nf3", "Nc6"], from: "From a test line." };
    const p: Progress = { back: [{ challenge: "3.1.1", facts: sequence, rounds: 2 }], places: {} };
    expect(chapterOf(3).path[11]!.kind).toBe("mixed");
    // Step 12, the mixed round of 3.1.1 L5 and 3.2.1 L5; an L1 round; an L4 round.
    expect(left(p, { chapter: 3, step: 11 }, "mixed")).toEqual(p.back);
    expect(left(p, { chapter: 3, challenge: "3.1.1", level: "L1" }, "one")).toEqual(p.back);
    expect(left(p, { chapter: 3, challenge: "3.1.1", level: "L4" }, "four")).toEqual(p.back);
    // A round of 3.2.1 holds another challenge: it is not touched either.
    expect(left(p, { chapter: 3, challenge: "3.2.1", level: "L2" }, "write")).toEqual(p.back);
    // L6 asks it, twice; then it is done.
    const six = { chapter: 3, challenge: "3.1.1", level: "L6" };
    const once = left(p, six, "six-1");
    expect(once).toEqual([{ challenge: "3.1.1", facts: sequence, rounds: 1 }]);
    expect(left({ back: once, places: {} }, six, "six-2")).toEqual([]);
  });

  it("3.1.1 and 3.2.1: a question seated on the other side waits in a mixed round, and is asked in the round of its own level", () => {
    // A question missed as White, from a 3.1.1 L1 round whose seat was White.
    const first = makeRound({ chapter: 3, challenge: "3.1.1", level: "L1" }, "miss", NO_PROGRESS);
    let w = begin(first, 0);
    w = act(w, { did: "answer", answer: { kind: "squares", squares: ["a1"] } }, 1000);
    w = act(w, { did: "press" }, 2000);
    const missed = w.results.back[0]!;
    expect(missed.challenge).toBe("3.1.1");
    const p: Progress = { back: [{ challenge: "3.1.1", facts: missed.facts, rounds: 2 }], places: {} };
    // Its own level's round asks it, and takes one of its two.
    expect(left(p, { chapter: 3, challenge: "3.1.1", level: "L2" }, "own")).toEqual([{ challenge: "3.1.1", facts: missed.facts, rounds: 1 }]);
    // The mixed round draws a side: it asks the question only when its side matches, and ages it exactly then.
    const seen = { asked: 0, waited: 0 };
    for (const seed of ["m1", "m2", "m3", "m4", "m5", "m6"]) {
      const mixed = makeRound({ chapter: 3, step: 11 }, seed, p, seed, packsFor({ chapter: 3, step: 11 }));
      const asked = mixed.asked.length === 1;
      seen[asked ? "asked" : "waited"]++;
      const questions = mixed.items.filter((i) => i.challenge === "3.1.1").map((i) => (i.first() as Ask).question);
      const again = makeRound({ chapter: 3, challenge: "3.1.1", level: "L1" }, "miss", NO_PROGRESS).items[0]!.first() as Ask;
      expect(questions.includes(again.question), seed).toBe(asked);
      expect(afterRound(p, mixed, nothing).back[0]!.rounds, seed).toBe(asked ? 1 : 2);
    }
    // Both happened among the seeds: the check above is not one-sided.
    expect(seen.asked).toBeGreaterThan(0);
    expect(seen.waited).toBeGreaterThan(0);
  });

  it("3.1.1 and 3.2.1: a round of the question's own level names the side that question keeps, whichever side the seed drew", () => {
    const first = makeRound({ chapter: 3, challenge: "3.1.1", level: "L1" }, "miss", NO_PROGRESS);
    let w = begin(first, 0);
    w = act(w, { did: "answer", answer: { kind: "squares", squares: ["a1"] } }, 1000);
    w = act(w, { did: "press" }, 2000);
    const facts = w.results.back[0]!.facts;
    // 3.1.1 reads my opponent's move: I play the other side. 3.2.1 writes mine: I play its side.
    const mover = /^(White|Black) plays/.exec((first.items[0]!.first() as Ask).question)![1] === "White" ? "white" : "black";
    const seeds = ["a", "b", "c", "d", "e", "f", "g", "h"];
    const drew = new Set(seeds.map((s) => makeRound({ chapter: 3, challenge: "3.1.1", level: "L2" }, s, NO_PROGRESS).side));
    expect(drew, "the seeds draw both sides").toEqual(new Set(["white", "black"]));
    for (const [challenge, side] of [["3.1.1", mover === "white" ? "black" : "white"], ["3.2.1", mover]] as const) {
      const p: Progress = { back: [{ challenge, facts, rounds: 2 }], places: {} };
      for (const s of seeds) {
        const round = makeRound({ chapter: 3, challenge, level: "L2" }, s, p);
        expect(round.asked, `${challenge} ${s}`).toHaveLength(1);
        expect(round.side, `${challenge} ${s}`).toBe(side);
      }
    }
  });

  // Record lines 1-036, 1-069, 1-093 and 2-069: a mixed round asks the first of its count of the squares coming back.
  // 1.1.1 takes 4 of the mixed round's 23, over three parts, one per level: each missed square is asked once.
  it("1.1.1: chapter 1's mixed round asks 4 of 10 missed squares, once each, and the other 6 keep both their rounds", () => {
    const squares = ["a1", "b3", "c5", "d7", "e2", "f4", "g6", "h8", "a5", "b7"];
    const p: Progress = { back: squares.map((square) => ({ challenge: "1.1.1", facts: { square }, rounds: 2 })), places: {} };
    expect(chapterOf(1).path[11]!.kind).toBe("mixed");
    const back = left(p, { chapter: 1, step: 11 }, "mixed");
    expect(back.map((b) => [b.facts, b.rounds])).toEqual(squares.map((square, i) => [{ square }, i < 4 ? 1 : 2]));
    const questions = asked(makeRound({ chapter: 1, step: 11 }, "mixed", p));
    for (const [i, square] of squares.entries()) expect(questions.filter((q) => q === `Find ${square}.`), square).toHaveLength(i < 4 ? 1 : 0);
  });

  // Record lines 4-075 and 4-076: a square waits for L1, a position for L2 and after.
  it("4.1.1: a square waits through a round from L2, a position through an L1 round", () => {
    const position = { fen: "8/8/4k3/5p1p/3R4/K7/8/8 w - - 0 1", from: "From a test game.", squares: ["f5", "d4", "h5", "e5", "g6"] };
    const p: Progress = {
      back: [
        { challenge: "4.1.1", facts: { square: "c8" }, rounds: 2 },
        { challenge: "4.1.1", facts: position, rounds: 2 },
      ],
      places: {},
    };
    const ages = (id: string) => left(p, { chapter: 4, challenge: "4.1.1", level: id }, `4.1.1-${id}`).map((b) => b.rounds);
    expect(ages("L1")).toEqual([1, 2]);
    expect(ages("L2")).toEqual([2, 1]);
  });

  // A missed position of 4.2.1 comes back at the level it was missed at: the others leave it, and its rounds, alone.
  describe("4.2.1: a missed position comes back at its own level", () => {
    // Positions as 4.2.1 stores them, mirrored: 10 pieces besides the kings at L3, 7 at L6, 4 at L1.
    const at3 = { fen: "1k6/8/p2R3p/5b2/1p3P2/4r3/PP6/K1R5 w - - 0 1", from: "Mirrored, a to h, from a test game.", level: "L3" };
    const at6 = { fen: "5r2/p7/8/1p4R1/1P6/P3k3/6P1/6K1 w - - 0 1", from: "Mirrored, a to h, from a test game.", level: "L6" };
    const ages = (progress: Progress, id: string, seed: string) =>
      left(progress, { chapter: 4, challenge: "4.2.1", level: id }, seed).map((b) => [(b.facts as { level?: string }).level ?? "none", b.rounds]);
    const play = (id: string): Parameters<typeof makeRound>[0] => ({ chapter: 4, challenge: "4.2.1", level: id });
    // Every question of a round answered with an empty position: all missed.
    const missAll = (round: ReturnType<typeof makeRound>) => {
      let w = begin(round, 0);
      while (!w.ended) w = act(w, w.step.step === "ask" ? { did: "answer", answer: { kind: "position", pieces: [] } } : { did: "press" }, 1000);
      return w.results;
    };

    it("waits through a round of any other level, un-aged and kept, and is asked in two rounds of its own: L3 and L6", () => {
      for (const [miss, others] of [[at3, ["L1", "L2", "L4", "L5", "L6"]], [at6, ["L1", "L2", "L3", "L4", "L5"]]] as const) {
        const p: Progress = { back: [{ challenge: "4.2.1", facts: miss, rounds: 2 }], places: {} };
        for (const id of others) expect(left(p, play(id), `other-${miss.level}-${id}`), `${miss.level} through ${id}`).toEqual(p.back);
        const once = left(p, play(miss.level), `own-1-${miss.level}`);
        expect(once).toEqual([{ challenge: "4.2.1", facts: miss, rounds: 1 }]);
        // A round of another level between the two changes nothing.
        expect(left({ back: once, places: {} }, play(others[0]), `between-${miss.level}`)).toEqual(once);
        expect(left({ back: once, places: {} }, play(miss.level), `own-2-${miss.level}`)).toEqual([]);
      }
    });

    it("brings the position back mirrored in a round of its level: the stored one is the mirror", () => {
      for (const miss of [at3, at6]) {
        const p: Progress = { back: [{ challenge: "4.2.1", facts: miss, rounds: 2 }], places: {} };
        const round = makeRound(play(miss.level), `shown-${miss.level}`, p, `shown-${miss.level}`, packsFor(play(miss.level)));
        expect(round.asked).toEqual([{ challenge: "4.2.1", facts: miss }]);
        const shown = round.items.map((i) => i.first()).filter((s) => s.step === "show") as { lines?: string[]; board?: { pieces: unknown[] } }[];
        const back = shown.find((s) => s.lines![0] === miss.from)!;
        expect(back.board!.pieces).toHaveLength(Number(miss.level === "L3" ? 12 : 9));
        // Another level's round holds neither the position nor asks it.
        const other = makeRound(play(miss.level === "L3" ? "L2" : "L1"), "elsewhere", p, "elsewhere", packsFor(play("L2")));
        expect(other.asked).toEqual([]);
        expect(other.items.map((i) => (i.first() as { lines?: string[] }).lines?.[0])).not.toContain(miss.from);
      }
    });

    it("counts the rounds left of each come-back apart: two levels, two counts", () => {
      const p: Progress = {
        back: [
          { challenge: "4.2.1", facts: at3, rounds: 2 },
          { challenge: "4.2.1", facts: at6, rounds: 1 },
        ],
        places: {},
      };
      expect(ages(p, "L3", "count-3")).toEqual([["L3", 1], ["L6", 1]]);
      expect(ages(p, "L6", "count-6")).toEqual([["L3", 2]]);
      expect(ages(p, "L1", "count-1")).toEqual([["L3", 2], ["L6", 1]]);
      // A miss at L1 joins them with its own two.
      const r = makeRound(play("L1"), "miss-1", p, "miss-1", packsFor(play("L1")));
      const after = afterRound(p, r, missAll(r));
      expect(after.back.filter((b) => (b.facts as { level: string }).level === "L1").map((b) => b.rounds)).toEqual(Array(r.items.length).fill(2));
      expect(after.back.filter((b) => (b.facts as { level: string }).level !== "L1").map((b) => [(b.facts as { level: string }).level, b.rounds])).toEqual([["L3", 2], ["L6", 1]]);
    });

    // A come-back stored before levels were kept has none, and is given none: it is asked at a level whose
    // count of pieces besides the kings is its own, and loses a round only there.
    it("asks a stored position with no level at a level of its own piece count, and nowhere else", () => {
      const sevenWithNoLevel = { fen: "5r2/p7/8/1p4R1/1P6/P3k3/6P1/6K1 w - - 0 1", from: "Mirrored, a to h, from a test game." };
      const p: Progress = { back: [{ challenge: "4.2.1", facts: sevenWithNoLevel, rounds: 2 }], places: {} };
      for (const id of ["L1", "L3", "L4"]) expect(ages(p, id, `nolevel-${id}`), id).toEqual([["none", 2]]);
      for (const id of ["L2", "L5", "L6"]) expect(ages(p, id, `nolevel-${id}`), id).toEqual([["none", 1]]);
    });

    // Reported, not fixed (the brief's two things the helper read and nobody ran).
    it("REPORTED, not fixed: a come-back missed again is stored mirrored back, and the old entry stays beside the new", () => {
      const p: Progress = { back: [{ challenge: "4.2.1", facts: at3, rounds: 2 }], places: {} };
      const round = makeRound(play("L3"), "again", p, "again", packsFor(play("L3")));
      const after = afterRound(p, round, missAll(round));
      const mine = after.back.filter((b) => (b.facts as { fen: string }).fen === at3.fen || (b.facts as { from: string }).from === "From a test game.");
      // The old entry (mirrored) aged to 1, and the new (the real position, mirrored back) holds its own 2.
      expect(mine.map((b) => [(b.facts as { from: string }).from, b.rounds])).toEqual([[at3.from, 1], ["From a test game.", 2]]);
      expect((mine[1]!.facts as { fen: string }).fen).not.toBe(at3.fen);
    });

    it("REPORTED, not fixed: a stored position 4.2.1 cannot read is never asked, so it never ages", () => {
      const junk = { fen: "junk", from: "x", level: "L3" };
      let p: Progress = { back: [{ challenge: "4.2.1", facts: junk, rounds: 2 }], places: {} };
      for (const id of ["L1", "L2", "L3", "L3", "L3", "L4", "L5", "L6"]) {
        const round = makeRound(play(id), `junk-${id}-${p.back.length}`, p, `junk-${id}`, packsFor(play(id)));
        expect(round.asked, id).toEqual([]);
        p = afterRound(p, round, { answered: [], looks: [], moves: [], back: [], left: [], ended: "done" });
      }
      expect(p.back).toEqual([{ challenge: "4.2.1", facts: junk, rounds: 2 }]);
    });
  });

  // 4.3: each opening's miss comes back in its own challenge at its own level; L1 feeds none.
  describe("4.3: a missed opening comes back in the same opening and at the same level", () => {
    const italianL2 = { opening: "italian-game", level: "L2" };
    const p: Progress = { back: [{ challenge: "4.3.1", facts: italianL2, rounds: 2 }], places: {} };
    const at = (challenge: string, id: string, progress: Progress, seed: string) => left(progress, { chapter: 4, challenge, level: id }, seed);

    it("waits through a round of L1 and L3 and of every other opening, and is asked in two rounds of its own L2", () => {
      for (const id of ["L1", "L3"]) expect(at("4.3.1", id, p, `italian-${id}`), id).toEqual(p.back);
      for (const challenge of ["4.3.2", "4.3.3", "4.3.4", "4.3.5", "4.3.6", "4.3.7", "4.3.8", "4.3.9"]) {
        for (const id of ["L1", "L2", "L3"]) expect(at(challenge, id, p, `${challenge}-${id}`), `${challenge} ${id}`).toEqual(p.back);
      }
      const once = at("4.3.1", "L2", p, "italian-own-1");
      expect(once).toEqual([{ challenge: "4.3.1", facts: italianL2, rounds: 1 }]);
      expect(at("4.3.1", "L2", { back: once, places: {} }, "italian-own-2")).toEqual([]);
    });

    it("keeps the old 4.3.1's come-backs stored and unread: no level, and an opening's name", () => {
      const old = [{ opening: "Italian Game" }, { opening: "Sicilian Defense: Najdorf Variation" }];
      const stored: Progress = { back: old.map((facts) => ({ challenge: "4.3.1", facts, rounds: 2 })), places: {} };
      for (const id of ["L1", "L2", "L3"]) expect(at("4.3.1", id, stored, `old-${id}`), id).toEqual(stored.back);
    });

    it("keeps a round of one question, at every level of every opening", () => {
      for (const [i, challenge] of ["4.3.1", "4.3.2", "4.3.3", "4.3.4", "4.3.5", "4.3.6", "4.3.7", "4.3.8", "4.3.9"].entries()) {
        for (const id of ["L1", "L2", "L3"]) {
          const round = makeRound({ chapter: 4, challenge, level: id }, `one-${i}`, NO_PROGRESS);
          expect([round.questions, round.items.length, round.minutes], `${challenge} ${id}`).toEqual([1, 1, null]);
        }
      }
    });
  });

  it("6.3.1: a game lost at L1 waits through a round of any other level, and is asked in two rounds of L1", () => {
    const even = [{ game: "bee1mrsw", white: 1368, black: 1396, fen: "8/8/1P1R4/6p1/2P4p/1K3k2/7r/8 w - - 0 46", moveNumber: 45, moved: "black" as const }];
    const game = { game: "bee1mrsw", mirrored: false, level: "L1" };
    const p: Progress = { back: [{ challenge: "6.3.1", facts: game, rounds: 2 }], places: {} };
    const at = (id: string, progress: Progress, seed: string) => {
      const play = { chapter: 6, challenge: "6.3.1", level: id };
      return afterRound(progress, makeRound(play, seed, progress, seed, { "positions.json": { memory: [], even } }), nothing).back;
    };
    for (const id of ["L2", "L3", "L4", "L5", "L6"]) expect(at(id, p, `other-${id}`), id).toEqual(p.back);
    const once = at("L1", p, "own-1");
    expect(once).toEqual([{ challenge: "6.3.1", facts: game, rounds: 1 }]);
    expect(at("L1", { back: once, places: {} }, "own-2")).toEqual([]);
  });

  it("6.2.1: a queen endgame waits through a round of the rook or the pawn endgame, and is asked in two rounds of its own", () => {
    const queen = { endgame: "queen", start: "White: king d1, queen e1. Black: king d5." };
    const p: Progress = { back: [{ challenge: "6.2.1", facts: queen, rounds: 2 }], places: {} };
    const at = (id: string, progress: Progress, seed: string) => left(progress, { chapter: 6, challenge: "6.2.1", level: id }, seed);
    for (const id of ["L4", "L5", "L6"]) expect(at(id, p, `other-${id}`), id).toEqual(p.back);
    const once = at("L2", p, "own-1");
    expect(once).toEqual([{ challenge: "6.2.1", facts: queen, rounds: 1 }]);
    expect(at("L3", { back: once, places: {} }, "own-2")).toEqual([]);
  });
});

describe("the packs a round reads", () => {
  it("names a challenge's packs once, and hands them to its round maker", () => {
    let handed: unknown = null;
    addTrials([
      {
        built: true,
        id: "trial-packs",
        name: "Trial",
        trains: "Reading packs.",
        packs: ["lines.json", "lines.json", "openings.json"],
        levels: [{ id: "L1", path: "Trial.", questions: 1, minutes: 1, seconds: null, seat: null, passMark: "", dials: [] }],
        makeRound(_level, _random, facts) {
          handed = facts.packs;
          return [];
        },
      },
    ]);
    const play = { chapter: 1, challenge: "trial-packs", level: "L1" };
    expect(packsOf(play)).toEqual(["lines.json", "openings.json"]);
    expect(packsOf({ chapter: 1, step: 0 })).toEqual([]);
    makeRound(play, "s", NO_PROGRESS, "s", { "lines.json": { first: [] } });
    expect(handed).toEqual({ "lines.json": { first: [] } });
  });
});
