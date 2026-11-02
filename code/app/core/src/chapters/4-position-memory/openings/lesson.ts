// L1 of an opening, the lesson: each move demonstrated on its own, with its
// departure and destination and its teaching line, then played by me on the
// board; then one guided reconstruction from the starting position, with the
// moves in front of me. A wrong move is corrected in the exact words, with the
// right departure and destination, and I try again. It teaches and never
// punishes: each correction is counted as a mistake by kind, and none fails the
// round. It ends when the reconstruction is right, and feeds no come-back.
//
// Source: code/blueprint/docs/position-memory.md, 4.3. Its screen is the winner
// opening-lesson g1 v1, looks 3, 4, 7, 8 and 10.
//
// A move is shown with its departure and destination lit and an arrow between
// them (arrowsOf), and its piece slides. The words of a move are its
// departure and destination, and the brief's teaching line when it has one: no
// other word of chess.

import { arrowsOf } from "../../../notation/index.ts";
import { piecesOf, sideWord } from "../../../positions/index.ts";
import type { Ask, BoardView, Did, Item, Lesson, Level, Show, Step, Told } from "../../../shape/index.ts";
import { moveWords } from "../../../thread/index.ts";
import type { Opening } from "./definitions.ts";

// Every board of the lesson names its squares along the edge, to learn the moves by.
const board = (pieces: BoardView["pieces"], extra: Partial<BoardView> = {}): BoardView => ({ seat: "white", names: true, pieces, lit: [], ...extra });

// One move demonstrated, then played, then told right; then, from the start, each played again.
type Stage = { kind: "demo" | "practice" | "right" | "rebuild"; i: number };

export function stagesOf(moves: number): Stage[] {
  const each = (kind: Stage["kind"][]) => Array.from({ length: moves }, (_, i) => kind.map((k): Stage => ({ kind: k, i }))).flat();
  return [...each(["demo", "practice", "right"]), ...each(["rebuild"])];
}

// What a move I played says, from the departure and destination alone, in the
// exact words, and the kind it counts as.
export function correction(o: Opening, i: number, from: string, to: string): { text: string; kind: string } {
  const m = o.moves[i]!;
  if (from === m.from) return { text: `Right piece. It goes to ${m.to}, not ${to}.`, kind: "Another square" };
  return { text: `Not that piece. Move the ${m.kind} on ${m.from} to ${m.to}.`, kind: "The wrong piece" };
}

export function teachOpening(level: Level, o: Opening): Item {
  const stages = stagesOf(o.moves.length);
  const labels = o.moves.map((_, i) => moveWords(o.thread, i + 1));
  const last = o.moves.length - 1;
  let at = 0;
  let waiting = false; // the last Told, until I press
  const corrections: string[] = [];

  // The move shown: the position after it, its departure and destination lit, an
  // arrow between them, its piece sliding in. A move with no line shows those alone.
  const shown = (i: number, extra: Partial<Show> = {}): Show => {
    const m = o.moves[i]!;
    return {
      step: "show",
      name: o.name,
      board: board(piecesOf(o.positions[i + 1]!), { lit: [m.from, m.to], arrows: arrowsOf(m), slide: true }),
      move: labels[i],
      lines: [`${sideWord(m.side)}'s ${m.kind} goes from ${m.from} to ${m.to}.`, ...(o.teach[i] ? [o.teach[i]!] : [])],
      button: "Next",
      time: "move",
      ...extra,
    };
  };
  const lesson = (i: number, extra: Partial<Lesson> = {}): Lesson => ({ line: labels, at: i, ...extra });
  const play = (i: number, rebuild: boolean, miss?: { text: string; to: string }): Ask => ({
    step: "ask",
    question: `Play ${labels[i]}.`,
    // After a miss, the right move's arrow shows at once with the words.
    board: board(piecesOf(o.positions[i]!), miss ? { arrows: arrowsOf(o.moves[i]!) } : {}),
    notes: [],
    input: { how: "play-move" },
    seconds: null,
    reopened: miss !== undefined,
    lesson: lesson(i, {
      guide: arrowsOf(o.moves[i]!),
      strip: !rebuild,
      ...(rebuild ? { watch: shown(i, { moves: 0 }) } : {}),
      ...(miss ? { said: { ok: false, text: miss.text } } : rebuild && i > 0 ? { said: { ok: true, text: `Yes. ${labels[i - 1]}.` } } : {}),
    }),
  });
  const stepOf = (s: Stage): Step => {
    const i = s.i;
    if (s.kind === "demo") return shown(i, { lesson: lesson(i, { strip: true }), button: "Your turn" });
    if (s.kind === "practice") return play(i, false);
    if (s.kind === "rebuild") return play(i, true);
    // Played right: the board holds the result until I go on. It times no move.
    return {
      step: "show",
      name: o.name,
      board: board(piecesOf(o.positions[i + 1]!)),
      lines: [`Yes. ${labels[i]}.`],
      lesson: lesson(i, { strip: true }),
      button: i < last ? "Next" : "Start the reconstruction",
      time: "move",
      moves: 0,
    };
  };

  return {
    challenge: o.challenge,
    level: level.id,
    questions: 1,
    first: () => stepOf(stages[0]!),
    next(did: Did): Step {
      if (waiting) return { step: "done", back: null };
      const s = stages[at]!;
      // The strip, and Replay: watch a move, from any move but the reconstruction's.
      if (did.did === "jump") {
        if (s.kind === "rebuild" || did.to < 0 || did.to > last) throw new Error(`${o.challenge} L1 has no move ${did.to} to watch now.`);
        at = stages.findIndex((x) => x.kind === "demo" && x.i === did.to);
        return stepOf(stages[at]!);
      }
      if (s.kind === "demo" || s.kind === "right") {
        if (did.did !== "press") throw new Error(`${o.challenge} L1 takes a press.`);
      } else {
        if (did.did !== "answer" || did.answer.kind !== "move") throw new Error(`${o.challenge} L1 takes a move.`);
        const m = o.moves[s.i]!;
        const { from, to } = did.answer;
        if (from !== m.from || to !== m.to) {
          const c = correction(o, s.i, from, to);
          corrections.push(c.kind);
          return play(s.i, s.kind === "rebuild", { text: c.text, to });
        }
      }
      at++;
      if (at < stages.length) return stepOf(stages[at]!);
      waiting = true;
      const told: Told = {
        step: "told",
        verdict: "right",
        line: `Right: the ${o.name}, ${o.line}. Anchor: ${o.anchor}.`,
        again: { board: board(piecesOf(o.final)) },
        score: { right: true, mistakes: corrections, counts: {} },
      };
      return told;
    },
  };
}
