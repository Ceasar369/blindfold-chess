// 6.2.1 Play out the endgame: its level table, its round maker, its judge,
// its mistake names and its told lines. The lone king defends from the
// tables solver.ts makes: each reply puts the goal off the longest.
//
// Source: code/blueprint/docs/blind-play.md, 6.2.1, and its sections "A move
// I write", "Moves shown", "A position in words", "Checkmate and stalemate",
// "Illegal moves", "The opponent", "The side I sit on".
//
// The tables hold the stronger side as White. When I sit as Black, a
// position is turned into the tables' form: each rank counted from the other
// edge, the colours swapped.
//
// > Stand-in. Moves read aloud: every level plays in silence.

import { findMove, numbered, numberedLine, type Written } from "../../../notation/index.ts";
import { packOf } from "../../../packs/index.ts";
import { fromPieces, fromWords, inWords, other, piecesOf, type Position, sideWord } from "../../../positions/index.ts";
import { seeded } from "../../../random/index.ts";
import { legalMoves, type Move, play } from "../../../rules/index.ts";
import {
  type Ask, type BoardView, type Challenge, type Did, type Facts, type Item, type Kind, type Level, NOT_COUNTED_MOVE, type Placed,
  type Random, type Replay, type RoundFacts, type Side, type Square, type Step, type Tally, type Told,
} from "../../../shape/index.ts";
import { bySquare } from "../../../squares/index.ts";
import { follow } from "../../../thread/index.ts";
import { whyIllegal, whyLine } from "../../../why-illegal/index.ts";
import { at, blackToMove, DRAW, type Endgame, fileOf, NOT_SET_UP, queenHolds, rankOf } from "./solver.ts";

const PASS_MARK =
  "Pass mark for 6.2.1 L1 to L6: the endgames won in one round, and my illegal moves. My practice sets it.";

type See = "board" | "words" | "held";

// The card's level table, row by row.
const TABLE: {
  id: string; path: string; endgame: Endgame; see: See; band: [number, number]; questions: number; minutes: number;
}[] = [
  { id: "L1", path: "Play out the endgame, king and queen, on a board.", endgame: "queen", see: "board", band: [6, 8], questions: 2, minutes: 5 },
  { id: "L2", path: "Play out the endgame, king and queen, in words.", endgame: "queen", see: "words", band: [6, 8], questions: 2, minutes: 5 },
  { id: "L3", path: "Play out the endgame, king and queen, held.", endgame: "queen", see: "held", band: [6, 8], questions: 2, minutes: 5 },
  { id: "L4", path: "Play out the endgame, king and rook, in words.", endgame: "rook", see: "words", band: [10, 14], questions: 1, minutes: 8 },
  { id: "L5", path: "Play out the endgame, king and rook, held.", endgame: "rook", see: "held", band: [10, 14], questions: 1, minutes: 8 },
  { id: "L6", path: "Play out the endgame, king and pawn, held.", endgame: "pawn", see: "held", band: [5, 10], questions: 2, minutes: 6 },
];

const ENDGAME_WORDS: Record<Endgame, string> = {
  queen: "King and queen v king",
  rook: "King and rook v king",
  pawn: "King and pawn v king",
};

const SEE_WORDS: Record<See, string> = {
  board: "A board, renewed after each move",
  words: "Words, renewed after each move",
  held: "Words until I hide them, then each move alone",
};

export const LEVELS: Level[] = TABLE.map((row) => ({
  id: row.id,
  path: row.path,
  questions: row.questions,
  minutes: row.minutes,
  seconds: null,
  seat: "round",
  passMark: PASS_MARK,
  dials: [
    { name: "Endgame", value: ENDGAME_WORDS[row.endgame] },
    { name: "What I see", value: SEE_WORDS[row.see] },
    { name: "Fewest moves to the goal", value: `${row.band[0]} to ${row.band[1]}` },
  ],
}));

// The card's mistakes. A move refused counts too.
export const MISTAKE = {
  stalemate: "A stalemate",
  left: "A piece left to the king",
  slipped: "The win let slip",
  slow: "Too slow",
  illegal: "An illegal move",
} as const;

// The packs it reads: one table per endgame.
export const PACKS = ["endgames/queen.bin", "endgames/rook.bin", "endgames/pawn.bin"] as const;

function row(level: Level) {
  const found = TABLE.find((r) => r.id === level.id);
  if (!found) throw new Error(`6.2.1 has no level ${level.id}.`);
  return found;
}

// ---------------------------------------------------------------------------
// Squares as the tables hold them: a1 = 0 ... h8 = 63, the stronger side White.

const num = (s: Square) => s.charCodeAt(0) - 97 + (Number(s[1]) - 1) * 8;
const nameOf = (n: number) => `${"abcdefgh"[fileOf(n)]}${rankOf(n) + 1}` as Square;
const turnRanks = (n: number) => (7 - rankOf(n)) * 8 + fileOf(n);

// The three pieces, as the tables hold them: my king, my piece, their king.
type Canon = { wk: number; piece: number; bk: number };

function toCanon(side: Side, s: Square): number {
  return side === "white" ? num(s) : turnRanks(num(s));
}

function toReal(side: Side, n: number): Square {
  return nameOf(side === "white" ? n : turnRanks(n));
}

function canonOf(pos: Position, side: Side): Canon & { kind: Kind } {
  const pieces = piecesOf(pos);
  const mine = pieces.find((p) => p.side === side && p.kind !== "king");
  const wk = pieces.find((p) => p.side === side && p.kind === "king");
  const bk = pieces.find((p) => p.side !== side && p.kind === "king");
  if (!mine || !wk || !bk) throw new Error(`Not an endgame of 6.2.1: ${inWords(pos)}`);
  return { wk: toCanon(side, wk.square), piece: toCanon(side, mine.square), bk: toCanon(side, bk.square), kind: mine.kind };
}

// A position from the tables' three, on my side, my side to move.
function realOf(c: Canon, kind: Endgame, side: Side): Position {
  const pieces: Placed[] = [
    { side, kind: "king", square: toReal(side, c.wk) },
    { side, kind, square: toReal(side, c.piece) },
    { side: other(side), kind: "king", square: toReal(side, c.bk) },
  ];
  return fromPieces(pieces, side);
}

// The tables' three, in words, White the stronger: what comes back.
function canonWords(c: Canon, kind: Endgame): string {
  return inWords(realOf(c, kind, "white"));
}

function canonFromWords(words: string, kind: Endgame): Canon | null {
  try {
    const c = canonOf(fromWords(words), "white");
    return c.kind === kind ? c : null;
  } catch {
    return null;
  }
}

const mirrored = (c: Canon): Canon => {
  const m = (n: number) => rankOf(n) * 8 + (7 - fileOf(n));
  return { wk: m(c.wk), piece: m(c.piece), bk: m(c.bk) };
};

// ---------------------------------------------------------------------------
// The tables

export function tableOf(facts: RoundFacts, kind: Endgame): Uint8Array {
  const pack = packOf<ArrayBuffer | Uint8Array>(facts, `endgames/${kind}.bin`);
  return pack instanceof Uint8Array ? pack : new Uint8Array(pack);
}

// The fewest moves to the goal, my side to move, or null when the tables hold
// no win.
export function fewestOf(table: Uint8Array, pos: Position, side: Side): number | null {
  const c = canonOf(pos, side);
  const v = table[at(c.wk, c.piece, c.bk)]!;
  return v === DRAW || v === NOT_SET_UP ? null : v;
}

// Every set-up position whose fewest moves sit in a band, kept per table.
const bands = new WeakMap<Uint8Array, Map<string, number[]>>();

function inBand(table: Uint8Array, [low, high]: [number, number]): number[] {
  let byBand = bands.get(table);
  if (!byBand) bands.set(table, (byBand = new Map()));
  const key = `${low}-${high}`;
  let list = byBand.get(key);
  if (!list) {
    list = [];
    for (let i = 0; i < table.length; i++) if (table[i]! >= low && table[i]! <= high) list.push(i);
    byBand.set(key, list);
  }
  return list;
}

const fromIndex = (i: number): Canon => ({ wk: i >> 12, piece: (i >> 6) & 63, bk: i & 63 });

// What a move of mine leads to, as the tables count it: the moves still
// needed after it, 0 once it reaches the goal, or Infinity when it throws the
// win away. With the pawn, only a queen reaches the goal.
function movesAfter(kind: Endgame, table: Uint8Array, c: Canon, m: Move, side: Side): number {
  const to = toCanon(side, m.to);
  const next: Canon = m.kind === "king" ? { ...c, wk: to } : { ...c, piece: to };
  if (m.promotion) return m.promotion === "queen" && queenHolds(next.wk, next.piece, next.bk) ? 0 : Infinity;
  const b = blackToMove(kind, table, next.wk, next.piece, next.bk);
  if ("mated" in b) return 0;
  if ("stalemated" in b) return Infinity;
  return Math.max(...b.replies.map((r) => (r.value === DRAW ? Infinity : r.value)));
}

// My moves that win fastest from a position, in the order Rules lists them.
export function fastest(table: Uint8Array, pos: Position, side: Side, kind: Endgame): Move[] {
  const c = canonOf(pos, side);
  const scored = legalMoves(pos).map((m) => ({ m, v: movesAfter(kind, table, c, m, side) }));
  const best = Math.min(...scored.map((s) => s.v));
  return scored.filter((s) => s.v === best).map((s) => s.m);
}

// ---------------------------------------------------------------------------
// The lone king's defence

// The door the lone king's reply goes through: given every reply that puts
// the goal off the longest, in the pages' square order, it picks one. "Where
// two moves put it off alike, either." The card's own door picks at random,
// from the item's own seeded source. A test replays a page's line through it.
export type Defender = (longest: readonly Square[]) => Square;

// > Stand-in. No rule found picks the pages' replies where two put the goal
// > off alike: the card's door picks at random. With the pawn, a draw: the
// > pawn's file first, then nearest the queening square ("1... Ke7").
export function randomDefender(random: Random): Defender {
  return (longest) => random.pick(longest);
}

// A door that plays a page's replies, in order: each must be among the longest.
export function replayDefender(replies: readonly Square[]): Defender {
  const queue = [...replies];
  return (longest) => {
    const next = queue.shift();
    if (!next || !longest.includes(next)) throw new Error(`The replay's ${next ?? "end"} is not among the longest: ${longest.join(", ")}.`);
    return next;
  };
}

// The key squares of a pawn, as the tables hold it: on the rook's file, the
// two beside its queening square on the next file; on ranks 2 to 4, the three
// two ranks ahead; on ranks 5 and 6, the six on the two ranks ahead.
export function keySquares(pawn: number): number[] {
  const f = fileOf(pawn);
  const r = rankOf(pawn);
  if (f === 0 || f === 7) return [6, 7].map((rank) => rank * 8 + (f === 0 ? 1 : 6));
  const ranks = r <= 3 ? [r + 2] : [r + 1, r + 2].filter((x) => x <= 7);
  return ranks.flatMap((rank) => [f - 1, f, f + 1].map((file) => rank * 8 + file));
}

const COUNT = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"];
const LETTER: Record<Kind, string> = { king: "K", queen: "Q", rook: "R", bishop: "B", knight: "N", pawn: "" };

// A move I gave, written back as the page writes one: "Kb5", "exd5", "e8=Q".
function writtenForm(w: Written): string {
  if (w.castle) return w.castle === "king" ? "O-O" : "O-O-O";
  return `${LETTER[w.piece]}${w.fromFile ?? ""}${w.fromRank ?? ""}${w.capture ? "x" : ""}${w.to}${w.promotion ? `=${LETTER[w.promotion]}` : ""}`;
}

// ---------------------------------------------------------------------------
// One endgame

// One endgame from `start`, my side to move: the round's seat is my side.
export function makeItem(level: Level, start: Position, table: Uint8Array, defender: Defender): Item {
  const { see, endgame } = row(level);
  const side = start.turn;
  const them = other(side);
  const startCanon = canonOf(start, side);
  const fewest = table[at(startCanon.wk, startCanon.piece, startCanon.bk)]!;
  if (fewest === DRAW || fewest === NOT_SET_UP) throw new Error(`6.2.1 takes no position the tables do not win: ${inWords(start)}`);
  const allowed = 2 * fewest;

  let pos = start;
  const played: Move[] = [];
  const said: string[] = []; // each half-move, numbered: "1. Qd7", "1... Kf6"
  const history: Position[] = [start]; // the position after each half-move
  let mine = 0;
  const illegal: string[] = [];
  const illegalAt: string[][] = []; // each illegal move's line, at the position I tried it in
  let unclear = 0;
  let stage: "show" | "ask" | "told" | "done" = see === "held" ? "show" : "ask";
  let told: Told | null = null;

  const view = (p: Position): BoardView => ({ seat: side, names: false, pieces: piecesOf(p), lit: [] });
  const goal =
    endgame === "pawn"
      ? `Make your pawn a queen, in ${allowed} moves at most.`
      : `Mate ${sideWord(them)}'s king, in ${allowed} moves at most.`;

  // The live count every step carries: my moves played, the most allowed, my
  // moves refused. An endgame gives no hint.
  const tally = (): Tally => ({ played: mine, allowed, illegal: illegal.length, hints: null });

  // > Stand-in. After the first move: "Black played 1... Kf6. Your move.", my
  // > own move shown back above it, "You played 1. Qd7.", as 6.3.1 asks.
  function ask(note?: string): Ask {
    const lastReply = played.length && played.at(-1)!.side === them ? said.at(-1)! : null;
    return {
      step: "ask",
      question: lastReply ? `${sideWord(them)} played ${lastReply}. Your move.` : goal,
      board: see === "board" ? view(pos) : null,
      words: see === "words" ? inWords(pos, { toMove: true }) : undefined,
      notes: lastReply ? [`You played ${said.at(-2)!}.`] : [],
      input: { how: "compose-move" },
      seconds: null,
      note,
      reopened: note !== undefined,
      time: "move",
      tally: tally(),
    };
  }

  function push(m: Move, before: Position): Position {
    played.push(m);
    said.push(numbered(m.san, m.side, before.moveNumber));
    const after = play(before, m)!;
    history.push(after);
    return after;
  }

  function finish(right: boolean, line: string, mistake: string | null, final: Position): Told {
    const lines = illegal.length ? `${line} ${COUNT[illegal.length] ?? illegal.length} illegal move${illegal.length > 1 ? "s" : ""}: ${illegal.join(" ")}` : line;
    const counts: Record<string, number> = { "Moves played": mine, "Fewest moves": fewest, "Illegal moves": illegal.length };
    if (unclear) counts["Moves left unclear"] = unclear;
    // "The endgame shows again on a board, with its moves": move by move, from
    // its first position, each illegal move's line where I tried it.
    // > Stand-in. The first step's words: "The first position.", as 6.3.1's.
    const replay: Replay = history.map((p, k) => ({
      move: k === 0 ? "The first position." : said[k - 1]!,
      board: { ...view(p), lit: k === 0 ? [] : [played[k - 1]!.from, played[k - 1]!.to] },
      notes: illegalAt[k] ?? [],
    }));
    told = {
      step: "told",
      verdict: right ? "right" : "wrong",
      line: lines,
      again: { board: view(final), moves: numberedLine(start, played), replay },
      score: { right, mistakes: [...illegal.map(() => MISTAKE.illegal), ...(mistake ? [mistake] : [])], counts },
      tally: tally(),
    };
    stage = "told";
    return told;
  }

  // > Stand-in. The card's right line is "Right: mate in 7 moves, the fewest."
  // > Slower: "Right: mate in 9 moves. The fewest: 7." With the pawn: "Right: a
  // > queen in 5 moves, the fewest." Two illegal moves or more: "Two illegal
  // > moves:", each line after it.
  function reached(n: number): string {
    const what = endgame === "pawn" && !played.at(-1)!.san.endsWith("#") ? "a queen" : "mate";
    return n === fewest ? `Right: ${what} in ${n} moves, the fewest.` : `Right: ${what} in ${n} moves. The fewest: ${fewest}.`;
  }

  // My move, legal: the goal, a win thrown away, my moves run out, or the
  // lone king's reply and my next move.
  function afterMine(m: Move): Step {
    const before = pos;
    const c = canonOf(before, side);
    const after = push(m, before);
    mine++;
    const me = said.at(-1)!;
    const v = movesAfter(endgame, table, c, m, side);
    if (v === 0) return finish(true, reached(mine), null, after);
    if (m.promotion && m.promotion !== "queen") {
      // > Stand-in. A pawn made another piece: the page asks a queen.
      return finish(false, `No: ${me} made your pawn a ${m.promotion}, not a queen.`, MISTAKE.slipped, after);
    }
    const replies = legalMoves(after);
    const kingAt = replies[0]?.from ?? piecesOf(after).find((p) => p.side === them && p.kind === "king")!.square;
    if (!replies.length) {
      const kept = fastest(table, before, side, endgame)[0]!;
      return finish(
        false,
        `No: ${me} left ${sideWord(them)}'s king on ${kingAt} no move, and not in check: stalemate, a draw. ${numbered(kept.san, side, before.moveNumber)} kept the win.`,
        MISTAKE.stalemate,
        after,
      );
    }
    const takes = replies.find((r) => r.captured);
    if (takes) {
      const final = push(takes, after);
      return finish(
        false,
        `No: ${me} put your ${takes.captured} next to ${sideWord(them)}'s king, unguarded, and ${said.at(-1)!} took it. King against king: a draw.`,
        MISTAKE.left,
        final,
      );
    }
    const mc = canonOf(after, side);
    const b = blackToMove(endgame, table, mc.wk, mc.piece, mc.bk);
    const values = "replies" in b ? b.replies : [];
    const valueOf = (r: Move) => values.find((x) => x.to === toCanon(side, r.to))!.value;
    if (values.some((x) => x.value === DRAW)) {
      // The win let slip: the king plays a draw, on the pawn's file first,
      // then nearest the queening square, then as Rules lists them.
      const queening = 7 * 8 + fileOf(mc.piece);
      const dist = (r: Move): [number, number] => {
        const n = toCanon(side, r.to);
        return [Math.abs(fileOf(n) - fileOf(mc.piece)), Math.max(Math.abs(fileOf(n) - fileOf(queening)), Math.abs(rankOf(n) - rankOf(queening)))];
      };
      const draws = replies.filter((r) => valueOf(r) === DRAW);
      const reply = draws.reduce((a, r) => {
        const [fa, qa] = dist(a);
        const [fr, qr] = dist(r);
        return fr < fa || (fr === fa && qr < qa) ? r : a;
      });
      const final = push(reply, after);
      const left = m.kind === "king" && keySquares(c.piece).includes(c.wk) && !keySquares(c.piece).includes(mc.wk);
      return finish(
        false,
        `No: after ${me}, ${sideWord(them)} draws with ${said.at(-1)!}.${left ? ` Your king left ${m.from}, a key square for your pawn.` : ""}`,
        MISTAKE.slipped,
        final,
      );
    }
    if (mine >= allowed) {
      // > Stand-in. The card gives no words when my moves run out.
      const none = endgame === "pawn" ? "no queen" : "no mate";
      return finish(false, `No: ${allowed} moves, and ${none}. The fewest: ${fewest}.`, MISTAKE.slow, after);
    }
    const longest = Math.max(...values.map((x) => x.value));
    const tied = replies.filter((r) => valueOf(r) === longest).map((r) => r.to).sort(bySquare);
    const to = defender(tied);
    pos = push(replies.find((r) => r.to === to)!, after);
    stage = "ask";
    return ask();
  }

  function answer(text: string): Step {
    const found = findMove(pos, text);
    if ("notCounted" in found) return ask(NOT_COUNTED_MOVE);
    if ("unclear" in found) {
      unclear++;
      return ask(found.line);
    }
    if ("none" in found) {
      const w = found.readings[0]!;
      const thread = follow(start, played);
      const line = whyLine(whyIllegal(pos, w, thread), numbered(writtenForm(w), side, pos.moveNumber), side, thread);
      illegal.push(line);
      (illegalAt[played.length] ??= []).push(line);
      return ask(NOT_COUNTED_MOVE);
    }
    return afterMine(found.found);
  }

  return {
    challenge: "6.2.1",
    level: level.id,
    questions: 1,
    first(): Step {
      return see === "held"
        ? { step: "show", words: inWords(start, { toMove: true }), button: "Hide", time: "look", tally: tally() }
        : ask();
    },
    next(did: Did): Step {
      if (stage === "show") {
        stage = "ask";
        return ask();
      }
      if (stage === "told") {
        stage = "done";
        return { step: "done", back: told!.score.right ? null : { endgame, start: canonWords(startCanon, endgame) } };
      }
      if (stage === "done") throw new Error("The endgame is over.");
      if (did.did === "timeout") throw new Error("6.2.1 has no time limit on a move.");
      if (did.did !== "answer" || did.answer.kind !== "text") throw new Error("6.2.1 takes a move from the move composer.");
      return answer(did.answer.text);
    },
  };
}

// What comes back: { endgame: "queen", start: "White: king e1, queen d1.
// Black: king e5." }, the tables' form. It comes back mirrored, a to h.
function backCanon(facts: Facts, kind: Endgame): Canon | null {
  if (!facts || typeof facts !== "object" || Array.isArray(facts)) return null;
  if (facts.endgame !== kind || typeof facts.start !== "string") return null;
  return canonFromWords(facts.start, kind);
}

// A round's endgames coming back, each with the facts it was stored as.
function takeBack(level: Level, facts: RoundFacts): { canon: Canon; from: Facts }[] {
  const { endgame } = row(level);
  const table = tableOf(facts, endgame);
  const won = (c: Canon) => {
    const v = table[at(c.wk, c.piece, c.bk)]!;
    return v !== DRAW && v !== NOT_SET_UP;
  };
  return facts.back
    .flatMap((from) => {
      const canon = backCanon(from, endgame);
      return canon ? [{ canon: mirrored(canon), from }] : [];
    })
    .filter((b) => won(b.canon))
    .slice(0, facts.count ?? level.questions);
}

export const challenge: Challenge = {
  built: true,
  id: "6.2.1",
  name: "Play out the endgame",
  trains: "Winning a small endgame against the best defence, with the board in my head.",
  levels: LEVELS,
  needs: "1.1.1 L2, 2.3.2 L3, 3.2.1 L4 and 6.1.1 L2. From L2, 3.1.1 L6 and 3.2.1 L5. From L3, 4.2.1 L4 and 5.1.1 L2.",
  packs: PACKS,
  // The endgames coming back that a round asks: only its own kind, mirrored,
  // a win; one of another kind waits for a round of its own.
  asks(level, facts) {
    return takeBack(level, facts).map((b) => b.from);
  },
  makeRound(level, random, facts) {
    const { endgame, band } = row(level);
    const table = tableOf(facts, endgame);
    const count = facts.count ?? level.questions;
    const back = takeBack(level, facts).map((b) => b.canon);
    const taken = new Set(back.map((c) => at(c.wk, c.piece, c.bk)));
    const pool = inBand(table, band);
    const fresh: Canon[] = [];
    while (back.length + fresh.length < count) {
      const i = random.pick(pool);
      if (taken.has(i)) continue;
      taken.add(i);
      fresh.push(fromIndex(i));
    }
    // Positions coming back take places among them.
    return random.shuffle([...back, ...fresh]).map((c) => {
      const own = seeded(`6.2.1 ${random.int(2 ** 31)}`);
      return makeItem(level, realOf(c, endgame, facts.side), table, randomDefender(own));
    });
  },
};
