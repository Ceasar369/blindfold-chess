// The parts of an opening's lesson screen (4.3 L1), shared by the lesson's
// Show and its move input: the strip of moves, the list the reconstruction
// keeps in front of me, the line a move is told on, and a move's explanation.
// From the winner opening-lesson g1 v1, looks 4, 7, 8 and 10. They draw what
// the core hands them, and decide nothing.

import type { Lesson, Show } from "../core.ts";

// The strip's chip says its move short: "1. e4" for White, "e5" for Black. Its
// name for a screen reader is the whole label, "1... e5".
const short = (label: string) => label.replace(/^\d+\.\.\.\s*/, "");

// The moves, each a button to watch that move. The one on screen is lit, the
// ones before it ticked.
export function Strip({ lesson, onJump }: { lesson: Lesson; onJump?: (to: number) => void }) {
  return (
    <div className="les-strip" role="group" aria-label="The moves">
      {lesson.line.map((label, k) => (
        <button
          key={label}
          type="button"
          className={`les-chip${k === lesson.at ? " on" : ""}${k < lesson.at ? " done" : ""}`}
          aria-label={label}
          aria-current={k === lesson.at ? "step" : undefined}
          onClick={() => onJump?.(k)}
        >
          {short(label)}
        </button>
      ))}
    </div>
  );
}

// The moves written out above the board: done, the one asked, the ones to come.
export function Seq({ lesson }: { lesson: Lesson }) {
  return (
    <div className="les-seq" role="list" aria-label="The moves">
      {lesson.line.map((label, k) => (
        <span key={label} role="listitem" className={k < lesson.at ? "done" : k === lesson.at ? "cur" : "todo"} aria-current={k === lesson.at ? "step" : undefined}>
          {label}
        </span>
      ))}
    </div>
  );
}

// "Yes. 1. e4." in green, or a correction in amber: a correction is never red.
export function Said({ ok, text }: { ok: boolean; text: string }) {
  return (
    <p className={`les-say ${ok ? "ok" : "no"}`} role="status">
      {text}
    </p>
  );
}

// A move shown: its label, where its piece goes, then its teaching line when it has one.
export function Explain({ show }: { show: Show }) {
  const [first, ...rest] = show.lines ?? [];
  return (
    <>
      {show.move && <p className="stepmove">{show.move}</p>}
      {first && <p className="note-line">{first}</p>}
      {rest.map((l) => (
        <p key={l} className="words">
          {l}
        </p>
      ))}
    </>
  );
}
