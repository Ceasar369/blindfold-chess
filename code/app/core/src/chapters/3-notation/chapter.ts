// Chapter 3 — Notation: its sections, its challenges and its path.
//
// Source: code/blueprint/docs/notation.md.

import type { Chapter } from "../../shape/index.ts";
import { levelStep } from "../path.ts";
import { challenge as c311 } from "./3.1.1/index.ts";
import { challenge as c321 } from "./3.2.1/index.ts";

export const chapter: Chapter = {
  n: 3,
  name: "Notation",
  trains: "A move's written form, read and written: the squares a few letters change, and the letters a move of mine needs.",
  abilities: [
    "I name every square a move in notation changes, from a position given in words: castling, promotion and a pawn taken in passing included. Every move my opponent makes in a blindfold game reaches me this way.",
    "I follow a real game's numbered moves, such as 3... cxd4 4. Nxd4 Nf6 5. Nc3, from its position in words, telling White's moves from Black's. Every game record and every line of moves I am given reads this way.",
    "I write any move of mine in notation, from a position given in words: its letter, a capture's file, castling, promotion, which of two pieces goes, and its check or mate sign. Every move I make in a blindfold game leaves me this way.",
  ],
  needs: [
    "These levels of chapters 1 and 2:",
    "1.1.1 L2 — finding a square on a board with no names.",
    "1.1.2 L2 — naming a square on the keypad, file then rank. Every move composer answer here holds squares.",
    "2.1.1 L2 — a knight's squares. The position tells which knight a move names.",
    "2.2.1 L2 — where a rook's, bishop's or queen's line stops. The same, for those pieces.",
    "2.3.2 L1 — where a pawn may move. e4 can come from e2 or from e3.",
    "2.3.1 L3 — who attacks a king's square. Writing + asks whether my move gives check.",
    "2.3.2 L3 — where a checked king may go. Writing # asks whether it can go anywhere.",
    "2.1.1 L4, 2.2.1 L4, 2.3.1 L5 and 2.3.2 L5 — the same four, with no board, before this chapter's no-board levels.",
    "Each card names the levels it needs. No level needs chapter 2 finished.",
  ],
  sections: [
    {
      id: "3.1",
      name: "Reading moves",
      trains: "From a move's notation to the squares it changes: one move, then a numbered sequence.",
      challenges: [c311],
    },
    {
      id: "3.2",
      name: "Writing moves",
      trains: "From a move to its notation.",
      challenges: [c321],
    },
  ],
  path: [
    levelStep("3.1.1 L1 — Read the move, without captures."),
    levelStep("3.2.1 L1 — Write the move, from four choices."),
    levelStep("3.1.1 L2 — Read the move, captures too."),
    levelStep("3.2.1 L2 — Write the move, on the move composer, captures too."),
    levelStep("3.1.1 L3 — Read the move, castling, promotion and in passing too."),
    levelStep("3.2.1 L3 — Write the move, castling, promotion and in passing too."),
    levelStep("3.1.1 L4 — Read the move, two pieces told apart."),
    levelStep("3.2.1 L4 — Write the move, two pieces told apart, signs judged."),
    levelStep("3.1.1 L5 — Read the move, no board."),
    levelStep("3.2.1 L5 — Write the move, no board."),
    levelStep("3.1.1 L6 — Read a numbered sequence, no board."),
    {
      kind: "mixed",
      words: "The mixed round.",
      parts: [
        { challenge: "3.1.1", level: "L5", count: 5 },
        { challenge: "3.2.1", level: "L5", count: 5 },
      ],
      order: "turns",
      oneSide: true,
      questions: 10,
      minutes: 5,
      passMark: "Pass mark for the mixed round: the right answers in one round, and in each challenge's five. My practice sets it.",
    },
  ],
};
