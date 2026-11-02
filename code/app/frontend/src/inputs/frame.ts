// What every answer input takes, and how it lays itself out.
//
// An input marks the board and holds its controls. It hands both to the
// frame, which the runner draws: at 1440 the board on the left, the question
// and the controls in the column on its right; at 390 the board at the top,
// then a bar holding the question and most controls. An input hands back an
// answer, and never judges it.

import type { ReactNode } from "react";
import type { Answer, Arrow, Ask, BoardView, Placed, Square, Told } from "../core.ts";
import type { Marks } from "../board/Board.tsx";

// What an input puts on the board: its marks, its own pieces, and its clicks.
// show: the board it brings when the Ask has none, once I ask for it.
// arrows: the arrows to draw, in place of the Ask's board's own; none at all
// when empty. view: a whole other board to draw, a lesson's move watched again.
export type OnBoard = Marks & {
  show?: BoardView;
  pieces?: Placed[];
  arrows?: Arrow[];
  view?: BoardView;
  onSquare?: (sq: Square) => void;
};

// An answer built key by key hands its parts apart, for the runner to place:
// on a phone, the answer so far and its send button in the bar under the
// question, the keys and the other buttons in the panel under the header; at
// 1440 all in the column, the answer first, the buttons last. From the winner
// no-typing g1 v1.
//
// An input hands its controls and its keys told or not, and never draws them
// shut itself: once told, a phone's frame keeps them drawn, dimmed and locked,
// so the page keeps its height, and a wide screen's leaves them out. The one
// exception: choices, which draw their own told state, a pick ringed or dimmed.
export type Built = { line: ReactNode; send?: ReactNode; keys: ReactNode; more?: ReactNode };

export type Frame = (board: OnBoard, controls: ReactNode, built?: Built) => ReactNode;

export type InputProps = {
  ask: Ask;
  told: Told | null; // the verdict once given: the input shows what I gave, and takes nothing more
  onAnswer: (answer: Answer) => void;
  onJump?: (to: number) => void; // a lesson's strip, and Replay: watch that move
  frame: Frame;
};
