import { describe, expect, it } from "vitest";
import { NOT_COUNTED, NOT_COUNTED_MOVE, type Ask, type Item, type Step, type Tally } from "../core.ts";
import { NO_PROGRESS, makeRound, type Round, scoreSheet } from "../rounds/rounds.ts";
import { headerOf } from "./header.ts";
import { act, askLeft, begin, endByTime, questionNumber, roundLeft } from "./walk.ts";

const square = (w: ReturnType<typeof begin>) => (w.step as Ask).question.slice(5, 7);

describe("walking a round of 1.1.1", () => {
  it("asks, tells, and moves on at Continue, counting each answer's time", () => {
    const round = makeRound({ chapter: 1, step: 0 }, "walk", NO_PROGRESS);
    let w = begin(round, 0);
    expect(w.step.step).toBe("ask");
    expect(questionNumber(w)).toBe(1);
    const first = square(w);
    w = act(w, { did: "answer", answer: { kind: "squares", squares: [first as never] } }, 1500);
    expect(w.step).toMatchObject({ step: "told", verdict: "right", line: `Right: ${first}.` });
    expect(w.results.answered).toEqual([
      { challenge: "1.1.1", level: "L1", secs: 1.5, verdict: "right", score: { right: true, mistakes: [], counts: {} } },
    ]);
    w = act(w, { did: "press" }, 3000);
    expect(w.step.step).toBe("ask");
    expect(questionNumber(w)).toBe(2);
    // The next answer's time starts when its question shows.
    w = act(w, { did: "answer", answer: { kind: "squares", squares: ["a1"] } }, 3800);
    expect(w.results.answered[1]!.secs).toBeCloseTo(0.8);
  });

  it("shows my average time per answer as I play, never counting the pause before the next question", () => {
    const round = makeRound({ chapter: 1, step: 0 }, "avg", NO_PROGRESS);
    let w = begin(round, 0);
    expect(headerOf(w, 0).avg).toBe("—");
    w = act(w, { did: "answer", answer: { kind: "squares", squares: [square(w) as never] } }, 2000);
    expect(headerOf(w, 2000).avg).toBe("2.0 s");
    w = act(w, { did: "press" }, 5000);
    w = act(w, { did: "answer", answer: { kind: "squares", squares: ["a1"] } }, 6000);
    expect(headerOf(w, 6000).avg).toBe("1.5 s");
  });

  it("counts a question out of time as its full seconds, and brings the square back", () => {
    const round = makeRound({ chapter: 1, step: 9 }, "slow", NO_PROGRESS); // L3, 2 seconds
    let w = begin(round, 0);
    const sq = square(w);
    expect(askLeft(w, 500)).toBe(1.5);
    w = act(w, { did: "timeout" }, 2050);
    expect(w.step).toMatchObject({ step: "told", verdict: "slow", line: `Too slow. ${sq} is lit.` });
    expect(w.results.answered[0]).toMatchObject({ secs: 2, score: { mistakes: ["Too slow"] } });
    w = act(w, { did: "press" }, 2100);
    expect(w.results.back).toEqual([{ challenge: "1.1.1", facts: { square: sq } }]);
  });

  it("ends after the last item", () => {
    const round = makeRound({ chapter: 1, step: 0 }, "all", NO_PROGRESS);
    let w = begin(round, 0);
    for (let i = 0; i < 20; i++) {
      w = act(w, { did: "answer", answer: { kind: "squares", squares: [square(w) as never] } }, i * 1000 + 500);
      w = act(w, { did: "press" }, i * 1000 + 900);
    }
    expect(w.ended).toBe(true);
    expect(w.results.answered).toHaveLength(20);
    expect(w.results.ended).toBe("done");
  });

  it("ends when the minutes run out, each question left a miss", () => {
    const round = makeRound({ chapter: 1, step: 0 }, "time", NO_PROGRESS);
    let w = begin(round, 0);
    w = act(w, { did: "answer", answer: { kind: "squares", squares: [square(w) as never] } }, 1000);
    expect(roundLeft(w, 1000)).toBe(179);
    // Told, not yet continued: that question is already counted.
    w = endByTime(w);
    expect(w.ended).toBe(true);
    expect(w.results.ended).toBe("time");
    expect(w.results.left).toEqual(Array.from({ length: 19 }, () => ({ challenge: "1.1.1", level: "L1", questions: 1 })));
  });
});

// A look, then one question that stays open once, then its verdict.
function lookThenAsk(): Item {
  const ask = (reopened: boolean): Step => ({
    step: "ask",
    question: "Find e4.",
    board: null,
    notes: [],
    input: { how: "keypad", many: "one", none: null },
    seconds: null,
    reopened,
    ...(reopened ? { note: NOT_COUNTED } : {}),
  });
  let at = 0;
  const steps: Step[] = [
    { step: "show", words: "White: king e1.", button: "Hide", time: "look" },
    ask(false),
    ask(true),
    { step: "told", verdict: "right", line: "Right: e4.", score: { right: true, mistakes: [], counts: {} } },
    { step: "done", back: null },
  ];
  return { challenge: "9.9.9", level: "L1", questions: 1, first: () => steps[0]!, next: () => steps[++at]! };
}

describe("walking any item", () => {
  it("adds an item's own counts when the minutes leave it unasked: 4.2.1's pieces, all left out", () => {
    const told: Step = { step: "told", verdict: "right", line: "Right: all 6 pieces.", score: { right: true, mistakes: [], counts: { "Pieces right": 6, "Pieces in all": 6 } } };
    const rebuild = (): Item => {
      let at = 0;
      const look = lookThenAsk();
      const steps: Step[] = [look.first(), look.next({ did: "press" }), told, { step: "done", back: null }];
      return { challenge: "9.9.9", level: "L1", questions: 1, unasked: { "Pieces right": 0, "Pieces in all": 6 }, first: () => steps[0]!, next: () => steps[++at]! };
    };
    const round = { ...makeRound({ chapter: 1, step: 0 }, "x", NO_PROGRESS), items: [rebuild(), rebuild(), rebuild()], questions: 3 } as Round;
    let w = begin(round, 0);
    w = act(w, { did: "press" }, 1000);
    w = act(w, { did: "answer", answer: { kind: "position", pieces: [] } }, 2000);
    w = act(w, { did: "press" }, 3000);
    // The second shows, unanswered, when the minutes run out.
    w = endByTime(w);
    expect(w.results.left).toEqual([
      { challenge: "9.9.9", level: "L1", questions: 1, counts: { "Pieces right": 0, "Pieces in all": 6 } },
      { challenge: "9.9.9", level: "L1", questions: 1, counts: { "Pieces right": 0, "Pieces in all": 6 } },
    ]);
    expect(scoreSheet(round, w.results).counts).toEqual([["Pieces right", 6], ["Pieces in all", 18]]);
  });

  it("counts look time, and keeps a question's clock through an answer not counted", () => {
    const round = { ...makeRound({ chapter: 1, step: 0 }, "x", NO_PROGRESS), items: [lookThenAsk()], questions: 1 } as Round;
    let w = begin(round, 0);
    w = act(w, { did: "press" }, 4000);
    expect(w.results.looks).toEqual([4]);
    w = act(w, { did: "answer", answer: { kind: "text", text: "i3" } }, 5000);
    expect(w.step).toMatchObject({ step: "ask", note: NOT_COUNTED });
    w = act(w, { did: "answer", answer: { kind: "text", text: "e4" } }, 7000);
    expect(w.results.answered[0]!.secs).toBe(3);
    w = act(w, { did: "press" }, 8000);
    expect(w.ended).toBe(true);
  });

  it("counts a list of moves shown whole once per move: 5.2.1 L1's 6 half-moves read in 30 seconds", () => {
    const steps: Step[] = [
      { step: "show", words: "1. e4 e5 2. Nf3 Nf6 3. Nxe5 Nc6", button: "Hide", time: "move", moves: 6 },
      { step: "show", move: "1. e4", button: "Next", time: "move" },
      { step: "done", back: null },
    ];
    let at = 0;
    const item: Item = { challenge: "9.9.9", level: "L1", questions: 0, first: () => steps[0]!, next: () => steps[++at]! };
    const round = { ...makeRound({ chapter: 1, step: 0 }, "x", NO_PROGRESS), items: [item], questions: 0 } as Round;
    let w = begin(round, 0);
    w = act(w, { did: "press" }, 30000);
    expect(w.results.moves).toEqual([5, 5, 5, 5, 5, 5]);
    w = act(w, { did: "press" }, 32000);
    expect(w.results.moves).toEqual([5, 5, 5, 5, 5, 5, 2]);
  });

  it("times each move of a question asking several, Ask after Ask, and the question from its first", () => {
    const move = (question: string, reopened = false): Step => ({
      step: "ask", question, board: null, notes: [], input: { how: "compose-move" }, seconds: null, reopened, time: "move",
      ...(reopened ? { note: NOT_COUNTED_MOVE } : {}),
    });
    const steps: Step[] = [
      move("Your move."),
      move("Black played 1... Kf6. Your move."),
      move("Black played 1... Kf6. Your move.", true),
      { step: "told", verdict: "right", line: "Right: mate in 2 moves, the fewest.", score: { right: true, mistakes: [], counts: {} } },
      { step: "done", back: null },
    ];
    let at = 0;
    const item: Item = { challenge: "9.9.9", level: "L1", questions: 1, first: () => steps[0]!, next: () => steps[++at]! };
    const round = { ...makeRound({ chapter: 1, step: 0 }, "x", NO_PROGRESS), items: [item], questions: 1 } as Round;
    const written = (text: string) => ({ did: "answer" as const, answer: { kind: "text" as const, text } });
    let w = begin(round, 0);
    w = act(w, written("Qd7"), 2000);
    expect(w.results.moves).toEqual([2]);
    // A move refused counts no move, and the turn's clock runs on from the Ask that opened it, at 2.
    w = act(w, written("Kxe8"), 5000);
    expect(w.results.moves).toEqual([2]);
    w = act(w, written("Qg4"), 6000);
    expect(w.results.moves).toEqual([2, 4]);
    expect(w.results.answered).toHaveLength(1);
    expect(w.results.answered[0]!.secs).toBe(6);
  });

  // Record lines 6-136 and 6-183: my time per move runs from the Ask that
  // opens my turn to the legal move played, through refusals, notes and hints.
  it("times a move from the Ask that opens my turn, through a refusal, a note and a hint", () => {
    const move = (question: string, reopened = false, note?: string): Step => ({
      step: "ask", question, board: null, notes: [], input: { how: "compose-move" }, seconds: null, reopened, time: "move",
      ...(note ? { note } : {}),
    });
    const steps: Step[] = [
      move("Your move."), // my turn opens at 0
      move("Your move.", true, NOT_COUNTED_MOVE), // refused at 2
      move("Your move.", true, NOT_COUNTED_MOVE), // not counted at 3
      { step: "show", words: "White: king e1.", seconds: 5, button: "Hide", time: "look" }, // a hint asked at 4
      move("Your move.", true), // the hint hidden at 9
      move("Black played 1... e5. Your move."), // the legal move at 10: my next turn opens
      { step: "told", verdict: "right", line: "Checkmate: you won, in 2 moves. A clean game.", score: { right: true, mistakes: [], counts: {} } }, // the move at 10.6
      { step: "done", back: null },
    ];
    let at = 0;
    const item: Item = { challenge: "9.9.9", level: "L1", questions: 1, first: () => steps[0]!, next: () => steps[++at]! };
    const round = { ...makeRound({ chapter: 1, step: 0 }, "x", NO_PROGRESS), items: [item], questions: 1 } as Round;
    const written = (text: string) => ({ did: "answer" as const, answer: { kind: "text" as const, text } });
    let w = begin(round, 0);
    w = act(w, written("Ke2"), 2000);
    w = act(w, written("N"), 3000);
    w = act(w, { did: "answer", answer: { kind: "hint", hint: "board" } }, 4000);
    expect(w.results.moves).toEqual([]);
    w = act(w, { did: "press" }, 9000);
    expect(w.results.moves).toEqual([]);
    w = act(w, written("e4"), 10000);
    expect(w.results.moves).toEqual([10]);
    w = act(w, written("d4"), 10600);
    expect(w.results.moves[0]).toBe(10);
    expect(w.results.moves[1]).toBeCloseTo(0.6);
    expect(w.results.moves).toHaveLength(2);
  });
});

describe("the question's number in the header", () => {
  // Record line R-008: the header names the question on screen, its own number until Continue.
  it("keeps a question's own number through its told line, and moves on at Continue", () => {
    const round = makeRound({ chapter: 1, step: 0 }, "number", NO_PROGRESS);
    let w = begin(round, 0);
    for (let i = 1; i <= 3; i++) {
      expect(questionNumber(w), `question ${i} asked`).toBe(i);
      w = act(w, { did: "answer", answer: { kind: "squares", squares: [square(w) as never] } }, i * 1000);
      expect(w.step.step).toBe("told");
      expect(questionNumber(w), `question ${i} told`).toBe(i);
      w = act(w, { did: "press" }, i * 1000 + 500);
    }
    expect(questionNumber(w)).toBe(4);
  });

  it("names the last question 20 of 20 through its told line", () => {
    const round = makeRound({ chapter: 1, step: 0 }, "last", NO_PROGRESS);
    let w = begin(round, 0);
    for (let i = 1; i < 20; i++) {
      w = act(w, { did: "answer", answer: { kind: "squares", squares: [square(w) as never] } }, i * 1000);
      w = act(w, { did: "press" }, i * 1000 + 500);
    }
    expect(questionNumber(w)).toBe(20);
    w = act(w, { did: "answer", answer: { kind: "squares", squares: [square(w) as never] } }, 20000);
    expect(w.step.step).toBe("told");
    expect(questionNumber(w)).toBe(20);
  });

  it("names a question that holds several by the one it is on, look and told alike", () => {
    // Two questions on one position: a look, ask 1, its told line, ask 2, its told line.
    const ask = (question: string): Step => ({ step: "ask", question, board: null, notes: [], input: { how: "choose", choices: [] }, seconds: null, reopened: false });
    const told = (line: string): Step => ({ step: "told", verdict: "right", line, score: { right: true, mistakes: [], counts: {} } });
    const steps: Step[] = [
      { step: "show", words: "White: king e1.", button: "Hide", time: "look" },
      ask("What stands on e1?"),
      told("Right: White's king."),
      ask("What stands on e2?"),
      told("Right: Empty."),
      { step: "done", back: null },
    ];
    let at = 0;
    const item: Item = { challenge: "9.9.9", level: "L1", questions: 2, first: () => steps[0]!, next: () => steps[++at]! };
    const round = { ...makeRound({ chapter: 1, step: 0 }, "x", NO_PROGRESS), items: [item], questions: 2 } as Round;
    const picked = { did: "answer" as const, answer: { kind: "choice" as const, value: "white-king" } };
    let w = begin(round, 0);
    expect(questionNumber(w)).toBe(1); // the look shows the number of the question it is for
    w = act(w, { did: "press" }, 1000);
    w = act(w, picked, 2000);
    expect(questionNumber(w)).toBe(1);
    w = act(w, { did: "press" }, 2500);
    expect(questionNumber(w)).toBe(2);
    w = act(w, picked, 3000);
    expect(w.step.step).toBe("told");
    expect(questionNumber(w)).toBe(2);
  });

  // The header's counts for a game and an endgame come from the core's tally on
  // each step. The words of the steps below say other numbers, and a note says
  // "Not counted. The move stays open.": nothing reads them.
  const tiles = (w: ReturnType<typeof begin>) => Object.fromEntries(headerOf(w, 0).tiles.map((t) => [t.label, t]));
  const writtenMove = { did: "answer" as const, answer: { kind: "text" as const, text: "x" } };
  const gameRound = (steps: Step[], challenge: string) => {
    let at = 0;
    const item: Item = { challenge, level: "L1", questions: 1, first: () => steps[0]!, next: () => steps[++at]! };
    return { ...makeRound({ chapter: 1, step: 0 }, "x", NO_PROGRESS), items: [item], questions: 1 } as Round;
  };
  const ask = (question: string, tally: Tally, note?: string): Step => ({
    step: "ask", question, board: null, notes: [], input: { how: "compose-move" }, seconds: null, note, reopened: note !== undefined, time: "move", tally,
  });
  const told = (tally: Tally): Step => ({ step: "told", verdict: "right", line: "Right.", score: { right: true, mistakes: [], counts: {} }, tally });

  it("shows an endgame's moves played, allowed and refused as the core counts them", () => {
    const t = (played: number, illegal: number): Tally => ({ played, allowed: 14, illegal, hints: null });
    const steps: Step[] = [
      ask("Mate Black's king, in 99 moves at most.", t(0, 0)),
      ask("Black played 1... Kf6. Your move.", t(1, 0)),
      ask("Black played 1... Kf6. Your move.", t(1, 1), NOT_COUNTED_MOVE),
      ask("Black played 2... Kg5. Your move.", t(2, 1)),
      told(t(3, 1)),
      { step: "done", back: null },
    ];
    let w = begin(gameRound(steps, "6.2.1"), 0);
    expect(tiles(w).Move).toMatchObject({ value: "1", of: 14, sub: "13 left", say: "Move 1 of 14 at most" });
    expect(tiles(w).Illegal!.value).toBe("0");
    w = act(w, writtenMove, 1000);
    expect(tiles(w).Move).toMatchObject({ value: "2", of: 14, sub: "12 left" });
    w = act(w, writtenMove, 2000); // refused: counted as illegal, the move on screen is the same
    expect(tiles(w).Move!.value).toBe("2");
    expect(tiles(w).Illegal).toMatchObject({ value: "1", say: "1 illegal moves" });
    w = act(w, writtenMove, 3000);
    expect(tiles(w).Move!.value).toBe("3");
    w = act(w, writtenMove, 4000); // the move that ends it
    expect(w.step.step).toBe("told");
    expect(tiles(w).Move).toMatchObject({ value: "3", of: 14, say: "Move 3 of 14 at most" });
    expect(tiles(w).Won).toMatchObject({ value: "1", of: 1 });
  });

  it("shows a game's hint points left, and None where the level gives none", () => {
    const game = (hints: Tally["hints"]): Tally => ({ played: 4, allowed: null, illegal: 0, hints });
    const w = begin(gameRound([ask("Your move.", game({ left: 5, of: 6 }))], "6.3.1"), 0);
    expect(tiles(w).Move).toMatchObject({ value: "5", say: "Move 5" });
    expect(tiles(w).Hints).toMatchObject({ value: "5", of: 6, say: "5 of 6 hint points left" });
    const none = begin(gameRound([ask("Your move.", game(null))], "6.3.1"), 0);
    expect(tiles(none).Hints).toMatchObject({ value: "None", say: "No hint points" });
    expect(tiles(none).Hints!.of).toBeUndefined();
  });

  it("keeps the standard tiles where a step carries no tally", () => {
    const w = begin(makeRound({ chapter: 1, step: 0 }, "plain", NO_PROGRESS), 0);
    expect(headerOf(w, 0).tiles.map((t) => t.label)).toEqual(["Question", "Time", "Right", "Wrong"]);
  });
});
