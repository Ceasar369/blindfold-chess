import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { MISTAKE } from "../../../near-misses/index.ts";
import { besidesKings, fromFen, fromPieces, inWords } from "../../../positions/index.ts";
import { moveBetween, play } from "../../../rules/index.ts";
import type { Puzzle, PuzzlesPack } from "../../../packs/index.ts";
import { seeded } from "../../../random/index.ts";
import { type Ask, type Did, type Item, type Level, NOT_COUNTED, type RoundFacts, type Show, type Square, type Step, type Told } from "../../../shape/index.ts";
import { EXAMPLES } from "./examples.ts";
import {
  ANOTHER_MOVE, challenge, CHECK_NOT_MATE, findTheWinningMove, FIRST_MOVES_RIGHT, LEVELS, MISTAKES, mirrorPuzzle, MOVE_FROM_BEFORE, NO_MOVE,
  roundPuzzles, UNCLEAR,
} from "./index.ts";

const real = JSON.parse(readFileSync(join(import.meta.dirname, "..", "..", "..", "..", "packs", "puzzles.json"), "utf8")) as PuzzlesPack;
const level = (id: string): Level => LEVELS.find((l) => l.id === id)!;
// A move built on the move composer.
const composed = (text: string): Did => ({ did: "answer", answer: { kind: "text", text } });
const picked = (value: string): Did => ({ did: "answer", answer: { kind: "choice", value } });
const item = (id: string, p: Puzzle, mirrored = false): Item => findTheWinningMove(level(id), { puzzle: p, mirrored }, seeded(`6.1.1 ${p.id}`));
const facts = (pack: PuzzlesPack, back: RoundFacts["back"] = []): RoundFacts => ({ side: "white", back, packs: { "puzzles.json": pack } });

// The right answers of a puzzle as I meet it, written: my first move, and my
// second in a two-move one, with their UCI forms.
function answers(seen: { puzzle: Puzzle; mirrored: boolean }): { uci: string; san: string }[] {
  const p = seen.mirrored ? mirrorPuzzle(seen.puzzle) : seen.puzzle;
  let pos = fromFen(p.fen);
  const out: { uci: string; san: string }[] = [];
  p.moves.forEach((uci, i) => {
    const promo = ({ q: "queen", r: "rook", b: "bishop", n: "knight" } as const)[uci[4] as "q"] ?? null;
    const m = moveBetween(pos, uci.slice(0, 2) as Square, uci.slice(2, 4) as Square, promo)!;
    if (i % 2 === 1) out.push({ uci, san: m.san });
    pos = play(pos, m)!;
  });
  return out;
}

describe("6.1.1 Find the winning move", () => {
  it("copies the card's level table", () => {
    expect(LEVELS.map((l) => [l.id, l.questions, l.minutes, l.seconds, l.seat, ...l.dials.map((d) => d.value)])).toEqual([
      ["L1", 10, 4, null, "item", "A board, after my opponent's move", "Mate in one", "Any", "Pick one of four"],
      ["L2", 10, 5, null, "item", "A board, after my opponent's move", "Mate in one", "Any", "Move composer"],
      ["L3", 6, 5, null, "item", "A board, after my opponent's move", "3 mates in one, 3 two-move", "Any", "Move composer"],
      ["L4", 6, 5, null, "item", "Words after my opponent's move, on screen", "3 mates in one, 3 two-move", "7 at most", "Move composer"],
      ["L5", 6, 5, null, "item", "Words before my opponent's move, until I hide them; then the move alone", "3 mates in one, 3 two-move", "7 at most", "Move composer"],
    ]);
    expect(LEVELS[0]!.passMark).toBe("Pass mark for 6.1.1 L1 to L5: the right answers in one round. My practice sets it.");
    expect(MISTAKES).toEqual([
      "The file beside", "The rank beside", "The board turned", "The files reversed", "The ranks reversed",
      "A move from before my opponent's move", "A move that is no move", "A check that is not mate", "Another move",
    ]);
  });

  it("holds the examples as the file does", () => {
    for (const p of Object.values(EXAMPLES)) expect(besidesKings(fromFen(p.fen))).toBe(p.besides);
  });

  it("L1, 002Q2: Nxg3# picked, then Rh2+ picked", () => {
    const p = EXAMPLES.L1;
    const it1 = item("L1", p);
    const ask = it1.first() as Ask;
    expect(ask.question).toBe("White played 28. Bxh6. Find your winning move.");
    expect(ask.board?.seat).toBe("black");
    expect(ask.board?.names).toBe(false);
    expect(ask.board?.lit).toEqual(["f4", "h6"]);
    const pos = fromFen("7k/p4R1p/3p3B/2pN1n2/2PbB1b1/3P2P1/P3r3/5R1K b - - 0 28");
    expect(inWords(pos)).toBe(
      "White: king h1, rooks f1 and f7, bishops e4 and h6, knight d5, pawns a2, c4, d3 and g3. Black: king h8, rook e2, bishops d4 and g4, knight f5, pawns a7, c5, d6 and h7.",
    );
    expect(inWords(fromPieces(ask.board!.pieces))).toBe(inWords(pos));
    if (ask.input.how !== "choose") throw new Error("L1 picks one of four.");
    const words = ask.input.choices.map((c) => c.words);
    expect(words).toHaveLength(4);
    expect(words).toContain("Nxg3#");
    expect(words).toContain("Rh2+");
    expect(words).toContain("Bf3+");
    const value = (w: string) => (ask.input.how === "choose" ? ask.input.choices.find((c) => c.words === w)!.value : "");
    expect((it1.next(picked(value("Nxg3#"))) as Told).line).toBe("Right: 28... Nxg3#.");
    expect(it1.next({ did: "press" })).toEqual({ step: "done", back: null });

    const it2 = item("L1", p);
    const a2 = it2.first() as Ask;
    const rh2 = a2.input.how === "choose" ? a2.input.choices.find((c) => c.words === "Rh2+")!.value : "";
    const told = it2.next(picked(rh2)) as Told;
    expect(told.line).toBe("No: it is 28... Nxg3#. Rh2+ is check, but White's king takes the rook on h2.");
    expect(told.score.mistakes).toEqual([CHECK_NOT_MATE]);
    expect(told.again?.moves).toBe("28. Bxh6 Nxg3#");
    expect(told.again?.board?.lit).toEqual(["f5", "g3"]);
    expect(it2.next({ did: "press" })).toEqual({ step: "done", back: { id: "002Q2", mirrored: true } });
  });

  it("L1's other choices: checks first, then captures, never another mate", () => {
    for (let i = 0; i < 20; i++) {
      const ask = findTheWinningMove(level("L1"), { puzzle: EXAMPLES.L1, mirrored: false }, seeded(`choices ${i}`)).first() as Ask;
      const words = ask.input.how === "choose" ? ask.input.choices.map((c) => c.words) : [];
      expect(words.filter((w) => w.endsWith("#"))).toEqual(["Nxg3#"]);
      expect(words.filter((w) => w.includes("+")).sort()).toEqual(["Bf3+", "Rh2+"]);
      expect(words.filter((w) => !w.includes("+") && !w.includes("#"))[0]).toMatch(/x/);
    }
  });

  it("L2, 004WZ: Qh1# on the move composer, then Qg2", () => {
    const p = EXAMPLES.L2;
    const right = item("L2", p);
    const ask = right.first() as Ask;
    expect(ask.question).toBe("White played 26. Kxg1. Find your winning move.");
    expect(ask.board?.lit).toEqual(["f1", "g1"]);
    expect(ask.board?.seat).toBe("black");
    expect(ask.input).toEqual({ how: "compose-move" });
    expect((right.next(composed("Qh1#")) as Told).line).toBe("Right: 26... Qh1#.");
    const wrong = item("L2", p);
    wrong.first();
    const told = wrong.next(composed("Qg2")) as Told;
    expect(told.line).toBe("No: it is 26... Qh1#. Qg2+ is check, but White's queen on h3 takes it.");
    expect(told.score.mistakes).toEqual([CHECK_NOT_MATE]);
  });

  it("L3, 0030b: Rd8, then Rxe8; and Rd7, the rank beside", () => {
    const p = EXAMPLES.L3;
    const right = item("L3", p);
    const ask = right.first() as Ask;
    expect(ask.question).toBe("Black played 32... Be4. Find your winning move.");
    expect(ask.board?.seat).toBe("white");
    expect(ask.board?.lit).toEqual(["g6", "e4"]);
    const second = right.next(composed("Rd8")) as Ask;
    expect(second.step).toBe("ask");
    expect(second.question).toBe("Black played 33... Ne8. Your next move.");
    // My own move shows back once, as the page read it, before the reply.
    expect(second.notes).toEqual(["You played 33. Rd8+."]);
    expect(second.board?.lit).toEqual(["f6", "e8"]);
    const told = right.next(composed("Rxe8")) as Told;
    expect(told.line).toBe("Right: 33. Rd8+ Ne8 34. Rxe8#.");
    expect(told.score.counts).toEqual({ [FIRST_MOVES_RIGHT]: 1 });

    const wrong = item("L3", p);
    wrong.first();
    const no = wrong.next(composed("Rd7")) as Told;
    expect(no.line).toBe("No: it is 33. Rd8+, and after 33... Ne8, 34. Rxe8#. d7 is the rank beside d8.");
    expect(no.score.mistakes).toEqual([MISTAKE["rank beside"]]);
    expect(no.score.counts).toEqual({ [FIRST_MOVES_RIGHT]: 0 });
    // Qxg4 wins a rook, and Black plays on: another move.
    const other = item("L3", p);
    other.first();
    expect((other.next(composed("Qxg4")) as Told).score.mistakes).toEqual([ANOTHER_MOVE]);
    // Chapter 1's five ask the right piece: the rook on g1 landing on e1, d8
    // with the board turned, moves another rook than the d1 one.
    const otherRook = item("L3", p);
    otherRook.first();
    const rge1 = otherRook.next(composed("Rge1")) as Told;
    expect(rge1.score.mistakes).toEqual([ANOTHER_MOVE]);
    expect(rge1.line).toBe("No: it is 33. Rd8+, and after 33... Ne8, 34. Rxe8#.");
  });

  it("L4, 00OXc: Rh3 in words, then Rg3; and the card's other near misses", () => {
    const p = EXAMPLES.L4;
    const right = item("L4", p);
    const ask = right.first() as Ask;
    expect(ask.board).toBeNull();
    expect(ask.words).toBe("White: king f7, rook f3. Black: king h6, rook e4, bishop d4, pawns b6, f4, g5 and h7. White to move.");
    expect(ask.question).toBe("Black played 50... g5. Find your winning move.");
    expect((right.next(composed("Rh3")) as Told).line).toBe("Right: 51. Rh3#.");
    const wrong = (text: string) => {
      const i = item("L4", p);
      i.first();
      return i.next(composed(text)) as Told;
    };
    expect(wrong("Rg3").line).toBe("No: it is 51. Rh3#. g3 is the file beside h3.");
    expect(wrong("Rg3").score.mistakes).toEqual(["The file beside"]);
    expect(wrong("Rh2").score.mistakes).toEqual(["The rank beside"]);
    expect(wrong("Rh4").score.mistakes).toEqual(["The rank beside"]);
    expect(wrong("Ra6").score.mistakes).toEqual(["The board turned"]);
    expect(wrong("Ra3").score.mistakes).toEqual(["The files reversed"]);
    expect(wrong("Rh6").score.mistakes).toEqual(["The ranks reversed"]);
    expect(wrong("Ra6").line).toBe("No: it is 51. Rh3#. a6 is h3 with the board turned.");
    // Rf6: Black's pawn on f4 stands between f3 and f6.
    expect(wrong("Rf6").score.mistakes).toEqual([NO_MOVE]);
    expect(wrong("Rf6").line).toBe("No: it is 51. Rh3#. Rf6 is no move: Black's pawn on f4 stands between f3 and f6.");
  });

  it("L5, 01FzV: the words hidden, Ne1 then Nxc2; and c1=Q, a move from before", () => {
    const p = EXAMPLES.L5;
    const right = item("L5", p);
    const show = right.first() as Show;
    expect(show).toMatchObject({ step: "show", button: "Hide", time: "look" });
    expect(show.words).toBe("White: king d3, rook c4, pawn h4. Black: king g6, knight f3, pawns c2 and f5. White to move.");
    const ask = right.next({ did: "press" }) as Ask;
    expect(ask).toMatchObject({ question: "White played 49. Rxc2. Find your winning move.", board: null, words: undefined });
    const second = right.next(composed("Ne1")) as Ask;
    expect(second.question).toBe("White played 50. Kc4. Your next move.");
    expect(second.notes).toEqual(["You played 49... Ne1+."]);
    expect(second.board).toBeNull();
    expect((right.next(composed("Nxc2")) as Told).line).toBe("Right: 49... Ne1+ 50. Kc4 Nxc2.");

    const wrong = item("L5", p);
    wrong.first();
    wrong.next({ did: "press" });
    const told = wrong.next(composed("c1=Q")) as Told;
    expect(told.line).toBe(
      "No: your pawn on c2 was taken by 49. Rxc2. It is 49... Ne1+, then 50... Nxc2: the knight checks the king, then takes the rook.",
    );
    expect(told.score.mistakes).toEqual([MOVE_FROM_BEFORE]);
    expect(told.again?.board?.pieces).toHaveLength(5);
  });

  it("keeps a question open on a move not counted, or left unclear", () => {
    const i = item("L3", EXAMPLES.L3);
    i.first();
    // A knight's key alone names no move.
    const slip = i.next(composed("N")) as Ask;
    expect(slip).toMatchObject({ step: "ask", note: NOT_COUNTED, reopened: true });
    const unclear = i.next(composed("Re1")) as Ask;
    expect(unclear).toMatchObject({ step: "ask", note: "Two of your rooks reach e1: say which.", reopened: true });
    i.next(composed("Rd8"));
    const told = i.next(composed("Rxe8")) as Told;
    expect(told.verdict).toBe("right");
    expect(told.score.counts).toEqual({ [FIRST_MOVES_RIGHT]: 1, [UNCLEAR]: 1 });
  });

  it("brings 00OXc back mirrored: 51. Ra3#", () => {
    const m = mirrorPuzzle(EXAMPLES.L4);
    const i = item("L4", EXAMPLES.L4, true);
    const ask = i.first() as Ask;
    expect(ask.words).toBe("White: king c7, rook c3. Black: king a6, rook d4, bishop e4, pawns a7, b5, c4 and g6. White to move.");
    expect(ask.question).toBe("Black played 50... b5. Find your winning move.");
    expect(m.moves).toEqual(["b6b5", "c3a3"]);
    expect((i.next(composed("Ra3")) as Told).line).toBe("Right: 51. Ra3#.");
    // Missed mirrored, it comes back as it first stood.
    const missed = item("L4", EXAMPLES.L4, true);
    missed.first();
    missed.next(composed("Rb3"));
    expect(missed.next({ did: "press" })).toEqual({ step: "done", back: { id: "00OXc", mirrored: false } });
  });

  it("makes each level's round from the pack, and plays it right", () => {
    for (const l of LEVELS) {
      const seed = `6.1.1 round ${l.id}`;
      const f = facts(real);
      const seen = roundPuzzles(l, seeded(seed), f);
      const items = challenge.makeRound(l, seeded(seed), f);
      expect(items).toHaveLength(l.questions);
      expect(new Set(seen.map((s) => s.puzzle.id)).size).toBe(l.questions);
      const twos = seen.filter((s) => s.puzzle.moves.length === 4).length;
      expect(twos).toBe(l.id === "L1" || l.id === "L2" ? 0 : 3);
      if (l.id === "L4" || l.id === "L5") expect(seen.every((s) => s.puzzle.besides <= 7)).toBe(true);
      items.forEach((it, i) => {
        let step: Step = it.first();
        if (step.step === "show") step = it.next({ did: "press" });
        for (const { uci, san } of answers(seen[i]!)) {
          const ask = step as Ask;
          expect(ask.step).toBe("ask");
          step = it.next(ask.input.how === "choose" ? picked(uci) : composed(san));
        }
        expect((step as Told).verdict).toBe("right");
        expect(it.next({ did: "press" })).toEqual({ step: "done", back: null });
      });
    }
  });

  it("brings missed puzzles back among a round's", () => {
    const pack: PuzzlesPack = { puzzles: [...real.puzzles, EXAMPLES.L4] };
    const seen = roundPuzzles(level("L4"), seeded("back"), facts(pack, [{ id: "00OXc", mirrored: true }, { id: "002Q2", mirrored: false }, "x"]));
    expect(seen).toHaveLength(6);
    expect(seen.filter((s) => s.puzzle.id === "00OXc")).toEqual([{ puzzle: EXAMPLES.L4, mirrored: true }]);
    // 002Q2 holds more than 7 pieces besides the kings, and is not in the pack.
    expect(seen.some((s) => s.puzzle.id === "002Q2")).toBe(false);
  });

  // Record line 6-103: a puzzle of more than 7 pieces waits through a round of L4 or L5, which does not ask it.
  it("asks the puzzles coming back that its level takes, and a puzzle of more than 7 pieces waits at L4 and L5", () => {
    const big = real.puzzles.filter((p) => p.besides > 7).slice(0, 2);
    const small = real.puzzles.filter((p) => p.besides <= 7).slice(0, 8);
    expect(big).toHaveLength(2);
    expect(small).toHaveLength(8);
    const back = [{ id: big[0]!.id, mirrored: false }, { id: small[0]!.id, mirrored: true }, { id: big[1]!.id, mirrored: false }, { id: "not-in-the-pack", mirrored: false }, "x"];
    // L4 and L5 take 7 pieces at most: the small one is asked, the big ones wait.
    for (const id of ["L4", "L5"]) expect(challenge.asks!(level(id), facts(real, back)), id).toEqual([back[1]]);
    // L1 to L3 take any: the big ones are asked too, in the order they were stored.
    for (const id of ["L1", "L2", "L3"]) expect(challenge.asks!(level(id), facts(real, back)), id).toEqual([back[0], back[1], back[2]]);
    // Past the round's count, a puzzle waits.
    const many = small.map((p) => ({ id: p.id, mirrored: false }));
    expect(challenge.asks!(level("L4"), facts(real, many))).toEqual(many.slice(0, 6));
    expect(challenge.asks!(level("L4"), { ...facts(real, many), count: 3 })).toEqual(many.slice(0, 3));
    // What it says it asks is what it makes: no big puzzle in an L4 round, the small one in it.
    const seen = roundPuzzles(level("L4"), seeded("6.1.1 asks"), facts(real, back));
    expect(seen.map((s) => s.puzzle.id)).toContain(small[0]!.id);
    expect(seen.some((s) => s.puzzle.id === big[0]!.id || s.puzzle.id === big[1]!.id)).toBe(false);
  });

  it("gives one seed one round", () => {
    const ids = (seed: string) => roundPuzzles(level("L3"), seeded(seed), facts(real)).map((s) => s.puzzle.id);
    expect(ids("same")).toEqual(ids("same"));
    expect(ids("same")).not.toEqual(ids("other"));
  });
});
