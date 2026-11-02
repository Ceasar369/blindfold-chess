// The step screen's parts around the header, from the winner, step-screen g2
// v1: the Black banner, the level's note, the question's big countdown and the
// look time. The banner is from phone-verdict g1 v1, look 4.

import { Glyph } from "../board/Board.tsx";
import type { Check, Show } from "../core.ts";
import { bannerWords, clock, type Note, type Seat } from "./header.ts";

// Black is told as a strip: the king's tile, "You play Black" and the level's
// reason. Under the board on a phone, at the top of the column on a wide
// screen. It never says the board is flipped: a board always faces White.
export function Banner({ seat }: { seat: Seat }) {
  const w = bannerWords(seat);
  return (
    <div className="sx-bn">
      <span className="sx-bt">
        <Glyph side="black" kind="king" />
      </span>
      <div className="sx-bw">
        <div className="sx-bh">{w.head}</div>
        <div className="sx-bs">{w.reason}</div>
      </div>
    </div>
  );
}

// > Stand-in. A level's note: what the level adds, said plainly.
export function NoteView({ note }: { note: Note }) {
  return (
    <div className={`sx-nt${note.wide ? " dskb" : ""}`}>
      <b>{note.tag}</b>
      <span>{note.text}</span>
    </div>
  );
}

// A king question whose king stands in check says so, and from where, as the
// core hands it: "The king on e8 is in check, from the rook on e4." Red is the
// app's own. Above the question at 1440, as the winner draws its notes; under
// the board on a phone, so the board keeps its place.
export function CheckNote({ check }: { check: Check }) {
  const from = check.from.map((p) => `the ${p.kind} on ${p.square}`);
  const by = from.length < 2 ? from.join("") : `${from.slice(0, -1).join(", ")} and ${from[from.length - 1]}`;
  return (
    <div className="sx-nt red" role="note">
      <b>Check</b>
      <span>
        The king on {check.king} is in check, from {by}.
      </span>
    </div>
  );
}

// > Stand-in. The question's big countdown, on the right of a wide screen. A
// > phone shows its seconds in the question's bar instead, Runner.tsx's. The
// > round's clock stays in the header.
export function Meter({ left, of }: { left: number; of: number }) {
  return (
    <div className={`timer sx-mt${left < of / 3 ? " low" : ""}`} role="timer" aria-label="Time left on this question">
      <span className="sx-ml">Time for this question</span>
      <span className="sx-mn">
        {Math.max(0, left).toFixed(1)}
        <small>s</small>
      </span>
      <span className="sx-mb">
        <i style={{ width: `${Math.max(0, Math.min(1, left / of)) * 100}%` }} />
      </span>
    </div>
  );
}

// The one note every look I end shows.
export function LookNote() {
  return <p className="look-note">Look as long as you like.</p>;
}

// > Stand-in. What a look's time counts: look time, or time per move. A lesson's
// > "Yes" screen times no move, so it says so.
function countsOf(show: Show): string {
  if (show.time === "look") return "counted as look time";
  return show.moves === 0 ? "not counted" : "counted as time per move";
}

// > Stand-in. The look's time, shown while I look, with what it counts.
export function LookLine({ show, secs }: { show: Show; secs: number }) {
  return (
    <p className="sx-look">
      Looking <b>{clock(secs)}</b> · {countsOf(show)}
    </p>
  );
}
