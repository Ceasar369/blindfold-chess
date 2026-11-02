import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { changes } from "../../../notation/index.ts";
import type { LinesPack } from "../../../packs/index.ts";
import { fromFen, standsValue } from "../../../positions/index.ts";
import { seeded } from "../../../random/index.ts";
import { playLine } from "../../../rules/index.ts";
import type { Ask, Did, Item, Level, Show, Square, Stands, Step, Told } from "../../../shape/index.ts";
import { standsAfter } from "../../../thread/index.ts";
import { type Line, sequence } from "../sequences.ts";
import { challenge, checkpoints, judge, LEVELS, MISTAKES, nameItem } from "./index.ts";

const level = (id: string): Level => LEVELS.find((l) => l.id === id)!;
const pack = JSON.parse(readFileSync(join(import.meta.dirname, "..", "..", "..", "..", "packs", "lines.json"), "utf8")) as LinesPack;
const line = (sans: string, white: number, black: number, game = `example-${white}-${black}`): Line => ({ game, white, black, sans: sans.split(" ") });

// The card's four examples, and the line L1's miss brings back.
const L1 = line("e4 e5 Nf3 d6 d4 Nc6 dxe5 dxe5", 1352, 1365);
const L2 = line("Nf3 Nc6 Nc3 e5 d4 exd4 Nxd4 Qf6", 1384, 1222);
const L3 = line("e4 e6 Nf3 Nc6 Nc3 e5 d4 d6 dxe5 dxe5 Qxd8+ Kxd8", 1439, 1355);
const L4 = line("e4 d5 exd5 Qxd5 Nc3 Qa5 Nf3 c6 Bc4 Nf6 O-O Bf5 d3 e6 Re1 Bb4 Bd2 O-O a3 Bd6", 1466, 1237);
const BACK = line("e4 e5 Nf3 Nf6 Nxe5 Bd6 Nc4 Nxe4", 1456, 1381);

const piece = (side: "white" | "black", kind: string): Stands => ({ side, kind: kind as never });
const choose = (s: Stands): Did => ({ did: "answer", answer: { kind: "choice", value: standsValue(s) } });

// The told line for one square of a sequence after all its moves.
const told = (l: Line, square: Square, answer: Stands) => {
  const seq = sequence(l);
  return judge(seq, square, seq.moves.length, answer).told;
};

// Plays an item to its end: each move shown is read and played, each
// question answered by `answer`. Returns every step.
function walk(item: Item, answer: (square: Square, now: Stands, ask: Ask) => Did) {
  const sans: string[] = [];
  const steps: Step[] = [];
  let step = item.first();
  while (step.step !== "done") {
    steps.push(step);
    if (step.step === "show") {
      sans.push(step.move!.replace(/^\d+\.(\.\.)?\s/, ""));
      step = item.next({ did: "press" });
    } else if (step.step === "ask") {
      const square = step.question.match(/^What stands on ([a-h][1-8]) now\?$/)![1] as Square;
      const pos = playLine(fromFen("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"), sans).positions.at(-1)!;
      step = item.next(answer(square, pos.board[square] ?? null, step));
    } else step = item.next({ did: "press" });
  }
  return { steps, done: step };
}

describe("5.1.1 Name what stands there now", () => {
  it("copies the card's level table", () => {
    expect(LEVELS.map((l) => [l.id, l.path, l.seat, l.questions, l.minutes, ...l.dials.map((d) => d.value)])).toEqual([
      ["L1", "Name what stands there now, a checkpoint every full move.", "round", 12, 4, "8", "2 half-moves", "An empty board, the square lit", "Piece picker"],
      ["L2", "Name what stands there now, no board.", null, 12, 5, "8", "2 half-moves", "No board, the square named", "Piece picker"],
      ["L3", "Name what stands there now, 12 half-moves.", null, 12, 5, "12", "6 half-moves", "No board, the square named", "Piece picker"],
      ["L4", "Name what stands there now, through move 10.", null, 10, 5, "20", "10 half-moves", "No board, the square named", "Piece picker"],
    ]);
    expect(LEVELS[0]!.passMark).toBe("Pass mark for 5.1.1 L1 to L4: the right answers in one round, and my average time per move. My practice sets it.");
  });

  it("plays a whole round at each level from the pack, every answer right", () => {
    for (const l of LEVELS) {
      const items = challenge.makeRound(l, seeded(`5.1.1 ${l.id}`), { side: "black", back: [], packs: { "lines.json": pack } });
      expect(items.reduce((n, i) => n + i.questions, 0)).toBe(l.questions);
      expect(new Set(items.map((i) => (i.first() as Show).lines![0])).size).toBe(items.length);
      for (const item of items) {
        const { steps, done } = walk(item, (_sq, now) => choose(now));
        const shows = steps.filter((s): s is Show => s.step === "show");
        expect(shows).toHaveLength({ L1: 8, L2: 8, L3: 12, L4: 20 }[l.id]!);
        expect(shows.every((s) => s.button === "Next" && s.time === "move")).toBe(true);
        expect(shows[0]!.lines![0]).toMatch(/^From a Lichess game of January 2013, players rated \d+ and \d+\.$/);
        const asks = steps.filter((s): s is Ask => s.step === "ask");
        expect(asks).toHaveLength(item.questions);
        for (const a of asks) {
          expect(a.board).toEqual(l.id === "L1" ? { seat: "black", names: false, pieces: [], lit: [a.question.slice(15, 17)] } : null);
          expect(a.input.how).toBe("choose");
        }
        expect(steps.filter((s): s is Told => s.step === "told").every((t) => t.verdict === "right" && t.line.startsWith("Right: "))).toBe(true);
        expect(done).toEqual({ step: "done", back: null });
      }
    }
  });

  it("asks each checkpoint's squares as the card says", () => {
    for (const [l, every, n] of [[L1, 2, 1], [L3, 6, 3], [L4, 10, 5]] as const) {
      for (let s = 0; s < 40; s++) {
        const seq = sequence(l);
        const plan = checkpoints(seq, every, seeded(`cp ${s}`))!;
        expect(plan.map((c) => c.after)).toEqual(Array.from({ length: seq.moves.length / every }, (_, i) => (i + 1) * every));
        const asked = plan.flatMap((c) => c.squares);
        expect(new Set(asked).size).toBe(asked.length);
        plan.forEach((c, i) => {
          expect(c.squares).toHaveLength(n);
          const own = new Set(seq.moves.slice(c.after - every, c.after).flatMap(changes));
          const before = new Set(seq.moves.slice(0, c.after - every).flatMap(changes));
          const mine = c.squares.filter((sq) => own.has(sq));
          expect(mine.length).toBe(i === 0 ? n : Math.ceil(n / 2));
          for (const sq of c.squares) expect(own.has(sq) || before.has(sq)).toBe(true);
        });
      }
    }
  });

  it("judges the card's L1 example: e5, on an empty board", () => {
    const item = nameItem(level("L1"), sequence(L1), [{ after: 8, squares: ["e5"] }], "white");
    const shown: string[] = [];
    let step = item.first();
    while (step.step === "show") {
      shown.push(step.move!);
      step = item.next({ did: "press" });
    }
    expect(shown).toEqual(["1. e4", "1... e5", "2. Nf3", "2... d6", "3. d4", "3... Nc6", "4. dxe5", "4... dxe5"]);
    expect(step).toMatchObject({ question: "What stands on e5 now?", board: { seat: "white", names: false, pieces: [], lit: ["e5"] } });
    expect((step as Ask).input).toMatchObject({ how: "choose" });
    expect(((step as Ask).input as { choices: { words: string }[] }).choices.map((c) => c.words)).toEqual([
      "White's king", "White's queen", "White's rook", "White's bishop", "White's knight", "White's pawn",
      "Black's king", "Black's queen", "Black's rook", "Black's bishop", "Black's knight", "Black's pawn", "Empty",
    ]);
    expect((item.next(choose(piece("black", "pawn"))) as Told).line).toBe("Right: Black's pawn stands on e5, since 4... dxe5.");
    const wrong = told(L1, "e5", piece("white", "pawn"));
    expect(wrong.line).toBe("No: Black's pawn stands on e5, since 4... dxe5. White's pawn stood there until 4... dxe5 took it.");
    expect(wrong.score).toEqual({ right: false, mistakes: ["An old square"], counts: { "Lost the thread at a capture": 1 } });
  });

  it("judges the card's L2 example: f3, picked from 13, no board", () => {
    expect(told(L2, "f3", null).line).toBe("Right: f3 is empty since 4. Nxd4.");
    const seq = sequence(L2);
    const item = nameItem(level("L2"), seq, [{ after: 8, squares: ["f3"] }], "white");
    let step = item.first();
    while (step.step === "show") step = item.next({ did: "press" });
    expect(step).toMatchObject({ question: "What stands on f3 now?", board: null, input: { how: "choose" } });
    expect(item.next(choose(null))).toMatchObject({ verdict: "right", line: "Right: f3 is empty since 4. Nxd4." });
    const again = nameItem(level("L2"), seq, [{ after: 8, squares: ["f3"] }], "white");
    step = again.first();
    while (step.step === "show") step = again.next({ did: "press" });
    expect(again.next(choose(piece("white", "knight")))).toMatchObject({
      verdict: "wrong",
      line: "No: f3 is empty since 4. Nxd4. White's knight stood there until 4. Nxd4 moved it.",
    });
    expect(again.next({ did: "press" })).toEqual({ step: "done", back: { game: L2.game, misses: [{ ply: 7, kind: "capture" }] } });
  });

  it("judges the card's L3 example: d8, after 12 half-moves", () => {
    const seq = sequence(L3);
    const plan = checkpoints(seq, 6, seeded("L3"))!;
    expect(plan.map((c) => c.squares.length)).toEqual([3, 3]);
    expect(told(L3, "d8", piece("black", "king")).line).toBe("Right: Black's king stands on d8, since 6... Kxd8.");
    expect(judge(seq, "d8", 12, { side: "black", kind: "king" }).told.verdict).toBe("right");
    expect(told(L3, "d8", piece("black", "queen")).line).toBe("No: Black's king stands on d8, since 6... Kxd8. Black's queen stood there until 6. Qxd8+ took it.");
  });

  it("judges the card's L4 example: f1, through move 10", () => {
    expect(told(L4, "f1", null).line).toBe("Right: f1 is empty since 8. Re1.");
    const wrong = told(L4, "f1", piece("white", "rook"));
    expect(wrong.line).toBe("No: f1 is empty since 8. Re1. White's rook stood there until 8. Re1 moved it.");
    expect(wrong.score.counts).toEqual({ "Lost the thread at a move": 1 });
  });

  it("names each of the card's mistakes, the first that fits", () => {
    const kind = (l: Line, sq: Square, a: Stands) => told(l, sq, a).score.mistakes;
    expect(kind(L1, "e5", piece("white", "pawn"))).toEqual(["An old square"]);
    expect(kind(L1, "d6", piece("black", "pawn"))).toEqual(["An old square"]);
    expect(told(L1, "d6", piece("black", "pawn")).line).toBe("No: d6 is empty since 4... dxe5. Black's pawn stood there until 4... dxe5 moved it.");
    expect(kind(L1, "c6", piece("black", "pawn"))).toEqual(["The rank beside"]);
    expect(told(L1, "c6", piece("black", "pawn")).line).toBe("No: Black's knight stands on c6, since 3... Nc6. Black's pawn stands on c7, the rank beside.");
    expect(kind(L1, "f3", piece("black", "knight"))).toEqual(["The board turned"]);
    expect(kind(L3, "d8", null)).toEqual(["A piece left out"]);
    expect(kind(L2, "f6", piece("white", "queen"))).toEqual(["The wrong side"]);
    expect(kind(L1, "f3", piece("white", "bishop"))).toEqual(["The wrong piece"]);
    expect(kind(L1, "d7", piece("black", "knight"))).toEqual(["A piece where nothing stands"]);
    expect(kind(L1, "f3", piece("black", "bishop"))).toEqual(["Another answer"]);
    // Each miss says why, by its kind: the card's own words where it gives them.
    expect(told(L3, "d8", null).line).toBe("No: Black's king stands on d8, since 6... Kxd8. d8 was never empty.");
    expect(told(L2, "f6", piece("white", "queen")).line).toBe("No: Black's queen stands on f6, since 4... Qf6. It is Black's queen, not White's.");
    expect(told(L1, "f3", piece("white", "bishop")).line).toBe("No: White's knight stands on f3, since 2. Nf3. It is a knight, not a bishop.");
    expect(told(L1, "d7", piece("black", "knight")).line).toBe(
      "No: d7 is empty since 2... d6, and no Black knight stood there or stands one square off it.",
    );
    expect(told(L1, "f3", piece("black", "bishop")).line).toBe("No: White's knight stands on f3, since 2. Nf3. Black's bishop never stood there.");
    // Empty, for a square empty before a move landed on it.
    expect(told(L1, "e4", null).line).toBe("No: White's pawn stands on e4, since 1. e4. e4 was empty until 1. e4.");
    expect(MISTAKES).toEqual([
      "An old square", "The file beside", "The rank beside", "The board turned", "The files reversed", "The ranks reversed",
      "A piece left out", "The wrong side", "The wrong piece", "A piece where nothing stands", "Another answer",
    ]);
  });

  it("brings L1's miss back: another line with a capture at the 8th half-move, its checkpoint asking that move's square", () => {
    const missed = nameItem(level("L1"), sequence(L1), [{ after: 8, squares: ["e5"] }], "white");
    let step = missed.first();
    while (step.step === "show") step = missed.next({ did: "press" });
    missed.next(choose(piece("white", "pawn")));
    const back = (missed.next({ did: "press" }) as { back: unknown }).back;
    expect(back).toEqual({ game: L1.game, misses: [{ ply: 8, kind: "capture" }] });
    const lines: LinesPack = { first: [{ ...L1, plies: 60 }, { ...BACK, plies: 60 }, ...pack.first.slice(0, 40)], afterOpening: [], mid: [] };
    for (let s = 0; s < 10; s++) {
      const items = challenge.makeRound(level("L1"), seeded(`back ${s}`), { side: "white", back: [back as never], packs: { "lines.json": lines } });
      expect(items).toHaveLength(3);
      const firsts = items.map((i) => (i.first() as Show).lines![0]);
      expect(firsts).not.toContain("From a Lichess game of January 2013, players rated 1352 and 1365.");
      // The line coming back holds a capture at its 8th half-move, and the checkpoint after it asks one of its squares.
      const comes = items.find((i) => {
        const { steps } = walk(i, (_sq, now) => choose(now));
        const sans = steps.filter((x): x is Show => x.step === "show").map((x) => x.move!.replace(/^\d+\.(\.\.)?\s/, ""));
        const eighth = sequence({ game: "", white: 0, black: 0, sans }).moves[7]!;
        if (!eighth.captured) return false;
        const lastAsk = steps.filter((x): x is Ask => x.step === "ask").at(-1)!;
        return changes(eighth).includes(lastAsk.question.slice(15, 17) as Square);
      });
      expect(comes).toBeDefined();
    }
    // The card's own line comes back so: its checkpoint after 4... Nxe4 may ask e4.
    const seq = sequence(BACK);
    expect(changes(seq.moves[7]!)).toEqual(["f6", "e4"]);
    expect(standsAfter(seq.thread, "e4")).toEqual({ side: "black", kind: "knight" });
  });

  // Record line 5-086: a miss takes a place of the round's sequences; one past them waits, and a miss no game can meet is let go.
  it("asks the come-backs that hold a place of its sequences, a miss no game can meet let go, the rest waiting", () => {
    const miss = (game: string, ...plies: number[]) => ({ game, misses: plies.map((ply) => ({ ply, kind: "capture" })) });
    const [a, b, c, none] = [miss("a", 8), miss("b", 8, 4), miss("c", 8), { game: "d", misses: [] }];
    const unmeetable = miss("z", 99);
    const facts = (back: unknown[], count?: number) => ({ side: "white" as const, count, back: back as never });
    // L1's 12 questions are 3 sequences: a takes 1 place, b 2, so c waits.
    expect(challenge.asks!(level("L1"), facts([7, { game: 1 }, a, b, c, none]))).toEqual([a, b]);
    expect(challenge.asks!(level("L1"), facts([a, none, c, b]))).toEqual([a, none, c]);
    // A miss no game can meet is asked, and let go: it holds its place and ends.
    expect(challenge.asks!(level("L1"), facts([a, unmeetable, c, b]))).toEqual([a, unmeetable, c]);
    // L4 holds 1 sequence, L3 2; a mixed round's count sets its own.
    expect(challenge.asks!(level("L4"), facts([a, b, c]))).toEqual([a]);
    expect(challenge.asks!(level("L3"), facts([a, b, c]))).toEqual([a, b]);
    expect(challenge.asks!(level("L1"), facts([a, b, c], 4))).toEqual([a]);
  });

  it("gives one seed one round", () => {
    const qs = (seed: string) =>
      challenge.makeRound(level("L3"), seeded(seed), { side: "white", back: [], packs: { "lines.json": pack } }).map((i) => (i.first() as Show).lines![0]);
    expect(qs("same")).toEqual(qs("same"));
  });
});
