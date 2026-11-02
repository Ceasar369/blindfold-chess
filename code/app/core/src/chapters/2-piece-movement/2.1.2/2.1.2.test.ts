import { describe, expect, it } from "vitest";
import { seeded } from "../../../random/index.ts";
import { reachOnEmpty } from "../../../reach/index.ts";
import type { Answer, Ask, Did, Facts, Level, Placed, Square, Told } from "../../../shape/index.ts";
import { challenge, knightRoute, LEVELS, MISTAKES, movesTo, routeFact, type Route } from "./index.ts";

const level = (id: string): Level => LEVELS.find((l) => l.id === id)!;
const answer = (a: Answer): Did => ({ did: "answer", answer: a });
const clicked = (...squares: Square[]) => answer({ kind: "squares", squares });
const route = (from: Square, to: Square, pawns: Square[] = []): Route => ({ from, to, pawns });

function play(id: string, r: Route, did: Did) {
  const it = knightRoute(level(id), r);
  const ask = it.first() as Ask;
  const told = it.next(did) as Told;
  return { ask, told, done: it.next({ did: "press" }) };
}

// A shortest route, found the slow way: every landing tried.
function shortest(r: Route): Square[] {
  const dist = movesTo(r.to, r.pawns);
  const out: Square[] = [];
  for (let at = r.from; at !== r.to; ) {
    at = reachOnEmpty({ side: "white", kind: "knight" }, at).find((j) => dist.get(j) === dist.get(at)! - 1)!;
    out.push(at);
  }
  return out;
}

// Every shortest route of the empty board, as the landings between the start and the target.
function between(r: Route): Square[][] {
  const dist = movesTo(r.to);
  const from = (at: Square): Square[][] =>
    dist.get(at) === 1
      ? [[]]
      : reachOnEmpty({ side: "white", kind: "knight" }, at)
          .filter((j) => dist.get(j) === dist.get(at)! - 1)
          .flatMap((j) => from(j).map((rest) => [j, ...rest]));
  return from(r.from);
}

// Two pawns fit when each blocks a shortest route the other leaves open, and one route stays free of both.
function fit({ pawns: [a, b] }: Route, ways: Square[][]): boolean {
  const blocks = (s: Square | undefined, other: Square | undefined) => ways.some((w) => w.includes(s!) && !w.includes(other!));
  return blocks(a, b) && blocks(b, a) && ways.some((w) => !w.includes(a!) && !w.includes(b!));
}

// A round's questions, each with the pair it asks.
function asked(id: string, seed: string, back: Facts[] = []) {
  return challenge.makeRound(level(id), seeded(seed), { side: "white", back }).map((it) => {
    const ask = it.first() as Ask;
    const m = ask.question.match(/^Take your knight from ([a-h][1-8]) to ([a-h][1-8]) in the fewest moves\.(?: Your pawns stand on ([a-h][1-8]) and ([a-h][1-8])\.)?$/)!;
    return { it, ask, r: route(m[1] as Square, m[2] as Square, m[3] ? [m[3] as Square, m[4] as Square] : []) };
  });
}

// What a level's board shows for a pair.
const board = (pieces: Placed[], lit: Square[]) => ({ seat: "white", names: false, pieces, lit });
const mine = (r: Route): Placed[] => [{ side: "white", kind: "knight", square: r.from }, ...r.pawns.map((s): Placed => ({ side: "white", kind: "pawn", square: s }))];
const SHOWN: Record<string, (r: Route) => unknown> = {
  L1: (r) => board(mine(r), [r.to]),
  L2: (r) => board(mine(r), [r.to]),
  L3: (r) => board(mine(r), [r.to]),
  L4: () => board([], []),
  L5: () => null,
};

describe("2.1.2 Find the knight's route", () => {
  it("copies the card's level table", () => {
    expect(LEVELS.map((l) => [l.id, ...l.dials.map((d) => d.value), l.questions, l.minutes, l.seconds])).toEqual([
      ["L1", "My knight and the target", "2", "None", "Click", 8, 2, null],
      ["L2", "My knight and the target", "3", "None", "Click", 8, 3, null],
      ["L3", "My knight, the target and my two pawns, all question long", "3", "2, in every question", "Click", 8, 4, null],
      ["L4", "An empty board, no edge names: never the knight, the target or the pawns", "2 or 3", "2, in 4 of 8 questions", "Click", 8, 5, null],
      ["L5", "No board until I reveal it", "3 or 4", "2, in 4 of 8 questions", "Click", 8, 5, null],
    ]);
    expect(challenge.needs).toBe("2.1.1 L3. From L5, 2.1.1 L4.");
  });

  // The set-up positions of the pawn questions: given time while every other test runs too.
  it("plays a whole round at each level, every answer right", { timeout: 60_000 }, () => {
    const moves: Record<string, number[]> = { L1: [2], L2: [3], L3: [3], L4: [2, 3], L5: [3, 4] };
    const withPawns: Record<string, number> = { L1: 0, L2: 0, L3: 8, L4: 4, L5: 4 };
    for (const l of LEVELS) {
      const items = asked(l.id, `2.1.2 ${l.id}`);
      expect(items).toHaveLength(8);
      expect(items.filter(({ r }) => r.pawns.length).length, l.id).toBe(withPawns[l.id]);
      for (const { it, ask, r } of items) {
        const fewest = movesTo(r.to, r.pawns).get(r.from)!;
        expect(moves[l.id]).toContain(fewest);
        // A pawn question takes 3 moves or more, and at L4 exactly 3.
        if (r.pawns.length) expect(l.id === "L4" ? [3] : [3, 4]).toContain(fewest);
        expect(ask.input).toEqual(l.id === "L5" ? { how: "click-route", reveal: board([], []) } : { how: "click-route" });
        expect(ask.board).toEqual(SHOWN[l.id]!(r));
        const way = shortest(r);
        expect((it.next(clicked(...way)) as Told).line).toBe(`Right: ${way.join(", ")}, in ${fewest} moves.`);
        expect(it.next({ did: "press" })).toEqual({ step: "done", back: null });
      }
    }
  });

  // Many rounds: the pawns are never decorative, and the starts and targets vary.
  it("puts two pawns that each block a route and leave one free, never on the ends of the board", { timeout: 60_000 }, () => {
    // The old card's b1 to e5 around d2 and f3: with d2 there, f3 blocks nothing more.
    expect(fit(route("b1", "e5", ["d2", "f3"]), between(route("b1", "e5")))).toBe(false);
    expect(fit(route("b1", "e5", ["a3", "f3"]), between(route("b1", "e5")))).toBe(true);
    const starts = new Set<Square>();
    const targets = new Set<Square>();
    for (const [i, id] of ["L3", "L4", "L5", "L3", "L4", "L5"].entries()) {
      for (const { r } of asked(id, `2.1.2 pawns ${i}`)) {
        starts.add(r.from);
        targets.add(r.to);
        if (!r.pawns.length) continue;
        expect(r.pawns).toHaveLength(2);
        expect(r.pawns.every((s) => s !== r.from && s !== r.to && s[1] !== "1" && s[1] !== "8"), `${r.from} ${r.to} ${r.pawns}`).toBe(true);
        expect(fit(r, between(r)), `${r.from} ${r.to} ${r.pawns}`).toBe(true);
        // One shortest route stays free: the pawns never make the way longer.
        expect(movesTo(r.to, r.pawns).get(r.from)).toBe(movesTo(r.to).get(r.from));
      }
    }
    expect(starts.size).toBeGreaterThan(20);
    expect(targets.size).toBeGreaterThan(20);
  });

  it("makes a round of 4 pawn questions at L4 and L5 whatever comes back", { timeout: 60_000 }, () => {
    const pawned = (id: string, back: Facts[]) => asked(id, `2.1.2 back ${id}`, back).filter(({ r }) => r.pawns.length).length;
    const withPawns = [{ from: "b1", to: "e5", pawns: ["a3", "f3"] }, { from: "b1", to: "g5", pawns: ["c3", "f3"] }];
    const plain = [{ from: "c1", to: "g6" }, { from: "a1", to: "c2" }, { from: "g1", to: "e5" }];
    for (const id of ["L4", "L5"]) {
      expect(pawned(id, withPawns), id).toBe(4);
      expect(pawned(id, plain), id).toBe(4);
      expect(pawned(id, [...withPawns, ...plain]), id).toBe(4);
    }
    // A pair comes back with its own pawns.
    const back = asked("L4", "2.1.2 back L4", withPawns).map(({ r }) => r);
    for (const f of withPawns) expect(back).toContainEqual(route(f.from as Square, f.to as Square, f.pawns as Square[]));
  });

  // Record line 2-109: a missed pair comes back in a round that asks it; a round past its count leaves the rest.
  it("asks the first of its count of the routes coming back, and the rest wait", () => {
    const back = [{ from: "g1", to: "e5" }, { from: "b1", to: "d4" }, { from: "g1", to: "f3" }, { from: "a1", to: "c2" }];
    for (const f of back) expect(routeFact(f), `${f.from} ${f.to}`).not.toBe(null);
    expect(challenge.asks!(level("L2"), { side: "white", count: 3, back: [{ square: "c4" }, ...back] })).toEqual(back.slice(0, 3));
    expect(challenge.asks!(level("L2"), { side: "white", back })).toEqual(back);
    const items = challenge.makeRound(level("L2"), seeded("2.1.2 asks"), { side: "white", count: 3, back });
    expect(items).toHaveLength(3);
    const asked = items.map((i) => (i.first() as Ask).question);
    for (const f of back.slice(0, 3)) expect(asked).toContain(`Take your knight from ${f.from} to ${f.to} in the fewest moves.`);
  });

  it("judges the card's L1 example: g1 to e5", () => {
    const { ask, told } = play("L1", route("g1", "e5"), clicked("f3", "e5"));
    expect(ask.question).toBe("Take your knight from g1 to e5 in the fewest moves.");
    expect(ask.board?.pieces).toEqual([{ side: "white", kind: "knight", square: "g1" }]);
    expect(told.line).toBe("Right: f3, e5, in 2 moves.");
    const wrong = play("L1", route("g1", "e5"), clicked("h3", "f4", "e5"));
    expect(wrong.told.line).toBe("No: f4 to e5 is no knight move. The only route: g1, f3, e5.");
    expect(wrong.told.score.mistakes).toEqual(["A jump that is no knight move"]);
    expect(wrong.done).toEqual({ step: "done", back: { from: "g1", to: "e5" } });
  });

  it("judges the card's L2 example: b1 to d4", () => {
    expect(play("L2", route("b1", "d4"), clicked("d2", "f3", "d4")).told.line).toBe("Right: d2, f3, d4, in 3 moves.");
    const wrong = play("L2", route("b1", "d4"), clicked("d2", "f3", "e5", "c6", "d4")).told;
    expect(wrong.line).toBe(
      "No: b1 to d4 takes 3 moves, and yours took 5. One route: b1, d2, f3, d4. b1 is light and d4 dark, so the count is odd.",
    );
    expect(wrong.score.mistakes).toEqual(["A longer route"]);
  });

  it("names a wrong landing against a square that works: the card's c3 to e3", () => {
    const wrong = play("L2", route("b1", "d4"), clicked("c3", "e3", "d4")).told;
    expect(wrong.line).toBe("No: c3 to e3 is no knight move. e2, the rank beside, was. One route: b1, c3, e2, d4.");
    expect(wrong.score.mistakes).toEqual(["The rank beside"]);
    // From c3 toward d4, e2 and b5 work.
    const kind = (s: Square) => play("L2", route("b1", "d4"), clicked("c3", s, "d4")).told.score.mistakes;
    expect(kind("f2")).toEqual(["The file beside"]);
    expect(kind("d7")).toEqual(["The board turned"]);
    expect(kind("g5")).toEqual(["The files reversed"]);
    expect(kind("e7")).toEqual(["The ranks reversed"]);
  });

  it("judges the card's L3 example: b1 to e5, around my pawns", () => {
    const r = route("b1", "e5", ["a3", "f3"]);
    const { ask, told } = play("L3", r, clicked("d2", "c4", "e5"));
    expect(ask.question).toBe("Take your knight from b1 to e5 in the fewest moves. Your pawns stand on a3 and f3.");
    expect(ask.board?.pieces).toEqual([
      { side: "white", kind: "knight", square: "b1" },
      { side: "white", kind: "pawn", square: "a3" },
      { side: "white", kind: "pawn", square: "f3" },
    ]);
    expect(ask.board?.lit).toEqual(["e5"]);
    expect(told.verdict).toBe("right");
    const wrong = play("L3", r, clicked("a3", "c4", "e5"));
    expect(wrong.told.line).toBe("No: a3 holds your pawn. The only route: b1, d2, c4, e5.");
    expect(wrong.told.score.mistakes).toEqual(["A landing on my pawn"]);
    expect(wrong.done).toEqual({ step: "done", back: { from: "b1", to: "e5", pawns: ["a3", "f3"] } });
    // A jump over my pawn is fine: b1 to d2 jumps over c2.
    expect(play("L3", route("b1", "e5", ["c2", "f3"]), clicked("d2", "c4", "e5")).told.verdict).toBe("right");
  });

  it("judges the card's L4 example: c1 to g6, on an empty board", () => {
    const { ask, told } = play("L4", route("c1", "g6"), clicked("d3", "f4", "g6"));
    expect([ask.board?.pieces, ask.board?.lit, told.verdict]).toEqual([[], [], "right"]);
    expect(play("L4", route("c1", "g6"), clicked("d3", "f5", "g6")).told.line).toBe(
      "No: d3 to f5 is no knight move. e5, the file beside, was. One route: c1, d3, e5, g6.",
    );
    // A pawn question there asks the same, and its board stays empty.
    const pawned = play("L4", route("b1", "e5", ["a3", "f3"]), clicked("d2", "c4", "e5"));
    expect([pawned.ask.board?.pieces, pawned.ask.board?.lit, pawned.told.verdict]).toEqual([[], [], "right"]);
  });

  it("judges the card's L5 example: b1 to g5, on the revealed board", () => {
    expect(play("L5", route("b1", "g5"), clicked("c3", "e4", "g5")).told.verdict).toBe("right");
    const wrong = play("L5", route("b1", "g5"), clicked("c3", "e4", "f6")).told;
    expect(wrong.line).toBe("No: your route ends on f6, not g5. One route: b1, c3, e4, g5.");
    expect(wrong.score.mistakes).toEqual(["A route ending elsewhere"]);
    // My pawns are named in the question, and a landing on one is wrong there too.
    const pawned = play("L5", route("b1", "e5", ["a3", "f3"]), clicked("a3", "c4", "e5"));
    expect(pawned.ask.question).toBe("Take your knight from b1 to e5 in the fewest moves. Your pawns stand on a3 and f3.");
    expect(pawned.ask.board).toBe(null);
    expect(pawned.told.line).toBe("No: a3 holds your pawn. The only route: b1, d2, c4, e5.");
  });

  it("takes the start square leading, or not, and offers no None", () => {
    expect(play("L5", route("b1", "g5"), clicked("b1", "c3", "e4", "g5")).told.line).toBe("Right: c3, e4, g5, in 3 moves.");
    expect((knightRoute(level("L5"), route("b1", "g5")).first() as Ask).input).toEqual({ how: "click-route", reveal: board([], []) });
    const it = knightRoute(level("L5"), route("b1", "g5"));
    it.first();
    expect(() => it.next(answer({ kind: "none" }))).toThrow("2.1.2 offers no None button.");
  });

  it("tells the count line for two squares of one colour", () => {
    expect(play("L4", route("c1", "e5"), clicked("d3", "b4", "c6", "e5")).told.line).toBe(
      "No: c1 to e5 takes 2 moves, and yours took 4. The only route: c1, d3, e5. c1 and e5 are both dark, so the count is even.",
    );
    expect(MISTAKES).toEqual([
      "A jump that is no knight move", "The file beside", "The rank beside", "The board turned", "The files reversed", "The ranks reversed",
      "A landing on my pawn", "A route ending elsewhere", "A longer route",
    ]);
  });

  it("brings a missed pair back, and passes over anything else", () => {
    expect(routeFact({ from: "b1", to: "e5", pawns: ["a3", "f3"] })).toEqual(route("b1", "e5", ["a3", "f3"]));
    expect(routeFact({ from: "b1", to: "b1" })).toBe(null);
    expect(routeFact({ square: "b1" })).toBe(null);
    const items = challenge.makeRound(level("L2"), seeded("back"), { side: "white", back: [{ from: "b1", to: "d4" }] });
    expect(items.map((i) => (i.first() as Ask).question)).toContain("Take your knight from b1 to d4 in the fewest moves.");
  });
});
