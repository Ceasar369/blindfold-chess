// 6.1.1 Find the winning move: its level table, its round maker, its judge,
// its mistake names and its told lines.
//
// Source: code/blueprint/docs/blind-play.md, 6.1.1, and its sections "A move
// I write", "Moves shown", "A position in words" and "Where I lost the thread".
//
// > Stand-in. Whether the question, and at L4 and L5 the position in words,
// > is also read aloud. Every level plays in silence.

import { MISTAKE, nearMiss, type NearMiss, WORDS } from "../../../near-misses/index.ts";
import { findMove, numbered, numberedLine, readMove, type Written } from "../../../notation/index.ts";
import { packOf, type Puzzle, puzzles, type PuzzlesPack } from "../../../packs/index.ts";
import { fromFen, inWords, kingSquare, mirrorPosition, piecesOf, type Position, sideWord, toFen } from "../../../positions/index.ts";
import { attackedPieces, attackersOf } from "../../../reach/index.ts";
import { legalMoves, legalProblem, type Move, moveBetween, play } from "../../../rules/index.ts";
import {
  type Ask,
  type BoardView,
  type Challenge,
  type Choice,
  type Did,
  type Facts,
  type Item,
  type Kind,
  type Level,
  NOT_COUNTED,
  type Random,
  type RoundFacts,
  type Show,
  type Side,
  type Square,
  type Step,
  type Told,
} from "../../../shape/index.ts";
import { mirror } from "../../../squares/index.ts";
import { follow } from "../../../thread/index.ts";
import { whyIllegal, whyLine } from "../../../why-illegal/index.ts";

const PASS_MARK = "Pass mark for 6.1.1 L1 to L5: the right answers in one round. My practice sets it.";

type Row = {
  id: string;
  path: string;
  see: string;
  puzzles: string;
  pieces: string;
  answer: string;
  questions: number;
  minutes: number;
  twoMove: boolean;
  most: number; // pieces besides the kings, before my opponent's move
  view: "board" | "words" | "held";
};

// The card's level table, row by row.
const TABLE: Row[] = [
  {
    id: "L1", path: "Find the winning move, a mate in one, from four choices.", see: "A board, after my opponent's move",
    puzzles: "Mate in one", pieces: "Any", answer: "Pick one of four", questions: 10, minutes: 4, twoMove: false, most: Infinity, view: "board",
  },
  {
    id: "L2", path: "Find the winning move, a mate in one, on the move composer.", see: "A board, after my opponent's move",
    puzzles: "Mate in one", pieces: "Any", answer: "Move composer", questions: 10, minutes: 5, twoMove: false, most: Infinity, view: "board",
  },
  {
    id: "L3", path: "Find the winning move, two moves too.", see: "A board, after my opponent's move",
    puzzles: "3 mates in one, 3 two-move", pieces: "Any", answer: "Move composer", questions: 6, minutes: 5, twoMove: true, most: Infinity, view: "board",
  },
  {
    id: "L4", path: "Find the winning move, in words on screen.", see: "Words after my opponent's move, on screen",
    puzzles: "3 mates in one, 3 two-move", pieces: "7 at most", answer: "Move composer", questions: 6, minutes: 5, twoMove: true, most: 7, view: "words",
  },
  {
    id: "L5", path: "Find the winning move, held, after my opponent's move.",
    see: "Words before my opponent's move, until I hide them; then the move alone",
    puzzles: "3 mates in one, 3 two-move", pieces: "7 at most", answer: "Move composer", questions: 6, minutes: 5, twoMove: true, most: 7, view: "held",
  },
];

export const LEVELS: Level[] = TABLE.map((r) => ({
  id: r.id,
  path: r.path,
  questions: r.questions,
  minutes: r.minutes,
  seconds: null,
  seat: "item",
  passMark: PASS_MARK,
  dials: [
    { name: "What I see", value: r.see },
    { name: "Puzzles", value: r.puzzles },
    { name: "Pieces besides the kings", value: r.pieces },
    { name: "How I answer", value: r.answer },
  ],
}));

// The card's mistakes, by the first that fits.
export const MOVE_FROM_BEFORE = "A move from before my opponent's move";
export const NO_MOVE = "A move that is no move";
export const CHECK_NOT_MATE = "A check that is not mate";
export const ANOTHER_MOVE = "Another move";
export const MISTAKES = [...Object.values(MISTAKE), MOVE_FROM_BEFORE, NO_MOVE, CHECK_NOT_MATE, ANOTHER_MOVE];

// Its own counts.
export const FIRST_MOVES_RIGHT = "Two-move first moves right";
export const UNCLEAR = "Moves left unclear";

function row(level: Level): Row {
  const found = TABLE.find((r) => r.id === level.id);
  if (!found) throw new Error(`6.1.1 has no level ${level.id}.`);
  return found;
}

// ---------------------------------------------------------------------------
// A puzzle as I meet it: mirrored a to h when it comes back.

export type Seen = { puzzle: Puzzle; mirrored: boolean };

const mirrorUci = (uci: string) => `${mirror(uci.slice(0, 2) as Square)}${mirror(uci.slice(2, 4) as Square)}${uci.slice(4)}`;

// A puzzle mirrored a to h: each piece keeps its rank and moves to the other
// wing. 00OXc's answer, 51. Rh3#, becomes 51. Ra3#.
export function mirrorPuzzle(p: Puzzle): Puzzle {
  return { ...p, fen: toFen(mirrorPosition(fromFen(p.fen))), moves: p.moves.map(mirrorUci) };
}

const asSeen = (s: Seen): Puzzle => (s.mirrored ? mirrorPuzzle(s.puzzle) : s.puzzle);

const PROMOTION: Record<string, Kind> = { q: "queen", r: "rook", b: "bishop", n: "knight" };

// The legal move a UCI string names, in a position.
function uciMove(pos: Position, uci: string): Move {
  const m = moveBetween(pos, uci.slice(0, 2) as Square, uci.slice(2, 4) as Square, PROMOTION[uci[4] ?? ""] ?? null);
  if (!m) throw new Error(`Not a legal move: ${uci} in ${toFen(pos)}`);
  return m;
}

const uciOf = (m: Move) => `${m.from}${m.to}${m.promotion ? { queen: "q", rook: "r", bishop: "b", knight: "n", king: "", pawn: "" }[m.promotion] : ""}`;
const sameMove = (a: Move, b: Move) => a.from === b.from && a.to === b.to && a.promotion === b.promotion;
const after = (pos: Position, m: Move): Position => play(pos, m)!;
const mates = (m: Move) => m.san.endsWith("#");

// The puzzle played out: my opponent's move, then mine and the replies.
type Played = { positions: Position[]; moves: Move[] };

function replay(p: Puzzle): Played {
  const positions = [fromFen(p.fen)];
  const moves: Move[] = [];
  for (const uci of p.moves) {
    const m = uciMove(positions.at(-1)!, uci);
    moves.push(m);
    positions.push(after(positions.at(-1)!, m));
  }
  return { positions, moves };
}

// ---------------------------------------------------------------------------
// The told lines

const say = (pos: Position, m: Move) => numbered(m.san, m.side, pos.moveNumber);
const LETTER: Record<Kind, string> = { king: "K", queen: "Q", rook: "R", bishop: "B", knight: "N", pawn: "" };

// A move as written: "Rf6", "exd5", "c1=Q", "O-O".
function writtenOf(w: Written): string {
  if (w.castle) return w.castle === "king" ? "O-O" : "O-O-O";
  return `${LETTER[w.piece]}${w.fromFile ?? ""}${w.fromRank ?? ""}${w.capture ? "x" : ""}${w.to}${w.promotion ? `=${LETTER[w.promotion]}` : ""}`;
}

// The answer, after "it is": "51. Rh3#." for a mate in one; "33. Rd8+, and
// after 33... Ne8, 34. Rxe8#." for a mate in two; "49... Ne1+, then 50...
// Nxc2: the knight checks the king, then takes the rook." for a fork.
function answerWords(p: Puzzle, run: Played): string {
  const [, m1, reply, m2] = run.moves;
  const [, p1, p2, p3] = run.positions;
  if (!reply || !m2) return `${say(p1!, m1!)}.`;
  if (p.kind === "mate in two") return `${say(p1!, m1!)}, and after ${say(p2!, reply)}, ${say(p3!, m2)}.`;
  return `${say(p1!, m1!)}, then ${say(p3!, m2)}: ${forkWords(m1!, m2, p2!)}.`;
}

// > Stand-in. A fork whose first move gives no check: "the knight attacks
// > the queen and the rook, then takes the rook". And a capture made by
// > another piece: "then your bishop takes the rook".
function forkWords(m1: Move, m2: Move, afterFirst: Position): string {
  let first = `the ${m1.kind} checks the king`;
  if (!m1.san.includes("+") && !m1.san.includes("#")) {
    const hit = attackedPieces(afterFirst.board, m1.to).filter((x) => x.square !== m2.to && x.kind !== "king");
    const others = hit.length ? `the ${hit[0]!.kind} and ` : "";
    first = `the ${m1.kind} attacks ${others}the ${m2.captured ?? "piece"}`;
  }
  const taken = m2.captured ? `takes the ${m2.captured}` : `plays ${m2.san}`;
  return `${first}, then ${m2.from === m1.to ? taken : `your ${m2.kind} ${taken}`}`;
}

// Why a check is no mate: who answers it, the first that fits. "White's king
// takes the rook on h2"; "White's queen on h3 takes it".
// > Stand-in. A king that steps away, "White's king steps to g1", and a piece
// > put between, "White's knight on f3 blocks on g2".
function escapeWords(afterMine: Position, m: Move): string {
  const them = afterMine.turn;
  const king = kingSquare(afterMine, them)!;
  const checkers = attackersOf(afterMine.board, king, m.side);
  const target = checkers.includes(m.to) ? m.to : checkers[0]!;
  const piece = afterMine.board[target]!;
  const replies = legalMoves(afterMine);
  const kingTakes = replies.find((r) => r.kind === "king" && r.to === target);
  if (kingTakes) return `${sideWord(them)}'s king takes the ${piece.kind} on ${target}`;
  const takes = replies.find((r) => r.to === target);
  if (takes) return `${sideWord(them)}'s ${takes.kind} on ${takes.from} takes it`;
  const steps = replies.find((r) => r.kind === "king");
  if (steps) return `${sideWord(them)}'s king steps to ${steps.to}`;
  const block = replies[0]!;
  return `${sideWord(them)}'s ${block.kind} on ${block.from} blocks on ${block.to}`;
}

// > Stand-in. The near misses the card gives no words for: "a6 is h3 with the
// > board turned", "a3 is h3 with the files reversed", "h6 is h3 with the
// > ranks reversed".
function nearMissWords(kind: NearMiss, wrong: Square, right: Square): string {
  return kind === "file beside" || kind === "rank beside" ? `${wrong} is ${WORDS[kind]} ${right}.` : `${wrong} is ${right} with ${WORDS[kind]}.`;
}

// ---------------------------------------------------------------------------
// One puzzle

type Given = { text: string } | { move: Move };

export function findTheWinningMove(level: Level, seen: Seen, random: Random): Item {
  const r = row(level);
  const p = asSeen(seen);
  const run = replay(p);
  const me: Side = run.positions[1]!.turn;
  const twoMove = p.moves.length === 4;
  // The stage I answer: 1 for my first move, 3 for my second, by index in run.moves.
  let stage = 1;
  let told: Told | null = null;
  let unclear = 0;
  let firstRight = false;

  const board = (pos: Position, lit: Square[]): BoardView => ({ seat: me, names: false, pieces: piecesOf(pos), lit });

  // My four choices at L1: the win, then checks, captures and any other
  // move, at random within each, never another move that mates.
  function choicesAt(at: number): Choice[] {
    const pos = run.positions[at]!;
    const win = run.moves[at]!;
    const rest = legalMoves(pos).filter((m) => !sameMove(m, win) && !mates(m));
    const checks = rest.filter((m) => m.san.includes("+"));
    const captures = rest.filter((m) => !m.san.includes("+") && m.captured);
    const quiet = rest.filter((m) => !m.san.includes("+") && !m.captured);
    const three = [...random.shuffle(checks), ...random.shuffle(captures), ...random.shuffle(quiet)].slice(0, 3);
    return random.shuffle([win, ...three]).map((m) => ({ words: m.san, value: uciOf(m) }));
  }
  const choices = r.answer === "Pick one of four" ? { 1: choicesAt(1), 3: twoMove ? choicesAt(3) : [] } : null;

  // mine: my first move, shown back once, as the page read it, before the
  // reply ("Moves shown").
  // > Stand-in. Its words: "You played 33. Rd8+.", as 6.2.1 and 6.3.1 say it.
  function askAt(at: number, mine?: Move): Ask {
    const before = run.positions[at - 1]!;
    const theirs = run.moves[at - 1]!;
    const pos = run.positions[at]!;
    const played = `${sideWord(theirs.side)} played ${say(before, theirs)}.`;
    return {
      step: "ask",
      question: at === 1 ? `${played} Find your winning move.` : `${played} Your next move.`,
      board: r.view === "board" ? board(pos, [theirs.from, theirs.to]) : null,
      words: r.view === "words" ? inWords(pos, { toMove: true }) : undefined,
      notes: mine ? [`You played ${say(run.positions[at - 2]!, mine)}.`] : [],
      input: choices ? { how: "choose", choices: choices[at as 1 | 3] } : { how: "compose-move" },
      seconds: null,
      reopened: false,
    };
  }

  const show: Show | null =
    r.view === "held" ? { step: "show", words: inWords(run.positions[0]!, { toMove: true }), button: "Hide", time: "look" } : null;
  let ask = askAt(1);

  // The legal move I gave, or why none: "not counted", unclear, or none.
  function read(given: Given, pos: Position): { move: Move } | { none: Written[] } | { note: string } {
    if ("move" in given) return { move: given.move };
    const found = findMove(pos, given.text);
    if ("notCounted" in found) return { note: NOT_COUNTED };
    if ("unclear" in found) {
      unclear++;
      return { note: found.line };
    }
    if ("none" in found) return { none: found.readings };
    return { move: found.found };
  }

  const again = () => {
    const end = run.positions.at(-1)!;
    const last = run.moves.at(-1)!;
    return { board: board(end, [last.from, last.to]), moves: numberedLine(run.positions[0]!, run.moves) };
  };

  const counts = (): Record<string, number> => ({
    ...(twoMove ? { [FIRST_MOVES_RIGHT]: firstRight ? 1 : 0 } : {}),
    ...(unclear ? { [UNCLEAR]: unclear } : {}),
  });

  function right(mine: Move): Told {
    const pos = run.positions[stage]!;
    const line =
      stage === 1
        ? `Right: ${say(pos, mine)}.`
        : `Right: ${numberedLine(run.positions[1]!, [run.moves[1]!, run.moves[2]!, mine])}.`;
    return { step: "told", verdict: "right", line, again: again(), score: { right: true, mistakes: [], counts: counts() } };
  }

  function wrong(mistake: string, line: string): Told {
    return { step: "told", verdict: "wrong", line, again: again(), score: { right: false, mistakes: [mistake], counts: counts() } };
  }

  // A wrong move, its kind the first that fits.
  function judgeWrong(given: Given, got: { move: Move } | { none: Written[] }): Told {
    const pos = run.positions[stage]!;
    const win = run.moves[stage]!;
    const it = `it is ${answerWords(p, run)}`;
    const plain = (reason: string) => `No: ${it}${reason ? ` ${reason}` : ""}`;

    // Chapter 1's five, on the square my move lands on, when it moves the
    // right piece: a legal move from the winning move's square; a move that
    // is no move, by the kind it names.
    const named =
      "move" in got
        ? got.move.from === win.from ? [{ kind: got.move.kind, to: got.move.to as Square | null }] : []
        : got.none.map((w) => ({ kind: w.piece, to: w.to }));
    for (const n of named) {
      if (n.kind !== win.kind || !n.to || n.to === win.to) continue;
      const kind = nearMiss(win.to, n.to);
      if (kind) return wrong(MISTAKE[kind], plain(nearMissWords(kind, n.to, win.to)));
    }

    if ("none" in got) {
      const w = got.none[0]!;
      const thread = follow(run.positions[0]!, run.moves.slice(0, stage));
      const typed = numbered(writtenOf(w), me, pos.moveNumber);
      const reason = whyLine(whyIllegal(pos, w, thread), typed, me, thread).replace(`${typed} was not legal: `, "").replace(`${typed} was not legal.`, "");
      // A move from before my opponent's move: one then, none after it.
      const before = { ...run.positions[stage - 1]!, turn: me, enPassant: null };
      if ("text" in given && !legalProblem(before)) {
        const then = findMove(before, given.text);
        if (("found" in then || "unclear" in then) && reason) {
          return wrong(MOVE_FROM_BEFORE, `No: ${reason} I${it.slice(1)}`);
        }
      }
      // > Stand-in. The line for a move that is no move: "Rf6 is no move:
      // > Black's pawn on f4 stands between f3 and f6."
      return wrong(NO_MOVE, plain(`${writtenOf(w)} is no move${reason ? `: ${reason}` : "."}`));
    }

    const mine = got.move;
    if (mine.san.includes("+")) {
      return wrong(CHECK_NOT_MATE, plain(`${mine.san} is check, but ${escapeWords(after(pos, mine), mine)}.`));
    }
    return wrong(ANOTHER_MOVE, plain(""));
  }

  function judge(given: Given): Step {
    const pos = run.positions[stage]!;
    const win = run.moves[stage]!;
    const got = read(given, pos);
    if ("note" in got) return (ask = { ...ask, note: got.note, reopened: true });
    if ("move" in got && (sameMove(got.move, win) || (mates(win) && mates(got.move)))) {
      if (stage === 1 && twoMove) {
        firstRight = true;
        stage = 3;
        return (ask = askAt(3, got.move));
      }
      return (told = right(got.move));
    }
    return (told = judgeWrong(given, got));
  }

  return {
    challenge: "6.1.1",
    level: level.id,
    questions: 1,
    first: () => show ?? ask,
    next(did: Did): Step {
      if (told) return { step: "done", back: told.score.right ? null : { id: seen.puzzle.id, mirrored: !seen.mirrored } };
      if (did.did === "press") return ask;
      if (did.did !== "answer") throw new Error("6.1.1 has no time limit.");
      const a = did.answer;
      if (a.kind === "text") return judge({ text: a.text });
      if (a.kind === "choice") {
        const m = legalMoves(run.positions[stage]!).find((x) => uciOf(x) === a.value);
        if (!m) throw new Error(`6.1.1 has no choice ${a.value}.`);
        return judge({ move: m });
      }
      throw new Error("6.1.1 takes a move, composed or picked.");
    },
  };
}

// ---------------------------------------------------------------------------
// A round

// What comes back is a puzzle as I met it: { id, mirrored }. It comes back
// mirrored again: the flag is already flipped. Anything else is passed over.
function backOf(facts: Facts): { id: string; mirrored: boolean } | null {
  if (facts && typeof facts === "object" && !Array.isArray(facts) && typeof facts.id === "string") {
    return { id: facts.id, mirrored: facts.mirrored === true };
  }
  return null;
}

// A round's puzzles coming back, each with the facts it was stored as: those
// the pack still holds, the first of the round's count. At L4 and L5 a puzzle
// of more pieces than the level takes waits for a round of a level that takes it.
function takeBack(level: Level, facts: RoundFacts): (Seen & { from: Facts })[] {
  const pack = packOf<PuzzlesPack>(facts, "puzzles.json");
  return facts.back
    .flatMap((from) => {
      const b = backOf(from);
      const puzzle = b && pack.puzzles.find((x) => x.id === b.id);
      return puzzle && puzzle.besides <= row(level).most ? [{ puzzle, mirrored: b.mirrored, from }] : [];
    })
    .slice(0, facts.count ?? level.questions);
}

// The round's puzzles, in order, before any item is made: a test reads them.
// Mates in one, then at L3 to L5 as many two-move puzzles, mates in two and
// forks drawn together, shuffled. Puzzles coming back take places among them.
// > Stand-in. A puzzle coming back takes any place, of either kind, but at
// > L4 and L5 only one of 7 pieces or fewer besides the kings comes back.
export function roundPuzzles(level: Level, random: Random, facts: RoundFacts): Seen[] {
  const r = row(level);
  const pack = packOf<PuzzlesPack>(facts, "puzzles.json");
  const count = facts.count ?? level.questions;
  const back = takeBack(level, facts).map(({ puzzle, mirrored }) => ({ puzzle, mirrored }));
  const taken = new Set(back.map((b) => b.puzzle.id));
  const fresh = (list: Puzzle[]) => random.shuffle(list.filter((x) => !taken.has(x.id)));
  const twos = r.twoMove ? Math.floor(count / 2) : 0;
  const ones = count - twos;
  const drawn = [
    ...fresh(puzzles(pack, "mate in one", r.most)).slice(0, ones),
    ...fresh([...puzzles(pack, "mate in two", r.most), ...puzzles(pack, "fork", r.most)]).slice(0, twos),
  ].map((puzzle) => ({ puzzle, mirrored: false }));
  const order = r.twoMove ? random.shuffle(drawn) : drawn;
  // Each puzzle coming back takes a place at random.
  const places = random.shuffle(order.map((_, i) => i));
  back.forEach((b, i) => (order[places[i]!] = b));
  return order;
}

export const challenge: Challenge = {
  built: true,
  id: "6.1.1",
  name: "Find the winning move",
  trains: "Finding the move that wins, in a position held in my head.",
  needs: "1.1.1 L2, 2.3.1 L3, 2.3.2 L3 and 3.1.1 L4. From L2, 3.2.1 L4. From L4, 2.2.1 L4 and 3.2.1 L5. From L5, 4.1.1 L5 and 5.1.1 L2.",
  levels: LEVELS,
  packs: ["puzzles.json"],
  asks(level, facts) {
    return takeBack(level, facts).map((b) => b.from);
  },
  makeRound(level, random, facts) {
    return roundPuzzles(level, random, facts).map((seen) => findTheWinningMove(level, seen, random));
  },
};

