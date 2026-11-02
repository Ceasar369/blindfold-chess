import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Chess } from "chess.js";
import { describe, expect, it } from "vitest";
import { besidesKings, fromFen, inWords } from "../positions/index.ts";
import { isLegalPosition } from "../rules/index.ts";
import {
  afterOpenings, afterWords, CAP, firstLines, type LinesPack, memoryPositions, type OpeningsPack, type PositionsPack, puzzles,
  type PuzzlesPack,
} from "./index.ts";

const read = <T>(name: string): T => JSON.parse(readFileSync(join(import.meta.dirname, "..", "..", "packs", `${name}.json`), "utf8")) as T;
const positions = read<PositionsPack>("positions");
const lines = read<LinesPack>("lines");
const openings = read<OpeningsPack>("openings");
const puzzlePack = read<PuzzlesPack>("puzzles");

const words = (fen: string, toMove = false) => inWords(fromFen(fen), { toMove });

describe("the positions pack", () => {
  it("keeps 4.1.1 and 4.2.1's positions, legal, within the cap", () => {
    for (const n of [4, 7, 10] as const) {
      const items = memoryPositions(positions, n);
      expect(items.length).toBeGreaterThan(0);
      expect(items.length).toBeLessThanOrEqual(CAP);
      for (const p of items) {
        const pos = fromFen(p.fen);
        expect(besidesKings(pos)).toBe(n);
        expect(isLegalPosition(pos)).toBe(true);
        expect(p.white).toBeGreaterThanOrEqual(1000);
        expect(p.black).toBeLessThanOrEqual(1500);
      }
    }
  });

  it("holds the pages' examples of 4 besides the kings, every one of which it keeps", () => {
    const find = (w: string) => memoryPositions(positions, 4).find((p) => words(p.fen) === w);
    expect(find("White: king a5, rook d4, knight f5. Black: king e6, pawns f6 and h5.")).toMatchObject({ white: 1415, black: 1500, moveNumber: 46, moved: "white" });
    expect(find("White: king h2, rook f5, pawn h3. Black: king g7, rook b1, pawn h6.")).toMatchObject({ white: 1343, black: 1336, moveNumber: 38 });
    expect(find("White: king e1, queen e2, pawn g3. Black: king g6, bishop c4, pawn f7.")).toMatchObject({ white: 1153, black: 1395, moveNumber: 63 });
    expect(afterWords({ moveNumber: 46, moved: "white" })).toBe("after White's 46th move");
    expect(afterWords({ moveNumber: 33, moved: "black" })).toBe("after Black's 33rd move");
    expect(afterWords({ moveNumber: 12, moved: "black" })).toBe("after Black's 12th move");
  });

  it("keeps 6.3.1's even positions of 6, nothing to take, no castling, with the pages' two", () => {
    expect(positions.even.length).toBeGreaterThan(0);
    for (const p of positions.even) {
      const [, , castling, ep] = p.fen.split(" ");
      expect([castling, ep]).toEqual(["-", "-"]);
      expect(besidesKings(fromFen(p.fen))).toBe(6);
      expect(new Chess(p.fen).moves({ verbose: true }).some((m) => m.captured !== undefined)).toBe(false);
    }
    const all = positions.even.map((p) => words(p.fen, true));
    expect(all).toContain("White: king b3, rook d6, pawns b6 and c4. Black: king f3, rook h2, pawns g5 and h4. White to move.");
    expect(all).toContain("White: king b6, rook c7, pawns c6 and g3. Black: king d5, rook f2, pawns g5 and h5. White to move.");
  });
});

describe("the lines pack", () => {
  it("keeps games' first 20 half-moves, each legal, from games going on past them", () => {
    expect(lines.first.length).toBeGreaterThan(0);
    expect(lines.first.length).toBeLessThanOrEqual(CAP);
    for (const l of lines.first.slice(0, 200)) {
      const chess = new Chess();
      for (const s of l.sans) chess.move(s, { strict: true });
      expect(l.plies).toBeGreaterThan(20);
    }
    for (const n of [6, 8, 12, 20]) expect(firstLines(lines, n).every((l) => l.sans.length === n)).toBe(true);
  });

  it("keeps the 6 after each opening real games reach, with 5.2.1 L3's Italian Game", () => {
    const italian = afterOpenings(lines, "Italian Game");
    expect(italian.some((l) => l.white === 1316 && l.black === 1361 && l.sans.join(" ") === "Bc5 b4 Bxb4 c3 Bc5 d4")).toBe(true);
    for (const name of new Set(lines.afterOpening.map((l) => l.opening))) expect(afterOpenings(lines, name).length).toBeLessThanOrEqual(CAP);
    expect(afterOpenings(lines, "London System")).toEqual([]);
  });

  it("keeps 3.1.1 L6's lines from a Black move after White's move 3 to 15", () => {
    expect(lines.mid.length).toBeLessThanOrEqual(CAP);
    for (const l of lines.mid.slice(0, 200)) {
      const pos = fromFen(l.fen);
      expect(pos.turn).toBe("black");
      expect(pos.moveNumber).toBeGreaterThanOrEqual(3);
      expect(pos.moveNumber).toBeLessThanOrEqual(15);
      expect(besidesKings(pos)).toBeGreaterThanOrEqual(16);
      expect(l.sans).toHaveLength(4);
    }
  });
});

describe("the openings pack", () => {
  it("holds the 13 openings 5.2.1 L3 starts from, each with its position", () => {
    expect(openings.thirteen.map((o) => o.name)).toHaveLength(13);
    const italian = openings.thirteen.find((o) => o.name === "Italian Game")!;
    expect(words(italian.fen)).toBe(
      "White: king e1, queen d1, rooks a1 and h1, bishops c1 and c4, knights b1 and f3, pawns a2, b2, c2, d2, e4, f2, g2 and h2. Black: king e8, queen d8, rooks a8 and h8, bishops c8 and f8, knights c6 and g8, pawns a7, b7, c7, d7, e5, f7, g7 and h7.",
    );
    expect(openings.thirteen.filter((o) => o.captures).map((o) => o.name)).toEqual([
      "Caro-Kann Defense: Classical Variation", "Sicilian Defense: Najdorf Variation", "Sicilian Defense: Dragon Variation",
    ]);
    for (const o of openings.thirteen) expect(besidesKings(fromFen(o.fen))).toBe(o.captures ? 28 : 30);
  });

  it("keeps named lines of the Lichess list, within the cap", () => {
    expect(openings.list.length).toBeLessThanOrEqual(CAP);
    expect(openings.list.every((l) => l.sans.length >= 4)).toBe(true);
  });
});

describe("the puzzles pack", () => {
  it("keeps puzzles rated under 1000, by kind and size, within the cap, none allowing castling or in passing", () => {
    for (const kind of ["mate in one", "mate in two", "fork"] as const) {
      const small = puzzles(puzzlePack, kind, 7);
      const any = puzzles(puzzlePack, kind);
      expect(small.length).toBeGreaterThan(0);
      expect(small.length).toBeLessThanOrEqual(CAP);
      expect(any.length - small.length).toBeLessThanOrEqual(CAP);
      for (const p of any) {
        expect(p.rating).toBeLessThan(1000);
        expect(p.moves).toHaveLength(kind === "mate in one" ? 2 : 4);
        expect(p.fen.split(" ").slice(2, 4)).toEqual(["-", "-"]);
      }
    }
  });
});
