// Chapter 2 — Piece movement: its sections, its challenges and its path.
//
// Source: code/blueprint/docs/piece-movement.md.

import type { Chapter } from "../../shape/index.ts";
import { levelStep } from "../path.ts";
import { challenge as c211 } from "./2.1.1/index.ts";
import { challenge as c212 } from "./2.1.2/index.ts";
import { challenge as c221 } from "./2.2.1/index.ts";
import { challenge as c231 } from "./2.3.1/index.ts";
import { challenge as c232 } from "./2.3.2/index.ts";

export const chapter: Chapter = {
  n: 2,
  name: "Piece movement",
  trains: "Each piece's moves, held in my head: where a knight lands, where a line stops, what a piece attacks, and where it may go.",
  abilities: [
    "I name every square a knight reaches, from any square, with no board, within 15 seconds. Every knight move in a blindfold game asks it, mine and my opponent's.",
    "I find a shortest knight route between two squares, with no board, around my own pawns. Every knight manoeuvre I plan blind asks it.",
    "I name the enemy pieces a rook, bishop or queen attacks, from a position given in words. After each move my opponent makes, I ask what that piece now hits.",
    "I name every piece of one side that attacks a square, or gives check, from a position given in words. Before I put a piece on a square, I ask it.",
    "I name every square a pawn or a king may move to, check included, from a position given in words. Every pawn push and every king step asks it, escaping check most of all.",
  ],
  needs: [
    "These levels of chapter 1:",
    "1.1.1 L2 — finding a square on a board with no names. Every click here asks it.",
    "1.2.1 L1 — a square's colour. A knight always lands on the other colour, and 2.1's feedback says so.",
    "1.3.1 L1 — the squares along a diagonal. A bishop's and a queen's lines build on it.",
    "1.3.1 L3 — the same, with no board, before any line is followed blind.",
    "Each card names the levels it needs. No level needs chapter 1 finished.",
  ],
  sections: [
    {
      id: "2.1",
      name: "Knight jumps",
      trains: "The squares a knight lands on, and its routes.",
      challenges: [c211, c212],
    },
    {
      id: "2.2",
      name: "Lines",
      trains: "Where a rook's, bishop's or queen's line stops, and what it hits.",
      challenges: [c221],
    },
    {
      id: "2.3",
      name: "Pieces together",
      trains: "Every piece of one side at once: who attacks a square, and where a pawn or a king may go.",
      challenges: [c231, c232],
    },
  ],
  path: [
    levelStep("2.1.1 L1 — Name the knight's squares, from the centre."),
    levelStep("2.1.1 L2 — Name the knight's squares, from any square."),
    levelStep("2.2.1 L1 — Name what it attacks, a rook or a bishop."),
    levelStep("2.3.2 L1 — Name where it may move, a pawn."),
    levelStep("2.1.1 L3 — Name the knight's squares, nothing on the board."),
    levelStep("2.1.2 L1 — Find the knight's route, 2 moves."),
    levelStep("2.2.1 L2 — Name what it attacks, the queen too."),
    levelStep("2.3.1 L1 — Name who attacks a square, 4 pieces."),
    levelStep("2.3.2 L2 — Name where it may move, a king."),
    levelStep("2.1.2 L2 — Find the knight's route, 3 moves."),
    levelStep("2.1.1 L4 — Name the knight's squares, no board."),
    levelStep("2.3.1 L2 — Name who attacks a square, 6 pieces."),
    levelStep("2.3.1 L3 — Name who attacks a square, kings' squares too."),
    levelStep("2.2.1 L3 — Name what it attacks, nothing on the board."),
    levelStep("2.3.1 L4 — Name who attacks a square, nothing on the board."),
    levelStep("2.1.2 L3 — Find the knight's route, around my pawns."),
    levelStep("2.3.2 L3 — Name where it may move, pawns and kings, check too."),
    levelStep("2.3.2 L4 — Name where it may move, nothing on the board."),
    levelStep("2.1.1 L5 — Name the knight's squares, 15 seconds."),
    levelStep("2.2.1 L4 — Name what it attacks, no board."),
    levelStep("2.1.2 L4 — Find the knight's route, nothing on the board."),
    levelStep("2.3.1 L5 — Name who attacks a square, no board."),
    levelStep("2.3.2 L5 — Name where it may move, no board."),
    levelStep("2.1.2 L5 — Find the knight's route, no board."),
    {
      kind: "mixed",
      words: "The mixed round.",
      parts: [
        { challenge: "2.1.1", level: "L5", count: 3 },
        { challenge: "2.2.1", level: "L4", count: 3 },
        { challenge: "2.3.1", level: "L5", count: 3 },
        { challenge: "2.3.2", level: "L5", count: 3 },
      ],
      order: "random",
      oneSide: false,
      questions: 12,
      minutes: 5,
      passMark: "Pass mark for the mixed round: the right answers in one round, and in each challenge's three. My practice sets it.",
    },
  ],
};
