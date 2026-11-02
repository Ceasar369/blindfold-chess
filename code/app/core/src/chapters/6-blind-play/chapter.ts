// Chapter 6 — Blind play: its sections, its challenges and its path.
// No round mixes its three challenges.
//
// Source: code/blueprint/docs/blind-play.md.

import type { Chapter } from "../../shape/index.ts";
import { levelStep } from "../path.ts";
import { challenge as c611 } from "./6.1.1/index.ts";
import { challenge as c621 } from "./6.2.1/index.ts";
import { challenge as c631 } from "./6.3.1/index.ts";

export const chapter: Chapter = {
  n: 6,
  name: "Blind play",
  trains: "My own moves, chosen with no board: the win a position holds, an endgame played to its end, and a whole game against a bot.",
  // > Stand-in. The chapter screen shows "What I can do at the end", word for
  // > word, each item of the page's list one line.
  abilities: [
    "I find the winning move, a mate in one, a mate in two or a fork, in a real puzzle position of up to 7 pieces besides the kings, read once in words, after my opponent's move shown once. Every move my opponent makes in a blindfold game may leave a win, and I must see it with no board.",
    "I mate with a king and a queen, or a king and a rook, against a lone king that defends as well as it can, from the position read once, without stalemate. A won blindfold game ends this way.",
    "I take a king and a pawn against a lone king to a queen, from a position read once, where the position is won. A blindfold endgame often comes down to one pawn.",
    "I play a whole game against a bot from the starting position, each move shown once, with no hint and no illegal move, as White or as Black. That is my goal's first half: a full blindfold game against a bot.",
  ],
  needs: [
    "These levels of chapters 1 to 5:",
    "1.1.1 L2 — finding a square on a board with no names.",
    "2.3.1 L3 — who attacks a king's square. A check and a mate are attacks on a king.",
    "2.3.2 L3 — where a checked king may go. A mate leaves it nowhere, a stalemate leaves an unchecked king nowhere.",
    "2.2.1 L4 — a position in words that stays on screen. 6.1.1 L4 and 6.2.1 L2 give one.",
    "3.1.1 L4 — reading a move, two pieces told apart included. 6.1.1 L1 offers moves as choices.",
    "3.1.1 L6 — words renewed after each move. 6.2.1 L2 and 6.3.1 L1 renew them so.",
    "3.2.1 L4 and L5 — writing my move, with a board and without. Every answer here is my move.",
    "4.1.1 L5 — a real position of 7 pieces besides the kings, read once in words, held. 6.1.1 L5 asks the same hold.",
    "4.2.1 L4 — a small position read in words, then hidden. Every endgame here starts so from 6.2.1 L3.",
    "5.1.1 L2 — a move shown once, with no board, changing a position I hold. Every opponent's move here comes so.",
    "5.2.1 L5 — a game held through move 10, each move shown once. A whole game starts there.",
    "Each card names the levels it needs. Only 6.3.1's whole games, from L3, need chapter 5 finished: 5.2.1 L5 is its last step.",
  ],
  sections: [
    {
      id: "6.1",
      name: "Tactics",
      trains: "The move that wins, found in a position I hold.",
      challenges: [c611],
    },
    {
      id: "6.2",
      name: "Endgames",
      trains: "A small won endgame, played to its end against the best defence.",
      challenges: [c621],
    },
    {
      id: "6.3",
      name: "Games",
      trains: "A game against a bot, from a small real position, then from the start.",
      challenges: [c631],
    },
  ],
  path: [
    levelStep("6.1.1 L1 — Find the winning move, a mate in one, from four choices."),
    levelStep("6.1.1 L2 — Find the winning move, a mate in one, on the move composer."),
    levelStep("6.2.1 L1 — Play out the endgame, king and queen, on a board."),
    levelStep("6.1.1 L3 — Find the winning move, two moves too."),
    levelStep("6.2.1 L2 — Play out the endgame, king and queen, in words."),
    levelStep("6.1.1 L4 — Find the winning move, in words on screen."),
    levelStep("6.2.1 L3 — Play out the endgame, king and queen, held."),
    levelStep("6.3.1 L1 — Play the game, from 6 pieces, in words."),
    levelStep("6.2.1 L4 — Play out the endgame, king and rook, in words."),
    levelStep("6.1.1 L5 — Find the winning move, held, after my opponent's move."),
    levelStep("6.2.1 L5 — Play out the endgame, king and rook, held."),
    levelStep("6.3.1 L2 — Play the game, from 6 pieces, held, with hints."),
    levelStep("6.2.1 L6 — Play out the endgame, king and pawn, held."),
    levelStep("6.3.1 L3 — Play the game, whole, as White, with hints."),
    levelStep("6.3.1 L4 — Play the game, whole, as Black, with hints."),
    levelStep("6.3.1 L5 — Play the game, whole, either side, the even bot, with hints."),
    levelStep("6.3.1 L6 — Play the game, whole, either side, the even bot, no hint."),
  ],
  // > Stand-in, the page's own, after its path: playing people, my goal's
  // > last step: where, against whom, and from when. I answer it later, with
  // > session 10. It happens outside the app: no step of the path holds it.
};
