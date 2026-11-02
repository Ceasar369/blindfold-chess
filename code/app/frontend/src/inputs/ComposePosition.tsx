// The position composer, with no board: a piece from 4.2.1's palette, which
// stays picked, then a file and a rank, place it. A square placed again takes
// the new piece. Each side's pieces show as a list; one tapped comes off.
// Confirm sends the whole position. The trials page only. From the winner
// no-typing g1 v1, look 6.

import { useState } from "react";
import { Glyph } from "../board/Board.tsx";
import type { File, Kind, Placed, Side, Square } from "../core.ts";
import type { InputProps } from "./frame.ts";
import { Line, SquareKeys } from "./keys.tsx";

const KINDS: Kind[] = ["king", "queen", "rook", "bishop", "knight", "pawn"];
const SIDES: Side[] = ["white", "black"];
const cap = (s: string) => s[0]!.toUpperCase() + s.slice(1);

export function ComposePosition({ told, onAnswer, frame }: InputProps) {
  const [pieces, setPieces] = useState<Placed[]>([]);
  const [pen, setPen] = useState<{ side: Side; kind: Kind } | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const n = pieces.length;

  const line = (
    <Line empty="Your position" told={told}>
      {n ? `${n} ${n === 1 ? "piece" : "pieces"} placed` : null}
    </Line>
  );

  const keys = (
    <div className="nt-pad">
      {SIDES.map((side) => (
        <div key={side} className="nt-side">
          <p className="nt-cap">{cap(side)}</p>
          <div className="nt-chips">
            {pieces
              .filter((p) => p.side === side)
              .sort((a, b) => KINDS.indexOf(a.kind) - KINDS.indexOf(b.kind))
              .map((p) => (
                <button
                  key={p.square}
                  type="button"
                  className="nt-chip nt-off"
                  aria-label={`Take off ${cap(side)}'s ${p.kind} on ${p.square}`}
                  onClick={() => setPieces((l) => l.filter((x) => x !== p))}
                >
                  {p.kind} {p.square} <small>✕</small>
                </button>
              ))}
          </div>
        </div>
      ))}
      <div className="palette">
        {SIDES.map((side) => (
          <div key={side} className="prow">
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
        ))}
      </div>
      <SquareKeys
        file={file}
        off={!pen}
        onFile={setFile}
        onRank={(r) => {
          const square = `${file}${r}` as Square;
          setFile(null);
          setPieces((l) => [...l.filter((x) => x.square !== square), { ...pen!, square }]);
        }}
      />
    </div>
  );

  return frame({}, null, {
    line,
    send: (
      <button type="button" className="btn primary" disabled={n === 0} onClick={() => onAnswer({ kind: "position", pieces })}>
        Confirm
      </button>
    ),
    keys,
  });
}
