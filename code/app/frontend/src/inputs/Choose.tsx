// Pick one choice: each choice a button; a pick is the answer, carrying the
// choice's value, never its words. 1.1.2, 1.2.1, 3.2.1, 4.1.1, 5.1.1, 6.1.1.
//
// A choice that carries a piece, or Empty (the thirteen of 4.1.1 and 5.1.1), is
// drawn as a piece card instead, from the winner answer-cards g1 v1, look 2
// (and piece-cards g2 v1, looks 1, 7, 9 and 10, whose file was deleted once
// built; git keeps it): White's six over Black's six, in the order king, queen,
// rook, bishop, knight, pawn, Empty one tall tile at their right end, at every
// width. A card is named by its words for a screen reader. A card never says
// which is right before I pick. After my pick it keeps its tile and gains a
// ring and a badge: a check if right, a cross if wrong; after a wrong pick the
// right card is ringed too, with a check; the others dim.

import { type ReactNode, useState } from "react";
import { Glyph } from "../board/Board.tsx";
import type { Choice, Side, Told } from "../core.ts";
import type { InputProps } from "./frame.ts";

const SIDES: Side[] = ["white", "black"];

// Whether these choices draw as piece cards. The runner reads it too, to seat
// them in the question's bar on a phone.
export const asCards = (choices: Choice[]) => choices.length > 0 && choices.every((c) => c.stands !== undefined);

export function Choose({ ask, told, onAnswer, frame }: InputProps) {
  const [picked, setPicked] = useState<string | null>(null);
  const choices: Choice[] = ask.input.how === "choose" ? ask.input.choices : [];
  const pick = (value: string) => {
    setPicked(value);
    onAnswer({ kind: "choice", value });
  };
  if (asCards(choices)) {
    return frame({}, <PieceCards choices={choices} picked={picked} told={told} onPick={pick} />);
  }
  const verdict = told ? (told.verdict === "right" ? " right" : " wrong") : "";
  return frame(
    {},
    <div className="choices">
      {choices.map((c) => (
        <button
          key={c.value}
          type="button"
          className={`choice${told && picked === c.value ? verdict : ""}${told && picked !== c.value ? " rest" : ""}`}
          disabled={!!told}
          onClick={() => pick(c.value)}
        >
          {c.words}
        </button>
      ))}
    </div>,
  );
}

// How a card stands once I have answered: the card I picked, right or wrong; after
// a wrong pick, the right card; every other card rests.
function stateOf(c: Choice, picked: string | null, told: Told | null): "" | "right" | "wrong" | "show" | "rest" {
  if (!told) return "";
  if (c.value === picked) return told.verdict === "right" ? "right" : "wrong";
  return told.verdict !== "right" && c.value === told.rightChoice ? "show" : "rest";
}

// One grid of seven columns: a side's six cards in a row, Empty in the seventh
// column across both rows. Each side's group has no box of its own, for a screen
// reader's label alone.
function PieceCards({ choices, picked, told, onPick }: { choices: Choice[]; picked: string | null; told: Told | null; onPick: (value: string) => void }) {
  const card = (c: Choice, className: string, face: ReactNode) => {
    const state = stateOf(c, picked, told);
    return (
      <button key={c.value} type="button" className={`pk ${className}${state ? ` ${state}` : ""}`} aria-label={c.words} disabled={!!told} onClick={() => onPick(c.value)}>
        {face}
        {(state === "right" || state === "show") && (
          <span className="pk-bdg ok" aria-hidden="true">
            ✓
          </span>
        )}
        {state === "wrong" && (
          <span className="pk-bdg no" aria-hidden="true">
            ✕
          </span>
        )}
      </button>
    );
  };
  const empty = choices.filter((c) => c.stands === null);
  return (
    <div className="choices pk-picker">
      {SIDES.map((side) => (
        <div key={side} className="pk-side" role="group" aria-label={`${side === "white" ? "White" : "Black"}'s pieces`}>
          {choices.filter((c) => c.stands?.side === side).map((c) => card(c, `s-${side[0]}`, <Glyph side={c.stands!.side} kind={c.stands!.kind} />))}
        </div>
      ))}
      {empty.map((c) =>
        card(
          c,
          "pk-empty",
          <>
            <span className="pk-pair" aria-hidden="true">
              <i className="l" />
              <i className="d" />
            </span>
            <span aria-hidden="true">Empty</span>
          </>,
        ),
      )}
    </div>
  );
}
