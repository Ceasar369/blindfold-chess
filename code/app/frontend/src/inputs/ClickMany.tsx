// Click several, then Confirm, or the None button when the Ask names one.
// A square clicked again comes off. 1.3.1, 2.1.1, 2.2.1, 2.3.1, 2.3.2, 3.1.1.
// An Ask with no board may bring one behind a Reveal board button. A new Ask
// starts empty: 3.1.1 L6 asks each move of its line in turn, under one question.

import { useEffect, useState } from "react";
import type { Square } from "../core.ts";
import type { InputProps } from "./frame.ts";
import { useReveal } from "./reveal.tsx";

export function ClickMany({ ask, onAnswer, frame }: InputProps) {
  const [marks, setMarks] = useState<Square[]>([]);
  const { hidden, show, button } = useReveal(ask);
  const none = ask.input.how === "click-many" ? ask.input.none : null;
  useEffect(() => setMarks([]), [ask]);
  return frame(
    { marks, show, onSquare: (sq) => setMarks((m) => (m.includes(sq) ? m.filter((s) => s !== sq) : [...m, sq])) },
    <div className="btns">
      {!hidden && (
        <button
          type="button"
          className="btn primary"
          disabled={marks.length === 0}
          onClick={() => onAnswer({ kind: "squares", squares: marks })}
        >
          Confirm
        </button>
      )}
      {none && (
        <button type="button" className="btn" onClick={() => onAnswer({ kind: "none" })}>
          {none}
        </button>
      )}
      {button}
    </div>,
  );
}
