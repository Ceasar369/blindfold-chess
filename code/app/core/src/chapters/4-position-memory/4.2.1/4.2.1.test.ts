import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { besidesKings, fromFen, fromWords, inWords, piecesOf, toFen } from "../../../positions/index.ts";
import { seeded } from "../../../random/index.ts";
import type { Ask, BoardView, Did, Done, Placed, Show, Told } from "../../../shape/index.ts";
import { attackersOf } from "../../../reach/index.ts";
import { bySquare, SQUARES } from "../../../squares/index.ts";
import { mirrored, type Real } from "../real.ts";
import { challenge, judgeRebuilt, LEVELS, MISTAKES, rebuild } from "./index.ts";

// The positions pack, as the site fetches it and hands it in.
const PACKS = { "positions.json": JSON.parse(readFileSync(join(import.meta.dirname, "..", "..", "..", "..", "packs", "positions.json"), "utf8")) };

const level = (id: string) => LEVELS.find((l) => l.id === id)!;
const press: Did = { did: "press" };
const placed = (pieces: Placed[]): Did => ({ did: "answer", answer: { kind: "position", pieces } });

const real = (words: string, from: string): Real => ({ fen: toFen(fromWords(words)), from });
const pieces = (r: Real) => piecesOf(fromFen(r.fen));
// The position's pieces, one moved, added or taken off.
const moved = (r: Real, from: string, to: string) => pieces(r).map((p) => (p.square === from ? { ...p, square: to } : p)) as Placed[];
const without = (r: Real, square: string) => pieces(r).filter((p) => p.square !== square);

// The card's examples.
const L1 = real("White: king h2, rook f5, pawn h3. Black: king g7, rook b1, pawn h6.", "From a Lichess game of January 2013, players rated 1343 and 1336, after White's 38th move.");
const L2 = real("White: king g2, knight a6, pawns f4, g4 and h3. Black: king g7, rook d1, pawns g6 and h7.", "From a Lichess game of January 2013, players rated 1395 and 1393, after White's 50th move.");
const L3 = real("White: king h1, rooks e6 and f1, pawns c4, g2 and h2. Black: king g8, rook d3, bishop c5, pawns a6, g4 and h6.", "From a Lichess game of January 2013, players rated 1233 and 1249, after White's 30th move.");
const L4 = real("White: king e1, queen e2, pawn g3. Black: king g6, bishop c4, pawn f7.", "From a Lichess game of January 2013, players rated 1153 and 1395, after White's 63rd move.");
const L5 = real("White: king f1, rooks d1 and d3, pawn a2. Black: king g4, pawns a7, d4, h6 and h7.", "From a Lichess game of January 2013, players rated 1360 and 1301, after Black's 40th move.");
const L6 = real("White: king b1, rook b5, pawns b2, g4 and h3. Black: king d3, rook c8, pawns g5 and h7.", "From a Lichess game of January 2013, players rated 1408 and 1287, after White's 36th move.");

function play(id: string, r: Real, answer: Did) {
  const item = rebuild(level(id), r);
  const show = item.first() as Show;
  const ask = item.next(press) as Ask;
  const told = item.next(answer) as Told;
  return { show, ask, told, done: item.next(press) as Done };
}

const judge = (r: Real, built: Placed[]) => judgeRebuilt(fromFen(r.fen), built);
const key = (ps: readonly Placed[]) => JSON.stringify(ps.map((p) => `${p.side} ${p.kind} ${p.square}`).sort());

describe("4.2.1 Rebuild the position", () => {
  it("copies the card's level table", () => {
    expect(LEVELS.map((l) => [l.id, l.seat, l.questions, l.minutes, l.dials.map((d) => d.value).join(" | ")])).toEqual([
      ["L1", null, 5, 4, "On a board, until I hide it | 4 | Place them"],
      ["L2", null, 4, 5, "On a board, until I hide it | 7 | Place them"],
      ["L3", null, 3, 5, "On a board, until I hide it | 10 | Place them"],
      ["L4", null, 5, 5, "In words, until I hide them | 4 | Place them"],
      ["L5", null, 4, 5, "In words, until I hide them | 7 | Place them"],
      ["L6", null, 3, 5, "On a board, until I hide it | 7 | Place them, after Reveal board"],
    ]);
    expect(LEVELS[0]!.passMark).toBe(
      "Pass mark for 4.2.1 L1 to L6: the positions rebuilt whole and the pieces right in one round, and my average look time. My practice sets it.",
    );
  });

  // Record line 4-086: "Rebuild this position." shows with the position, before I hide it, and again after.
  it("shows its question with the look at every level, and keeps it after Hide", () => {
    for (const [id, r] of [["L1", L1], ["L2", L2], ["L3", L3], ["L4", L4], ["L5", L5], ["L6", L6]] as const) {
      const { show, ask } = play(id, r, placed(pieces(r)));
      expect(show.question, id).toBe("Rebuild this position.");
      expect(show.lines![0], id).toBe(r.from);
      expect(ask.question, id).toBe("Rebuild this position.");
    }
  });

  it("judges the card's L1 example: 6 pieces on a board, as White", () => {
    const right = play("L1", L1, placed(pieces(L1)));
    expect(right.show).toMatchObject({ step: "show", button: "Hide", time: "look", lines: [L1.from], board: { seat: "white", names: false, lit: [] } });
    expect(right.ask).toMatchObject({ question: "Rebuild this position.", board: { seat: "white", pieces: [], lit: [] }, input: { how: "place" } });
    expect(right.told).toMatchObject({ verdict: "right", line: "Right: all 6 pieces.", score: { counts: { "Pieces right": 6, "Pieces in all": 6 } } });
    expect(right.told.again?.board?.pieces).toHaveLength(6);
    expect(right.done.back).toBeNull();
    const wrong = play("L1", L1, placed(moved(L1, "b1", "a1")));
    expect(wrong.told).toMatchObject({ verdict: "wrong", line: "No: 5 of 6. Black's rook stands on b1, not a1: the file beside.", score: { mistakes: ["The file beside"], counts: { "Pieces right": 5, "Pieces in all": 6 } } });
    // It comes back mirrored.
    expect(inWords(fromFen((wrong.done.back as Real).fen))).toBe("White: king a2, rook c5, pawn a3. Black: king b7, rook g1, pawn a6.");
  });

  it("judges the card's L2 example: 9 pieces", () => {
    expect(play("L2", L2, placed(pieces(L2))).told.line).toBe("Right: all 9 pieces.");
    expect(play("L2", L2, placed(moved(L2, "a6", "h6"))).told.line).toBe("No: 8 of 9. White's knight stands on a6, not h6: the files reversed.");
  });

  it("judges the card's L3 example: 12 pieces, two swapped", () => {
    expect(play("L3", L3, placed(pieces(L3))).told.line).toBe("Right: all 12 pieces.");
    const swapped = pieces(L3).map((p) => (p.square === "d3" ? { ...p, square: "c5" } : p.square === "c5" ? { ...p, square: "d3" } : p)) as Placed[];
    const { told } = play("L3", L3, placed(swapped));
    expect(told.line).toBe("No: 10 of 12. Black's rook stands on d3, and its bishop on c5: you swapped them.");
    expect(told.score.mistakes).toEqual(["Two pieces swapped"]);
  });

  it("judges the card's L4 example: read in words, placed on a board", () => {
    const right = play("L4", L4, placed(pieces(L4)));
    expect(right.show.board).toBeUndefined();
    expect(right.show.words).toBe("White: king e1, queen e2, pawn g3. Black: king g6, bishop c4, pawn f7.");
    expect(right.ask.board?.seat).toBe("white");
    // The position read in words shows again in words, and my reconstruction on one board.
    expect(right.told.again).toMatchObject({ words: "White: king e1, queen e2, pawn g3. Black: king g6, bishop c4, pawn f7." });
    expect(right.told.again!.board!.cells!.every((c) => c.state === "right")).toBe(true);
    const wrongSide = pieces(L4).map((p) => (p.square === "f7" ? { ...p, side: "white" as const } : p));
    expect(play("L4", L4, placed(wrongSide)).told.line).toBe("No: 5 of 6. f7 holds Black's pawn, not White's: the wrong side.");
  });

  it("judges the card's L5 example: a pawn left out", () => {
    expect(play("L5", L5, placed(pieces(L5))).told.verdict).toBe("right");
    const { told } = play("L5", L5, placed(without(L5, "h6")));
    expect(told.line).toBe("No: 8 of 9. You left out Black's pawn on h6.");
    expect(told.score.mistakes).toEqual(["A piece left out"]);
  });

  // A1: L6 shows the position on a board, with no words beside it, until Hide; then no board until I reveal an empty one.
  it("judges the card's L6 example: seen on a board, then placed on the revealed board", () => {
    const right = play("L6", L6, placed(pieces(L6)));
    expect(right.show).toMatchObject({ step: "show", button: "Hide", time: "look", lines: [L6.from], board: { seat: "white", names: false, lit: [] } });
    expect(right.show.board!.pieces).toHaveLength(9);
    expect(key(right.show.board!.pieces)).toBe(key(pieces(L6)));
    expect(right.show.words).toBeUndefined();
    // After Hide: no board, no words, no note, no hint; Reveal board brings an empty one.
    expect(right.ask).toMatchObject({ board: null, input: { how: "place", reveal: { seat: "white", names: false, pieces: [], lit: [] } }, notes: [], seconds: null });
    expect(right.ask.words).toBeUndefined();
    expect(right.ask.note).toBeUndefined();
    // After the answer, one board: what I placed, every cell right.
    const cells = pieces(L6).map((p) => ({ square: p.square, state: "right" })).sort((a, b) => bySquare(a.square, b.square));
    expect(right.told.again).toEqual({ board: { seat: "white", names: false, pieces: pieces(L6), lit: [], cells } });
    expect(cells).toHaveLength(9);
    expect(right.told.line).toBe("Right: all 9 pieces.");
    const wrong = play("L6", L6, placed(moved(L6, "h3", "h4")));
    expect(wrong.told.line).toBe("No: 8 of 9. White's pawn stands on h3, not h4: the rank beside.");
  });

  it("names each mistake on the card", () => {
    const kinds = (r: Real, built: Placed[]) => judge(r, built).mistakes;
    expect(kinds(L1, moved(L1, "b1", "a1"))).toEqual(["The file beside"]);
    expect(kinds(L1, moved(L1, "b1", "c1"))).toEqual(["The file beside"]);
    expect(kinds(L1, moved(L1, "b1", "b2"))).toEqual(["The rank beside"]);
    expect(kinds(L1, moved(L1, "b1", "g8"))).toEqual(["The board turned"]);
    expect(kinds(L1, moved(L1, "b1", "g1"))).toEqual(["The files reversed"]);
    expect(kinds(L1, moved(L1, "b1", "b8"))).toEqual(["The ranks reversed"]);
    const bishop = pieces(L2).map((p) => (p.square === "d1" ? { ...p, kind: "bishop" as const } : p));
    expect(kinds(L2, bishop)).toEqual(["The wrong piece"]);
    const added = [...pieces(L1), { side: "white", kind: "pawn", square: "g2" }] as Placed[];
    expect(kinds(L1, added)).toEqual(["A piece added"]);
    expect(judge(L1, added)).toMatchObject({ piecesRight: 5, pieces: 6 });
    expect(kinds(L1, moved(L1, "f5", "c3"))).toEqual(["Another square"]);
    expect(MISTAKES).toEqual([
      "The file beside", "The rank beside", "The board turned", "The files reversed", "The ranks reversed",
      "Two pieces swapped", "The wrong piece", "The wrong side", "A piece left out", "A piece added", "Another square",
    ]);
  });

  it("makes each level's round of real positions at its count", () => {
    for (const l of LEVELS) {
      const items = challenge.makeRound(l, seeded(`4.2.1 ${l.id}`), { side: "black", back: [], packs: PACKS });
      expect(items).toHaveLength(l.questions);
      const besides = Number(l.dials[1]!.value);
      for (const item of items) {
        const show = item.first() as Show;
        const pos = show.words ? fromWords(show.words) : fromWords(inWords({ ...fromWords("White: king a1. Black: king h8."), board: Object.fromEntries(show.board!.pieces.map((p) => [p.square, { side: p.side, kind: p.kind }])) }));
        expect(besidesKings(pos)).toBe(besides);
        expect(show.lines![0]).toMatch(/^From a Lichess game of January 2013/);
        item.next(press);
        const told = item.next(placed(piecesOf(pos))) as Told;
        expect(told.verdict).toBe("right");
      }
    }
  });

  // Every position of the pack: slow while the whole suite runs at once.
  it("mirrors every real position into one that keeps chapter 2's rules for a set-up position", { timeout: 60_000 }, () => {
    for (const p of PACKS["positions.json"].memory as { fen: string; from?: string }[]) {
      const m = fromFen(mirrored({ fen: p.fen, from: "From x." }).fen);
      const kings = piecesOf(m).filter((x) => x.kind === "king");
      expect(kings.map((k) => k.side).sort()).toEqual(["black", "white"]);
      const [a, b] = kings.map((k) => k.square);
      expect(Math.max(Math.abs(a!.charCodeAt(0) - b!.charCodeAt(0)), Math.abs(Number(a![1]) - Number(b![1])))).toBeGreaterThan(1);
      expect(piecesOf(m).some((x) => x.kind === "pawn" && (x.square[1] === "1" || x.square[1] === "8"))).toBe(false);
      const checked = kings.filter((k) => attackersOf(m.board, k.square, k.side === "white" ? "black" : "white").length > 0);
      expect(checked.length).toBeLessThan(2);
    }
  });

  it("counts a position left when the minutes run out as its pieces left out", () => {
    expect(rebuild(level("L1"), L1).unasked).toEqual({ "Pieces right": 0, "Pieces in all": 6 });
    expect(rebuild(level("L3"), L3).unasked).toEqual({ "Pieces right": 0, "Pieces in all": 12 });
  });

  // A1: a position reaches me as the card's level table says, and only L4 and L5 read it in words.
  it("shows a position on a board at L1, L2, L3 and L6, and in words at L4 and L5", () => {
    for (const [id, r] of [["L1", L1], ["L2", L2], ["L3", L3], ["L6", L6]] as const) {
      const { show, told } = play(id, r, placed(pieces(r)));
      expect(show.words, id).toBeUndefined();
      expect(key(show.board!.pieces), id).toBe(key(pieces(r)));
      expect(told.again?.words, id).toBeUndefined();
      expect(key(told.again!.board!.pieces), id).toBe(key(pieces(r)));
    }
    for (const [id, r] of [["L4", L4], ["L5", L5]] as const) {
      const { show, told } = play(id, r, placed(pieces(r)));
      expect(show.board, id).toBeUndefined();
      expect(show.words, id).toBe(inWords(fromFen(r.fen)));
      expect(told.again, id).toMatchObject({ words: inWords(fromFen(r.fen)) });
    }
  });

  // A2: a missed position keeps the level it was missed at.
  it("stores a missed position mirrored, with its level", () => {
    for (const [id, r] of [["L1", L1], ["L3", L3], ["L6", L6]] as const) {
      const { done } = play(id, r, placed(without(r, pieces(r)[0]!.square)));
      expect(done.back, id).toEqual({ ...mirrored(r), level: id });
    }
    expect(play("L3", L3, placed(pieces(L3))).done.back).toBeNull();
  });

  // Record line 4-129: a missed position comes back in a round that asks it; one past the round's count waits.
  it("asks the first of its count of the positions coming back at its level, and the rest wait", () => {
    const back = (id: string, n = 5) => Array.from({ length: n }, (_, i) => ({ ...L1, from: `${id} position ${i}.`, level: id }));
    const l3 = back("L3");
    const l1 = back("L1");
    for (const id of ["L3", "L6"]) expect(challenge.asks!(level(id), { side: "white", back: [{ fen: "junk", from: "x" }, ...back(id)] }), id).toEqual(back(id).slice(0, 3));
    expect(challenge.asks!(level("L1"), { side: "white", back: l1 })).toEqual(l1);
    expect(challenge.asks!(level("L3"), { side: "white", count: 2, back: l3 })).toEqual(l3.slice(0, 2));
    const shown = challenge.makeRound(level("L3"), seeded("4.2.1 asks"), { side: "white", back: l3, packs: PACKS }).map((i) => (i.first() as Show).lines![0]);
    expect(shown).toEqual(expect.arrayContaining(l3.slice(0, 3).map((p) => p.from)));
    expect(shown).not.toContain("L3 position 3.");
    expect(shown).not.toContain("L3 position 4.");
  });

  // A2: a position missed at one level waits through the rounds of every other.
  it("asks a missed position only at the level it was missed at", () => {
    const missed = (id: string, r: Real) => ({ ...r, from: `Missed at ${id}.`, level: id });
    const L3_MISS = missed("L3", L3);
    const L6_MISS = missed("L6", L6);
    const back = [L3_MISS, L6_MISS];
    const facts = { side: "white" as const, back, packs: PACKS };
    for (const id of ["L1", "L2", "L4", "L5"]) {
      expect(challenge.asks!(level(id), facts), id).toEqual([]);
      const shown = challenge.makeRound(level(id), seeded(`4.2.1 wait ${id}`), facts).map((i) => (i.first() as Show).lines![0]);
      expect(shown, id).not.toContain(L3_MISS.from);
      expect(shown, id).not.toContain(L6_MISS.from);
    }
    expect(challenge.asks!(level("L3"), facts)).toEqual([L3_MISS]);
    expect(challenge.asks!(level("L6"), facts)).toEqual([L6_MISS]);
    for (const [id, miss] of [["L3", L3_MISS], ["L6", L6_MISS]] as const) {
      const items = challenge.makeRound(level(id), seeded(`4.2.1 back ${id}`), facts);
      expect(items).toHaveLength(level(id).questions);
      expect(items.map((i) => (i.first() as Show).lines![0])).toContain(miss.from);
    }
  });

  // A2: a position missed at L3 comes back mirrored at L3: the stored one is the mirror, and L6 shows it on a board.
  it("brings a missed position back mirrored at its level, and at L6 on a board", () => {
    for (const [id, r] of [["L3", L3], ["L6", L6]] as const) {
      const { done } = play(id, r, placed(without(r, pieces(r)[0]!.square)));
      const items = challenge.makeRound(level(id), seeded(`4.2.1 mirrored ${id}`), { side: "white", back: [done.back!], packs: PACKS });
      const shows = items.map((i) => i.first() as Show);
      const back = shows.find((s) => s.lines![0] === mirrored(r).from)!;
      expect(key(back.board!.pieces), id).toBe(key(piecesOf(fromFen(mirrored(r).fen))));
      expect(back.words, id).toBeUndefined();
    }
  });

  it("brings a missed position back among the round's", () => {
    const items = challenge.makeRound(level("L1"), seeded("4.2.1 back"), { side: "white", back: [{ ...L1, level: "L1" }, { fen: "junk", from: "x" }], packs: PACKS });
    expect(items.map((i) => (i.first() as Show).lines![0])).toContain(L1.from);
  });

  // A2: a come-back stored before levels were kept has none, and is given none. It is asked at a level whose
  // count of pieces besides the kings is its own; the presentation is that level's.
  it("asks a come-back with no level at a level whose piece count is its own", () => {
    const count = (r: Real) => besidesKings(fromFen(r.fen));
    expect([L1, L2, L3, L4, L5, L6].map(count)).toEqual([4, 7, 10, 4, 7, 7]);
    const stored = [L1, L2, L3];
    const asked: Record<string, Real[]> = { L1: [L1], L2: [L2], L3: [L3], L4: [L1], L5: [L2], L6: [L2] };
    for (const l of LEVELS) {
      const facts = { side: "white" as const, back: stored, packs: PACKS };
      expect(challenge.asks!(l, facts), l.id).toEqual(asked[l.id]);
      const shown = challenge.makeRound(l, seeded(`4.2.1 nolevel ${l.id}`), facts).map((i) => (i.first() as Show).lines![0]);
      for (const r of stored) expect(shown.includes(r.from), `${l.id} ${r.from}`).toBe(asked[l.id]!.includes(r));
    }
    // It is the asking level's presentation: L6 shows a 7-piece record on a board, L5 in words.
    const l6 = challenge.makeRound(level("L6"), seeded("4.2.1 nolevel presentation"), { side: "white", back: [L2], packs: PACKS }).map((i) => i.first() as Show);
    expect(l6.find((s) => s.lines![0] === L2.from)!.board).toBeDefined();
    const l5 = challenge.makeRound(level("L5"), seeded("4.2.1 nolevel presentation"), { side: "white", back: [L2], packs: PACKS }).map((i) => i.first() as Show);
    expect(l5.find((s) => s.lines![0] === L2.from)!.words).toBe(inWords(fromFen(L2.fen)));
    // A level it does not name, or a mistyped one, is read as no come-back at all.
    for (const odd of [{ ...L1, level: "L9" }, { ...L1, level: 1 }, { ...L1, level: null }]) {
      for (const l of LEVELS) expect(challenge.asks!(l, { side: "white", back: [odd], packs: PACKS }), `${l.id} ${JSON.stringify(odd.level)}`).toEqual([]);
    }
  });

  // B1: after every counted answer, right or wrong, one board: my reconstruction, each cell marked.
  describe("the marked board after an answer", () => {
    const LEVELS_AND_POSITIONS = [["L1", L1], ["L2", L2], ["L3", L3], ["L4", L4], ["L5", L5], ["L6", L6]] as const;
    const stateOf = (board: BoardView, square: string) => board.cells!.find((c) => c.square === square)?.state;

    it("marks every piece right after a right answer, at every level, with nothing ghosted", () => {
      for (const [id, r] of LEVELS_AND_POSITIONS) {
        const { told } = play(id, r, placed(pieces(r)));
        const board = told.again!.board!;
        expect(told.verdict, id).toBe("right");
        expect(board.cells!.map((c) => c.square), id).toEqual(pieces(r).map((p) => p.square).sort(bySquare));
        expect(board.cells!.every((c) => c.state === "right"), id).toBe(true);
        expect(key(board.pieces), id).toBe(key(pieces(r)));
        expect([board.seat, board.names, board.lit], id).toEqual(["white", false, []]);
      }
    });

    it("marks the four states on one board at every level: right, wrong, extra, and missing with its piece ghosted on its square", () => {
      for (const [id, r] of LEVELS_AND_POSITIONS) {
        const all = pieces(r);
        const left = all.at(-1)!; // taken off the board: missing
        const turned = all[1]!; // the other side's piece on its square: wrong
        const extra = { side: "white", kind: "queen", square: SQUARES.find((s) => !all.some((p) => p.square === s))! } as Placed; // where nothing stands: extra
        const mine = [...all.filter((p) => p !== left && p !== turned), { ...turned, side: turned.side === "white" ? "black" : "white" } as Placed, extra];
        const { told } = play(id, r, placed(mine));
        const board = told.again!.board!;
        expect(told.verdict, id).toBe("wrong");
        expect(stateOf(board, left.square), id).toBe("missing");
        expect(stateOf(board, turned.square), id).toBe("wrong");
        expect(stateOf(board, extra.square), id).toBe("extra");
        for (const p of all.filter((x) => x !== left && x !== turned)) expect(stateOf(board, p.square), `${id} ${p.square}`).toBe("right");
        // Every cell is a square a piece stands on, once, in square order.
        expect(board.cells!.map((c) => c.square), id).toEqual([...new Set(board.cells!.map((c) => c.square))].sort(bySquare));
        // My pieces, and the missing one drawn where it belongs.
        expect(key(board.pieces), id).toBe(key([...mine, left]));
        expect(board.pieces.find((p) => p.square === left.square), id).toEqual(left);
      }
    });

    it("marks a piece on a square beside as extra there and missing where it belongs; two swapped pieces as both wrong", () => {
      const beside = play("L1", L1, placed(moved(L1, "b1", "a1"))).told.again!.board!;
      expect([stateOf(beside, "a1"), stateOf(beside, "b1")]).toEqual(["extra", "missing"]);
      expect(beside.pieces.find((p) => p.square === "b1")).toEqual({ side: "black", kind: "rook", square: "b1" });
      expect(beside.pieces.find((p) => p.square === "a1")).toEqual({ side: "black", kind: "rook", square: "a1" });
      const swapped = pieces(L3).map((p) => (p.square === "d3" ? { ...p, square: "c5" } : p.square === "c5" ? { ...p, square: "d3" } : p)) as Placed[];
      const both = play("L3", L3, placed(swapped)).told.again!.board!;
      expect([stateOf(both, "c5"), stateOf(both, "d3")]).toEqual(["wrong", "wrong"]);
      expect(both.cells!.filter((c) => c.state !== "right").map((c) => c.square)).toEqual(["c5", "d3"]);
    });

    it("keeps the judge, the mistake kinds and the told line as they were", () => {
      const { told } = play("L1", L1, placed(moved(L1, "b1", "a1")));
      expect(told).toMatchObject({ verdict: "wrong", line: "No: 5 of 6. Black's rook stands on b1, not a1: the file beside.", score: { mistakes: ["The file beside"] } });
    });

    it("draws a position read in words on one board too, with the words kept", () => {
      const { told } = play("L5", L5, placed(without(L5, "h6")));
      expect(told.again!.words).toBe(inWords(fromFen(L5.fen)));
      expect(stateOf(told.again!.board!, "h6")).toBe("missing");
    });
  });
});
