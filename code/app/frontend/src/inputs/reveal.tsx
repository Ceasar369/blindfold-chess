// Reveal board: an Ask with no board may bring one behind this button, for
// click-many, click-route and place. Pressed, its board shows until the next
// Ask, which starts hidden again: 3.1.1 L6 asks four moves under one question.

import { type ReactNode, useEffect, useState } from "react";
import type { Ask, BoardView } from "../core.ts";

export function useReveal(ask: Ask): { hidden: boolean; show: BoardView | undefined; button: ReactNode } {
  const reveal = "reveal" in ask.input ? ask.input.reveal : undefined;
  const [revealed, setRevealed] = useState(false);
  useEffect(() => setRevealed(false), [ask]);
  const hidden = !!reveal && !revealed;
  return {
    hidden,
    show: revealed ? reveal : undefined,
    button: hidden && (
      <button type="button" className="btn primary" onClick={() => setRevealed(true)}>
        Reveal board
      </button>
    ),
  };
}
