// Play one move on the board shown, 4.3 L1, the lesson: pick a piece, then its
// square, and the move is the answer, with no Confirm. A click on another
// piece of the same side picks that one instead; any piece may be picked.
//
// A move that is not the lesson's stays on the board for 0.8 seconds with its
// square tinted, then the piece goes back. The core tells it in the exact words
// and reopens the question, the right move's arrow drawn at once. Try again
// clears the words and hides the arrow; Show the move draws it again.
//
// Practice (the strip of moves): Replay, Guide, and the main button, which only
// waits for the move. Reconstruction (the list of moves): Watch this move shows
// the move again on the board, with its explanation, and Show the arrow gives it
// away. Picking a piece again hides the arrow a miss brought, when no button holds it.
// From the winner opening-lesson g1 v1, looks 7, 8 and 10.
// > Stand-in. The 0.8 seconds the miss stays on the board.

import { useEffect, useRef, useState } from "react";
import type { Placed, Square } from "../core.ts";
import type { InputProps, OnBoard } from "./frame.ts";
import { Explain, Said, Seq, Strip } from "./lesson.tsx";

export function PlayMove({ ask, told, onAnswer, onJump, frame }: InputProps) {
  const lesson = ask.lesson;
  if (!lesson) throw new Error("A play-move Ask carries its lesson.");
  const start = ask.board?.pieces ?? [];
  const [picked, setPicked] = useState<Square | null>(null);
  // The move I played, on the board until the 0.8 seconds pass, and the square it was played on.
  const [played, setPlayed] = useState<{ pieces: Placed[]; bad: Square } | null>(null);
  // guide: Guide or Show the arrow holds the arrow. shown: the arrow a miss brought, or Show the move.
  const [guide, setGuide] = useState(false);
  const [shown, setShown] = useState(ask.reopened);
  const [cleared, setCleared] = useState(false); // Try again: the words are gone
  const [peek, setPeek] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  // The same question reopened after a miss: its arrow shows, its words come back.
  const [seen, setSeen] = useState(ask);
  if (seen !== ask) {
    setSeen(ask);
    setShown(ask.reopened);
    setCleared(false);
  }

  const practice = lesson.strip === true;
  const said = cleared || peek ? null : (lesson.said ?? null);
  // Practice offers Try again and Show the move after a miss, until Try again.
  const buttons = practice && said !== null && !said.ok;

  const pick = (sq: Square) => {
    setPicked(sq);
    if (!buttons && !guide) setShown(false);
  };
  const attempt = (from: Square, to: Square) => {
    const mine = start.find((p) => p.square === from);
    if (!mine) return;
    setPicked(null);
    setPlayed({ pieces: [...start.filter((p) => p !== mine && p.square !== to), { ...mine, square: to }], bad: to });
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setPlayed(null), 800);
    onAnswer({ kind: "move", from, to });
  };
  const onSquare = (sq: Square) => {
    if (played) return;
    const here = start.find((p) => p.square === sq);
    const mine = picked ? start.find((p) => p.square === picked) : undefined;
    if (!mine) {
      if (here) pick(sq);
    } else if (sq === picked) {
      setPicked(null);
    } else if (here && here.side === mine.side) {
      pick(sq);
    } else {
      attempt(mine.square, sq);
    }
  };

  const arrows = (guide || shown) && !peek ? (lesson.guide ?? []) : [];
  const on: OnBoard = peek && lesson.watch?.board ? { view: lesson.watch.board } : { pieces: played?.pieces, bad: played?.bad ?? null, arrows, selected: picked, onSquare };

  const line = !told && said && <Said {...said} />;
  // The main button sits at the bar's right on a phone: it fills the bar alone, and shares it with a line.
  const button = (words: string, click: () => void, disabled = false, go = false) => (
    <button type="button" className={`btn${go ? " les-go" : ""}`} disabled={disabled} onClick={click}>
      {words}
    </button>
  );

  if (practice)
    return frame(on, null, {
      line,
      send: (
        <button type="button" className="btn primary les-go" disabled>
          Play the move
        </button>
      ),
      keys: <Strip lesson={lesson} onJump={onJump} />,
      more: (
        <>
          {button("Replay", () => onJump?.(lesson.at))}
          {button(guide ? "Hide guide" : "Guide", () => setGuide(!guide))}
          {buttons && (
            <>
              {button("Try again", () => {
                setCleared(true);
                setShown(false);
              })}
              {button("Show the move", () => setShown(true), shown)}
            </>
          )}
        </>
      ),
    });

  return frame(on, null, {
    line,
    send: button(peek ? "Back to my turn" : "Watch this move", () => setPeek(!peek), false, true),
    keys: (
      <>
        <Seq lesson={lesson} />
        {peek && lesson.watch && <Explain show={lesson.watch} />}
      </>
    ),
    more: button(guide ? "Arrow shown" : "Show the arrow", () => setGuide(true), peek || guide),
  });
}
