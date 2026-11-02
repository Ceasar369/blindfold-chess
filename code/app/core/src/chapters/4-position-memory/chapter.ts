// Chapter 4 — Position memory: its sections, its challenges and its path.
// No round mixes its challenges.
//
// Source: code/blueprint/docs/position-memory.md.

import type { Chapter } from "../../shape/index.ts";
import { levelStep } from "../path.ts";
import { challenge as c411 } from "./4.1.1/index.ts";
import { challenge as c421 } from "./4.2.1/index.ts";
import { challenge as c431 } from "./4.3.1/index.ts";
import { challenge as c432 } from "./4.3.2/index.ts";
import { challenge as c433 } from "./4.3.3/index.ts";
import { challenge as c434 } from "./4.3.4/index.ts";
import { challenge as c435 } from "./4.3.5/index.ts";
import { challenge as c436 } from "./4.3.6/index.ts";
import { challenge as c437 } from "./4.3.7/index.ts";
import { challenge as c438 } from "./4.3.8/index.ts";
import { challenge as c439 } from "./4.3.9/index.ts";

export const chapter: Chapter = {
  n: 4,
  name: "Position memory",
  trains: "A still position, held in my head: every piece on its square, from one look, one reading, or a name I know by heart.",
  abilities: [
    "I name what stands on any square of the starting position, with no piece on the board. Every blindfold game starts there.",
    "I rebuild each of 9 named openings from its name alone. When a blindfold game reaches one, I hold its 28 to 30 pieces besides the kings as the starting position and a few changes.",
    "I rebuild a real position of 10 pieces besides the kings, after one look. A blindfold endgame asks me to hold every piece at once.",
    "I name what stands on any square of a real position of 7 pieces besides the kings, read once in words, with no board. Before each move in a blindfold game, I ask what stands where my piece would land.",
    "I say back, whole, a real position of 7 pieces besides the kings, seen once on a board. Naming every piece and its square myself checks what I hold.",
  ],
  needs: [
    "These levels of chapters 1 and 2:",
    "1.1.1 L2 — finding a square on a board with no names.",
    "1.1.1 L3 — the same within 2 seconds. From 4.1.1 L4, a square is only named, and I find it at once in the position I hold.",
    "2.2.1 L4 — a position given in words, which stays on screen there. Here the words hide.",
    "Each card names the levels it needs. No level needs chapter 2 finished, or any of chapter 3.",
  ],
  sections: [
    {
      id: "4.1",
      name: "What stands there",
      trains: "One square at a time, from a position held in my head.",
      challenges: [c411],
    },
    {
      id: "4.2",
      name: "Whole positions",
      trains: "A position I have never seen, held whole once it hides.",
      challenges: [c421],
    },
    {
      id: "4.3",
      name: "Openings by heart",
      trains: "Named opening positions, held as the starting position and what moved.",
      challenges: [c431, c432, c433, c434, c435, c436, c437, c438, c439],
    },
  ],
  path: [
    levelStep("4.1.1 L1 — Name what stands there, the starting position."),
    levelStep("4.2.1 L1 — Rebuild the position, 4 pieces."),
    levelStep("4.1.1 L2 — Name what stands there, 4 pieces."),
    levelStep("4.2.1 L2 — Rebuild the position, 7 pieces."),
    levelStep("4.1.1 L3 — Name what stands there, 7 pieces."),
    levelStep("4.2.1 L3 — Rebuild the position, 10 pieces."),
    levelStep("4.1.1 L4 — Name what stands there, no board once it hides."),
    levelStep("4.2.1 L4 — Rebuild the position, read in words, 4 pieces."),
    levelStep("4.2.1 L5 — Rebuild the position, read in words, 7 pieces."),
    levelStep("4.1.1 L5 — Name what stands there, read in words."),
    levelStep("4.2.1 L6 — Rebuild the position, no board until I reveal it."),
    levelStep("4.3.1 L1 — Italian Game, learn the opening."),
    levelStep("4.3.1 L2 — Italian Game, remember the position."),
    levelStep("4.3.1 L3 — Italian Game, recall by name."),
    levelStep("4.3.2 L1 — Ruy Lopez, learn the opening."),
    levelStep("4.3.2 L2 — Ruy Lopez, remember the position."),
    levelStep("4.3.2 L3 — Ruy Lopez, recall by name."),
    levelStep("4.3.3 L1 — Scotch Game, learn the opening."),
    levelStep("4.3.3 L2 — Scotch Game, remember the position."),
    levelStep("4.3.3 L3 — Scotch Game, recall by name."),
    levelStep("4.3.4 L1 — Queen's Gambit, learn the opening."),
    levelStep("4.3.4 L2 — Queen's Gambit, remember the position."),
    levelStep("4.3.4 L3 — Queen's Gambit, recall by name."),
    levelStep("4.3.5 L1 — London System, learn the opening."),
    levelStep("4.3.5 L2 — London System, remember the position."),
    levelStep("4.3.5 L3 — London System, recall by name."),
    levelStep("4.3.6 L1 — Sicilian Defense, learn the opening."),
    levelStep("4.3.6 L2 — Sicilian Defense, remember the position."),
    levelStep("4.3.6 L3 — Sicilian Defense, recall by name."),
    levelStep("4.3.7 L1 — French Defense, learn the opening."),
    levelStep("4.3.7 L2 — French Defense, remember the position."),
    levelStep("4.3.7 L3 — French Defense, recall by name."),
    levelStep("4.3.8 L1 — Caro-Kann Defense, learn the opening."),
    levelStep("4.3.8 L2 — Caro-Kann Defense, remember the position."),
    levelStep("4.3.8 L3 — Caro-Kann Defense, recall by name."),
    levelStep("4.3.9 L1 — Slav Defense, learn the opening."),
    levelStep("4.3.9 L2 — Slav Defense, remember the position."),
    levelStep("4.3.9 L3 — Slav Defense, recall by name."),
  ],
};
