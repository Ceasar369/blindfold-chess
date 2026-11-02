// 6.3.1 Play the game: its level table, its game against the bot, its hints
// and their points, resigning, its told lines and the slips said after it.
//
// Source: code/blueprint/docs/blind-play.md, 6.3.1, and its sections "A
// move I write", "Moves shown", "Checkmate and stalemate", "Castling",
// "Illegal moves", "Where I lost the thread", "Hints", "The opponent", "How
// a game ends", "The side I sit on".
//
// One item is one game. Every Ask is my move, timed as a move: the game's
// time runs from my first move to its end.
//
// The game shows again on a board, move by move, each slip at its move:
// Again.replay.

import { type Written, findMove, numbered, numberedLine } from "../../../notation/index.ts";
import { type EvenPosition, packOf, type PositionsPack } from "../../../packs/index.ts";
import { fromFen, inWords, mirrorPosition, other, piecesOf, type Position, sideWord, standsOn, standsWords, startingPosition } from "../../../positions/index.ts";
import { type End, gameEnd, isStalemate, matingMoves, type Move, play } from "../../../rules/index.ts";
import {
  type Answer,
  type Ask,
  type BoardView,
  type Challenge,
  type Did,
  type Facts,
  type HintKind,
  type Item,
  type Kind,
  type Level,
  NOT_COUNTED_MOVE,
  type Replay,
  type RoundFacts,
  type Show,
  type Side,
  type Step,
  type Tally,
  type Told,
} from "../../../shape/index.ts";
import { follow } from "../../../thread/index.ts";
import { type Why, whyIllegal, whyLine } from "../../../why-illegal/index.ts";
import { door, type Strength } from "./bot.ts";

const PASS_MARK = "Pass mark for 6.3.1 L1 to L6: my results and my clean games, over my last games at the level. My practice sets it.";

type Row = {
  id: string;
  path: string;
  real: boolean; // a real position of 6 besides the kings, or the starting position
  see: "words" | "held" | "nothing";
  points: number; // hint points per game
  seat: Side | "round";
  strength: Strength;
  dials: [string, string, string, string, string];
};

// The card's level table, row by row: where the game starts, what I see,
// hint points per game, I sit as, the bot.
const REAL = "A real position, 6 besides the kings";
const START = "The starting position";
const TABLE: Row[] = [
  { id: "L1", path: "Play the game, from 6 pieces, in words.", real: true, see: "words", points: 0, seat: "white", strength: "weaker", dials: [REAL, "Words, renewed after each move", "None: the words show it", "White", "Weaker"] },
  { id: "L2", path: "Play the game, from 6 pieces, held, with hints.", real: true, see: "held", points: 6, seat: "white", strength: "weaker", dials: [REAL, "Words until I hide them, then each move alone", "6", "White", "Weaker"] },
  { id: "L3", path: "Play the game, whole, as White, with hints.", real: false, see: "nothing", points: 6, seat: "white", strength: "weaker", dials: [START, "Each move alone", "6", "White", "Weaker"] },
  { id: "L4", path: "Play the game, whole, as Black, with hints.", real: false, see: "nothing", points: 6, seat: "black", strength: "weaker", dials: [START, "Each move alone", "6", "Black", "Weaker"] },
  { id: "L5", path: "Play the game, whole, either side, the even bot, with hints.", real: false, see: "nothing", points: 6, seat: "round", strength: "even", dials: [START, "Each move alone", "6", "White or Black, at random", "Even"] },
  { id: "L6", path: "Play the game, whole, either side, the even bot, no hint.", real: false, see: "nothing", points: 0, seat: "round", strength: "even", dials: [START, "Each move alone", "0", "White or Black, at random", "Even"] },
];

const DIALS = ["Where the game starts", "What I see", "Hint points per game", "I sit as", "The bot"];

export const LEVELS: Level[] = TABLE.map((row) => ({
  id: row.id,
  path: row.path,
  questions: 1,
  minutes: null,
  seconds: null,
  seat: row.seat,
  passMark: PASS_MARK,
  dials: [...row.dials.map((value, i) => ({ name: DIALS[i]!, value })), { name: "Minutes per round", value: "None: it runs to its end" }],
}));

// The card's mistakes. Each illegal move is named by what made it illegal,
// the first that fits; then the slips of moves played.
export const MISTAKES = [
  "A piece not there",
  "A line blocked",
  "My king left in check",
  "Castling not allowed",
  "Another illegal move",
  "A move left unclear",
  "A mate in one missed",
  "A stalemate given",
];

// > Stand-in. A king stepping next to the other king counts as my king left
// > in check. "No piece" names a piece not there only where one of mine
// > stood earlier, where the move would have worked; else another illegal move.
function illegalKind(why: Why): string {
  switch (why.why) {
    case "no piece":
      return why.stood ? "A piece not there" : "Another illegal move";
    case "blocked":
      return "A line blocked";
    case "stays in check":
    case "into check":
    case "next to king":
      return "My king left in check";
    case "castling":
      return "Castling not allowed";
    case "other":
      return "Another illegal move";
  }
}

function row(level: Level): Row {
  const found = TABLE.find((r) => r.id === level.id);
  if (!found) throw new Error(`6.3.1 has no level ${level.id}.`);
  return found;
}

const LETTER: Record<Kind, string> = { king: "K", queen: "Q", rook: "R", bishop: "B", knight: "N", pawn: "" };

// A move as I gave it, read, signs left off: "Bxe5", "O-O", "c1=Q".
function written(w: Written): string {
  if (w.castle) return w.castle === "king" ? "O-O" : "O-O-O";
  const promotion = w.promotion ? `=${LETTER[w.promotion]}` : "";
  return `${LETTER[w.piece]}${w.fromFile ?? ""}${w.fromRank ?? ""}${w.capture ? "x" : ""}${w.to}${promotion}`;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

// > Stand-in. Several mates, in the order the references' program lists
// > them: from the square nearest h8, then the square landed on, the same
// > way. "17. Qg5# and 17. Qg4#".
const index = (s: string) => (Number(s[1]) - 1) * 8 + (s.charCodeAt(0) - 97);
const byLastSquare = (a: Move, b: Move) => index(b.from) - index(a.from) || index(b.to) - index(a.to);

// A hint asked by its button: the square hint carries the square keyed.
type Hint = Extract<Answer, { kind: "hint" }>;

const COST: Record<HintKind, number> = { square: 1, last: 1, board: 3 };
// The composer's hint buttons, each with its cost.
const HINTS = (["square", "last", "board"] as const).map((hint) => ({ hint, cost: COST[hint] }));
const HINT_COUNT: Record<HintKind, string> = {
  square: "Hint points: a square",
  last: "Hint points: the last moves",
  board: "Hint points: the board",
};

// What comes back at L1 and L2: the game's position, whether I played it
// mirrored, and the level I lost it at. It comes back mirrored again, a to h,
// at that level alone.
export type Back = { game: string; mirrored: boolean; level: string };

function backOf(facts: Facts): Back | null {
  if (
    facts &&
    typeof facts === "object" &&
    !Array.isArray(facts) &&
    typeof facts.game === "string" &&
    typeof facts.mirrored === "boolean" &&
    typeof facts.level === "string"
  ) {
    return { game: facts.game, mirrored: facts.mirrored, level: facts.level };
  }
  return null;
}

// One game, from a position, me on a side. back: this game's own facts, to
// come back when I lose it or play an illegal move; null from L3.
export function playTheGame(level: Level, start: Position, me: Side, back: Back | null = null): Item {
  const r = row(level);
  const them = other(me);
  let pos = start;
  const moves: Move[] = [];
  const history: Position[] = [start];
  let myMoves = 0;
  let lastMine: string | null = null;
  let lastTheirs: string | null = null;
  let pointsLeft = r.points;
  const points: Partial<Record<HintKind, number>> = {};
  let illegal = 0;
  let unclear = 0;
  let matesMissed = 0;
  const mistakes: string[] = [];
  const notes: string[] = []; // each slip, in the game's order, said after it
  const slipsAt: string[][] = []; // each slip again, at its place in the game shown again
  const slip = (line: string) => {
    notes.push(line);
    (slipsAt[moves.length] ??= []).push(line);
  };
  let phase: "start" | "ask" | "hint" | "told" | "done" = r.see === "held" ? "start" : "ask";
  let told: Told | null = null;

  const apply = (m: Move) => {
    pos = play(pos, m)!;
    moves.push(m);
    history.push(pos);
  };

  // The live count every step carries: my moves played, my moves refused, my
  // hint points left of the level's budget. A game sets no most moves.
  const tally = (): Tally => ({
    played: myMoves,
    allowed: null,
    illegal,
    hints: r.points === 0 ? null : { left: pointsLeft, of: r.points },
  });

  // > Stand-in. Whether the bot's moves, and the position in words, are also
  // > read aloud. I answer it later, with session 10. Every level plays in silence.
  function ask(reopened: boolean, note?: string): Ask {
    return {
      step: "ask",
      question: lastTheirs ? `${sideWord(them)} played ${lastTheirs}. Your move.` : "Your move.",
      board: null,
      words: r.see === "words" ? inWords(pos, { toMove: true }) : undefined,
      notes: lastMine ? [`You played ${lastMine}.`] : [],
      // A level with no hint points offers no hint button.
      input: { how: "compose-move", resign: true, ...(r.points ? { hints: HINTS } : {}) },
      seconds: null,
      note,
      reopened,
      time: "move",
      tally: tally(),
    };
  }

  // The bot's move, when it is its turn. It moves at once.
  function theirTurn(): Step {
    if (pos.turn === them) {
      const m = door.bot(pos, r.strength);
      lastTheirs = numbered(m.san, them, pos.moveNumber);
      apply(m);
      const end = gameEnd(start, moves);
      if (end) return finish(end);
    }
    phase = "ask";
    return ask(false);
  }

  function finish(end: End | "resigned"): Told {
    const n = plural(myMoves, "move", "moves");
    const won = end === "checkmate" && pos.turn === them;
    // > Stand-in. The lines for a game drawn, lost or resigned: the card's
    // > pattern, "Checkmate: you won, in 12 moves."
    const ending: Record<End | "resigned", string> = {
      checkmate: `Checkmate: you ${won ? "won" : "lost"}, in ${n}.`,
      stalemate: `Stalemate: a draw, in ${n}.`,
      dead: `A dead position: a draw, in ${n}.`,
      repetition: `A position's third appearance: a draw, in ${n}.`,
      "fifty moves": `50 moves with no capture and no pawn move: a draw, in ${n}.`,
      resigned: `You resigned: you lost, in ${n}.`,
    };
    const spent = r.points - pointsLeft;
    const clean = illegal === 0 && spent === 0;
    const slips = [illegal ? plural(illegal, "illegal move", "illegal moves") : "", spent ? plural(spent, "hint point", "hint points") : ""].filter(Boolean);
    const line = [
      ending[end],
      clean ? "A clean game." : `${slips.join(", ")}.`,
      unclear ? `${plural(unclear, "move", "moves")} left unclear.` : "",
      matesMissed ? `${plural(matesMissed, "mate", "mates")} in one missed.` : "",
    ].filter(Boolean).join(" ");
    const result = won ? "Won" : end === "checkmate" || end === "resigned" ? "Lost" : "Drawn";
    const counts: Record<string, number> = { [result]: 1, "My moves": myMoves, "Clean games": clean ? 1 : 0 };
    if (illegal) counts["Illegal moves"] = illegal;
    if (unclear) counts["Moves left unclear"] = unclear;
    if (matesMissed) counts["Mates in one missed"] = matesMissed;
    for (const [hint, p] of Object.entries(points)) counts[HINT_COUNT[hint as HintKind]] = p;
    const view = (p: Position, m: Move | undefined): BoardView => ({ seat: me, names: false, pieces: piecesOf(p), lit: m ? [m.from, m.to] : [] });
    const board = view(pos, moves.at(-1));
    // The game shown again, move by move: an illegal move's slip at the
    // position I tried it in, any other slip at the move that made it.
    // > Stand-in. The first step's words: "The first position."
    const replay: Replay = history.map((p, k) => ({
      move: k === 0 ? "The first position." : numbered(moves[k - 1]!.san, history[k - 1]!.turn, history[k - 1]!.moveNumber),
      board: view(p, moves[k - 1]),
      notes: slipsAt[k] ?? [],
    }));
    phase = "told";
    told = {
      step: "told",
      verdict: won ? "right" : "wrong",
      line,
      again: { board, moves: numberedLine(start, moves), replay, ...(notes.length ? { notes: [...notes] } : {}) },
      score: { right: won, mistakes: [...mistakes], counts },
      tally: tally(),
    };
    return told;
  }

  function hint(h: Hint): Step {
    if (r.points === 0) return ask(true, "No hints at this level.");
    if (COST[h.hint] > pointsLeft) return ask(true, `Not enough hint points: ${plural(pointsLeft, "point", "points")} left.`);
    pointsLeft -= COST[h.hint];
    points[h.hint] = (points[h.hint] ?? 0) + COST[h.hint];
    if (h.hint === "square") return ask(true, `${standsWords(standsOn(pos, h.square))}.`);
    phase = "hint";
    if (h.hint === "last") {
      const from = Math.max(0, moves.length - 6);
      // > Stand-in. The words when no move is played yet: "No move yet."
      const words = moves.length ? numberedLine(history[from]!, moves.slice(from)) : "No move yet.";
      return { step: "show", words, button: "Hide", time: "look", tally: tally() } satisfies Show;
    }
    return {
      step: "show",
      board: { seat: me, names: false, pieces: piecesOf(pos), lit: [] },
      seconds: 5,
      button: "Hide",
      time: "look",
      tally: tally(),
    } satisfies Show;
  }

  function myMove(text: string): Step {
    const found = findMove(pos, text);
    if ("notCounted" in found) return ask(true, NOT_COUNTED_MOVE);
    if ("unclear" in found) {
      unclear++;
      mistakes.push("A move left unclear");
      return ask(true, found.line);
    }
    if ("none" in found) {
      // Refused, counted, and asked again. Why, only after the game.
      const thread = follow(start, moves);
      const why = whyIllegal(pos, found.readings[0]!, thread);
      illegal++;
      mistakes.push(illegalKind(why));
      slip(whyLine(why, numbered(written(found.readings[0]!), me, pos.moveNumber), me, thread));
      return ask(true, NOT_COUNTED_MOVE);
    }
    const m = found.found;
    const before = pos;
    const said = numbered(m.san, me, before.moveNumber);
    const mates = matingMoves(before).sort(byLastSquare).map((x) => numbered(x.san, me, before.moveNumber));
    apply(m);
    myMoves++;
    lastMine = said;
    if (isStalemate(pos)) {
      mistakes.push("A stalemate given");
      const king = piecesOf(pos).find((p) => p.side === them && p.kind === "king")!;
      const mated = mates.length ? ` ${mates.join(" and ")} mated.` : "";
      slip(`${said} left ${sideWord(them)}'s king on ${king.square} no move, and not in check: stalemate, a draw.${mated}`);
    } else if (mates.length && !m.san.endsWith("#")) {
      matesMissed++;
      mistakes.push("A mate in one missed");
      slip(`${said}: ${mates.join(" and ")} mated at once.`);
    }
    const end = gameEnd(start, moves);
    if (end) return finish(end);
    return theirTurn();
  }

  return {
    challenge: "6.3.1",
    level: level.id,
    questions: 1,
    first(): Step {
      if (phase === "start") return { step: "show", words: inWords(start, { toMove: true }), button: "Hide", time: "look", tally: tally() };
      return theirTurn();
    },
    next(did: Did): Step {
      if (phase === "done") throw new Error("The game is over.");
      if (phase === "told") {
        phase = "done";
        const lost = told!.score.counts.Lost === 1;
        const comes = back !== null && r.real && (lost || illegal > 0);
        return { step: "done", back: comes ? back : null };
      }
      if (phase === "start" || phase === "hint") {
        const wasStart = phase === "start";
        phase = "ask";
        return wasStart ? theirTurn() : ask(true);
      }
      if (did.did === "answer") {
        const a = did.answer;
        if (a.kind === "text") return myMove(a.text);
        if (a.kind === "hint") return hint(a);
        if (a.kind === "resign") return finish("resigned");
      }
      throw new Error("6.3.1 takes a move, a hint, or resigning.");
    },
  };
}

// > Stand-in. A game I draw at L1 or L2, with no illegal move, does not come
// > back: the card names a game I lose, or play with an illegal move.

export const challenge: Challenge = {
  built: true,
  id: "6.3.1",
  name: "Play the game",
  trains: "Playing a game through, against a bot, with the board in my head.",
  needs: "3.1.1 L6, 3.2.1 L5, 6.1.1 L4 and 6.2.1 L2. From L2, 6.1.1 L5 and 6.2.1 L3. From L3, 5.1.1 L4, 5.2.1 L5 and 6.2.1 L6.",
  levels: LEVELS,
  packs: ["positions.json"],
  // The games coming back that a round asks: those lost at its own level. A
  // game lost at L1 waits for an L1 round, and L3 to L6 take none.
  asks(level, facts) {
    return takeBack(level, facts).froms;
  },
  makeRound(level, random, facts) {
    const r = row(level);
    const count = facts.count ?? level.questions;
    if (!r.real) return Array.from({ length: count }, () => playTheGame(level, startingPosition(), facts.side));
    const even = packOf<PositionsPack>(facts, "positions.json").even;
    const games: { p: EvenPosition; mirrored: boolean }[] = takeBack(level, facts).games.map((g) => ({ p: g.p, mirrored: !g.back.mirrored }));
    const fresh = random.shuffle(even.filter((p) => !games.some((g) => g.p.game === p.game)));
    while (games.length < count && fresh.length) games.push({ p: fresh.shift()!, mirrored: false });
    return games.map(({ p, mirrored }) => {
      const start = fromFen(p.fen);
      return playTheGame(level, mirrored ? mirrorPosition(start) : start, facts.side, { game: p.game, mirrored, level: level.id });
    });
  },
};

// A round's games coming back: the level's own, once each, and a game the
// pack no longer holds not at all. froms: every stored come-back of those
// games, as stored; a game stored twice is asked once and counts for both.
function takeBack(level: Level, facts: RoundFacts): { games: { p: EvenPosition; back: Back }[]; froms: Facts[] } {
  const games: { p: EvenPosition; back: Back }[] = [];
  const froms: Facts[] = [];
  if (!row(level).real) return { games, froms };
  const byGame = new Map(packOf<PositionsPack>(facts, "positions.json").even.map((p) => [p.game, p]));
  for (const from of facts.back) {
    const back = backOf(from);
    const p = back && back.level === level.id && byGame.get(back.game);
    if (!p) continue;
    if (games.some((g) => g.p.game === p.game)) froms.push(from);
    else if (games.length < (facts.count ?? level.questions)) {
      games.push({ p, back: back! });
      froms.push(from);
    }
  }
  return { games, froms };
}
