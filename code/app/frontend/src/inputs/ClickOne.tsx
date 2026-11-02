// Click one square: one click is the answer. 1.1.1.

import { useState } from "react";
import type { Square } from "../core.ts";
import type { InputProps } from "./frame.ts";

export function ClickOne({ told, onAnswer, frame }: InputProps) {
  const [clicked, setClicked] = useState<Square | null>(null);
  return frame(
    {
      marks: clicked ? [clicked] : [],
      onSquare: told
        ? undefined
        : (sq) => {
            setClicked(sq);
            onAnswer({ kind: "squares", squares: [sq] });
          },
    },
    null,
  );
}
