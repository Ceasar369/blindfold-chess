// The move composer: a move built key by key, as it is written, then Confirm.
// K Q R B N, x, + and #; the files; the ranks; both
// castlings, = and Delete. Every key is always on, never only the legal
// moves, so the keys hint at nothing and the notation stays mine to know.
// Each new Ask starts it empty: a move refused, "Not counted…", never
// waits there to be deleted key by key. Once told, its keys stay, locked by
// the frame. 3.2.1, 6.1.1, 6.2.1, 6.3.1. From the
// winner no-typing g1 v1, look 4.
//
// 6.3.1 adds one row under the pad: a button per hint the Ask offers, with
// its cost, then Resign. A hint costing more than the points left is off. The
// square hint takes its square from the keypad's two rows. Resign asks once
// more: a slipped thumb would end the game. Look 9.
// > Stand-in. A level with no hint shows Resign alone in the row.

import { useEffect, useState } from "react";
import type { File, HintKind, Square } from "../core.ts";
import type { InputProps } from "./frame.ts";
import { FILES, Keys, Line, RANKS, SquareKeys } from "./keys.tsx";

const PIECES = ["K", "Q", "R", "B", "N", "x", "+", "#"];
const HINT_WORDS: Record<HintKind, string> = { square: "Square", last: "Last moves", board: "Board" };
const points = (n: number) => `${n} ${n === 1 ? "point" : "points"}`;

export function ComposeMove({ ask, told, onAnswer, frame }: InputProps) {
  const input = ask.input.how === "compose-move" ? ask.input : null;
  const hints = input?.hints ?? [];
  const left = ask.tally?.hints?.left ?? 0;
  const [tokens, setTokens] = useState<string[]>([]);
  const [mode, setMode] = useState<"move" | "square" | "resign">("move");
  const [file, setFile] = useState<File | null>(null);
  const text = tokens.join("");
  const add = (t: string) => setTokens((x) => [...x, t]);

  useEffect(() => {
    setTokens([]);
    setMode("move");
    setFile(null);
  }, [ask]);

  const line = (
    <Line empty="Your move" told={told} move>
      {text}
    </Line>
  );
  // Once told, the keys show as they are at rest: the frame locks them, and
  // a hint's keypad or Resign's question I left open is not drawn.
  const at = told ? "move" : mode;

  const pad = (
    <div className="nt-pad">
      <Keys keys={PIECES} on={add} label="Pieces, capture and signs" />
      <Keys keys={FILES} on={add} label="Files" />
      <Keys keys={RANKS} on={add} label="Ranks" />
      <div className="nt-keys">
        <button type="button" className="choice nt-key span2" onClick={() => add("O-O")}>
          O-O
        </button>
        <button type="button" className="choice nt-key span3" onClick={() => add("O-O-O")}>
          O-O-O
        </button>
        <button type="button" className="choice nt-key" onClick={() => add("=")}>
          =
        </button>
        <button type="button" className="choice nt-key span2" aria-label="Delete" disabled={!text} onClick={() => setTokens((x) => x.slice(0, -1))}>
          ⌫
        </button>
      </div>
    </div>
  );

  const squareHint = (
    <div className="nt-pad">
      <p className="nt-cap">Hint: which square? {points(hints.find((h) => h.hint === "square")?.cost ?? 0)}.</p>
      <SquareKeys
        file={file}
        onFile={setFile}
        onRank={(r) => {
          setFile(null);
          setMode("move");
          onAnswer({ kind: "hint", hint: "square", square: `${file}${r}` as Square });
        }}
      />
      <div className="btns">
        <button type="button" className="btn" onClick={() => setMode("move")}>
          Cancel
        </button>
      </div>
    </div>
  );

  const game = input?.resign && (
    <>
      <div className="nt-hints" role="group" aria-label={hints.length ? `Hints, ${points(left)} left, and Resign` : "Resign"}>
        {hints.map((h) => (
          <button
            key={h.hint}
            type="button"
            className="btn sm nt-hint"
            aria-label={`${HINT_WORDS[h.hint]}, ${points(h.cost)}`}
            disabled={h.cost > left || mode !== "move"}
            onClick={() => (h.hint === "square" ? setMode("square") : onAnswer({ kind: "hint", hint: h.hint }))}
          >
            <span>{HINT_WORDS[h.hint]}</span>
            <small>{points(h.cost)}</small>
          </button>
        ))}
        <button type="button" className="btn sm nt-hint nt-red" disabled={mode !== "move"} onClick={() => setMode("resign")}>
          <span>Resign</span>
        </button>
      </div>
      {at === "resign" && (
        <div className="nt-ask">
          <p>Resign this game?</p>
          <div className="btns">
            <button type="button" className="btn nt-red" onClick={() => onAnswer({ kind: "resign" })}>
              Yes, resign
            </button>
            <button type="button" className="btn" onClick={() => setMode("move")}>
              Keep playing
            </button>
          </div>
        </div>
      )}
    </>
  );

  return frame({}, null, {
    line,
    send: (
      <button type="button" className="btn primary" disabled={!text || mode !== "move"} onClick={() => onAnswer({ kind: "text", text })}>
        Confirm
      </button>
    ),
    keys: (
      <>
        {at === "square" ? squareHint : pad}
        {game}
      </>
    ),
  });
}
