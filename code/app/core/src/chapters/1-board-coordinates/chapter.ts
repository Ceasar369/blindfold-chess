// Chapter 1 — Board coordinates: its sections, its challenges and its path.
//
// Source: code/blueprint/docs/board-coordinates.md.

import type { Chapter, MixedPart } from "../../shape/index.ts";
import { levelStep } from "../path.ts";
import { challenge as c111 } from "./1.1.1/index.ts";
import { challenge as c112 } from "./1.1.2/index.ts";
import { challenge as c121 } from "./1.2.1/index.ts";
import { challenge as c131 } from "./1.3.1/index.ts";

// A challenge's part of the mixed round: its questions from L1, L2, L3 and so on.
const share = (challenge: string, perLevel: number[]): MixedPart[] =>
  perLevel.map((count, i) => ({ challenge, level: `L${i + 1}`, count }));

export const chapter: Chapter = {
  n: 1,
  name: "Board coordinates",
  trains: "The board's map, held in my head: where each square sits, its name, its colour, its diagonals.",
  abilities: [
    "I find any square named to me on a blank board within 2 seconds. Every move in a blindfold game names a square I must place.",
    "I name any square I picture within 5 seconds. Every move I make in a blindfold game, I say by its square.",
    "I name any square's colour within 2 seconds, with no board. Every bishop move in a blindfold game asks it.",
    "I name the squares between two squares on one diagonal, with no board, or know they share none. Every check, pin and block along a diagonal asks it.",
  ],
  needs: ["Nothing. The course starts here."],
  sections: [
    {
      id: "1.1",
      name: "The squares",
      trains: "Where each square sits, and what it is called.",
      challenges: [c111, c112],
    },
    {
      id: "1.2",
      name: "Square colours",
      trains: "Each square's colour, from its name alone.",
      challenges: [c121],
    },
    {
      id: "1.3",
      name: "Diagonals",
      trains: "The squares a diagonal runs through.",
      challenges: [c131],
    },
  ],
  path: [
    levelStep("1.1.1 L1 — Find the square, names on the edge."),
    levelStep("1.1.1 L2 — Find the square, no names."),
    levelStep("1.2.1 L1 — Name the colour."),
    levelStep("1.1.2 L1 — Name the square, from four choices."),
    levelStep("1.1.2 L2 — Name the square, on the keypad."),
    levelStep("1.2.1 L2 — Name the colour, 2 seconds."),
    levelStep("1.3.1 L1 — Name the squares between, both lit."),
    levelStep("1.1.2 L3 — Name the square, 5 seconds."),
    levelStep("1.3.1 L2 — Name the squares between, nothing lit."),
    levelStep("1.1.1 L3 — Find the square, 2 seconds."),
    levelStep("1.3.1 L3 — Name the squares between, no board."),
    {
      kind: "mixed",
      words: "The mixed round.",
      // 4 from 1.1.1, 4 from 1.1.2, 7 from 1.2.1, 8 from 1.3.1: every level
      // at least once, the extra questions on the later levels.
      parts: [
        ...share("1.1.1", [1, 1, 2]),
        ...share("1.1.2", [1, 1, 2]),
        ...share("1.2.1", [3, 4]),
        ...share("1.3.1", [2, 3, 3]),
      ],
      order: "random",
      oneSide: false,
      questions: 23,
      minutes: 5,
      passMark: "Pass mark for the mixed round: the right answers in one round, and in each challenge's share. My practice sets it.",
    },
  ],
};
