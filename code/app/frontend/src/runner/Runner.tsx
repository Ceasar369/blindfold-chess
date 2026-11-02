// Block 18, the runner: plays one round on screen, each item's steps in turn.
// A Show stays until its button, or ends on its own after its seconds. An Ask
// counts down when its level times it, and sends "out of time" when the time
// runs out. An answer not counted keeps the question open, with its note. The
// told line shows with what shows again. The round ends when its items do,
// or when its minutes run out.
//
// The header: Leave, Restart, Next level and Settings, the level's name, four
// tiles. header.ts says what it shows; Header.tsx draws it. Where it sits:
// see Runner's return.
//
// It judges nothing, makes no question, and stores nothing: walk.ts walks the
// steps, and the round's results go to Rounds and the progress record.

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Board } from "../board/Board.tsx";
import type { Ask, Did, Show, Step, Told } from "../core.ts";
import { AnswerInput } from "../inputs/AnswerInput.tsx";
import { asCards } from "../inputs/Choose.tsx";
import type { Built, OnBoard } from "../inputs/frame.ts";
import type { Play, Results, Round } from "../rounds/rounds.ts";
import { StepHeader, useWide } from "./Header.tsx";
import { boardOf, headerOf, noteOf, partOf } from "./header.ts";
import { LessonShow } from "./LessonShow.tsx";
import { Banner, CheckNote, LookLine, LookNote, Meter, NoteView } from "./parts.tsx";
import { act, askLeft, begin, endByTime, roundLeft, showLeft, type Walk } from "./walk.ts";

// What I did fits the step on screen: a press on a Show or a Told, an answer
// or the time on an Ask, and a lesson's jump on either. A second click after an
// answer lands nowhere.
function fits(step: Step, did: Did): boolean {
  if (step.step === "show") return did.did === "press" || did.did === "timeout" || did.did === "jump";
  if (step.step === "ask") return did.did === "answer" || did.did === "timeout" || did.did === "jump";
  if (step.step === "told") return did.did === "press";
  return false;
}

function Countdown({ left, of }: { left: number; of: number }) {
  return (
    <div className={`timer${left < of / 3 ? " low" : ""}`} role="timer" aria-label="Time left">
      <span className="bar">
        <i style={{ width: `${Math.max(0, left / of) * 100}%` }} />
      </span>
      <span className="tnum">{Math.max(0, left).toFixed(1)} s</span>
    </div>
  );
}

type Props = {
  round: Round;
  onLeave: () => void;
  onRestart: () => void; // plays this level again from question 1
  onNext: (play: Play) => void; // plays the next level, header.ts's
  onEnd: (results: Results, startedAt: Date) => void;
};

export function Runner({ round, onLeave, onRestart, onNext, onEnd }: Props) {
  const [walk, setWalk] = useState<Walk>(() => begin(round, performance.now()));
  const [now, setNow] = useState(() => performance.now());
  const ref = useRef(walk);
  const startedAt = useRef(new Date());
  const ended = useRef(false);
  const wide = useWide();

  const update = (w: Walk) => {
    ref.current = w;
    setWalk(w);
  };
  const dispatch = (did: Did) => {
    const w = ref.current;
    if (w.ended || !fits(w.step, did)) return;
    update(act(w, did, performance.now()));
  };

  // The clocks: the round's minutes, the question's seconds, a Show's own end.
  useEffect(() => {
    const id = window.setInterval(() => {
      const t = performance.now();
      const w = ref.current;
      if (w.ended) return;
      const r = roundLeft(w, t);
      if (r !== null && r <= 0) return update(endByTime(w));
      const a = askLeft(w, t);
      if (a !== null && a <= 0) return dispatch({ did: "timeout" });
      const s = showLeft(w, t);
      if (s !== null && s <= 0) return dispatch({ did: "timeout" });
      setNow(t);
    }, 50);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (walk.ended && !ended.current) {
      ended.current = true;
      onEnd(walk.results, startedAt.current);
    }
  }, [walk, onEnd]);

  // Each new question or Show opens at the top of the page.
  const screen = walk.step.step === "show" ? `show:${walk.stepAt}` : `ask:${walk.index}:${walk.askAt}`;
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [screen]);

  if (walk.ended) return null;
  const step = walk.step;
  const part = partOf(round, walk);
  const h = headerOf(walk, now);
  const board = boardOf(step, walk.asked);

  // Black is told by a strip: under the board on a phone, at the top of the column
  // on a wide screen, above the header.
  const black = h.seat.side === "black" ? <Banner seat={h.seat} /> : null;
  // A question draws no level's note: its own words say it all. A Show still does.
  const note = step.step === "show" ? noteOf(round, part, h.seat, board) : null;
  const aside = note && <NoteView note={note} />;
  const header = <StepHeader h={h} onLeave={onLeave} onRestart={onRestart} onNext={onNext} />;
  const head = wide ? (
    <>
      {black}
      {header}
    </>
  ) : (
    header
  );
  const banner = wide ? null : black;

  // The board keeps one place and one size on every step: at 1440 on the left,
  // as tall as the screen allows, with one column on its right holding the
  // rest; on a phone at the top, with the rest under it.
  // > Stand-in. A step with no board keeps the board's room empty at 1440, so
  // > the column keeps its place. A phone gives it no room.
  return (
    <div className="rwrap">
      {step.step === "show" && (
        <ShowView
          key={screen}
          show={step}
          left={showLeft(walk, now)}
          looked={(now - walk.stepAt) / 1000}
          head={head}
          banner={banner}
          aside={aside}
          wide={wide}
          onPress={() => dispatch({ did: "press" })}
          onJump={(to) => dispatch({ did: "jump", to })}
        />
      )}
      {(step.step === "ask" || step.step === "told") && walk.asked && (
        <QuestionView
          key={`${screen}:${walk.asked.question}`}
          ask={walk.asked}
          told={step.step === "told" ? step : null}
          left={askLeft(walk, now)}
          head={head}
          banner={banner}
          aside={aside}
          wide={wide}
          onAnswer={(answer) => dispatch({ did: "answer", answer })}
          onJump={(to) => dispatch({ did: "jump", to })}
          onContinue={() => dispatch({ did: "press" })}
        />
      )}
    </div>
  );
}

function ShowView({
  show,
  left,
  looked,
  head,
  banner,
  aside,
  wide,
  onPress,
  onJump,
}: {
  show: Show;
  left: number | null;
  looked: number;
  head: ReactNode;
  banner: ReactNode;
  aside: ReactNode;
  wide: boolean;
  onPress: () => void;
  onJump: (to: number) => void;
}) {
  if (show.lesson)
    return <LessonShow show={show} lesson={show.lesson} looked={looked} head={head} banner={banner} aside={aside} wide={wide} onPress={onPress} onJump={onJump} />;
  // A look the player ends shows its note and its time. One that ends on its
  // own shows its countdown alone.
  const looking = !show.seconds;
  const board = (show.board || wide) && <div className="bcol">{show.board && <Board view={show.board} />}</div>;
  const button = (
    <button type="button" className="btn primary" autoFocus onClick={onPress}>
      {show.button}
    </button>
  );
  const lines = show.lines?.map((l) => (
    <p key={l} className="from">
      {l}
    </p>
  ));
  const name = show.name && <h2 className="lookname">{show.name}</h2>;
  const note = looking && <LookNote />;
  const question = show.question && <h2 className="q">{show.question}</h2>;
  const timing = (
    <>
      {looking && <LookLine show={show} secs={looked} />}
      {left !== null && show.seconds ? <Countdown left={left} of={show.seconds} /> : null}
    </>
  );
  if (wide)
    return (
      <div className="rd">
        {board}
        <div className="rcol">
          {head}
          <section className="panel pbody">
            {aside}
            {lines}
            {name}
            {show.move && <p className="stepmove">{show.move}</p>}
            {show.words && <p className="words">{show.words}</p>}
            {note}
            {question}
            {timing}
            <div className="btns">{button}</div>
          </section>
        </div>
      </div>
    );
  // On a phone a look wears the question's bar under the board: what to do,
  // then its time and its button.
  // > Stand-in. The bar names the question, else the look's name, else how to
  // > look. The rest sits under the header.
  const title = question || name || note;
  return (
    <div className="rd">
      {board}
      {banner}
      <section className="panel sx-bar" aria-label="The look">
        <div className="sx-qa">{title}</div>
        <div className="sx-row">
          {timing}
          {button}
        </div>
      </section>
      {head}
      {(aside || lines?.length || (title !== name && name) || show.move || show.words || (title !== note && note)) && (
        <section className="panel pbody">
          {aside}
          {lines}
          {title !== name && name}
          {show.move && <p className="stepmove">{show.move}</p>}
          {show.words && <p className="words">{show.words}</p>}
          {title !== note && note}
        </section>
      )}
    </div>
  );
}

type QuestionProps = {
  ask: Ask;
  told: Told | null;
  left: number | null;
  head: ReactNode;
  banner: ReactNode;
  aside: ReactNode;
  wide: boolean;
  onAnswer: Parameters<typeof AnswerInput>[0]["onAnswer"];
  onJump: (to: number) => void;
  onContinue: () => void;
};

// A right answer moves on by itself after 1 second, while a line empties to
// show the next question coming. A miss waits for Continue, so I can look at it.
// > Stand-in. A game or an endgame shown again move by move waits for
// > Continue too, right or not: its moves take longer than 1 second to step.
// > Stand-in. The emptying line borrows the timed question's line: its bar on
// > a wide screen, its line along the bar's foot on a phone.
const RIGHT_MS = 1000;

function NextLine() {
  return (
    <div className="next" role="status" aria-label="Next question coming">
      <span className="bar">
        <i style={{ animationDuration: `${RIGHT_MS}ms` }} />
      </span>
    </div>
  );
}

// On a phone, the sheet fixed to the screen's foot, over the keys: the verdict
// with Continue, or, slim, a refused move, which lets a tap through to the keys.
// The verdict's sheet reserves its own height at the page's end, so the last of
// the page stays reachable above it.
function Sheet({ slim = false, children }: { slim?: boolean; children: ReactNode }) {
  const sheet = useRef<HTMLDivElement>(null);
  const [room, setRoom] = useState(0);
  useLayoutEffect(() => {
    const el = sheet.current;
    if (slim || !el) return;
    const measure = () => setRoom(el.offsetHeight);
    measure();
    const watch = new ResizeObserver(measure);
    watch.observe(el);
    return () => watch.disconnect();
  }, [slim]);
  return (
    <>
      <div ref={sheet} className={`sx-sheet${slim ? " sx-slim" : ""}`}>
        {children}
      </div>
      {!slim && <div className="sx-room" style={{ height: room }} aria-hidden="true" />}
    </>
  );
}

// On a phone, under the board, Black's banner when I play Black, then one bar
// of one height: the question in two lines at most, then one row holding the
// answers before an answer, and what I gave once told. Then the header, then a
// panel with the rest. The verdict, with Continue after a miss, and a refused
// move ride in a sheet at the screen's foot, so an answer never moves the page:
// from the winner phone-verdict g1 v1, look 3. Once told the keys stay drawn,
// dimmed and locked, so the panel keeps its height.
// The row holds the squares' Confirm, None and Undo, up to four choices, or
// an answer built key by key and its send button, whose keys sit in the panel.
// The piece cards sit in the bar, under the question, which takes their height.
// > Stand-in. The pieces' palette, moved pieces, other long picks of choices,
// > the check note, and every text the panel holds, sit in the panel.
// > Stand-in. A right verdict rides in the sheet too, whole, until the next
// > question comes.
function QuestionView({ ask, told, left, head, banner, aside, wide, onAnswer, onJump, onContinue }: QuestionProps) {
  const continueRef = useRef<HTMLButtonElement>(null);
  const right = told?.verdict === "right" && !told.again?.replay;
  // On a phone a verdict never moves the keys on screen. A board coming in
  // above them, a blind game's at its end, would push them down: their place
  // is held, by scrolling the page the distance they moved. The sheet's room
  // at the page's end comes with the next render, so the hold is made twice.
  const rd = useRef<HTMLDivElement>(null);
  const keysAt = useRef<number | null>(null);
  const [settle, setSettle] = useState(0);
  const keysTop = () => rd.current?.querySelector(".sx-keys")?.getBoundingClientRect().top ?? null;
  const answer: typeof onAnswer = (did) => {
    keysAt.current = keysTop();
    onAnswer(did);
  };
  useLayoutEffect(() => {
    const held = keysAt.current;
    if (!told || held === null || wide) return;
    const now = keysTop();
    if (now !== null && now !== held) window.scrollBy(0, now - held);
    if (settle === 0) setSettle(1);
    else {
      keysAt.current = null;
      setSettle(0);
    }
  }, [told, wide, settle]);
  useEffect(() => {
    if (told) continueRef.current?.focus({ preventScroll: !wide });
  }, [told, wide]);
  useEffect(() => {
    if (!right) return;
    const id = window.setTimeout(onContinue, RIGHT_MS);
    return () => window.clearTimeout(id);
  }, [right]);
  const how = ask.input.how;
  const top =
    !wide && (how === "click-many" || how === "click-route" || (how === "choose" && ask.input.choices.length <= 4));
  // The piece cards, on a phone, sit in the question's bar, under the question.
  const cards = !wide && ask.input.how === "choose" && asCards(ask.input.choices);
  // Choices draw their own told state: a pick ringed or tinted, the others dimmed.
  // Every other control is shut once told.
  const shut = !!told && how !== "choose";

  // A game or an endgame shown again move by move: the step on the board, from its last.
  const replay = told?.again?.replay ?? null;
  const [at, setAt] = useState<number | null>(null);
  const shown = replay ? (at ?? replay.length - 1) : null;

  const timed = ask.seconds !== null;
  const frame = (on: OnBoard, controls: ReactNode, built?: Built) => {
    const again = replay && shown !== null ? replay[shown]!.board : told?.again?.board;
    const base = ask.board ?? on.show ?? null;
    const view = again ?? on.view ?? (base && (on.pieces || on.arrows) ? { ...base, pieces: on.pieces ?? base.pieces, arrows: on.arrows ?? base.arrows } : base);

    // The question as big as its room allows: a short one, like "Find d2.", in
    // one big line.
    // > Stand-in. Short is 20 characters at most.
    const question = <h2 className={`q${ask.question.length <= 20 ? " big" : ""}`}>{ask.question}</h2>;
    const toldLine = told && (
      <p className={`told ${told.verdict === "right" ? "right" : "wrong"}`} role="status">
        {told.line}
      </p>
    );
    const proceed = !right && (
      <button ref={continueRef} type="button" className="btn primary" onClick={onContinue}>
        Continue
      </button>
    );
    const check = ask.check && <CheckNote check={ask.check} />;
    const before = (
      <>
        {ask.words && <p className="words">{ask.words}</p>}
        {ask.notes.map((n) => (
          <p key={n} className="note-line">
            {n}
          </p>
        ))}
      </>
    );
    const after = (
      <>
        {ask.note && !told && (
          <p className="unread" role="status">
            {ask.note}
          </p>
        )}
      </>
    );
    // > Stand-in. A game or an endgame shown again: its move under the told
    // > line, each slip at its move, and two buttons to step.
    const replayView = replay && shown !== null && (
      <div className="replay">
        <p className="muted small">Move by move</p>
        <p className="stepmove" aria-live="polite">
          {replay[shown]!.move}
        </p>
        {replay[shown]!.notes.map((n) => (
          <p key={n} className="note-line">
            {n}
          </p>
        ))}
        <div className="btns">
          <button type="button" className="btn" disabled={shown === 0} onClick={() => setAt(shown - 1)}>
            Move back
          </button>
          <button type="button" className="btn" disabled={shown === replay.length - 1} onClick={() => setAt(shown + 1)}>
            Move on
          </button>
        </div>
      </div>
    );

    // On a phone the panel under the header holds only what the bar does not. Its
    // keys stay once told, locked: dimmed, or hidden under a game's replay, which
    // lies over their room.
    const clock = timed && !told && left !== null;
    const back = told?.again;
    const keys = built ? (
      (built.keys || built.more) && (
        <>
          {built.keys}
          {built.more && <div className="btns">{built.more}</div>}
        </>
      )
    ) : top || cards ? null : (
      controls
    );
    const lower = keys && (
      <div className={`sx-keys${shut ? (replay ? " sx-hide" : " sx-lock") : ""}`} inert={shut}>
        {keys}
      </div>
    );
    const over = !wide && !!lower && !!replayView;

    // What the told line brings back, between it and Continue.
    const shownAgain = told && (
      <>
        {told.again?.notes?.map((n) => (
          <p key={n} className="note-line">
            {n}
          </p>
        ))}
        {!over && replayView}
        {told.again?.words && (
          <div>
            <p className="muted small">The position</p>
            <p className="words">{told.again.words}</p>
          </div>
        )}
        {told.again?.moves && (
          <div>
            <p className="muted small">The moves</p>
            <p className="words">{told.again.moves}</p>
          </div>
        )}
      </>
    );

    const panelled = !!(ask.check || ask.words || ask.notes.length || lower) || !!(back && (back.notes?.length || replay || back.words || back.moves));

    const board = (view || wide) && (
      <div className="bcol">
        {view && (
          <Board
            view={view}
            marks={on.marks}
            order={on.order}
            selected={told ? null : on.selected}
            bad={told ? null : on.bad}
            onSquare={told ? undefined : on.onSquare}
          />
        )}
      </div>
    );
    if (wide)
      return (
        <div className="rd">
          {board}
          <div className="rcol">
            {head}
            {clock && <Meter left={left!} of={ask.seconds!} />}
            <section className="panel pbody">
              {aside}
              {check}
              {before}
              {question}
              {built ? (
                <>
                  {built.line}
                  {!told && built.keys}
                  {!told && (built.send || built.more) && (
                    <div className="btns">
                      {built.send}
                      {built.more}
                    </div>
                  )}
                </>
              ) : (
                !shut && controls
              )}
              {after}
              {told && (
                <>
                  {toldLine}
                  {shownAgain}
                  {right && <NextLine />}
                  {proceed && <div className="btns">{proceed}</div>}
                </>
              )}
            </section>
          </div>
        </div>
      );
    // A timed question on a phone: its seconds at the question's right, and a
    // line along the bar's foot that shrinks, from the winner timed-black g1 v1,
    // look 2. Red under a third of its time, as the wide countdown.
    const low = clock && left! < ask.seconds! / 3 ? " low" : "";
    // The row: what I gave once told, the answers before. The piece cards need none.
    const row = built ? (
      <>
        {built.line}
        {!told && built.send}
      </>
    ) : top ? (
      shut ? (
        <div className="sx-flat" inert>
          {controls}
        </div>
      ) : (
        controls
      )
    ) : null;
    return (
      <div className="rd" ref={rd}>
        {board}
        {banner}
        <section className={`panel sx-bar${timed || right ? " sx-tbar" : ""}${cards ? " sx-pick" : ""}`} aria-label="The question">
          <div className="sx-qa">
            {question}
            {clock && (
              <span className={`timer sx-qt${low}`} role="timer" aria-label="Time left on this question">
                {Math.max(0, left!).toFixed(1)}
                <small>s</small>
              </span>
            )}
          </div>
          {clock && <i className={`sx-tline${low}`} style={{ width: `${Math.max(0, Math.min(1, left! / ask.seconds!)) * 100}%` }} />}
          {right && <i className="sx-tline next" style={{ animationDuration: `${RIGHT_MS}ms` }} />}
          {cards ? controls : <div className="sx-row">{row}</div>}
        </section>
        {head}
        {panelled && (
          <section className="panel pbody">
            {check}
            {before}
            {lower && (
              <div className="sx-cell">
                {lower}
                {over && <div className="sx-over">{replayView}</div>}
              </div>
            )}
            {shownAgain && <div className="again">{shownAgain}</div>}
          </section>
        )}
        {told ? (
          <Sheet>
            {toldLine}
            {proceed}
          </Sheet>
        ) : (
          ask.note && (
            <Sheet slim>
              <p className="unread" role="status">
                {ask.note}
              </p>
            </Sheet>
          )
        )}
      </div>
    );
  };
  return <AnswerInput ask={ask} told={told} onAnswer={answer} onJump={onJump} frame={frame} />;
}
