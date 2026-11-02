import { afterEach, describe, expect, it } from "vitest";
import type { PositionsPack } from "../../../packs/index.ts";
import { fromFen, fromWords, inWords, startingPosition, toFen } from "../../../positions/index.ts";
import { legalMoves, playLine } from "../../../rules/index.ts";
import { seeded } from "../../../random/index.ts";
import { type Ask, type Did, type Item, type Level, NOT_COUNTED_MOVE, type Show, type Square, type Step, type Told } from "../../../shape/index.ts";
import { door, engineBot, LEVEL, replayBot } from "./bot.ts";
import { EXAMPLE_GAMES, type ExampleGame, useReplay } from "./examples.ts";
import { challenge, LEVELS, MISTAKES, playTheGame } from "./index.ts";

const level = (id: string): Level => LEVELS.find((l) => l.id === id)!;
// A move built on the move composer; a hint's button, the square one with the square keyed; Resign.
const move = (text: string): Did => ({ did: "answer", answer: { kind: "text", text } });
const square = (s: Square): Did => ({ did: "answer", answer: { kind: "hint", hint: "square", square: s } });
const LAST: Did = { did: "answer", answer: { kind: "hint", hint: "last" } };
const BOARD: Did = { did: "answer", answer: { kind: "hint", hint: "board" } };
const RESIGN: Did = { did: "answer", answer: { kind: "resign" } };
const example = (id: string): ExampleGame => EXAMPLE_GAMES.find((g) => g.level === id)!;

afterEach(() => {
  door.bot = engineBot;
});

// Plays an example game: my moves from its line, and before a move of mine,
// by its number, whatever else I give first. Each step comes back.
function playExample(ex: ExampleGame, which: "right" | "wrong" = "right", before: Record<number, Did[]> = {}) {
  useReplay(ex.game);
  const item = playTheGame(level(ex.level), ex.start, ex.me);
  const steps: Step[] = [item.first()];
  const { positions } = playLine(ex.start, ex[which]);
  const at = [ex.start, ...positions];
  if (steps[0]!.step === "show") steps.push(item.next({ did: "press" }));
  for (let i = 0; i < ex[which].length; i++) {
    if (at[i]!.turn !== ex.me) continue;
    for (const did of before[at[i]!.moveNumber] ?? []) {
      steps.push(item.next(did));
      if (steps.at(-1)!.step === "show") steps.push(item.next({ did: "press" }));
    }
    steps.push(item.next(move(ex[which][i]!)));
  }
  const told = steps.at(-1) as Told;
  expect(told.step).toBe("told");
  return { item, steps, told, asks: steps.filter((s): s is Ask => s.step === "ask") };
}

describe("6.3.1 Play the game", () => {
  it("copies the card's level table", () => {
    expect(LEVELS.map((l) => [l.id, l.seat, l.questions, l.minutes, ...l.dials.map((d) => d.value)])).toEqual([
      ["L1", "white", 1, null, "A real position, 6 besides the kings", "Words, renewed after each move", "None: the words show it", "White", "Weaker", "None: it runs to its end"],
      ["L2", "white", 1, null, "A real position, 6 besides the kings", "Words until I hide them, then each move alone", "6", "White", "Weaker", "None: it runs to its end"],
      ["L3", "white", 1, null, "The starting position", "Each move alone", "6", "White", "Weaker", "None: it runs to its end"],
      ["L4", "black", 1, null, "The starting position", "Each move alone", "6", "Black", "Weaker", "None: it runs to its end"],
      ["L5", "round", 1, null, "The starting position", "Each move alone", "6", "White or Black, at random", "Even", "None: it runs to its end"],
      ["L6", "round", 1, null, "The starting position", "Each move alone", "0", "White or Black, at random", "Even", "None: it runs to its end"],
    ]);
    expect(LEVELS.every((l) => l.passMark === "Pass mark for 6.3.1 L1 to L6: my results and my clean games, over my last games at the level. My practice sets it.")).toBe(true);
  });

  it("L1: bee1mrsw in words renewed after each move, then a move left unclear", () => {
    const { asks, told } = playExample(example("L1"));
    expect(asks[0]!.question).toBe("Your move.");
    expect(asks[0]!.words).toBe("White: king b3, rook d6, pawns b6 and c4. Black: king f3, rook h2, pawns g5 and h4. White to move.");
    expect(asks[1]).toMatchObject({ question: "Black played 46... g4. Your move.", notes: ["You played 46. b7."], time: "move" });
    expect(asks[1]!.words).toBe("White: king b3, rook d6, pawns b7 and c4. Black: king f3, rook h2, pawns g4 and h4. White to move.");
    expect(told.line).toBe("Checkmate: you won, in 12 moves. A clean game.");
    expect(told.score).toMatchObject({ right: true, mistakes: [], counts: { Won: 1, "My moves": 12, "Clean games": 1 } });
    expect(told.again?.notes).toBeUndefined();
    expect(told.again?.moves).toBe(
      "46. b7 g4 47. b8=Q Kg3 48. Rd3+ Kg2 49. Qb7+ Kf1 50. Qf7+ Rf2 51. Qe6 g3 52. Rd1+ Kg2 53. Qe4+ Rf3+ 54. Kb4 h3 55. Qe2+ Rf2 56. Qe4+ Kh2 57. Qh1#",
    );

    const wrong = playExample(example("L1"), "right", { 47: [move("b8")] });
    expect(wrong.asks.find((a) => a.reopened)).toMatchObject({ note: "Say which piece your pawn becomes.", question: "Black played 46... g4. Your move." });
    expect(wrong.told.line).toBe("Checkmate: you won, in 12 moves. A clean game. 1 move left unclear.");
    expect(wrong.told.score.mistakes).toEqual(["A move left unclear"]);
    expect(wrong.told.score.counts["Moves left unclear"]).toBe(1);
  });

  it("L2: hamanitw held, a square hint, then my king left in check", () => {
    const { steps, asks, told } = playExample(example("L2"), "right", { 53: [square("h2")] });
    expect(steps[0]).toEqual({
      step: "show", words: "White: king b6, rook c7, pawns c6 and g3. Black: king d5, rook f2, pawns g5 and h5. White to move.", button: "Hide", time: "look",
      tally: { played: 0, allowed: null, illegal: 0, hints: { left: 6, of: 6 } },
    });
    expect(asks[0]!.words).toBeUndefined();
    expect(asks.find((a) => a.note === "Black's pawn.")).toMatchObject({ reopened: true, question: "Black played 52... h2. Your move." });
    expect(told.line).toBe("Checkmate: you won, in 14 moves. 1 hint point.");
    expect(told.score.counts["Hint points: a square"]).toBe(1);
    // The count the screen reads: the game starts at move 48, so 5 moves are played before the hint at the 53rd; the hint spent a point; 14 at the end.
    expect(asks[0]!.tally).toEqual({ played: 0, allowed: null, illegal: 0, hints: { left: 6, of: 6 } });
    expect(asks.find((a) => a.note === "Black's pawn.")!.tally).toEqual({ played: 5, allowed: null, illegal: 0, hints: { left: 5, of: 6 } });
    expect(told.tally).toEqual({ played: 14, allowed: null, illegal: 0, hints: { left: 5, of: 6 } });

    const wrong = playExample(example("L2"), "right", { 50: [move("Rd4")], 53: [square("h2")] });
    expect(wrong.asks.find((a) => a.note === NOT_COUNTED_MOVE)).toMatchObject({ question: "Black played 49... Rb2+. Your move.", reopened: true });
    // A move refused counts as illegal and not as a move played; the points are untouched.
    expect(wrong.asks.find((a) => a.note === NOT_COUNTED_MOVE)!.tally).toEqual({ played: 2, allowed: null, illegal: 1, hints: { left: 6, of: 6 } });
    expect(wrong.told.tally).toEqual({ played: 14, allowed: null, illegal: 1, hints: { left: 5, of: 6 } });
    expect(wrong.told.line).toBe("Checkmate: you won, in 14 moves. 1 illegal move, 1 hint point.");
    expect(wrong.told.again?.notes).toEqual(["50. Rd4 was not legal: 49... Rb2+ gave check, and your king on b6 stayed in it."]);
    expect(wrong.told.score.mistakes).toEqual(["My king left in check"]);
  });

  it("L3: 0i9idrki as White, the last moves, then a line blocked", () => {
    const { steps, told } = playExample(example("L3"), "right", { 15: [LAST] });
    const shown = steps.filter((s): s is Show => s.step === "show");
    expect(shown).toEqual([
      {
        step: "show", words: "12. Bb2 Qg6 13. Ba4 Be7 14. e5 dxe5", button: "Hide", time: "look",
        tally: { played: 14, allowed: null, illegal: 0, hints: { left: 5, of: 6 } },
      },
    ]);
    expect(told.line).toBe("Checkmate: you won, in 19 moves. 1 hint point.");

    const wrong = playExample(example("L3"), "right", { 15: [LAST, move("Bxe5")] });
    expect(wrong.told.line).toBe("Checkmate: you won, in 19 moves. 1 illegal move, 1 hint point.");
    expect(wrong.told.again?.notes).toEqual(["15. Bxe5 was not legal: your pawn on d4 stands between b2 and e5."]);
    expect(wrong.told.score.mistakes).toEqual(["A line blocked"]);
    // The game shown again, move by move: the slip where I tried it, after 14... dxe5.
    const replay = wrong.told.again!.replay!;
    expect(replay).toHaveLength(38);
    expect(replay[0]).toMatchObject({ move: "The first position.", notes: [], board: { seat: "white", lit: [] } });
    expect(replay[28]).toMatchObject({ move: "14... dxe5", notes: ["15. Bxe5 was not legal: your pawn on d4 stands between b2 and e5."] });
    expect(replay[28]!.board.lit).toEqual(["d6", "e5"]);
    expect(replay[29]).toMatchObject({ move: "15. Nxe5", notes: [] });
    expect(replay.at(-1)).toMatchObject({ move: "19. Qxe7#", board: wrong.told.again!.board });
    // Three whole games: past 5 seconds on a busy machine.
  }, 20_000);

  it("L4: 3okbf6cj as Black, the bot first, then castling not allowed", () => {
    const { asks, told } = playExample(example("L4"));
    expect(asks[0]!.question).toBe("White played 1. e4. Your move.");
    expect(told.line).toBe("Checkmate: you won, in 18 moves. A clean game.");
    const wrong = playExample(example("L4"), "right", { 5: [move("O-O")] });
    expect(wrong.told.line).toBe("Checkmate: you won, in 18 moves. 1 illegal move.");
    expect(wrong.told.again?.notes).toEqual(["5... O-O was not legal: your bishop on f8 stands between your king and your rook."]);
    expect(wrong.told.score.mistakes).toEqual(["Castling not allowed"]);
  });

  it("L5: xxys63o9, then a mate in one missed", () => {
    expect(playExample(example("L5")).told.line).toBe("Checkmate: you won, in 17 moves. A clean game.");
    const wrong = playExample(example("L5"), "wrong");
    expect(wrong.told.line).toBe("Checkmate: you won, in 19 moves. A clean game. 1 mate in one missed.");
    expect(wrong.told.again?.notes).toEqual(["17. Qh6: 17. Qg5# and 17. Qg4# mated at once."]);
    expect(wrong.told.score.mistakes).toEqual(["A mate in one missed"]);
    // The slip at the move that made it.
    const at = wrong.told.again!.replay!.find((r) => r.notes.length)!;
    expect(at).toMatchObject({ move: "17. Qh6", notes: ["17. Qh6: 17. Qg5# and 17. Qg4# mated at once."] });
  });

  it("L6: 5cu748v4 as Black, then a piece not there", () => {
    expect(playExample(example("L6")).told.line).toBe("Checkmate: you won, in 18 moves. A clean game.");
    const wrong = playExample(example("L6"), "right", { 15: [move("Nxd4")] });
    expect(wrong.told.line).toBe("Checkmate: you won, in 18 moves. 1 illegal move.");
    expect(wrong.told.again?.notes).toEqual(["15... Nxd4 was not legal: your knight from c6 was taken on f3 at 13. Bxf3."]);
    expect(wrong.told.score.mistakes).toEqual(["A piece not there"]);
  });

  it("names a stalemate I give: 34. h4 in i3yzok75", () => {
    const start = { ...fromWords("White: king h1, queen b7, rooks a1 and f1, pawns a2, b2, f4, g2 and h3. Black: king a4, pawn a5. White to move."), moveNumber: 34 };
    const item = playTheGame(level("L3"), start, "white");
    item.first();
    const told = item.next(move("h4")) as Told;
    expect(told.line).toBe("Stalemate: a draw, in 1 move. A clean game.");
    expect(told.again?.notes).toEqual(["34. h4 left Black's king on a4 no move, and not in check: stalemate, a draw. 34. Qb3# mated."]);
    expect(told.score).toMatchObject({ right: false, mistakes: ["A stalemate given"], counts: { Drawn: 1 } });
  });

  it("draws at once at a position's third appearance, and at 50 moves with no capture and no pawn move", () => {
    const shuffle = ["Nf3", "Nf6", "Ng1", "Ng8", "Nf3", "Nf6", "Ng1", "Ng8"];
    door.bot = replayBot([{ start: startingPosition(), sans: shuffle }]);
    const item = playTheGame(level("L3"), startingPosition(), "white");
    item.first();
    let step: Step = item.next(move("Nf3"));
    for (const mine of ["Ng1", "Nf3", "Ng1"]) step = item.next(move(mine));
    expect(step).toMatchObject({ step: "told", line: "A position's third appearance: a draw, in 4 moves. A clean game." });
    expect((step as Told).score).toMatchObject({ right: false, counts: { Drawn: 1, "My moves": 4 } });

    // 98 half-moves with no capture and no pawn move: my king move, then the bot's, make 100.
    const late = fromFen("r5k1/8/8/8/8/8/8/1K5R w - - 98 60");
    door.bot = replayBot([{ start: late, sans: ["Kc2", "Kf7"] }]);
    const fifty = playTheGame(level("L1"), late, "white");
    fifty.first();
    expect(fifty.next(move("Kc2"))).toMatchObject({ step: "told", line: "50 moves with no capture and no pawn move: a draw, in 1 move. A clean game." });
  });

  it("keeps a slip apart from a chess move: not counted, resigning", () => {
    useReplay("0i9idrki");
    const item = playTheGame(level("L3"), startingPosition(), "white");
    item.first();
    // A knight's key alone names no move.
    expect(item.next(move("N"))).toMatchObject({ note: NOT_COUNTED_MOVE, reopened: true });
    const told = item.next(RESIGN) as Told;
    expect(told.line).toBe("You resigned: you lost, in 0 moves. A clean game.");
    expect(told.score).toMatchObject({ right: false, counts: { Lost: 1 } });
    expect(item.next({ did: "press" })).toEqual({ step: "done", back: null });
  });

  it("spends hint points from the game's budget: the board for 5 seconds", () => {
    useReplay("0i9idrki");
    const item = playTheGame(level("L3"), startingPosition(), "white");
    item.first();
    const board = item.next(BOARD) as Show;
    expect(board).toMatchObject({ step: "show", seconds: 5, button: "Hide", time: "look" });
    expect(board.board).toMatchObject({ seat: "white", names: false, lit: [] });
    expect(board.board!.pieces).toHaveLength(32);
    // The board costs 3 of the 6 points, and the Show already says so.
    expect(board.tally).toEqual({ played: 0, allowed: null, illegal: 0, hints: { left: 3, of: 6 } });
    expect(item.next({ did: "timeout" })).toMatchObject({ step: "ask", reopened: true, question: "Your move.", tally: { hints: { left: 3, of: 6 } } });
    item.next(BOARD);
    item.next({ did: "press" });
    const spent = item.next(square("e2")) as Ask;
    expect(spent).toMatchObject({ note: "Not enough hint points: 0 points left." });
    expect(spent.tally!.hints).toEqual({ left: 0, of: 6 });
    // L6 gives no hint: its tile says None, and no points are ever counted.
    const l6 = playTheGame(level("L6"), startingPosition(), "white");
    expect((l6.first() as Ask).tally).toEqual({ played: 0, allowed: null, illegal: 0, hints: null });
    expect(l6.next(BOARD)).toMatchObject({ note: "No hints at this level.", reopened: true, tally: { hints: null } });
  });

  it("asks each move on the move composer, with Resign, and a button per hint where the level gives points", () => {
    const hints = [{ hint: "square", cost: 1 }, { hint: "last", cost: 1 }, { hint: "board", cost: 3 }];
    for (const l of LEVELS) {
      const item = playTheGame(l, startingPosition(), "white");
      let step = item.first();
      if (step.step === "show") step = item.next({ did: "press" });
      const none = l.id === "L1" || l.id === "L6";
      expect((step as Ask).input, l.id).toEqual(none ? { how: "compose-move", resign: true } : { how: "compose-move", resign: true, hints });
    }
  });

  it("counts my moves played as the game goes: a move refused, unclear, or a hint adds none", () => {
    useReplay("0i9idrki");
    const item = playTheGame(level("L3"), startingPosition(), "white");
    item.first();
    const tallyOf = (s: Step) => (s as Ask).tally;
    expect(tallyOf(item.next(move("N")))).toMatchObject({ played: 0, illegal: 0 });
    expect(tallyOf(item.next(move("Ra3")))).toMatchObject({ played: 0, illegal: 1 });
    expect(tallyOf(item.next(move("e4")))).toMatchObject({ played: 1, illegal: 1 });
    const told = item.next(RESIGN) as Told;
    expect(told.tally).toEqual({ played: 1, allowed: null, illegal: 1, hints: { left: 6, of: 6 } });
  });

  it("makes a round from the even positions, the bot first when Black is to move", () => {
    const even = [
      { game: "bee1mrsw", white: 1368, black: 1396, fen: "8/8/1P1R4/6p1/2P4p/1K3k2/7r/8 w - - 0 46", moveNumber: 45, moved: "black" as const },
      { game: "blackfirst", white: 1200, black: 1200, fen: "8/p7/P7/2p4p/2P2k1K/8/5P2/8 b - - 0 34", moveNumber: 34, moved: "white" as const },
    ];
    const packs = { "positions.json": { memory: [], even } satisfies PositionsPack };
    const asked = new Set<string>();
    for (let i = 0; i < 20; i++) {
      const [item] = challenge.makeRound(level("L1"), seeded(`r${i}`), { side: "white", back: [], packs });
      const first = item!.first() as Ask;
      asked.add(first.question === "Your move." ? "white first" : "bot first");
      if (first.question !== "Your move.") expect(first.question).toMatch(/^Black played 34\.\.\. \S+\. Your move\.$/);
    }
    expect(asked).toEqual(new Set(["white first", "bot first"]));
  });

  it("brings a game I lose back mirrored, a to h", () => {
    const even = [{ game: "bee1mrsw", white: 1368, black: 1396, fen: "8/8/1P1R4/6p1/2P4p/1K3k2/7r/8 w - - 0 46", moveNumber: 45, moved: "black" as const }];
    const packs = { "positions.json": { memory: [], even } };
    const [item] = challenge.makeRound(level("L1"), seeded("back"), { side: "white", back: [{ game: "bee1mrsw", mirrored: false, level: "L1" }], packs });
    const ask = item!.first() as Ask;
    expect(ask.words).toBe("White: king g3, rook e6, pawns f4 and g6. Black: king c3, rook a2, pawns a4 and b5. White to move.");
    item!.next(RESIGN);
    expect(item!.next({ did: "press" })).toEqual({ step: "done", back: { game: "bee1mrsw", mirrored: true, level: "L1" } });
    // Played as it came, mirrored, and lost: it comes back mirrored again, as the pack holds it.
    const [twice] = challenge.makeRound(level("L1"), seeded("back"), { side: "white", back: [{ game: "bee1mrsw", mirrored: true, level: "L1" }], packs });
    expect((twice!.first() as Ask).words).toBe("White: king b3, rook d6, pawns b6 and c4. Black: king f3, rook h2, pawns g5 and h4. White to move.");
    // An illegal move brings it back; a game won clean does not; nothing comes back from L3.
    const ex = example("L1");
    const clean = playExample(ex);
    expect(clean.item.next({ did: "press" })).toEqual({ step: "done", back: null });
    useReplay(ex.game);
    const slipped = playTheGame(level("L1"), ex.start, "white", { game: ex.game, mirrored: false, level: "L1" });
    slipped.first();
    slipped.next(move("Ra1"));
    for (const [i, san] of ex.right.entries()) if (i % 2 === 0) slipped.next(move(san));
    expect(slipped.next({ did: "press" })).toEqual({ step: "done", back: { game: "bee1mrsw", mirrored: false, level: "L1" } });
  });

  // Record line 6-201: a game comes back at the level where I lost it, and only
  // a round at that level asks it, so only that round takes one of its two.
  it("brings a game back at its own level alone, and asks it nowhere else", () => {
    const even = [
      { game: "bee1mrsw", white: 1368, black: 1396, fen: "8/8/1P1R4/6p1/2P4p/1K3k2/7r/8 w - - 0 46", moveNumber: 45, moved: "black" as const },
      { game: "blackfirst", white: 1200, black: 1200, fen: "8/p7/P7/2p4p/2P2k1K/8/5P2/8 b - - 0 34", moveNumber: 34, moved: "white" as const },
    ];
    const packs = { "positions.json": { memory: [], even } };
    const lostAtL1 = { game: "bee1mrsw", mirrored: false, level: "L1" };
    const lostAtL2 = { game: "blackfirst", mirrored: false, level: "L2" };
    const facts = { side: "white" as const, back: [lostAtL1, lostAtL2], packs };

    // The game lost at L1 is asked in an L1 round, mirrored, and the L2 game is not.
    expect(challenge.asks!(level("L1"), facts)).toEqual([lostAtL1]);
    for (let i = 0; i < 10; i++) {
      const [item] = challenge.makeRound(level("L1"), seeded(`own-${i}`), facts);
      expect((item!.first() as Ask).words).toBe("White: king g3, rook e6, pawns f4 and g6. Black: king c3, rook a2, pawns a4 and b5. White to move.");
    }
    // The game lost at L2 is asked in an L2 round alone.
    expect(challenge.asks!(level("L2"), facts)).toEqual([lostAtL2]);
    // No other level asks either: L3 to L6 start from the starting position.
    for (const id of ["L3", "L4", "L5", "L6"]) expect(challenge.asks!(level(id), facts)).toEqual([]);
    // A game stored with no level, as before, is asked by no level.
    expect(challenge.asks!(level("L1"), { ...facts, back: [{ game: "bee1mrsw", mirrored: false }] })).toEqual([]);
    // A game stored twice is asked once, and both entries count.
    const again = { game: "bee1mrsw", mirrored: true, level: "L1" };
    expect(challenge.asks!(level("L1"), { ...facts, back: [lostAtL1, again] })).toEqual([lostAtL1, again]);
    expect(challenge.makeRound(level("L1"), seeded("twice"), { ...facts, back: [lostAtL1, again] })).toHaveLength(1);
  });

  it("plays the starting position at L3 to L6, on the side the round sets", () => {
    for (const id of ["L5", "L6"]) {
      const [item] = challenge.makeRound(level(id), seeded(id), { side: "black", back: [] });
      door.bot = replayBot([{ start: startingPosition(), sans: ["e4"] }]);
      expect((item!.first() as Ask).question).toBe("White played 1. e4. Your move.");
    }
  });

  it("puts the engine behind the door, at each strength, a legal move at once", () => {
    expect(LEVEL).toEqual({ weaker: 2, even: 3 });
    for (const strength of ["weaker", "even"] as const) {
      let pos = startingPosition();
      for (let i = 0; i < 12; i++) {
        const m = door.bot(pos, strength);
        expect(legalMoves(pos).map((x) => x.san)).toContain(m.san);
        pos = playLine(pos, [m.san]).positions[0]!;
      }
    }
    // A promotion: js-chess-engine makes a queen.
    const promo = fromFen("8/4P3/8/8/8/8/k7/6K1 w - - 0 1");
    expect(engineBot(promo, "weaker").san).toMatch(/^e8=Q/);
  });

  it("varies its openings, at each strength", () => {
    const afterE4 = playLine(startingPosition(), ["e4"]).positions[0]!;
    for (const strength of ["weaker", "even"] as const) {
      const firsts = new Set(Array.from({ length: 30 }, () => engineBot(startingPosition(), strength).san));
      expect(firsts.size, `${strength}: White's first moves`).toBeGreaterThan(1);
    }
    const replies = new Set(Array.from({ length: 30 }, () => engineBot(afterE4, "weaker").san));
    expect(replies.size, "the weaker bot's replies to 1. e4").toBeGreaterThan(1);
  });

  it("carries its card's \"It needs\", word for word", () => {
    expect(challenge.needs).toBe(
      "3.1.1 L6, 3.2.1 L5, 6.1.1 L4 and 6.2.1 L2. From L2, 6.1.1 L5 and 6.2.1 L3. From L3, 5.1.1 L4, 5.2.1 L5 and 6.2.1 L6.",
    );
  });

  it("plays a whole game against the engine to its end", () => {
    // I play the engine's own weaker moves, and follow the game from the questions.
    const item = playTheGame(level("L3"), startingPosition(), "white");
    let pos = startingPosition();
    let step = item.first();
    for (let i = 0; i < 40 && step.step === "ask"; i++) {
      const theirs = (step as Ask).question.match(/^Black played \d+\.\.\. (\S+)\. Your move\.$/);
      if (theirs) pos = playLine(pos, [theirs[1]!]).positions[0]!;
      const mine = engineBot(pos, "weaker");
      pos = playLine(pos, [mine.san]).positions[0]!;
      step = item.next(move(mine.san));
    }
    if (step.step === "ask") step = item.next(RESIGN);
    expect(step.step).toBe("told");
    expect((step as Told).again?.moves).toMatch(/^1\. /);
  }, 30_000);

  it("names its mistakes", () => {
    expect(MISTAKES).toEqual([
      "A piece not there", "A line blocked", "My king left in check", "Castling not allowed", "Another illegal move",
      "A move left unclear", "A mate in one missed", "A stalemate given",
    ]);
    expect(inWords(fromFen(toFen(startingPosition())))).toBe(inWords(startingPosition()));
  });
});

