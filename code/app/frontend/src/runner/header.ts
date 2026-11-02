// What the step screen's header says, from the round and its walk: no screen
// here, so a test can read it. Header.tsx draws it.
//
// The header: Leave, Restart, Next level and Settings, the level's name, four
// tiles, and the level's conditions folded behind Settings.
//
// > Stand-in. "Settings": the level's own conditions, as its card's level
// > table gives them. The seat chip comes from the chapter's words where the
// > table has no column for it.

import type { Ask, BoardView, Side, Step, Tally } from "../core.ts";
import { levelLabel, nextOf, scoreSheet, type Part, type Play, type Round } from "../rounds/rounds.ts";
import { questionNumber, roundLeft, type Walk } from "./walk.ts";

export const clock = (secs: number) => {
  const s = Math.max(0, Math.ceil(secs));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

const cap = (s: string) => s[0]!.toUpperCase() + s.slice(1);

// ---------------------------------------------------------------------------
// The board on screen, and the side I sit on

// The board a step draws, if it draws one.
export function boardOf(step: Step, asked: Ask | null): BoardView | null {
  if (step.step === "show") return step.board ?? null;
  if (step.step === "told") return step.again?.board ?? asked?.board ?? null;
  if (step.step === "ask") return step.board;
  return null;
}

// > Stand-in. Where the core seats nobody ("seat: null") yet chapter 3's page
// > gives each round a side: its three levels with no board draw their side
// > from the round, as the winner's section 28 does.
const DRAWN_WITH_NO_BOARD = new Set(["3.1.1 L5", "3.1.1 L6", "3.2.1 L5"]);

// Why I sit where I do: the level fixes it, the round drew it, or the item
// does (a puzzle's side to move).
export type Seat = { side: Side | null; why: "level" | "round" | "item" | "none" };

// > Stand-in. A puzzle with no board gives its side only in its words, "…
// > Black to move.", read from the open question's words.
const toMove = (words: string | undefined): Side | null => {
  const m = /\b(White|Black) to move\.?\s*$/.exec(words ?? "");
  return m ? (m[1] === "White" ? "white" : "black") : null;
};

export function seatOf(round: Round, part: Part, step: Step, asked: Ask | null): Seat {
  const seat = part.level.seat;
  const mixed = round.parts.length > 1;
  if (seat === "white" || seat === "black") return { side: seat, why: mixed && round.oneSide ? "round" : "level" };
  if (seat === "round") return { side: round.side, why: "round" };
  if (seat === "item") {
    const side = boardOf(step, asked)?.seat ?? toMove(asked?.words);
    return { side, why: side ? "item" : "none" };
  }
  if (DRAWN_WITH_NO_BOARD.has(`${part.challenge.id} ${part.level.id}`)) return { side: round.side, why: "round" };
  return { side: null, why: "none" };
}

// ---------------------------------------------------------------------------
// The chips behind Settings

export type Chip = { lead?: boolean; name: string; value: string; extra?: string };

// The cards that carry a time column list "Time per question", even when it is none.
const TIME_COLUMN = new Set(["1.1.1", "1.1.2", "1.2.1", "2.1.1"]);

export function chipsOf(part: Part, seat: Seat): Chip[] {
  const { level, challenge } = part;
  const out: Chip[] = [];
  const seatDial = level.dials.find((d) => d.name === "I sit as");
  const drawn = seat.why === "round" ? "drawn for the round" : seat.why === "item" ? "the side to move" : "";
  if (seat.side) {
    const word = seatDial && seat.why === "level" ? seatDial.value : cap(seat.side);
    out.push({ lead: true, name: "I sit as", value: word, extra: drawn ? `, ${drawn}` : undefined });
  } else if (seatDial) out.push({ lead: true, ...seatDial });
  for (const d of level.dials) if (d.name !== "I sit as") out.push(d);
  if (level.seconds !== null || TIME_COLUMN.has(challenge.id)) {
    out.push({ name: "Time per question", value: level.seconds === null ? "None" : `${level.seconds} seconds` });
  }
  return out;
}

// ---------------------------------------------------------------------------
// The tiles

export type Tile = {
  label: string;
  value: string;
  of?: number;
  sub?: string; // beside the value
  tone?: "good" | "bad";
  low?: boolean;
  say?: string; // the tile said whole, for a screen reader and a test
};

export type Mix = { label: string; of: number; asked: number; cur: boolean }[];

export type Header = {
  name: string; // "1.1.1 Find the square", or the mixed round's words
  level: string; // "L2", or "Mixed"
  label: string; // the level's own words, "no names"; none in a mixed round
  now: { id: string; asked: number; of: number } | null; // a mixed round: the question's own level
  tiles: Tile[];
  avg: string; // my average time per answer so far, "2.4 s", or "—" before the first
  chips: Chip[];
  mix: Mix | null;
  seat: Seat;
  next: { play: Play; label: string; words: string } | null;
  nextOk: boolean;
};

// Next level: Rounds' own next, the same the score screen offers.
function nextLevel(round: Round): Pick<Header, "next" | "nextOk"> {
  const n = nextOf(round);
  return n ? { next: { play: n.play, label: n.label, words: n.words }, nextOk: n.ok } : { next: null, nextOk: false };
}

// The live count a step carries, when its item is a game or an endgame.
export const tallyOf = (step: Step): Tally | null => (step.step === "done" ? null : (step.tally ?? null));

export function partOf(round: Round, walk: Walk): Part {
  const item = round.items[walk.index]!;
  return round.parts.find((p) => p.challenge.id === item.challenge && p.level.id === item.level) ?? round.parts[0]!;
}

// How many of a challenge's questions are told, apart from the one on screen.
const askedIn = (walk: Walk, challenge: string) =>
  walk.results.answered.filter((a) => a.challenge === challenge).length - (walk.step.step === "told" && partOf(walk.round, walk).challenge.id === challenge ? 1 : 0);

export function headerOf(walk: Walk, now: number): Header {
  const round = walk.round;
  const part = partOf(round, walk);
  const mixed = round.parts.length > 1;
  const told = walk.step.step === "told";
  const seat = seatOf(round, part, walk.step, walk.asked);
  const chips = chipsOf(part, seat);

  const answered = walk.results.answered;
  const right = answered.filter((a) => a.score.right).length;
  const wrong = answered.length - right;
  const n = questionNumber(walk);

  const total = round.minutes === null ? 0 : round.minutes * 60;
  const left = roundLeft(walk, now);
  const elapsed = (now - walk.startedAt) / 1000;
  const time = (noClock: string): Tile => ({
    label: "Time",
    value: clock(elapsed),
    ...(left === null ? { sub: noClock } : { sub: `${clock(left)} left`, low: left < total / 3 }),
  });

  // A game's or an endgame's own count, as the core hands it with the step on
  // screen. The move on screen is the next after those played; once told, the
  // last. An endgame sets the most moves allowed, a game sets none.
  const tally = tallyOf(walk.step);

  let tiles: Tile[];
  if (tally && tally.allowed !== null) {
    const move = tally.played + (told ? 0 : 1);
    tiles = [
      {
        label: "Move",
        value: String(move),
        of: tally.allowed,
        sub: `${Math.max(0, tally.allowed - move)} left`,
        say: `Move ${move} of ${tally.allowed} at most`,
      },
      time("no clock"),
      { label: "Illegal", value: String(tally.illegal), say: `${tally.illegal} illegal moves` },
      { label: "Won", value: String(right), of: round.questions, say: `Won ${right} of ${round.questions}` },
    ];
  } else if (tally) {
    const move = tally.played + (told ? 0 : 1);
    const hints = tally.hints;
    tiles = [
      { label: "Move", value: String(move), say: `Move ${move}` },
      time("no clock"),
      { label: "Illegal", value: String(tally.illegal), say: `${tally.illegal} illegal moves` },
      // > Stand-in. "5 of 6" with "points left" said by the tile's name alone:
      // > the fourth tile has no room beside its value for the words, at either
      // > width, and the winner's short look drops them too.
      hints
        ? { label: "Hints", value: String(hints.left), of: hints.of, say: `${hints.left} of ${hints.of} hint points left` }
        : { label: "Hints", value: "None", say: "No hint points" },
    ];
  } else {
    tiles = [
      { label: "Question", value: String(n), of: round.questions, sub: `${round.questions - n} left`, say: `Question ${n} of ${round.questions}` },
      time("no clock"),
      { label: "Right", value: String(right), tone: "good", say: `${right} right` },
      { label: "Wrong", value: String(wrong), tone: wrong > 0 ? "bad" : undefined, say: `${wrong} wrong` },
    ];
  }

  // The score sheet's own average: each answer's time runs from its question
  // to my answer, so the pause before the next question never counts.
  const avg = scoreSheet(round, walk.results).avgAnswer;

  // A challenge's questions in the round, over all its parts, in the order its first part comes.
  const groups = [...new Set(round.parts.map((p) => p.challenge.id))].map((id) => ({
    id,
    of: round.parts.filter((p) => p.challenge.id === id).reduce((n, p) => n + p.count, 0),
    asked: askedIn(walk, id),
  }));
  const g = groups.find((x) => x.id === part.challenge.id)!;
  return {
    name: round.title,
    level: mixed ? "Mixed" : part.level.id,
    label: mixed ? "" : levelLabel(part.challenge, part.level),
    now: mixed ? { id: `${part.challenge.id} ${part.level.id}`, asked: g.asked + 1, of: g.of } : null,
    tiles,
    avg: avg === null ? "—" : `${avg.toFixed(1)} s`,
    chips,
    mix: mixed ? groups.map((x) => ({ label: x.id, of: x.of, asked: x.asked, cur: x.id === part.challenge.id })) : null,
    seat,
    ...nextLevel(round),
  };
}

// ---------------------------------------------------------------------------
// The level's note, the Black banner's words

export type Note = { tag: string; text: string; wide?: boolean };

// > Stand-in. "Custom occasions": a level's note says plainly what the level
// > adds, from its own conditions: a mixed round, signs judged, pairs on no
// > diagonal, names on the edge, a question timed. One note at a time, in that
// > order. The winner's check note ("The king on e8 is in check") is not one
// > of them: the core hands it with the Ask, and CheckNote draws it.
export function noteOf(round: Round, part: Part, seat: Seat, board: BoardView | null): Note | null {
  const { level } = part;
  const dial = (name: string) => level.dials.find((d) => d.name === name)?.value;
  if (round.parts.length > 1) {
    const one = seat.side && round.oneSide ? ` One side holds for the whole round: ${cap(seat.side)}.` : "";
    if (part.challenge.id === "3.2.1") return { tag: "Your turn", text: `I write my move.${one}` };
    if (part.challenge.id === "3.1.1") return { tag: "Their turn", text: `My opponent's move comes in, and I read it.${one}` };
    if (!round.oneSide) return { tag: "Mixed round", text: "Each question keeps its own level: its side, its names on the edge and its time. Which question comes next is never said." };
    return { tag: "Mixed round", text: seat.side ? `${one.trim()} Each question is timed as at its own level.` : "Which question comes next is never said." };
  }
  if (dial("Signs judged") === "Yes") return { tag: "Signs count", text: "Write + after a check and # after a mate." };
  const pairs = /^(\d+) of (\d+)$/.exec(dial("Pairs on no diagonal") ?? "");
  if (pairs && pairs[1] !== "0") {
    return { tag: "This level", text: `Some pairs share no diagonal: ${pairs[1]} in ${pairs[2]}. Then the answer is No diagonal.` };
  }
  if (board?.names) return { tag: "This level", text: "The letters a to h and the numbers 1 to 8 run along the board's edge." };
  if (level.seconds !== null) return { tag: "Timed", text: `${level.seconds} seconds a question. No answer in time is a miss.`, wide: true };
  return null;
}

// The banner's words: the colour, and why I sit there. It never speaks of a board.
export function bannerWords(seat: Seat): { head: string; reason: string } {
  const reason =
    seat.why === "round"
      ? "Drawn for this round. You keep it to the end."
      : seat.why === "item"
        ? "You move for Black in this puzzle."
        : "This level seats you as Black.";
  return { head: "You play Black", reason };
}
