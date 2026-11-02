import { describe, expect, it } from "vitest";
import { besidesKings, inWords, piecesOf, startingPosition } from "../../../positions/index.ts";
import { playLine } from "../../../rules/index.ts";
import { seeded } from "../../../random/index.ts";
import type { Ask, Did, Done, Level, Placed, Show, Square, Told } from "../../../shape/index.ts";
import { SQUARES } from "../../../squares/index.ts";
import { builtChallenges, CHAPTERS } from "../../index.ts";
import { openingChallenge } from "./challenge.ts";
import { DEFINITIONS, OPENINGS, type Opening } from "./definitions.ts";
import { judgeOpening, MISTAKES } from "./judge.ts";
import { correction, stagesOf } from "./lesson.ts";

const press: Did = { did: "press" };
const answered = (pieces: readonly Placed[]): Did => ({ did: "answer", answer: { kind: "position", pieces: [...pieces] } });
const opening = (name: string) => OPENINGS.find((o) => o.name === name)!;
const judge = (o: Opening, pieces: readonly Placed[]) => judgeOpening(o, pieces, OPENINGS);
const challengeOf = (o: Opening) => builtChallenges().get(o.challenge)!;
const levelOf = (o: Opening, id: string): Level => challengeOf(o).levels.find((l) => l.id === id)!;
const roundOf = (o: Opening, id: string, back: unknown[] = []) =>
  challengeOf(o).makeRound(levelOf(o, id), seeded(`${o.id} ${id}`), { side: "white", back: back as never });

// The start position's pieces, edited square by square: a piece moved, put, or taken off (null).
function startWith(edits: [string, string | null][]): Placed[] {
  let pieces = piecesOf(startingPosition());
  for (const [from, to] of edits) {
    const p = pieces.find((x) => x.square === from)!;
    pieces = pieces.filter((x) => x !== p && x.square !== to);
    if (to) pieces.push({ ...p, square: to } as Placed);
  }
  return pieces;
}
// An opening's checkpoint, edited the same way.
function changed(o: Opening, edits: [string, string | null][]): Placed[] {
  let pieces = piecesOf(o.final);
  for (const [from, to] of edits) {
    const p = pieces.find((x) => x.square === from)!;
    pieces = pieces.filter((x) => x !== p && x.square !== to);
    if (to) pieces.push({ ...p, square: to } as Placed);
  }
  return pieces;
}
const key = (ps: readonly Placed[]) => JSON.stringify(ps.map((p) => `${p.side} ${p.kind} ${p.square}`).sort());

// The brief's lines, word for word: each opening's moves, and its sentences in order.
const BRIEF: Record<string, { sans: string; line: string; sentences: string[] }> = {
  "Italian Game": { sans: "1. e4 e5 2. Nf3 Nc6 3. Bc4", line: "", sentences: ["White occupies the centre with e4.", "Both sides develop knights.", "White's bishop reaches c4 and attacks f7."] },
  "Ruy Lopez": { sans: "1. e4 e5 2. Nf3 Nc6 3. Bb5", line: "", sentences: ["The first four half-moves match the Italian Game.", "White's bishop reaches b5 instead of c4. It pressures Black's knight defending e5."] },
  "Scotch Game": {
    sans: "1. e4 e5 2. Nf3 Nc6 3. d4",
    line: "",
    sentences: ["Both knights develop as in the Italian.", "White advances the d-pawn instead of developing the bishop. The pawn on d4 challenges Black's e5 pawn."],
  },
  "Queen's Gambit": {
    sans: "1. d4 d5 2. c4",
    line: "",
    sentences: ["Both sides occupy the centre with d-pawns.", "White advances the c-pawn to c4. That pawn challenges Black's pawn on d5."],
  },
  "London System": {
    sans: "1. d4 d5 2. Nf3 Nf6 3. Bf4",
    line: "",
    sentences: ["Both sides advance their d-pawns.", "Both kingside knights develop.", "White develops its c1 bishop to f4."],
  },
  "Sicilian Defense": {
    sans: "1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4",
    line: "",
    // The last two carry the brief's "Teach the capture sequence" too.
    sentences: [
      "Black answers asymmetrically with ...c5.",
      "White challenges the centre with d4.",
      "Black captures White's d-pawn. The white d-pawn disappears.",
      "White's f3 knight recaptures on d4. The black c-pawn also disappears.",
    ],
  },
  "French Defense": {
    sans: "1. e4 e6 2. d4 d5",
    line: "",
    sentences: ["White builds a centre with e4 and d4.", "Black prepares ...d5 with ...e6.", "The central pawn structure defines this checkpoint."],
  },
  "Caro-Kann Defense": {
    sans: "1. e4 c6 2. d4 d5",
    line: "",
    sentences: ["White establishes e4 and d4.", "Black prepares ...d5 using ...c6.", "The c6 pawn supports Black's d5 pawn."],
  },
  "Slav Defense": {
    sans: "1. d4 d5 2. c4 c6",
    line: "",
    sentences: ["White plays the Queen's Gambit structure.", "Black answers with ...c6. Black's c6 pawn reinforces the d5 pawn."],
  },
};
const ANCHORS: Record<string, string> = {
  "Italian Game": "White's bishop on c4",
  "Ruy Lopez": "White's bishop on b5",
  "Scotch Game": "White's pawn on d4",
  "Queen's Gambit": "White's pawns on d4 and c4",
  "London System": "White's bishop on f4",
  "Sicilian Defense": "White's knight on d4",
  "French Defense": "Black's pawn on e6",
  "Caro-Kann Defense": "Black's pawns on c6 and d5",
  "Slav Defense": "Black's pawns on c6 and d5",
};

describe("the nine openings of 4.3", () => {
  it("defines each opening once: a stable id, its challenge, its name, its moves, its lines and its checkpoint", () => {
    expect(DEFINITIONS.map((d) => [d.challenge, d.name])).toEqual([
      ["4.3.1", "Italian Game"], ["4.3.2", "Ruy Lopez"], ["4.3.3", "Scotch Game"], ["4.3.4", "Queen's Gambit"], ["4.3.5", "London System"],
      ["4.3.6", "Sicilian Defense"], ["4.3.7", "French Defense"], ["4.3.8", "Caro-Kann Defense"], ["4.3.9", "Slav Defense"],
    ]);
    for (const k of ["id", "checkpoint"] as const) expect(new Set(DEFINITIONS.map((d) => d[k])).size, k).toBe(9);
    expect(DEFINITIONS.map((d) => d.id)).toEqual([
      "italian-game", "ruy-lopez", "scotch-game", "queens-gambit", "london-system", "sicilian-defense", "french-defense", "caro-kann-defense", "slav-defense",
    ]);
    for (const o of OPENINGS) {
      expect(o.line, o.name).toBe(BRIEF[o.name]!.sans);
      expect(o.anchor, o.name).toBe(ANCHORS[o.name]);
      expect(o.teach, o.name).toHaveLength(o.sans.length);
      expect(o.checkpoint, o.name).toMatch(new RegExp(`^${o.id}-\\d-`));
    }
  });

  it("makes each checkpoint from the rules, from the standard starting position, and every one differs", () => {
    for (const o of OPENINGS) {
      const reached = playLine(startingPosition(), o.sans).positions.at(-1)!;
      expect(inWords(o.final), o.name).toBe(inWords(reached));
      expect(o.positions, o.name).toHaveLength(o.sans.length + 1);
      expect(inWords(o.positions[0]!), o.name).toBe(inWords(startingPosition()));
      // 32 pieces; a capture takes one from each side.
      expect(besidesKings(o.final), o.name).toBe(o.name === "Sicilian Defense" ? 28 : 30);
    }
    expect(new Set(OPENINGS.map((o) => inWords(o.final))).size).toBe(9);
  });

  it("teaches only the brief's lines, and a move without a line shows only its departure and destination", () => {
    for (const o of OPENINGS) {
      const lines = o.teach.filter((l): l is string => l !== null);
      const allowed = BRIEF[o.name]!.sentences;
      expect(new Set(lines), o.name).toEqual(new Set(allowed));
    }
    // The Italian Game's 1... e5 has no line, and nor do the Slav Defense's first two moves.
    expect(opening("Italian Game").teach[1]).toBeNull();
    expect(opening("Slav Defense").teach.slice(0, 2)).toEqual([null, null]);
  });

  it("registers all nine on chapter 4, three levels each, with the path's words equal to the levels'", () => {
    const ch = CHAPTERS.find((c) => c.n === 4)!;
    expect(ch.sections.find((s) => s.id === "4.3")!.challenges.map((c) => c.id)).toEqual(OPENINGS.map((o) => o.challenge));
    expect(ch.path).toHaveLength(38);
    const steps = ch.path.slice(11);
    expect(steps.map((s) => (s.kind === "level" ? `${s.challenge} ${s.level}` : "mixed"))).toEqual(OPENINGS.flatMap((o) => ["L1", "L2", "L3"].map((l) => `${o.challenge} ${l}`)));
    for (const o of OPENINGS) {
      const c = challengeOf(o);
      expect(c.name).toBe(o.name);
      expect(c.needs).toBe("4.1.1 L1 and 4.2.1 L1.");
      expect(c.levels.map((l) => l.id)).toEqual(["L1", "L2", "L3"]);
      expect(c.levels.map((l) => l.path)).toEqual([`${o.name}, learn the opening.`, `${o.name}, remember the position.`, `${o.name}, recall by name.`]);
    }
  });

  it("sets the level table: one question a round, no minutes, no seconds, no seat, and a pass mark that invents no threshold", () => {
    for (const o of OPENINGS) {
      for (const l of challengeOf(o).levels) {
        expect([l.questions, l.minutes, l.seconds, l.seat], `${o.name} ${l.id}`).toEqual([1, null, null, null]);
      }
      const [l1, l2, l3] = challengeOf(o).levels;
      expect(l1!.passMark).toBe(`Pass mark for ${o.challenge} L1: none. The level ends when the guided reconstruction is right.`);
      for (const l of [l2!, l3!]) expect(l.passMark).toBe(`Pass mark for ${o.challenge} L2 and L3: the right answer in one round, and my look time at L2. My practice sets it.`);
    }
    expect(levelOf(OPENINGS[0]!, "L1").dials.map((d) => d.value)).toEqual(["The name, then each move on the board", "Play each move, then rebuild it"]);
    expect(levelOf(OPENINGS[0]!, "L2").dials.map((d) => d.value)).toEqual(["The name, and the position on a board, until I hide it", "Move the pieces"]);
    expect(levelOf(OPENINGS[0]!, "L3").dials.map((d) => d.value)).toEqual(["The name only", "Move the pieces"]);
  });
});

describe("L2 Remember the position, and L3 Recall by name, of every opening", () => {
  it("L2 shows the name and the checkpoint on a board until Hide, then a board in the starting position, and judges the final board whole", () => {
    for (const o of OPENINGS) {
      const [item, ...rest] = roundOf(o, "L2");
      expect(rest, o.name).toEqual([]);
      expect([item!.challenge, item!.level, item!.questions], o.name).toEqual([o.challenge, "L2", 1]);
      const show = item!.first() as Show;
      expect(show, o.name).toEqual({
        step: "show",
        name: o.name,
        board: { seat: "white", names: false, pieces: piecesOf(o.final), lit: [] },
        question: `Rebuild the ${o.name}.`,
        button: "Hide",
        time: "look",
      });
      // No move list, no departure or destination, no words.
      for (const k of ["move", "moves", "words", "lines", "seconds"] as const) expect(show[k], `${o.name} ${k}`).toBeUndefined();
      const ask = item!.next(press) as Ask;
      expect(ask, o.name).toEqual({
        step: "ask",
        question: `Rebuild the ${o.name}.`,
        board: { seat: "white", names: false, pieces: piecesOf(startingPosition()), lit: [] },
        notes: [],
        input: { how: "move" },
        seconds: null,
        reopened: false,
      });
      expect(ask.words).toBeUndefined();
      const told = item!.next(answered(piecesOf(o.final))) as Told;
      expect(told, o.name).toMatchObject({ verdict: "right", line: `Right: the ${o.name}.`, again: { board: { pieces: piecesOf(o.final) } }, score: { right: true, mistakes: [], counts: {} } });
      expect(item!.next(press), o.name).toEqual({ step: "done", back: null });
    }
  });

  it("L3 shows only the name in its question, then the starting position: no look, no move list, no preview", () => {
    for (const o of OPENINGS) {
      const [item, ...rest] = roundOf(o, "L3");
      expect(rest, o.name).toEqual([]);
      const ask = item!.first() as Ask;
      expect(ask, o.name).toEqual({
        step: "ask",
        question: `Rebuild the ${o.name}.`,
        board: { seat: "white", names: false, pieces: piecesOf(startingPosition()), lit: [] },
        notes: [],
        input: { how: "move" },
        seconds: null,
        reopened: false,
      });
      // The question names the opening and gives no move.
      expect(ask.question, o.name).not.toMatch(/\d\.|\b[a-h][1-8]\b/);
      expect(item!.next(answered(piecesOf(o.final)))).toMatchObject({ verdict: "right" });
    }
  });

  it("judges the final board only: the order of my moves, and the pieces I picked of two alike, never count", () => {
    for (const o of OPENINGS) {
      const pieces = piecesOf(o.final);
      expect(judge(o, [...pieces].reverse()).right, o.name).toBe(true);
      expect(judge(o, [...pieces].sort((a, b) => a.square.localeCompare(b.square))).right, o.name).toBe(true);
    }
    // The Italian Game: either knight, or its two pawns, the same board.
    const italian = opening("Italian Game");
    expect(judge(italian, startWith([["e2", "e4"], ["g1", "f3"], ["f1", "c4"], ["e7", "e5"], ["b8", "c6"]])).right).toBe(true);
    expect(judge(italian, startWith([["b8", "c6"], ["f1", "c4"], ["e7", "e5"], ["g1", "f3"], ["e2", "e4"]])).right).toBe(true);
  });

  it("tells the card's two examples: the Italian Game's bishop on b5, and the Slav Defense with Black's pawn left on c7", () => {
    const italian = judge(opening("Italian Game"), changed(opening("Italian Game"), [["c4", "b5"]]));
    expect(italian).toEqual({ right: false, mistakes: ["Another opening's square"], line: "No: in the Italian Game, White's bishop stands on c4. On b5, it is the Ruy Lopez." });
    const slav = judge(opening("Slav Defense"), changed(opening("Slav Defense"), [["c6", "c7"]]));
    expect(slav).toEqual({ right: false, mistakes: ["A piece left at home"], line: "No: in the Slav Defense, ...c6 was left out. Black's pawn is still on c7." });
    // A white move left out is written without dots.
    expect(judge(opening("Queen's Gambit"), changed(opening("Queen's Gambit"), [["c4", "c2"]])).line).toBe("No: in the Queen's Gambit, c4 was left out. White's pawn is still on c2.");
  });

  it("names each kind of mistake on the card, with a line that tells the truth", () => {
    const kinds = (o: Opening, pieces: Placed[]) => judge(o, pieces).mistakes;
    const italian = opening("Italian Game");
    expect(kinds(italian, changed(italian, [["c4", "d4"]]))).toEqual(["The file beside"]);
    expect(kinds(italian, changed(italian, [["c4", "c3"]]))).toEqual(["The rank beside"]);
    expect(kinds(italian, changed(italian, [["c4", "f5"]]))).toEqual(["The board turned"]);
    expect(kinds(italian, changed(italian, [["c4", "f4"]]))).toEqual(["The files reversed"]);
    expect(kinds(italian, changed(italian, [["f3", "f6"]]))).toEqual(["The ranks reversed"]);
    expect(kinds(italian, changed(italian, [["c6", "b8"]]))).toEqual(["A piece left at home"]);
    expect(judge(italian, changed(italian, [["c6", "b8"]])).line).toBe("No: in the Italian Game, ...Nc6 was left out. Black's knight is still on b8.");
    expect(kinds(italian, changed(italian, [["c4", "b5"]]))).toEqual(["Another opening's square"]);
    expect(kinds(italian, changed(italian, [["g8", "f6"]]))).toEqual(["A piece moved that stays home"]);
    expect(judge(italian, changed(italian, [["g8", "f6"]])).line).toBe("No: in the Italian Game, Black's knight stays on g8.");
    // The knight from b1 put on c4, where the bishop stands; the bishop left on f1.
    expect(kinds(italian, changed(italian, [["c4", "f1"], ["b1", "c4"]]))).toContain("The wrong piece");
    expect(kinds(italian, changed(italian, [["c4", "h3"]]))).toEqual(["Another square"]);
    // A piece taken, left on: the Sicilian Defense's two pawns that disappear.
    const sicilian = opening("Sicilian Defense");
    const whiteD = judge(sicilian, [...piecesOf(sicilian.final), { side: "white", kind: "pawn", square: "d2" }]);
    expect(whiteD).toEqual({
      right: false,
      mistakes: ["A piece taken, left on"],
      line: "No: in the Sicilian Defense, d2 is empty. White's pawn from d2 is gone, traded for Black's pawn from c7.",
    });
    const blackC = judge(sicilian, [...piecesOf(sicilian.final), { side: "black", kind: "pawn", square: "c7" }]);
    expect(blackC.mistakes).toEqual(["A piece taken, left on"]);
    expect(blackC.line).toBe("No: in the Sicilian Defense, c7 is empty. Black's pawn from c7 is gone, taken by White's knight from g1.");
    // The black pawn that took, left on c5 instead of c7 or d4.
    const onC5 = judge(sicilian, [...piecesOf(sicilian.final), { side: "black", kind: "pawn", square: "c5" }]);
    expect(onC5.mistakes).toEqual(["A piece taken, left on"]);
    expect(onC5.line).toBe("No: in the Sicilian Defense, c5 is empty. Black's pawn from c7 is gone, taken by White's knight from g1.");
    expect(MISTAKES).toEqual([
      "A piece left at home", "The file beside", "The rank beside", "The board turned", "The files reversed", "The ranks reversed",
      "Another opening's square", "A piece taken, left on", "A piece moved that stays home", "The wrong piece", "Another square",
    ]);
  });

  it("compares 'another opening's square' against the nine: a piece on the square another of them holds", () => {
    // The Ruy Lopez with the bishop on c4 is the Italian Game.
    const ruy = opening("Ruy Lopez");
    expect(judge(ruy, changed(ruy, [["b5", "c4"]])).line).toBe("No: in the Ruy Lopez, White's bishop stands on b5. On c4, it is the Italian Game.");
    // The Scotch Game's d-pawn left on d2 and the bishop on c4 are not one opening's square: the bishop stays home there.
    const scotch = opening("Scotch Game");
    expect(judge(scotch, changed(scotch, [["f1", "c4"]])).mistakes).toContain("A piece moved that stays home");
  });

  it("names no other opening for a piece put on a square it starts on, and tells a pawn put beside the one missing by that square", () => {
    const sicilian = opening("Sicilian Defense");
    // The e-pawn on d2, where the d-pawn starts: no opening's square.
    expect(judge(sicilian, changed(sicilian, [["e4", "d2"]]))).toEqual({ right: false, mistakes: ["Another square"], line: "No: in the Sicilian Defense, White's pawn stands on e4, not d2." });
    // The d-pawn on c5, where the c-pawn stood before it was taken: the d-pawn belongs on d6.
    expect(judge(sicilian, changed(sicilian, [["d6", "c5"]])).line).toBe("No: in the Sicilian Defense, Black's pawn stands on d6, not c5.");
    // The Italian Game's bishop on h3: told by the square it belongs on.
    expect(judge(opening("Italian Game"), changed(opening("Italian Game"), [["c4", "h3"]])).line).toBe("No: in the Italian Game, White's bishop stands on c4, not h3.");
  });

  // Every piece of every opening, moved to every empty square: slow while the whole suite runs at once.
  it("never tells a line with an undefined, a null or an empty name, whatever one piece goes wrong", { timeout: 60_000 }, () => {
    for (const o of OPENINGS) {
      const pieces = piecesOf(o.final);
      for (const p of pieces) {
        // Taken off the board.
        const off = judge(o, pieces.filter((x) => x !== p));
        expect(off.right, `${o.name} off ${p.square}`).toBe(false);
        expect(off.line.startsWith(`No: in the ${o.name}, `), `${o.name} off ${p.square}`).toBe(true);
        expect(off.line, `${o.name} off ${p.square}`).not.toMatch(/undefined|null|NaN/);
        for (const kind of off.mistakes) expect(MISTAKES, `${o.name} ${kind}`).toContain(kind);
        // Moved to any other square.
        for (const to of SQUARES) {
          if (pieces.some((x) => x.square === to)) continue;
          const moved = judge(o, pieces.map((x) => (x === p ? { ...x, square: to } : x)));
          expect(moved.right, `${o.name} ${p.square}-${to}`).toBe(false);
          expect(moved.line, `${o.name} ${p.square}-${to}`).not.toMatch(/undefined|null|NaN/);
          expect(moved.mistakes.length, `${o.name} ${p.square}-${to}`).toBeGreaterThan(0);
          for (const kind of moved.mistakes) expect(MISTAKES, `${o.name} ${kind}`).toContain(kind);
        }
      }
    }
  });

  it("comes back only in the same opening and the same level, stored as { opening, level }", () => {
    for (const o of OPENINGS) {
      for (const id of ["L2", "L3"]) {
        const [item] = roundOf(o, id);
        item!.first();
        // L2 shows the checkpoint first, until Hide.
        if (id === "L2") item!.next(press);
        item!.next(answered(piecesOf(startingPosition())));
        expect((item!.next(press) as Done).back, `${o.name} ${id}`).toEqual({ opening: o.id, level: id });
      }
    }
    const italian = opening("Italian Game");
    const l2 = { opening: "italian-game", level: "L2" };
    const ruyL2 = { opening: "ruy-lopez", level: "L2" };
    const facts = (back: unknown[]) => ({ side: "white" as const, back: back as never });
    // An Italian miss at L2 is asked by the Italian Game's L2 round alone.
    expect(challengeOf(italian).asks!(levelOf(italian, "L2"), facts([l2, ruyL2]))).toEqual([l2]);
    expect(challengeOf(italian).asks!(levelOf(italian, "L3"), facts([l2, ruyL2]))).toEqual([]);
    expect(challengeOf(italian).asks!(levelOf(italian, "L1"), facts([l2, ruyL2, { opening: "italian-game", level: "L1" }]))).toEqual([]);
    const ruy = opening("Ruy Lopez");
    expect(challengeOf(ruy).asks!(levelOf(ruy, "L2"), facts([l2, ruyL2]))).toEqual([ruyL2]);
    // The round is the same one question, whatever comes back.
    expect(roundOf(italian, "L2", [l2])).toHaveLength(1);
    expect(roundOf(italian, "L3", [l2])).toHaveLength(1);
  });

  it("leaves a come-back stored by the old 4.3.1 stored and unread: it has the opening's name and no level", () => {
    const italian = opening("Italian Game");
    const old = [{ opening: "Italian Game" }, { opening: "Sicilian Defense: Najdorf Variation" }, { opening: "italian-game" }, { opening: "italian-game", level: 2 }, "junk", null];
    for (const id of ["L1", "L2", "L3"]) {
      expect(challengeOf(italian).asks!(levelOf(italian, id), { side: "white", back: old as never }), id).toEqual([]);
    }
  });
});

describe("the round of an opening", () => {
  it("is one checkpoint exercise at every level, and the same one every time", () => {
    for (const o of OPENINGS) {
      for (const id of ["L1", "L2", "L3"]) {
        const a = roundOf(o, id);
        const b = challengeOf(o).makeRound(levelOf(o, id), seeded("another seed"), { side: "black", back: [] });
        expect(a, `${o.name} ${id}`).toHaveLength(1);
        expect(b, `${o.name} ${id}`).toHaveLength(1);
        expect(key(((a[0]!.first() as Show | Ask).board ?? { pieces: [] }).pieces), `${o.name} ${id}`).toBe(key(((b[0]!.first() as Show | Ask).board ?? { pieces: [] }).pieces));
      }
    }
  });

  it("builds the same challenge from a definition as the chapter lists", () => {
    const again = openingChallenge(OPENINGS[0]!);
    const listed = challengeOf(OPENINGS[0]!);
    expect(again.levels).toEqual(listed.levels);
    expect(again.id).toBe(listed.id);
  });
});
