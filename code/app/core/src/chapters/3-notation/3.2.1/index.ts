// 3.2.1 Write the move: its level table, its round maker, its written-form
// judge, its mistake names and its told lines. The written-form judge is this
// card's own, never a block: a capture marked, signs judged from L4, the short
// form only. Notation's shorthand, a capture without its x, is chapter 6's.
//
// Source: code/blueprint/docs/notation.md, 3.2.1, and "Notation, as this page
// uses it".
//
// > Stand-in. Whether the question is also read aloud. I answer it later, with
// > session 10. Every level plays in silence.

import { MISTAKE, nearMiss, WORDS } from "../../../near-misses/index.ts";
import { arrowsOf, readMove, type Written } from "../../../notation/index.ts";
import { inWords, kingSquare, other, piecesOf, type Position, sideWord } from "../../../positions/index.ts";
import { attackersOf, reachOnEmpty } from "../../../reach/index.ts";
import { legalMoves, type Move, play } from "../../../rules/index.ts";
import { type Arrow, type Ask, type Challenge, type Choice, type Did, type Facts, type Item, type Kind, type Level, NOT_COUNTED, type Random, type RoundFacts, type Side, type Square, type Step, type Told } from "../../../shape/index.ts";
import { rankNumber, SQUARES, step } from "../../../squares/index.ts";
import { apartBy, lastLine, levelPlans, makeQuestion, type Question, questionFacts, questionOf } from "../moves.ts";

const PASS_MARK = "Pass mark for 3.2.1 L1 to L5: the right answers in one round. My practice sets it.";

// The card's level table, row by row.
const TABLE = [
  { id: "L1", path: "Write the move, from four choices.", see: "A board, every piece, my move's squares lit, an arrow between them", asked: "Moves without a capture", besides: 4, signs: false, how: "Pick one of four", minutes: 2 },
  { id: "L2", path: "Write the move, on the move composer, captures too.", see: "A board, every piece, my move's squares lit, an arrow between them", asked: "Captures too", besides: 4, signs: false, how: "Move composer", minutes: 3 },
  { id: "L3", path: "Write the move, castling, promotion and in passing too.", see: "A board, every piece, my move's squares lit, an arrow between them", asked: "Castling, promotion and a pawn taken in passing too", besides: 6, signs: false, how: "Move composer", minutes: 3 },
  { id: "L4", path: "Write the move, two pieces told apart, signs judged.", see: "A board, every piece, my move's squares lit, an arrow between them", asked: "Two pieces told apart too", besides: 6, signs: true, how: "Move composer", minutes: 4 },
  { id: "L5", path: "Write the move, no board.", see: "No board, the position and my move in words", asked: "As at L4", besides: 6, signs: true, how: "Move composer", minutes: 5 },
] as const;

export const LEVELS: Level[] = TABLE.map((row) => ({
  id: row.id,
  path: row.path,
  questions: 10,
  minutes: row.minutes,
  seconds: null,
  seat: row.see.startsWith("A board") ? "round" : null,
  passMark: PASS_MARK,
  dials: [
    { name: "What I see", value: row.see },
    { name: "Moves asked", value: row.asked },
    { name: "Pieces besides the kings", value: String(row.besides) },
    { name: "Signs judged", value: row.signs ? "Yes" : "No" },
    { name: "How I answer", value: row.how },
  ],
}));

const rowOf = (level: Level) => TABLE.find((r) => r.id === level.id)!;

// The card's mistakes, in its order. A wrong square takes the first kind it fits.
export const MISTAKES = [
  ...Object.values(MISTAKE),
  "The wrong piece's letter",
  "A letter on a pawn",
  "The square it leaves",
  "The other piece named",
  "A pawn's capture without its file",
  "A capture without its x",
  "A capture where nothing is taken",
  "The other side's castling",
  "Castling written as a king move",
  "A promotion without its piece",
  "The wrong new piece",
  "What tells two apart, left out",
  "More than tells them apart",
  "A check left unmarked",
  "A sign where there is none",
  "A mate written as check",
  "Another move",
];

const LETTER: Record<Kind, string> = { king: "K", queen: "Q", rook: "R", bishop: "B", knight: "N", pawn: "" };

const unsigned = (san: string) => san.replace(/[+#]$/, "");
const signOf = (san: string): "+" | "#" | null => (san.endsWith("#") ? "#" : san.endsWith("+") ? "+" : null);

// ---------------------------------------------------------------------------
// The written-form judge

export type Judged = { right: boolean; mistakes: string[]; line: string };

// The checking line: "On f7, your bishop attacks Black's king on g8: that is check."
function checkWhy(pos: Position, move: Move, mate: boolean): string {
  const after = play(pos, move)!;
  const them = other(move.side);
  const king = kingSquare(after, them)!;
  const checkers = attackersOf(after.board, king, move.side);
  const end = mate ? ", and it has no way out: that is mate." : ": that is check.";
  const opp = `${sideWord(them)}'s king on ${king}`;
  const lands = move.castle ? null : move.to;
  if (lands && checkers.includes(lands)) return `On ${lands}, your ${after.board[lands]!.kind} attacks ${opp}${end}`;
  const by = checkers[0]!;
  return `After it, your ${after.board[by]!.kind} on ${by} attacks ${opp}${end}`;
}

// Judges a written move against the right one: the short form only, a capture
// marked, every form the card accepts, signs from L4. "not counted" when it
// names no move.
export function judgeWritten(pos: Position, move: Move, text: string, signs: boolean): Judged | "not counted" {
  const readings = readMove(text);
  if (readings === "not counted") return "not counted";
  const legal = legalMoves(pos);
  const w = readings[0]!;
  const found: [string, string][] = [];
  const add = (kind: string, why: string) => found.push([kind, why]);
  const san = move.san;

  if (move.castle) {
    if (w.castle === move.castle) {
      // Right, its sign aside.
    } else if (w.castle) {
      // > Stand-in. The card names this kind, not its line.
      add("The other side's castling", `Your king goes from ${move.from} to ${move.to}: ${move.castle === "queen" ? "O-O-O, on the queen's side" : "O-O, on the king's side"}.`);
    } else if (w.piece === "king" && w.to === move.to) {
      add("Castling written as a king move", `Castling is written ${unsigned(san)}, never as a king move.`);
    } else add("Another move", "");
  } else if (w.castle) {
    add("Another move", "");
  } else {
    // The square it lands on.
    if (w.to !== move.to) {
      const kind = nearMiss(move.to, w.to!);
      const head = move.enPassant
        ? `A pawn taken in passing is written where your pawn lands, ${move.to}.`
        : `Your ${move.kind} lands on ${move.to}.`;
      if (w.to === move.from) add("The square it leaves", `A move names where it lands: ${move.to}.`);
      else if (kind) add(MISTAKE[kind], `${head} ${w.to} is ${WORDS[kind]}.`);
      else add("Another move", head);
    }
    // The piece's letter.
    if (move.kind === "pawn" && w.pawnLetter) add("A letter on a pawn", "A pawn takes no letter.");
    else if (w.piece !== move.kind) {
      const theirs = w.piece === "pawn" ? "A move with no letter is a pawn's." : `${LETTER[w.piece]} is the ${w.piece}.`;
      const mine = move.kind === "pawn" ? "A pawn takes no letter." : `${LETTER[move.kind]} is the ${move.kind}.`;
      add("The wrong piece's letter", `${mine} ${theirs}`);
    }
    // What tells two apart: only for the right piece landing on the right square.
    if (w.piece === move.kind && w.to === move.to) departure(pos, move, w, legal, add);
    // A promotion.
    if (move.promotion && !w.promotion) add("A promotion without its piece", "A promotion names the piece the pawn becomes.");
    else if (move.promotion && w.promotion !== move.promotion) add("The wrong new piece", `Your pawn becomes a ${move.promotion}.`);
    else if (!move.promotion && w.promotion) add("Another move", "");
    // A capture written where nothing is taken, and a capture written without its x.
    // A capture's x is required, though FIDE makes it optional (C.9).
    if (w.capture && !move.captured) add("A capture where nothing is taken", `${move.to} is empty.`);
    else if (!w.capture && move.captured && w.to === move.to) add("A capture without its x", `Your ${move.kind} captures on ${move.to}, so an x goes before the square.`);
  }

  // Check and mate, from L4.
  if (signs) {
    const want = signOf(san);
    if (want === "#" && w.sign === "+") add("A mate written as check", `${sideWord(other(move.side))}'s king has no way out of the check: that is mate.`);
    else if (want && !w.sign) add("A check left unmarked", checkWhy(pos, move, want === "#"));
    else if (!want && w.sign) add("A sign where there is none", "It gives no check, so no sign follows it.");
    // > Stand-in. # written for a check is a sign where there is none.
    else if (want === "+" && w.sign === "#") add("A sign where there is none", "It gives check, not mate: + follows it.");
  }

  if (!found.length) return { right: true, mistakes: [], line: `Right: ${san}.` };
  const order = (k: string) => MISTAKES.indexOf(k);
  found.sort((a, b) => order(a[0]) - order(b[0]));
  const mistakes = [...new Set(found.map(([k]) => k))];
  const why = found.find(([, y]) => y)?.[1];
  // > Stand-in. The lines the card gives no words for follow its pattern:
  // > "No: it is Nf3." then why. Another move that is no wrong square: "No: it
  // > is Nf3." alone. A wrong square that is no near miss: "Your knight lands
  // > on f3."
  return { right: false, mistakes, line: why ? `No: it is ${san}. ${why}` : `No: it is ${san}.` };
}

// The file or rank that tells two of my pieces apart, judged: left out, the
// other piece named, or more than tells them apart.
function departure(pos: Position, move: Move, w: Written, legal: Move[], add: (kind: string, why: string) => void) {
  const gave = { file: w.fromFile, rank: w.fromRank };
  if (move.kind === "pawn") {
    if (move.captured) {
      if (!gave.file) return add("A pawn's capture without its file", `A pawn's capture names the file it leaves: ${move.from[0]}.`);
      if (gave.file !== move.from[0]) {
        const rival = legal.find((m) => m.kind === "pawn" && m.to === move.to && m.from[0] === gave.file);
        if (rival) {
          return add(
            "The other piece named",
            `Your pawn on ${move.from} takes, and a pawn's capture names the file it leaves. ${unsigned(rival.san)} is the pawn on ${rival.from}.`,
          );
        }
        return add("Another move", "");
      }
      if (gave.rank) add("More than tells them apart", "A pawn's capture names only the file it leaves.");
      return;
    }
    if (gave.file || gave.rank) {
      if ((gave.file ?? move.from[0]) === move.from[0] && (gave.rank ?? move.from[1]) === move.from[1]) {
        add("More than tells them apart", "A pawn's move names only where it lands.");
      } else add("Another move", "");
    }
    return;
  }
  const rivals = legal.filter((m) => m.kind === move.kind && m.to === move.to && m.from !== move.from && m.promotion === move.promotion);
  const all = [move, ...rivals];
  const pick = (file: string | null, rank: string | null) => all.filter((m) => (!file || m.from[0] === file) && (!rank || m.from[1] === rank));
  const chosen = pick(gave.file, gave.rank);
  if (!rivals.length) {
    if (!gave.file && !gave.rank) return;
    if (chosen.length === 1) add("More than tells them apart", `No other ${move.kind} of yours reaches ${move.to}, so nothing more is written.`);
    else add("Another move", "");
    return;
  }
  const by = apartBy(move.san);
  if (!chosen.includes(move)) {
    const rival = chosen[0];
    if (rival) add("The other piece named", `Your ${move.kind} on ${move.from} goes. ${unsigned(rival.san)} is the ${move.kind} on ${rival.from}.`);
    else add("Another move", "");
    return;
  }
  if (chosen.length > 1) {
    const rival = rivals[0]!;
    const why = by.rank
      ? `Your ${move.kind} on ${rival.from} reaches ${move.to} too. Both stand on the ${move.from[0]}-file, so the rank tells them apart: ${by.rank}.`
      : `Your ${move.kind} on ${rival.from} reaches ${move.to} too, so the file tells them apart: ${by.file ?? move.from[0]}.`;
    return add("What tells two apart, left out", why);
  }
  // One piece chosen, mine: more than needed when the file alone, or the
  // rank alone, would do.
  if (gave.file && gave.rank && (pick(gave.file, null).length === 1 || pick(null, gave.rank).length === 1)) {
    const alone = pick(gave.file, null).length === 1 ? `the file alone tells them apart: ${gave.file}` : `the rank alone tells them apart: ${gave.rank}`;
    add("More than tells them apart", `Both reach ${move.to}, and ${alone}.`);
  }
}

// ---------------------------------------------------------------------------
// The four choices at L1: the right one, and three wrong ones.
//
// A wrong choice is a move that fails by its letter, its square, or both. Each
// is drawn to look like a right answer, and to hang from one of the others:
// the same square under another letter, a near miss or a reach of the square
// under the same letter, or a move of its own. The four hang together as a star
// or a path, the right one at any of the four places, so it is no more the hub
// than a wrong one. A letter and a square are drawn as the right ones come, so
// neither says whether a choice is right. A pawn question may also offer a
// letter on a pawn, Pe4 for e4: never in every one. Signs never show: L1 judges
// none.

const LETTERS = ["", "K", "Q", "R", "B", "N"];
const KIND_OF_LETTER: Record<string, Kind> = { "": "pawn", P: "pawn", K: "king", Q: "queen", R: "rook", B: "bishop", N: "knight" };
// 3.1.1 L1's moves, which 3.2.1 L1 takes: 3 pawn moves in 10, and 7 of the
// other pieces, each once and 2 more of a knight, bishop, rook or queen.
const LETTER_ODDS: Record<string, number> = { "": 3, K: 1, Q: 1.5, R: 1.5, B: 1.5, N: 1.5 };
// P is a letter on a pawn, a wrong choice of a pawn question alone: Pe4, for
// e4. It takes this much of the 7 that the pieces' letters share.
const ODDS_P = 1.5;
const lettersOf = (move: Move) => (move.kind === "pawn" ? [...LETTERS, "P"] : LETTERS);
const oddsOfLetter = (move: Move, letter: string) =>
  move.kind !== "pawn" || letter === "" ? LETTER_ODDS[letter]! : letter === "P" ? ODDS_P : (LETTER_ODDS[letter]! * (7 - ODDS_P)) / 7;
const SHAPES: readonly (readonly (readonly [number, number])[])[] = [
  [[0, 1], [0, 2], [0, 3]],
  [[0, 1], [1, 2], [2, 3]],
];
// How a wrong choice hangs from its neighbour: under another letter on the same
// square (at most this often), as a move of its own (this often), else under
// the same letter on another square.
const ODDS_SAME_SQUARE = 0.5;
const ODDS_OWN = 0.2;

type Pick = { letter: string; square: Square };
const textOf = (p: Pick) => p.letter + p.square;
const INDEX = new Map(SQUARES.map((s, i) => [s, i]));

// What one letter's moves look like. A piece stands on a square at random and
// takes one of its moves at random (a pawn's, ahead): rho is how often each
// square is where it lands. rel lists, for each square, the squares a wrong
// choice of that letter may hang from it on: a near miss, or a square a piece of
// that letter could move to. a weighs those squares so that a choice hung from
// a square drawn as rho gives it lands on squares as rho gives them, rather than
// drifting toward the middle of the board.
type Field = { rho: number[]; rel: number[][]; a: number[] };
const FIELDS = new Map<string, Field>();
function field(side: Side, letter: string): Field {
  const key = `${side}${letter}`;
  const known = FIELDS.get(key);
  if (known) return known;
  const kind = KIND_OF_LETTER[letter]!;
  const rho = SQUARES.map(() => 0);
  const starts = SQUARES.filter((s) => kind !== "pawn" || (side === "white" ? rankNumber(s) >= 2 && rankNumber(s) <= 6 : rankNumber(s) >= 3 && rankNumber(s) <= 7));
  for (const from of starts) {
    const to = reachOnEmpty({ side, kind }, from);
    for (const t of to) rho[INDEX.get(t)!]! += 1 / (starts.length * to.length);
  }
  const reach = (from: Square) =>
    kind === "pawn" ? [-2, -1, 1, 2].map((d) => step(from, 0, d)).filter((t): t is Square => t !== null) : reachOnEmpty({ side, kind }, from);
  const rel = SQUARES.map((from, i) => {
    if (rho[i] === 0) return [];
    const moves = new Set(reach(from));
    return SQUARES.flatMap((to, j) => (j !== i && rho[j]! > 0 && (moves.has(to) || nearMiss(from, to) !== null) ? [j] : []));
  });
  // Found by scaling, as Sinkhorn's method does, until a square's hangings add up to its rho.
  const a = rho.map((r) => Math.sqrt(r));
  for (let n = 0; n < 60; n++) {
    rho.forEach((r, i) => {
      const near = rel[i]!.reduce((t, j) => t + a[j]!, 0);
      if (r > 0 && near > 0) a[i] = Math.sqrt((a[i]! * r) / near);
    });
  }
  const made = { rho, rel, a };
  FIELDS.set(key, made);
  return made;
}

function roulette<T>(random: Random, items: readonly T[], weight: (item: T) => number): T | null {
  const weights = items.map(weight);
  const total = weights.reduce((n, w) => n + w, 0);
  if (!(total > 0)) return null;
  let x = random.float() * total;
  const at = weights.findIndex((w) => (x -= w) < 0 && w > 0);
  return items[at < 0 ? weights.findIndex((w) => w > 0) : at]!;
}

// One wrong choice hung from another, or null when none is left to draw. It
// takes the neighbour's square under another letter, with the odds that keep
// each letter as common among the wrong choices as among the right ones; else
// the neighbour's letter on a square near it; else a move of its own.
function hung(random: Random, move: Move, from: Pick, taken: Set<string>, fromRight: boolean): Pick | null {
  const side = move.side;
  const letters = lettersOf(move);
  const free = (p: Pick) => !taken.has(textOf(p));
  const here = INDEX.get(from.square)!;
  const odds = (l: string) => oddsOfLetter(move, l) * field(side, l).rho[here]!;
  const others = letters.filter((l) => l !== from.letter && free({ letter: l, square: from.square }));
  const x = random.float();
  const sameSquare = (ODDS_SAME_SQUARE * others.reduce((n, l) => n + odds(l), 0)) / letters.reduce((n, l) => n + odds(l), 0);
  const order = x < sameSquare ? ["letter", "square", "own"] : x < sameSquare + ODDS_OWN ? ["own", "square", "letter"] : ["square", "own", "letter"];
  for (const kind of order) {
    if (kind === "letter") {
      const letter = roulette(random, others, odds);
      if (letter !== null) return { letter, square: from.square };
    } else if (kind === "square") {
      const f = field(side, from.letter);
      const j = roulette(random, f.rel[here]!, (k) => (free({ letter: from.letter, square: SQUARES[k]! }) ? f.a[k]! * (fromRight && SQUARES[k] === move.from ? 4 : 1) : 0));
      if (j !== null) return { letter: from.letter, square: SQUARES[j]! };
    } else {
      for (let i = 0; i < 10; i++) {
        const letter = roulette(random, letters, (l) => oddsOfLetter(move, l))!;
        const f = field(side, letter);
        const j = roulette(random, f.rho.map((_, k) => k), (k) => (free({ letter, square: SQUARES[k]! }) ? f.rho[k]! : 0));
        if (j !== null) return { letter, square: SQUARES[j]! };
      }
    }
  }
  return null;
}

function choicesOf(random: Random, move: Move): Choice[] {
  const right = unsigned(move.san);
  const mine: Pick = { letter: LETTER[move.kind], square: move.to };
  for (let tries = 0; tries < 20; tries++) {
    // The tree's four places, the right choice at one of them, and the order in
    // which the others hang from it.
    const edges = random.pick(SHAPES);
    const root = random.int(4);
    const order = [{ node: root, parent: -1 }];
    for (let i = 0; i < order.length; i++) {
      for (const [a, b] of edges) {
        const next = a === order[i]!.node ? b : b === order[i]!.node ? a : -1;
        if (next >= 0 && !order.some((o) => o.node === next)) order.push({ node: next, parent: order[i]!.node });
      }
    }
    const picks = new Map<number, Pick>([[root, mine]]);
    const taken = new Set([textOf(mine)]);
    let failed = false;
    for (let i = 1; i < order.length && !failed; i++) {
      const { node, parent } = order[i]!;
      const pick = hung(random, move, picks.get(parent)!, taken, parent === root);
      if (!pick) failed = true;
      else {
        picks.set(node, pick);
        taken.add(textOf(pick));
      }
    }
    if (failed) continue;
    const words = random.shuffle([...picks.values()].map(textOf));
    if (new Set(words).size === 4 && words.includes(right)) return words.map((w) => ({ words: w, value: w }));
  }
  // Should no four distinct choices come: the right square under four letters.
  const others = LETTERS.filter((l) => l !== mine.letter);
  return random.shuffle([right, ...random.shuffle(others).slice(0, 3).map((l) => `${l}${move.to}`)]).map((w) => ({ words: w, value: w }));
}

// ---------------------------------------------------------------------------
// One question

// "Your bishop goes from c4 to f7."
function moveWords(move: Move): string {
  return `Your ${move.kind} goes from ${move.from} to ${move.to}.`;
}

// The arrows a question's board draws: at L1 to L4, my move's, so that where my
// piece leaves and where it lands never look alike; at L5, no board, no arrow.
export function questionArrows(level: Level, q: Question): Arrow[] {
  return level.seat === null ? [] : arrowsOf(q.move);
}

export function writeTheMove(level: Level, q: Question, random: Random): Item {
  const row = rowOf(level);
  const board = level.seat !== null;
  const seat: Side = q.move.side;
  const notes = [
    lastLine(q),
    board ? null : moveWords(q.move),
    q.move.promotion ? `It becomes a ${q.move.promotion}.` : null,
  ].filter((n): n is string => n !== null);
  const ask: Ask = {
    step: "ask",
    question: "Write your move in notation.",
    board: board ? { seat, names: false, pieces: piecesOf(q.pos), lit: [q.move.from, q.move.to], arrows: questionArrows(level, q) } : null,
    words: board ? undefined : inWords(q.pos),
    notes,
    input: row.how === "Pick one of four" ? { how: "choose", choices: choicesOf(random, q.move) } : { how: "compose-move" },
    seconds: null,
    reopened: false,
  };
  let told: Told | null = null;
  return {
    challenge: "3.2.1",
    level: level.id,
    questions: 1,
    first: () => ask,
    next(did: Did): Step {
      if (told) return { step: "done", back: told.score.right ? null : questionFacts(q) };
      if (did.did !== "answer") throw new Error("3.2.1 takes an answer.");
      const a = did.answer;
      const text = a.kind === "choice" ? a.value : a.kind === "text" ? a.text : null;
      if (text === null) throw new Error("3.2.1 takes a choice, or a move from the composer.");
      const j = judgeWritten(q.pos, q.move, text, row.signs);
      if (j === "not counted") return { ...ask, note: NOT_COUNTED, reopened: true };
      told = { step: "told", verdict: j.right ? "right" : "wrong", line: j.line, score: { right: j.right, mistakes: j.mistakes, counts: {} } };
      return told;
    },
  };
}

export const challenge: Challenge = {
  built: true,
  id: "3.2.1",
  name: "Write the move",
  trains: "Writing a move of mine in notation.",
  needs: "3.1.1 L1 and 1.1.2 L2. From L2, 3.1.1 L2. From L3, 3.1.1 L3. From L4, 3.1.1 L4, 2.3.1 L3 and 2.3.2 L3. From L5, 3.1.1 L5, 2.3.1 L5 and 2.3.2 L5.",
  levels: LEVELS,
  // The questions coming back that a round asks. The move is mine, my side
  // kept for the whole round.
  // > Stand-in. A question coming back is the same position and the same
  // > move, so it keeps its side: the first one back sets the side of a
  // > round of its own level. A mixed round keeps the side it drew, and a
  // > question seated on the other side waits, as does one past the count.
  asks(level, facts) {
    return takeBack(level, facts).back.map((b) => b.from);
  },
  seats(level, facts) {
    return takeBack(level, facts).side;
  },
  makeRound(level, random, facts) {
    const row = rowOf(level);
    const count = facts.count ?? level.questions;
    const { side, back } = takeBack(level, facts);
    const fresh = levelPlans(random, level.id, row.signs)
      .slice(0, count - back.length)
      .map((plan) => makeQuestion(random, side, row.besides, plan));
    return random.shuffle([...back.map((b) => b.question), ...fresh]).map((q) => writeTheMove(level, q, random));
  },
};

// The side the round seats me on, and the questions it asks from what comes
// back, each with the facts it was stored as.
function takeBack(level: Level, facts: RoundFacts): { side: Side; back: { question: Question; from: Facts }[] } {
  const all = facts.back.flatMap((from) => {
    const question = questionOf(from);
    return question ? [{ question, from }] : [];
  });
  const side = facts.count === undefined && all.length ? all[0]!.question.move.side : facts.side;
  return { side, back: all.filter((b) => b.question.move.side === side).slice(0, facts.count ?? level.questions) };
}
