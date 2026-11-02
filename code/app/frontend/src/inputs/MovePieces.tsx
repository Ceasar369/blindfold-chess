// Move pieces from the position shown, the starting position in 4.3 and
// 5.2.1: pick a piece, then its square; a piece there is taken. A click on
// another piece of the same side picks that one instead. Take off removes the
// piece picked; Reset puts the board back. Castling is the king and the rook
// moved by hand. Confirm sends the whole position.
//
// Where the Ask says it promotes (5.2.1), a pawn moved onto its last rank
// asks which piece it becomes, Queen, Rook, Bishop or Knight, and becomes it.
// > Stand-in. A click on the board, while that is asked, drops the question
// > and counts as the click it is: the pawn, still picked, goes where it is
// > clicked, or another piece is picked.

import { useState } from "react";
import type { Kind, Placed, Square } from "../core.ts";
import type { InputProps } from "./frame.ts";

const BECOMES: { kind: Kind; words: string }[] = [
  { kind: "queen", words: "Queen" },
  { kind: "rook", words: "Rook" },
  { kind: "bishop", words: "Bishop" },
  { kind: "knight", words: "Knight" },
];

export function MovePieces({ ask, onAnswer, frame }: InputProps) {
  const start = ask.board?.pieces ?? [];
  const promotes = ask.input.how === "move" && ask.input.promotes === true;
  const [pieces, setPieces] = useState<Placed[]>(start);
  const [picked, setPicked] = useState<Square | null>(null);
  // The pawn moved onto its last rank, and the square it moved to, until I say what it becomes.
  const [promoting, setPromoting] = useState<{ pawn: Placed; square: Square } | null>(null);

  const onSquare = (sq: Square) => {
    setPromoting(null);
    const here = pieces.find((p) => p.square === sq);
    const mine = picked ? pieces.find((p) => p.square === picked) : undefined;
    if (!mine) {
      if (here) setPicked(sq);
    } else if (sq === picked) {
      setPicked(null);
    } else if (here && here.side === mine.side) {
      setPicked(sq);
    } else if (promotes && mine.kind === "pawn" && sq[1] === (mine.side === "white" ? "8" : "1")) {
      setPromoting({ pawn: mine, square: sq });
    } else {
      setPieces([...pieces.filter((p) => p !== mine && p !== here), { ...mine, square: sq }]);
      setPicked(null);
    }
  };

  const become = (kind: Kind) => {
    if (!promoting) return;
    const { pawn, square } = promoting;
    setPieces([...pieces.filter((p) => p !== pawn && p.square !== square), { side: pawn.side, kind, square }]);
    setPicked(null);
    setPromoting(null);
  };

  return frame(
    { pieces, selected: picked, onSquare },
    promoting ? (
      <div>
        <p className="note-line">Which piece does the pawn on {promoting.square} become?</p>
        <div className="btns">
          {BECOMES.map(({ kind, words }) => (
            <button key={kind} type="button" className="btn primary" onClick={() => become(kind)}>
              {words}
            </button>
          ))}
        </div>
      </div>
    ) : (
      <div className="btns">
        <button type="button" className="btn primary" onClick={() => onAnswer({ kind: "position", pieces })}>
          Confirm
        </button>
        <button
          type="button"
          className="btn"
          disabled={!picked}
          onClick={() => {
            setPieces(pieces.filter((p) => p.square !== picked));
            setPicked(null);
          }}
        >
          Take off
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => {
            setPieces(start);
            setPicked(null);
          }}
        >
          Reset
        </button>
      </div>
    ),
  );
}
