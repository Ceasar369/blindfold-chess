// How a rebuilt opening is judged, and what is told: the final board only, on
// all 64 squares. The order of my moves never counts, nor which of two alike
// pieces I move. It reads the teaching content (definitions.ts) and teaches
// nothing itself.
//
// Source: code/blueprint/docs/position-memory.md, 4.3, "Mistakes it names".

import { MISTAKE, WORDS } from "../../../near-misses/index.ts";
import { fromPieces, samePiece, standsWords } from "../../../positions/index.ts";
import { gradePosition } from "../../../position-grader/index.ts";
import type { Move } from "../../../rules/index.ts";
import type { Piece, Placed, Square } from "../../../shape/index.ts";
import { pathOf, type Taken, type Thread } from "../../../thread/index.ts";
import type { Opening } from "./definitions.ts";

// The card's mistakes, in its order. A wrong square takes the first kind it fits.
export const MISTAKES = [
  "A piece left at home",
  ...Object.values(MISTAKE),
  "Another opening's square",
  "A piece taken, left on",
  "A piece moved that stays home",
  "The wrong piece",
  "Another square",
];

// The start square of the piece standing on `square` after `ply` half-moves.
function homeOf(t: Thread, ply: number, square: Square): Square {
  const id = t.frames[ply]![square]!.id;
  return (Object.entries(t.frames[0]!) as [Square, { id: number }][]).find(([, v]) => v.id === id)![0];
}

// A piece of this kind and side stood on `square` at some moment of the line
// and was taken later: where it started, and the move that took it.
function takenLater(t: Thread, square: Square, piece: Piece): { home: Square; by: Taken } | null {
  for (let ply = 0; ply < t.frames.length; ply++) {
    const here = t.frames[ply]![square];
    if (!here || !samePiece(here.piece, piece)) continue;
    const path = pathOf(t, square, ply);
    if (path?.takenBy) return { home: homeOf(t, ply, square), by: path.takenBy };
  }
  return null;
}

// A move as the line writes it, with no number: "Nf3", "...c6".
const written = (m: Move) => (m.side === "white" ? m.san : `...${m.san}`);

export type Judged = { right: boolean; mistakes: string[]; line: string };

// `all`: the nine, for "another opening's square".
export function judgeOpening(o: Opening, built: readonly Placed[], all: readonly Opening[]): Judged {
  const right = o.final.board;
  const g = gradePosition(fromPieces(built).board, right);
  if (g.whole) return { right: true, mistakes: [], line: `Right: the ${o.name}.` };
  const t = o.thread;
  const start = o.positions[0]!.board;
  const found: [string, string][] = [];
  const paired = new Set(g.pairs.map((p) => p.belongs));
  for (const w of g.wrong) {
    const s = w.square;
    const b = w.built;
    const r = w.right;
    if (!b) {
      // A piece left out: told where it was placed instead, when it was.
      // > Stand-in. A piece taken off that stays: another square.
      if (!paired.has(s)) found.push(["Another square", `${standsWords(r)} stands on ${s}.`]);
      continue;
    }
    const pair = g.pairs.find((p) => p.placed === s);
    const home = samePiece(start[s] ?? null, b) ? pathOf(t, s, 0) : null;
    const first = home?.standsOn && home.standsOn !== s ? home.moved[0] : undefined;
    // Another opening's square is a square that opening moved a piece to: a piece at home is no sign of any opening.
    const other = pair && !r && !samePiece(start[s] ?? null, b) ? all.find((x) => x.id !== o.id && samePiece(x.final.board[s] ?? null, b)) : undefined;
    const movesHere = pair ? !samePiece(start[pair.belongs] ?? null, b) || !samePiece(right[pair.belongs] ?? null, start[pair.belongs] ?? null) : false;
    // A piece that stood on this square and was taken, left on it. A piece that pairs with a missing one is told by that square.
    const gone = !r && !pair ? takenLater(t, s, b) : null;
    // A piece I never moved is told by the move I left out, before it is told by a square beside.
    if (first) found.push(["A piece left at home", `${written(first.move)} was left out. ${standsWords(b)} is still on ${s}.`]);
    else if (pair?.kind) found.push([MISTAKE[pair.kind], `${standsWords(b)} stands on ${pair.belongs}, not ${s}: ${WORDS[pair.kind]}.`]);
    // > Stand-in. The card names these kinds, not their lines. Another
    // > opening's square fits only a piece that moves in this opening, so a
    // > knight put on f6 in the Italian Game stays "a piece moved that stays
    // > home", though the London System has one there.
    else if (other && movesHere) found.push(["Another opening's square", `${standsWords(b)} stands on ${pair!.belongs}. On ${s}, it is the ${other.name}.`]);
    else if (gone) {
      const takerHome = homeOf(t, gone.by.ply - 1, gone.by.move.from);
      const taker = start[takerHome]!;
      const traded = pathOf(t, takerHome, 0)?.takenBy != null;
      found.push(["A piece taken, left on", `${s} is empty. ${standsWords(b)} from ${gone.home} is gone, ${traded ? "traded for" : "taken by"} ${standsWords(taker)} from ${takerHome}.`]);
    } else if (pair && !r && !movesHere) found.push(["A piece moved that stays home", `${standsWords(b)} stays on ${pair.belongs}.`]);
    else if (r && r.side === b.side) found.push(["The wrong piece", `${standsWords(r)} stands on ${s}, not its ${b.kind}.`]);
    else if (pair) found.push(["Another square", `${standsWords(b)} stands on ${pair.belongs}, not ${s}.`]);
    else found.push(["Another square", r ? `${standsWords(r)} stands on ${s}.` : `${s} is empty.`]);
  }
  const order = (k: string) => MISTAKES.indexOf(k);
  found.sort((a, b) => order(a[0]) - order(b[0]));
  return { right: false, mistakes: [...new Set(found.map(([k]) => k))], line: `No: in the ${o.name}, ${found[0]![1]}` };
}
