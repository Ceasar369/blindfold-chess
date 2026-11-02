import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { AfterOpening, LinesPack, OpeningsPack } from "../../../packs/index.ts";
import { moveByHand, piecesOf, type Position, put, startingPosition, takeOff } from "../../../positions/index.ts";
import { seeded } from "../../../random/index.ts";
import { playLine } from "../../../rules/index.ts";
import type { Ask, Did, Done, Item, Level, Placed, Show, Told } from "../../../shape/index.ts";
import { type Line, sequence, type Sequence } from "../sequences.ts";
import { challenge, fromOpening, judge, LEVELS, MISTAKES, rebuildItem } from "./index.ts";

const level = (id: string): Level => LEVELS.find((l) => l.id === id)!;
const read = <T>(name: string): T => JSON.parse(readFileSync(join(import.meta.dirname, "..", "..", "..", "..", "packs", name), "utf8")) as T;
const lines = read<LinesPack>("lines.json");
const openings = read<OpeningsPack>("openings.json");
const packs = { "lines.json": lines, "openings.json": openings };
const line = (sans: string, white: number, black: number, game = `example-${white}-${black}`): Line => ({ game, white, black, sans: sans.split(" ") });

// The card's five examples, and the line L4's miss brings back.
const L1 = line("e4 e5 Nf3 Nf6 Nxe5 Nc6", 1429, 1388);
const L2 = line("e4 d5 exd5 Qxd5 Nc3 Qe6+", 1469, 1386);
const L3: AfterOpening = { game: "l42nthgl", white: 1316, black: 1361, opening: "Italian Game", reachedAt: 5, sans: ["Bc5", "b4", "Bxb4", "c3", "Bc5", "d4"] };
const L4 = line("e4 e5 Nf3 Nc6 Nc3 Bc5 Nd5 Nf6 Nxf6+ Qxf6 Bc4 O-O", 1414, 1424);
const L5 = line("e4 c5 d4 cxd4 Qxd4 Nc6 Qc3 a6 Nf3 d6 Bc4 e6 O-O Nf6 Nbd2 g6 e5 dxe5 Nxe5 Nxe5", 1263, 1365);
const BACK = line("e4 e5 Nf3 Nf6 Nc3 Nc6 a3 d6 Bb5 Be7 d3 O-O", 1499, 1489);

const seqOf = (l: Line | AfterOpening): Sequence => ("opening" in l ? fromOpening(l, openings) : sequence(l));
const place = (pieces: Placed[]): Did => ({ did: "answer", answer: { kind: "position", pieces } });

// The position after the moves, changed by hand: the rest right.
const changed = (seq: Sequence, change: (p: Position) => Position) => change(seq.final).board;
const tell = (l: Line | AfterOpening, change: (p: Position) => Position = (p) => p) => {
  const seq = seqOf(l);
  return judge(seq, changed(seq, change), "white").told;
};
const black = (kind: string) => ({ side: "black" as const, kind: kind as never });
const white = (kind: string) => ({ side: "white" as const, kind: kind as never });

// Plays an item: each Show pressed, then the position built.
function play(item: Item, built: Placed[]) {
  const shows: Show[] = [];
  let step = item.first();
  while (step.step === "show") {
    shows.push(step);
    step = item.next({ did: "press" });
  }
  const ask = step as Ask;
  const told = item.next(place(built)) as Told;
  return { shows, ask, told, done: item.next({ did: "press" }) };
}

describe("5.2.1 Rebuild after the moves", () => {
  it("copies the card's level table", () => {
    expect(LEVELS.map((l) => [l.id, l.path, l.seat, l.questions, l.minutes, ...l.dials.map((d) => d.value)])).toEqual([
      ["L1", "Rebuild after the moves, the list read whole.", "round", 5, 4, "The starting position", "6", "The whole list, until I hide it"],
      ["L2", "Rebuild after the moves, one at a time.", "round", 5, 5, "The starting position", "6", "One at a time"],
      ["L3", "Rebuild after the moves, from an opening by its name.", "round", 3, 4, "An opening, by its name", "6 after it", "One at a time"],
      ["L4", "Rebuild after the moves, 12 half-moves.", "round", 2, 5, "The starting position", "12", "One at a time"],
      ["L5", "Rebuild after the moves, through move 10.", "round", 1, 4, "The starting position", "20", "One at a time"],
    ]);
    expect(LEVELS[0]!.passMark).toBe(
      "Pass mark for 5.2.1 L1 to L5: the positions rebuilt whole and the squares right in one round, and my average time per move. My practice sets it.",
    );
  });

  it("plays a whole round at each level from the packs, every position right", () => {
    for (const l of LEVELS) {
      const items = challenge.makeRound(l, seeded(`5.2.1 ${l.id}`), { side: "white", back: [], packs });
      expect(items).toHaveLength(l.questions);
      for (const item of items) {
        const shows: Show[] = [];
        let step = item.first();
        while (step.step === "show") {
          shows.push(step);
          step = item.next({ did: "press" });
        }
        const ask = step as Ask;
        expect(ask).toMatchObject({ input: { how: "move" }, board: { seat: "white", names: false, lit: [] } });
        expect(ask.board!.pieces).toEqual(piecesOf(startingPosition()));
        // The moves shown, played from where they start, give the position to rebuild.
        let start = startingPosition();
        let moves: string[];
        if (l.id === "L1") {
          expect(shows).toHaveLength(1);
          expect(shows[0]).toMatchObject({ button: "Hide", time: "move", moves: 6 });
          moves = shows[0]!.words!.split(" ").filter((w) => !/^\d+\./.test(w));
        } else {
          if (l.id === "L3") {
            const name = shows[0]!.name!.replace(/^The (.*)\.$/, "$1");
            const opening = openings.thirteen.find((o) => o.name === name)!;
            start = seqOf({ game: "", white: 0, black: 0, opening: name, reachedAt: 0, sans: [] }).start;
            expect(opening).toBeDefined();
            shows.shift();
          }
          expect(shows.every((s) => s.button === "Next" && s.time === "move")).toBe(true);
          moves = shows.map((s) => s.move!.replace(/^\d+\.(\.\.)?\s/, ""));
        }
        expect(moves).toHaveLength({ L1: 6, L2: 6, L3: 6, L4: 12, L5: 20 }[l.id]!);
        const right = playLine(start, moves).positions.at(-1)!;
        const told = item.next(place(piecesOf(right))) as Told;
        expect(told.verdict).toBe("right");
        expect(told.line).toMatch(/^Right: all \d+ squares\.$/);
        expect(item.next({ did: "press" })).toEqual({ step: "done", back: null });
      }
    }
  });

  it("judges the card's L1 example: the list read whole", () => {
    const seq = sequence(L1);
    const item = rebuildItem(level("L1"), seq, "black");
    // Left when the minutes run out, its 9 squares count as wrong.
    expect(item.unasked).toEqual({ "Squares right": 0, "Squares that changed": 9 });
    const { shows, ask, told } = play(item, piecesOf(seq.final));
    // The list's time counts as my time per move, once for each of its 6.
    expect(shows).toEqual([
      {
        step: "show", words: "1. e4 e5 2. Nf3 Nf6 3. Nxe5 Nc6", lines: ["From a Lichess game of January 2013, players rated 1429 and 1388."],
        button: "Hide", time: "move", moves: 6,
      },
    ]);
    expect(ask.question).toBe("Rebuild the position after 3... Nc6.");
    expect(ask.board!.seat).toBe("black");
    expect(told.line).toBe("Right: all 9 squares.");
    expect(told.again).toMatchObject({ moves: "1. e4 e5 2. Nf3 Nf6 3. Nxe5 Nc6", board: { seat: "black", pieces: piecesOf(seq.final) } });
    const wrong = tell(L1, (p) => put(put(p, "f3", white("knight")), "e5", black("pawn")));
    expect(wrong.line).toBe("No: 7 of 9 squares. You lost the thread at 3. Nxe5: White's knight took Black's pawn on e5.");
    expect(wrong.score.mistakes).toEqual(["An old square", "A piece taken, left on"]);
    expect(wrong.score.counts).toEqual({ "Squares right": 7, "Squares that changed": 9, "Lost the thread at a capture": 1 });
  });

  it("judges the card's L2 example: one at a time", () => {
    const seq = sequence(L2);
    const { shows, ask, told } = play(rebuildItem(level("L2"), seq, "white"), piecesOf(seq.final));
    expect(shows.map((s) => s.move)).toEqual(["1. e4", "1... d5", "2. exd5", "2... Qxd5", "3. Nc3", "3... Qe6+"]);
    expect(ask.question).toBe("Rebuild the position after 3... Qe6+.");
    expect(told.line).toBe("Right: all 6 squares.");
    const wrong = tell(L2, (p) => moveByHand(p, "e6", "d5"));
    expect(wrong.line).toBe("No: 4 of 6 squares. You lost the thread at 3... Qe6+: Black's queen went on from d5 to e6.");
    expect(wrong.score.mistakes).toEqual(["An old square"]);
  });

  it("judges the card's L3 example: from the Italian Game", () => {
    const seq = fromOpening(L3, openings);
    const { shows, ask, told } = play(rebuildItem(level("L3"), seq, "black", "Italian Game"), piecesOf(seq.final));
    expect(shows[0]).toMatchObject({ name: "The Italian Game.", button: "Next" });
    expect(shows.slice(1).map((s) => s.move)).toEqual(["3... Bc5", "4. b4", "4... Bxb4", "5. c3", "5... Bc5", "6. d4"]);
    expect(ask.question).toBe("Rebuild the position after 6. d4.");
    expect(told.line).toBe("Right: all 17 squares.");
    const wrong = tell(L3, (p) => moveByHand(p, "c5", "b4"));
    expect(wrong.line).toBe("No: 15 of 17 squares. You lost the thread at 5... Bc5: Black's bishop went back from b4 to c5.");
  });

  it("judges the card's L4 example: castling's rook, and a swap", () => {
    expect(tell(L4).line).toBe("Right: all 18 squares.");
    const rook = tell(L4, (p) => moveByHand(p, "f8", "h8"));
    expect(rook.line).toBe("No: 16 of 18 squares. You lost the thread at 6... O-O: castling on the king's side takes Black's rook from h8 to f8.");
    expect(rook.score.mistakes).toEqual(["An old square"]);
    const swap = tell(L4, (p) => put(put(p, "c5", black("queen")), "f6", black("bishop")));
    expect(swap.line).toBe("No: 16 of 18 squares. Black's queen stands on f6, and its bishop on c5: you swapped them.");
    expect(swap.score.mistakes).toEqual(["Two pieces swapped"]);
  });

  it("judges the card's L5 example: through move 10", () => {
    expect(tell(L5).line).toBe("Right: all 22 squares.");
    const wrong = tell(L5, (p) => put(put(p, "c6", black("knight")), "e5", white("knight")));
    expect(wrong.line).toBe("No: 20 of 22 squares. You lost the thread at 10... Nxe5: Black's knight from c6 took White's knight on e5.");
  });

  it("names each of the card's mistakes", () => {
    const kinds = (l: Line | AfterOpening, change: (p: Position) => Position) => tell(l, change).score.mistakes;
    expect(kinds(L3, (p) => moveByHand(p, "c4", "b4"))).toEqual(["The file beside"]);
    expect(kinds(L3, (p) => moveByHand(p, "c4", "f5"))).toEqual(["The board turned"]);
    expect(kinds(L3, (p) => moveByHand(p, "c4", "f4"))).toEqual(["The files reversed"]);
    expect(kinds(L2, (p) => moveByHand(p, "e6", "e5"))).toEqual(["The rank beside"]);
    expect(kinds(L2, (p) => moveByHand(p, "e6", "e3"))).toEqual(["The ranks reversed"]);
    expect(kinds(L2, (p) => moveByHand(p, "e6", "d5"))).toEqual(["An old square"]);
    expect(kinds(L4, (p) => moveByHand(p, "f8", "h8"))).toEqual(["An old square"]);
    expect(kinds(L2, (p) => put(p, "d7", black("pawn")))).toEqual(["A piece taken, left on"]);
    expect(kinds(L3, (p) => moveByHand(p, "g8", "f6"))).toEqual(["A piece moved that stays home"]);
    expect(kinds(L4, (p) => put(put(p, "c5", black("queen")), "f6", black("bishop")))).toEqual(["Two pieces swapped"]);
    expect(kinds(L4, (p) => put(p, "f6", black("bishop")))).toEqual(["The wrong piece"]);
    expect(kinds(L5, (p) => put(p, "f6", white("knight")))).toEqual(["The wrong side"]);
    expect(kinds(L1, (p) => takeOff(p, "e4"))).toEqual(["A piece left out"]);
    expect(kinds(L1, (p) => put(p, "a5", white("queen")))).toEqual(["Another square"]);
    expect(MISTAKES).toEqual([
      "The file beside", "The rank beside", "The board turned", "The files reversed", "The ranks reversed", "An old square",
      "A piece taken, left on", "A piece moved that stays home", "Two pieces swapped", "The wrong piece", "The wrong side",
      "A piece left out", "Another square",
    ]);
  });

  it("brings L4's miss back: another 12 half-moves castling at the 12th", () => {
    const seq = sequence(L4);
    const { done } = play(rebuildItem(level("L4"), seq, "white"), piecesOf({ ...seq.final, board: changed(seq, (p) => moveByHand(p, "f8", "h8")) }));
    expect(done).toEqual({ step: "done", back: { game: L4.game, misses: [{ ply: 12, kind: "castling" }] } });
    const pack: LinesPack = { first: [{ ...L4, plies: 60 }, { ...BACK, plies: 60 }, ...lines.first.slice(0, 30)], afterOpening: [], mid: [] };
    for (let s = 0; s < 10; s++) {
      const items = challenge.makeRound(level("L4"), seeded(`back ${s}`), { side: "white", back: [(done as Done).back], packs: { ...packs, "lines.json": pack } });
      expect(items).toHaveLength(2);
      const sequences = items.map((i) => {
        const moves: string[] = [];
        let step = i.first();
        while (step.step === "show") {
          moves.push(step.move!.replace(/^\d+\.(\.\.)?\s/, ""));
          step = i.next({ did: "press" });
        }
        return moves;
      });
      expect(sequences.some((m) => m[11]!.startsWith("O-O"))).toBe(true);
      expect(sequences.some((m) => m.join(" ") === L4.sans.join(" "))).toBe(false);
    }
    // A swap names no move: any other line comes back.
    const swapped = play(rebuildItem(level("L4"), seq, "white"), piecesOf({ ...seq.final, board: changed(seq, (p) => put(put(p, "c5", black("queen")), "f6", black("bishop"))) }));
    expect(swapped.done).toEqual({ step: "done", back: { game: L4.game, misses: [] } });
  });

  // Record line 5-138: a miss takes a place of the round's count; one past it waits, and a miss no game can meet is let go.
  it("asks the come-backs that hold a place of its count, a miss no game can meet let go, the rest waiting", () => {
    const miss = (game: string, ...plies: number[]) => ({ game, misses: plies.map((ply) => ({ ply, kind: "castling" })) });
    const [a, b, c, none] = [miss("a", 12), miss("b", 12), miss("c", 12), { game: "d", misses: [] }];
    const unmeetable = miss("z", 99);
    const facts = (back: unknown[], count?: number) => ({ side: "white" as const, count, back: back as never });
    // L4 holds 2 sequences, L5 holds 1, L1 5.
    expect(challenge.asks!(level("L4"), facts([7, { game: 1 }, a, b, c]))).toEqual([a, b]);
    expect(challenge.asks!(level("L5"), facts([a, b, c]))).toEqual([a]);
    expect(challenge.asks!(level("L1"), facts([a, b, c, none, a, b, c]))).toEqual([a, b, c, none, a]);
    // A miss no game can meet is asked, and let go.
    expect(challenge.asks!(level("L4"), facts([unmeetable, a, b]))).toEqual([unmeetable, a]);
    // A come-back with two misses takes two places; a mixed round's count sets its own.
    expect(challenge.asks!(level("L4"), facts([miss("e", 12, 6), a]))).toEqual([miss("e", 12, 6)]);
    expect(challenge.asks!(level("L4"), facts([a, b, c], 3))).toEqual([a, b, c]);
  });

  it("gives one seed one round, no game twice", () => {
    const firsts = (seed: string) =>
      challenge.makeRound(level("L2"), seeded(seed), { side: "white", back: [], packs }).map((i) => (i.first() as Show).lines![0]);
    expect(firsts("same")).toEqual(firsts("same"));
    const games = challenge.makeRound(level("L3"), seeded("games"), { side: "white", back: [], packs }).map((i) => (i.first() as Show).lines![0]);
    expect(new Set(games).size).toBe(games.length);
  });
});
