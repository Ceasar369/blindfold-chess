// L2 and L3 of an opening: the checkpoint rebuilt on a board that starts in the
// starting position. L2 shows the checkpoint first, until I hide it; L3 shows
// only the name. Nothing times it: the look and the answer are counted apart.
//
// Source: code/blueprint/docs/position-memory.md, 4.3.

import { piecesOf } from "../../../positions/index.ts";
import type { Ask, BoardView, Did, Item, Level, Show, Step, Told } from "../../../shape/index.ts";
import type { Opening } from "./definitions.ts";
import { judgeOpening } from "./judge.ts";

const board = (pieces: BoardView["pieces"]): BoardView => ({ seat: "white", names: false, pieces, lit: [] });

// studied: L2, the checkpoint shows first. Otherwise L3, the name alone.
export function rebuildOpening(level: Level, o: Opening, all: readonly Opening[], studied: boolean): Item {
  const question = `Rebuild the ${o.name}.`;
  // No move list, no departure or destination, and the checkpoint is gone once I answer.
  const show: Show = { step: "show", name: o.name, board: board(piecesOf(o.final)), question, button: "Hide", time: "look" };
  const ask: Ask = {
    step: "ask",
    question,
    board: board(piecesOf(o.positions[0]!)),
    notes: [],
    input: { how: "move" },
    seconds: null,
    reopened: false,
  };
  let at: "show" | "ask" | "told" = studied ? "show" : "ask";
  let told: Told | null = null;
  return {
    challenge: o.challenge,
    level: level.id,
    questions: 1,
    first: () => (studied ? show : ask),
    next(did: Did): Step {
      if (at === "show") {
        at = "ask";
        return ask;
      }
      // A miss comes back in the same opening, at the same level.
      if (at === "told") return { step: "done", back: told!.score.right ? null : { opening: o.id, level: level.id } };
      if (did.did !== "answer" || did.answer.kind !== "position") throw new Error(`${o.challenge} takes a position.`);
      // Judged once I have rebuilt it whole and confirmed, on all 64 squares.
      const j = judgeOpening(o, did.answer.pieces, all);
      at = "told";
      // After the answer, the checkpoint shows.
      told = {
        step: "told",
        verdict: j.right ? "right" : "wrong",
        line: j.line,
        again: { board: board(piecesOf(o.final)) },
        score: { right: j.right, mistakes: j.mistakes, counts: {} },
      };
      return told;
    },
  };
}
