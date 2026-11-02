// Trial challenges: one per answer input, each a short round on its card's
// examples, so each input's screen plays before its challenge is built. The
// dev server alone adds them, at /?try=<input>; no built site holds them.
//
// The examples, questions and told lines are the cards' own, from
// code/blueprint/docs/board-coordinates.md (1.1.2, 1.3.1), piece-movement.md
// (2.1.2), notation.md (3.1.1, 3.2.1) and position-memory.md (4.2.1,
// 4.3). Each judge here knows only its examples: the challenges' real code
// is the core's.

import {
  type Answer,
  type Ask,
  type BoardView,
  type Challenge,
  type Item,
  type Kind,
  type Level,
  type Placed,
  type Show,
  type Side,
  type Square,
  type Told,
} from "../core.ts";

type Spec = { show?: Show; ask: Ask; judge: (a: Answer) => Told };

function item(challenge: string, spec: Spec): Item {
  let at: "show" | "ask" | "told" = spec.show ? "show" : "ask";
  let told: Told | null = null;
  return {
    challenge,
    level: "L1",
    questions: 1,
    first: () => spec.show ?? spec.ask,
    next(did) {
      if (at === "show") {
        at = "ask";
        return spec.ask;
      }
      if (at === "told") return { step: "done", back: told!.score.right ? null : challenge };
      if (did.did === "timeout") throw new Error("A trial has no time limit.");
      if (did.did !== "answer") throw new Error("An Ask takes an answer.");
      const v = spec.judge(did.answer);
      at = "told";
      told = v;
      return v;
    },
  };
}

const right = (line: string, again?: Told["again"], counts: Record<string, number> = {}): Told => ({
  step: "told",
  verdict: "right",
  line,
  again,
  score: { right: true, mistakes: [], counts },
});
const wrong = (line: string, kind: string, again?: Told["again"], counts: Record<string, number> = {}): Told => ({
  step: "told",
  verdict: "wrong",
  line,
  again,
  score: { right: false, mistakes: [kind], counts },
});

const ask = (question: string, board: BoardView | null, input: Ask["input"]): Ask => ({
  step: "ask",
  question,
  board,
  notes: [],
  input,
  seconds: null,
  reopened: false,
});

const empty = (lit: Square[] = []): BoardView => ({ seat: "white", names: false, pieces: [], lit });

function level(name: string, questions: number): Level {
  return { id: "L1", path: `${name}, a trial.`, questions, minutes: null, seconds: null, seat: "white", passMark: "A trial: no pass mark.", dials: [] };
}

function trial(how: string, name: string, specs: Spec[]): Challenge {
  const id = `trial-${how}`;
  return {
    built: true,
    id,
    name,
    trains: `The ${name.toLowerCase()} input.`,
    levels: [level(name, specs.length)],
    makeRound: () => specs.map((s) => item(id, s)),
  };
}

const sameSet = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x));
const key = (ps: Placed[]) => ps.map((p) => `${p.side} ${p.kind} ${p.square}`).sort().join(",");

// ---------------------------------------------------------------------------
// Pick one choice: 1.1.2 L1.

const lit = (sq: Square) => empty([sq]);
const chooseB3: Spec = {
  ask: ask("Which square is lit?", lit("b3"), {
    how: "choose",
    choices: ["b3", "c3", "b4", "c4"].map((s) => ({ words: s, value: s })),
  }),
  judge: (a) =>
    a.kind === "choice" && a.value === "b3"
      ? right("Right: b3.")
      : wrong("No: it is b3. c3 is the file beside.", "The file beside"),
};

// ---------------------------------------------------------------------------
// The keypad: one square, 1.1.2 L2; several, here only.

const keyE5: Spec = {
  ask: ask("Which square is lit?", lit("e5"), { how: "keypad", many: "one", none: null }),
  judge: (a) =>
    a.kind === "squares" && a.squares.join() === "e5"
      ? right("Right: e5.")
      : wrong("No: it is e5. e6 is the rank beside.", "The rank beside"),
};

const keyExf3: Spec = {
  ask: {
    ...ask("Black plays exf3. Which squares does it change?", null, { how: "keypad", many: "set", none: null }),
    words: "White: king g1, rook d1, pawns f4 and g2. Black: king g8, rook d8, pawns e4 and h7.",
    notes: ["White's last move: f2 to f4."],
  },
  judge: (a) =>
    a.kind === "squares" && sameSet(a.squares, ["e4", "f3", "f4"])
      ? right("Right: e4, f3 and f4.")
      : wrong("No: exf3 takes White's pawn on f4 in passing: e4, f3 and f4. You left out f4.", "A square left out"),
};

// ---------------------------------------------------------------------------
// The move composer: 3.2.1 L4.

const R1A3: BoardView = {
  seat: "white",
  names: false,
  pieces: [
    { side: "white", kind: "king", square: "g1" },
    { side: "white", kind: "rook", square: "a1" },
    { side: "white", kind: "rook", square: "a5" },
    { side: "white", kind: "pawn", square: "f2" },
    { side: "white", kind: "pawn", square: "g2" },
    { side: "black", kind: "king", square: "g8" },
    { side: "black", kind: "pawn", square: "f7" },
    { side: "black", kind: "pawn", square: "h7" },
  ],
  lit: ["a1", "a3"],
};

const writeR1a3: Spec = {
  ask: ask("Write your move in notation.", R1A3, { how: "compose-move" }),
  judge: (a) =>
    a.kind === "text" && a.text === "R1a3"
      ? right("Right: R1a3.")
      : wrong("No: it is R1a3. Your rook on a5 reaches a3 too. Both stand on the a-file, so the rank tells them apart: 1.", "What tells two apart, left out"),
};

// ---------------------------------------------------------------------------
// The position composer, here only: a position seen on a board, then composed.

const L6_421: Placed[] = [
  { side: "white", kind: "king", square: "b1" },
  { side: "white", kind: "rook", square: "b5" },
  { side: "white", kind: "pawn", square: "b2" },
  { side: "white", kind: "pawn", square: "g4" },
  { side: "white", kind: "pawn", square: "h3" },
  { side: "black", kind: "king", square: "d3" },
  { side: "black", kind: "rook", square: "c8" },
  { side: "black", kind: "pawn", square: "g5" },
  { side: "black", kind: "pawn", square: "h7" },
];

const rebuildComposed: Spec = {
  show: {
    step: "show",
    board: { seat: "white", names: false, pieces: L6_421, lit: [] },
    question: "Rebuild this position.",
    button: "Hide",
    time: "look",
  },
  ask: ask("Rebuild this position.", null, { how: "compose-position" }),
  judge: (a) => {
    if (a.kind !== "position") throw new Error("The position composer hands back a position.");
    const n = L6_421.filter((x) => a.pieces.some((y) => key([x]) === key([y]))).length;
    const counts = { "Pieces right": n };
    return key(a.pieces) === key(L6_421)
      ? right("Right: all 9 pieces.", undefined, counts)
      : wrong("No: 8 of 9. White's pawn stands on h3, not h4: the rank beside.", "The rank beside", undefined, counts);
  },
};

// ---------------------------------------------------------------------------
// Click several, or None: 1.3.1 L1 to L3.

const between = (from: Square, to: Square): Ask => ({
  ...ask(`Which squares lie between ${from} and ${to} on their diagonal?`, empty([from, to]), {
    how: "click-many",
    none: "No diagonal",
  }),
});

const c4f7: Spec = {
  ask: between("c4", "f7"),
  judge: (a) =>
    a.kind === "squares" && sameSet(a.squares, ["d5", "e6"])
      ? right("Right: d5 and e6.")
      : wrong("No: between c4 and f7 lie d5 and e6. You left out e6.", "A square left out"),
};

const c1g4: Spec = {
  ask: between("c1", "g4"),
  judge: (a) =>
    a.kind === "none"
      ? // > Stand-in. The card gives no right line for a pair on no diagonal.
        right("Right: c1 and g4 share no diagonal.")
      : wrong("No: c1 and g4 share no diagonal. They sit 4 files and 3 ranks apart; a diagonal needs both equal.", "A diagonal that is not there"),
};

// ---------------------------------------------------------------------------
// Click in order: 2.1.2 L1.

const g1e5: Spec = {
  ask: ask(
    "Take your knight from g1 to e5 in the fewest moves.",
    { seat: "white", names: false, pieces: [{ side: "white", kind: "knight", square: "g1" }], lit: ["e5"] },
    { how: "click-route" },
  ),
  judge: (a) =>
    a.kind === "squares" && a.squares.join() === "f3,e5"
      ? right("Right: f3, e5, in 2 moves.")
      : wrong("No: f4 to e5 is no knight move. The only route: g1, f3, e5.", "A jump that is no knight move"),
};

// ---------------------------------------------------------------------------
// Place pieces: 4.2.1 L1, after a look at the position.

const p = (side: Side, kind: Kind, square: Square): Placed => ({ side, kind, square });
const L1_421: Placed[] = [
  p("white", "king", "h2"),
  p("white", "rook", "f5"),
  p("white", "pawn", "h3"),
  p("black", "king", "g7"),
  p("black", "rook", "b1"),
  p("black", "pawn", "h6"),
];
const shown421: BoardView = { seat: "white", names: false, pieces: L1_421, lit: [] };

const rebuild: Spec = {
  show: {
    step: "show",
    board: shown421,
    lines: ["From a Lichess game of January 2013, players rated 1343 and 1336, after White's 38th move."],
    button: "Hide",
    time: "look",
  },
  ask: ask("Rebuild this position.", empty(), { how: "place" }),
  judge: (a) => {
    if (a.kind !== "position") throw new Error("Place hands back a position.");
    const n = L1_421.filter((x) => a.pieces.some((y) => key([x]) === key([y]))).length;
    const counts = { "Pieces right": n };
    return key(a.pieces) === key(L1_421)
      ? right("Right: all 6 pieces.", { board: shown421 }, counts)
      : wrong("No: 5 of 6. Black's rook stands on b1, not a1: the file beside.", "The file beside", { board: shown421 }, counts);
  },
};

// ---------------------------------------------------------------------------
// Move pieces from the starting position: 4.3 L2, after a look at the opening.

const BACK: Kind[] = ["rook", "knight", "bishop", "queen", "king", "bishop", "knight", "rook"];
const START: Placed[] = (["white", "black"] as Side[]).flatMap((side) => {
  const [back, pawns] = side === "white" ? ["1", "2"] : ["8", "7"];
  return [...BACK.map((kind, i) => p(side, kind, `${"abcdefgh"[i]}${back}` as Square)), ...[..."abcdefgh"].map((f) => p(side, "pawn", `${f}${pawns}` as Square))];
});
const moved = (moves: [Square, Square][]) =>
  START.map((x) => {
    const m = moves.find(([from]) => from === x.square);
    return m ? { ...x, square: m[1] } : x;
  });
const ITALIAN = moved([["e2", "e4"], ["g1", "f3"], ["f1", "c4"], ["e7", "e5"], ["b8", "c6"]]);
const italian: BoardView = { seat: "white", names: false, pieces: ITALIAN, lit: [] };

const opening: Spec = {
  show: { step: "show", name: "Italian Game", board: italian, button: "Hide", time: "look" },
  ask: ask("Rebuild the Italian Game.", { seat: "white", names: false, pieces: START, lit: [] }, { how: "move" }),
  judge: (a) =>
    a.kind === "position" && key(a.pieces) === key(ITALIAN)
      ? right("Right: the Italian Game.", { board: italian })
      : wrong("No: in the Italian Game, White's bishop stands on c4. On b5, it is the Ruy Lopez.", "Another opening's square", { board: italian }),
};

// Each trial plays its example right first, then wrong.
export const TRIALS: Challenge[] = [
  trial("choose", "Pick one choice", [chooseB3, chooseB3]),
  trial("keypad", "Square keypad", [keyE5, keyE5, keyExf3]),
  trial("compose-move", "Move composer", [writeR1a3, writeR1a3]),
  trial("compose-position", "Position composer", [rebuildComposed, rebuildComposed]),
  trial("click-many", "Click several", [c4f7, c4f7, c1g4]),
  trial("click-route", "Click in order", [g1e5, g1e5]),
  trial("place", "Place pieces", [rebuild, rebuild]),
  trial("move", "Move pieces", [opening, opening]),
];
