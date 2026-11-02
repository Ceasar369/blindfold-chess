// Place pieces: a palette of the twelve pieces. Pick one, then click squares
// to place it; a placed piece clicked again comes off. Confirm sends the
// whole position. 4.2.1. An Ask with no board may bring one behind a Reveal
// board button: 4.2.1 L6.

import { useState } from "react";
import { Glyph } from "../board/Board.tsx";
import type { Kind, Placed, Side } from "../core.ts";
import type { InputProps } from "./frame.ts";
import { useReveal } from "./reveal.tsx";

const KINDS: Kind[] = ["king", "queen", "rook", "bishop", "knight", "pawn"];
const SIDES: Side[] = ["white", "black"];
const cap = (s: string) => s[0]!.toUpperCase() + s.slice(1);

export function Place({ ask, onAnswer, frame }: InputProps) {
  const [pieces, setPieces] = useState<Placed[]>(ask.board?.pieces ?? []);
  const [pen, setPen] = useState<{ side: Side; kind: Kind } | null>(null);
  const { hidden, show, button } = useReveal(ask);
  if (hidden) return frame({}, <div className="btns">{button}</div>);
  return frame(
    {
      pieces,
      show,
      onSquare: (sq) => {
        const here = pieces.find((p) => p.square === sq);
        if (here) setPieces(pieces.filter((p) => p !== here));
        else if (pen) setPieces([...pieces, { ...pen, square: sq }]);
      },
    },
    <>
      <div className="palette">
        {SIDES.map((side) => (
          <div key={side}>
            <p className="muted small">{cap(side)}</p>
            <div className="prow">
              {KINDS.map((kind) => {
                const on = pen?.side === side && pen.kind === kind;
                return (
                  <button
                    key={kind}
                    type="button"
                    className={`pbtn${on ? " on" : ""}`}
                    aria-label={`${cap(side)} ${kind}`}
                    aria-pressed={on}
                    onClick={() => setPen(on ? null : { side, kind })}
                  >
                    <Glyph side={side} kind={kind} />
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="btns">
        <button
          type="button"
          className="btn primary"
          disabled={pieces.length === 0}
          onClick={() => onAnswer({ kind: "position", pieces })}
        >
          Confirm
        </button>
      </div>
    </>,
  );
}
