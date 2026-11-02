// The keypad: a file a to h, then a rank 1 to 8, make a square, with no
// board. One square is the answer at once, two clicks: 1.1.2. Several add up,
// a square tapped again coming off, then Confirm; or a route adds up in order,
// then Confirm: the trials page only. Undo last, and the None button when the
// Ask names one. Every file and rank is always on offer,
// so none hints at the answer. From the winner no-typing g1 v1, look 1.

import { useEffect, useState } from "react";
import type { File, Square } from "../core.ts";
import type { InputProps } from "./frame.ts";
import { Line, SquareKeys } from "./keys.tsx";

export function Keypad({ ask, told, onAnswer, frame }: InputProps) {
  const many = ask.input.how === "keypad" ? ask.input.many : "one";
  const none = ask.input.how === "keypad" ? ask.input.none : null;
  const [file, setFile] = useState<File | null>(null);
  const [list, setList] = useState<Square[]>([]);
  const [gave, setGave] = useState<string | null>(null);

  // A new Ask under the same question starts empty: 3.1.1 L6 asks each move
  // of its line in turn, under one question.
  useEffect(() => {
    setFile(null);
    setList([]);
    setGave(null);
  }, [ask]);

  const send = (squares: Square[]) => {
    setGave(squares.join(" "));
    onAnswer({ kind: "squares", squares });
  };
  const add = (sq: Square) => {
    setFile(null);
    if (many === "one") return send([sq]);
    setList((l) => (many === "set" && l.includes(sq) ? l.filter((s) => s !== sq) : [...l, sq]));
  };

  const chips = list.map((sq, i) => (
    <span key={`${i}${sq}`} className="nt-chip">
      {many === "route" && <small>{i + 1}</small>}
      {sq}
    </span>
  ));
  const line = (
    <Line empty="Your answer" told={told}>
      {told ? gave : chips.length || file ? [...chips, file && <span key="file" className="nt-chip wait">{file}…</span>] : null}
    </Line>
  );

  return frame({}, null, {
    line,
    send: many !== "one" && (
      <button type="button" className="btn primary" disabled={list.length === 0} onClick={() => send(list)}>
        Confirm
      </button>
    ),
    keys: <SquareKeys file={file} onFile={setFile} onRank={(r) => add(`${file}${r}` as Square)} />,
    more: (
      <>
        {none && (
          <button
            type="button"
            className="btn"
            onClick={() => {
              setGave(none);
              onAnswer({ kind: "none" });
            }}
          >
            {none}
          </button>
        )}
        <button type="button" className="btn" disabled={!file && list.length === 0} onClick={() => (file ? setFile(null) : setList((l) => l.slice(0, -1)))}>
          Undo last
        </button>
      </>
    ),
  });
}
