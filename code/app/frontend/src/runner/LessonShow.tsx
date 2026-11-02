// An opening's lesson, 4.3 L1, on a Show: a move demonstrated, or a move told
// right. The board shows the move with its departure and destination lit, the
// arrow between them, and its piece sliding in; the strip of moves, each a
// button to watch that move, sits above the move's own words. At 1440 the board
// is on the left and the panel in the column; on a phone the board, then a bar
// holding the opening's name and the main button, the header, the panel. From the
// winner opening-lesson g1 v1, looks 3, 4 and 7. It draws what the core hands it.
//
// Replay on a demonstrated move runs its slide again, here. Replay on a move told
// right goes back to that move's demonstration, through the core.

import { useState, type ReactNode } from "react";
import { Board } from "../board/Board.tsx";
import type { Lesson, Show } from "../core.ts";
import { Explain, Said, Strip } from "../inputs/lesson.tsx";
import { LookLine, LookNote } from "./parts.tsx";

type Props = {
  show: Show;
  lesson: Lesson;
  looked: number;
  head: ReactNode;
  banner: ReactNode;
  aside: ReactNode;
  wide: boolean;
  onPress: () => void;
  onJump: (to: number) => void;
};

export function LessonShow({ show, lesson, looked, head, banner, aside, wide, onPress, onJump }: Props) {
  // Each Replay of a demonstrated move draws its board anew, so the slide runs again.
  const [run, setRun] = useState(0);
  const demo = show.board?.slide === true;
  const board = <div className="bcol">{show.board && <Board key={run} view={show.board} />}</div>;
  const button = (
    <button type="button" className="btn primary les-go" autoFocus onClick={onPress}>
      {show.button}
    </button>
  );
  const replay = (
    <button type="button" className="btn" onClick={() => (demo ? setRun(run + 1) : onJump(lesson.at))}>
      Replay
    </button>
  );
  const name = show.name && <h2 className="lookname">{show.name}</h2>;
  const strip = lesson.strip && <Strip lesson={lesson} onJump={onJump} />;
  const said = !demo && show.lines?.[0] ? <Said ok text={show.lines[0]} /> : null;
  const words = demo && <Explain show={show} />;
  // The note and the time of every look, under the lesson's own words. On a
  // phone the time sits in the bar, beside the opening's name.
  const note = <LookNote />;
  const clock = <LookLine show={show} secs={looked} />;

  if (wide)
    return (
      <div className="rd">
        {board}
        <div className="rcol">
          {head}
          <section className="panel pbody">
            {aside}
            {name}
            {strip}
            {said}
            {words}
            {note}
            {clock}
            <div className="btns">
              {button}
              {replay}
            </div>
          </section>
        </div>
      </div>
    );
  return (
    <div className="rd">
      {board}
      {banner}
      <section className="panel sx-bar" aria-label="The look">
        <div className="sx-qa">
          {name}
          {clock}
        </div>
        <div className="sx-row">
          {said}
          {button}
        </div>
      </section>
      {head}
      <section className="panel pbody">
        {aside}
        {strip}
        {words}
        {note}
        <div className="btns">{replay}</div>
      </section>
    </div>
  );
}
