// Chapter 5 — Updating a position: its sections, its challenges and its path.
// No round mixes its two challenges.
//
// Source: code/blueprint/docs/updating-a-position.md.

import type { Chapter } from "../../shape/index.ts";
import { levelStep } from "../path.ts";
import { challenge as c511 } from "./5.1.1/index.ts";
import { challenge as c521 } from "./5.2.1/index.ts";

export const chapter: Chapter = {
  n: 5,
  name: "Updating a position",
  trains: "A position held in my head while moves change it: each move shown once, and nothing on screen renewing the board.",
  // > Stand-in. The chapter screen shows "What I can do at the end", word for
  // > word, each item of the page's list one line. A reference's path loses
  // > only its code marks, the page's backticks.
  abilities: [
    "I follow a real game from the starting position through move 10, each move shown once, and name what stands on any square its moves changed, with no board. Before each move in a blindfold game, I ask what stands where my piece would land.",
    "I rebuild the whole board after a real game's first 10 moves, each side's move shown once. In a blindfold game, stopping to set every piece in place is how I check the board in my head, as the Stepping Stones method does (my references, drafts-and-science/drafts/saychess-invisible-chess-viii-stepping-stones.md).",
    "I keep an exchange straight through a game's first 10 moves: which piece took, which took back, and which are gone. By move 10, 8,540 of 10,400 real games at my level hold one (updating-a-position-lookups/lichess-games-2013-01-sequences.md).",
  ],
  needs: [
    "These levels of chapters 1, 3 and 4:",
    "1.1.1 L2 — finding a square on a board with no names.",
    "3.1.1 L6 — a numbered sequence, the position in words renewed after each move. Here nothing renews it.",
    "4.1.1 L1 — the starting position, square by square. Every sequence but one level's starts there.",
    "4.1.1 L4 — naming what stands on a square only named, with no board. 5.1.1 asks it from L2.",
    "4.3.1 L1 — changing a board in the starting position into another position. Every rebuild here answers that way.",
    "4.3.1 L3 — an opening from its name alone. 5.2.1 L3 starts from one.",
    "Each card names the levels it needs. No level needs chapter 3 or chapter 4 finished.",
  ],
  sections: [
    {
      id: "5.1",
      name: "One square, after the moves",
      trains: "A position held while moves change it, asked one square at a time.",
      challenges: [c511],
    },
    {
      id: "5.2",
      name: "The whole board, after the moves",
      trains: "The same, asked whole.",
      challenges: [c521],
    },
  ],
  path: [
    levelStep("5.2.1 L1 — Rebuild after the moves, the list read whole."),
    levelStep("5.1.1 L1 — Name what stands there now, a checkpoint every full move."),
    levelStep("5.2.1 L2 — Rebuild after the moves, one at a time."),
    levelStep("5.1.1 L2 — Name what stands there now, no board."),
    levelStep("5.2.1 L3 — Rebuild after the moves, from an opening by its name."),
    levelStep("5.1.1 L3 — Name what stands there now, 12 half-moves."),
    levelStep("5.2.1 L4 — Rebuild after the moves, 12 half-moves."),
    levelStep("5.1.1 L4 — Name what stands there now, through move 10."),
    levelStep("5.2.1 L5 — Rebuild after the moves, through move 10."),
  ],
};
