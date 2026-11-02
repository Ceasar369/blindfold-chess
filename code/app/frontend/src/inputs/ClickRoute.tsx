// Click in order, then Confirm, with Undo last. Each square clicked shows its
// number on the board. 2.1.2. An Ask with no board may bring one behind a
// Reveal board button: 2.1.2 L5.

import { useState } from "react";
import type { Square } from "../core.ts";
import type { InputProps } from "./frame.ts";
import { useReveal } from "./reveal.tsx";

export function ClickRoute({ ask, onAnswer, frame }: InputProps) {
  const [route, setRoute] = useState<Square[]>([]);
  const { hidden, show, button } = useReveal(ask);
  return frame(
    { order: route, show, onSquare: (sq) => setRoute((r) => [...r, sq]) },
    <div className="btns">
      {!hidden && (
        <>
          <button
            type="button"
            className="btn primary"
            disabled={route.length === 0}
            onClick={() => onAnswer({ kind: "squares", squares: route })}
          >
            Confirm
          </button>
          <button type="button" className="btn" disabled={route.length === 0} onClick={() => setRoute((r) => r.slice(0, -1))}>
            Undo last
          </button>
        </>
      )}
      {button}
    </div>,
  );
}
