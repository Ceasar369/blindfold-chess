// The shell's screens: home, a chapter, the score, my progress record, and
// the library. From the winner, app-look g2 v1, lines 208 to 907, on the
// chapters' real paths and my kept progress. Its file was deleted once this
// was built; git keeps it. A chapter is one plain tree, and home from the
// winner home-screen, g1 v1. The library is the winner library-look g2 v1.

import { useEffect, useRef, useState, type ReactNode } from "react";
import { shapesOf } from "../board/arrows.ts";
import { Glyph } from "../board/Board.tsx";
import type { Square } from "../core.ts";
import { BOOK, PICS, runsOf, type Pic, type Rule } from "../library/library.ts";
import { LOCAL_RECORD, flush, levelKey, statsKey, useRecordStatus, type Last, type Stats, type StepStats } from "../record/record.ts";
import {
  challengeOf,
  chapterOf,
  levelLabel,
  nextAfter,
  nextOf,
  pathIndex,
  playable,
  type Next,
  type Play,
  type Round,
  type Sheet,
} from "../rounds/rounds.ts";

function Tag({ children }: { children: ReactNode }) {
  return <span className="tag">{children}</span>;
}

const secs = (s: number | null) => (s === null ? null : `${s.toFixed(1)} s`);

// A round's time, "1:24".
function clock(s: number): string {
  const t = Math.round(s);
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
}

// My right answers' colour: 60% and below red, above it yellow, only 100% green.
function band(s: { right: number; total: number }): "ls-red" | "ls-yellow" | "ls-green" {
  if (s.right === s.total) return "ls-green";
  return s.right / s.total > 0.6 ? "ls-yellow" : "ls-red";
}

// A score, its right answers coloured: "17/20". The right side stays white.
function Score({ right, total }: { right: number; total: number }) {
  return (
    <span className="ls-sc">
      <span className={band({ right, total })}>{right}</span>/{total}
    </span>
  );
}

// What my last round says against my best.
function verdict(s: StepStats): { text: string; good: boolean } {
  if (s.before !== null && s.last.right > s.before) return { text: `New best: up from ${s.before}/${s.last.total}.`, good: true };
  if (s.rounds === 1) return { text: "Your first round on this level.", good: false };
  const gap = s.best.right - s.last.right;
  return gap > 0 ? { text: `${gap} below your best.`, good: false } : { text: "You matched your best score.", good: true };
}

// "1.1.1 L3 — Find the square, 2 seconds", as a step's words.
const nextWords = (next: Next) => `${next.label} — ${next.words}`.replace(/\.$/, "");

// ---------------------------------------------------------------------------
// Home: one card, the step I played last. From the winner level-stats g2 v1,
// look 4: a clear title, my last score big, a bar to its total with a mark at
// my best, then three lines against my best.
//
// > Stand-in. The heading reads Home, as the score screen's reads Score.
// > Stand-in. Never played, the card offers chapter 1, step 1.

export function HomeScreen({ last, stats, onPlay }: { last: Last | null; stats: Stats; onPlay: (p: Play) => void }) {
  const at = last ?? { chapter: 1, step: 0 };
  const c = chapterOf(at.chapter);
  const here = c.path[at.step]!;
  const ch = here.kind === "level" ? challengeOf(here.challenge) : null;
  const level = ch && here.kind === "level" ? (ch.levels.find((l) => l.id === here.level) ?? null) : null;
  const next = last ? nextAfter(c.n, ch && here.kind === "level" ? { challenge: ch, level: here.level } : null, at.step) : null;
  const s = last ? stats[statsKey(c.n, here)] : undefined;
  const questions = level ? level.questions : here.kind === "mixed" ? here.questions : 0;
  const minutes = level ? level.minutes : here.kind === "mixed" ? here.minutes : null;
  const label = ch && level ? levelLabel(ch, level) : "";
  const share = (n: number) => `${(n / (s?.last.total || 1)) * 100}%`;
  return (
    <div className="wrap">
      <h1>Home</h1>
      <section className="panel ls-home" aria-label={last ? "Last played" : "First step"}>
        <p className="ls-kick">{last ? "Last played" : "Start here"}</p>
        <p className="ls-title">
          {ch && here.kind === "level" ? (
            <>
              {ch.name} <span className="ls-lv">{here.level.replace(/^L(\d+)$/, "Level $1")}</span>
              {label ? ` — ${label}` : ""}
            </>
          ) : (
            here.words.replace(/\.$/, "")
          )}
        </p>
        <p className="ls-sub">
          {here.kind === "level" ? `${here.challenge} · ` : ""}Chapter {c.n}, {c.name} · {plural(questions, "question", "questions")}
          {minutes !== null ? ` · ${minutes} min` : ""}
        </p>
        {s ? (
          <>
            <div className="ls-hero">
              <span className="ls-big">
                <Score right={s.last.right} total={s.last.total} />
              </span>
              <span className="ls-of">last round</span>
            </div>
            <div className="ls-bar">
              <i className={band(s.last)} style={{ width: share(s.last.right) }} />
              <span className="ls-mark" style={{ left: `clamp(24px, ${share(s.best.right)}, calc(100% - 24px))` }}>
                best {s.best.right}
              </span>
            </div>
            <div className="ls-vs">
              <div>
                <span>Score</span>
                <b className={verdict(s).good ? "ls-green" : "ls-n"}>{verdict(s).text}</b>
              </div>
              <div>
                <span>Average</span>
                <span className="ls-n">
                  {secs(s.last.avg) ?? "—"} <span className="muted">· best {secs(s.best.avg) ?? "—"}</span>
                </span>
              </div>
              <div>
                <span>Total time</span>
                <span className="ls-n">
                  {clock(s.last.secs)} <span className="muted">· fastest {clock(s.best.secs)}</span>
                </span>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="ls-hero">
              <span className="ls-big ls-dash">—</span>
              <span className="ls-of">no round yet</span>
            </div>
            <div className="ls-bar" />
          </>
        )}
        <div className="btns actions">
          <button type="button" className="btn primary" disabled={!playable(here)} onClick={() => onPlay(at)}>
            {last ? "Play again" : "Play"}
          </button>
          {next && (
            <button type="button" className="btn" disabled={!next.ok} onClick={() => onPlay(next.play)}>
              Next level: {next.label}
              {next.ok ? "" : " (coming)"}
            </button>
          )}
        </div>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// A chapter: one tree, shown whole, the full width beside the menu. Each
// section, then its challenges under it, then their levels. A level's row says
// its number, its name, its questions and minutes; then, at its right, my
// last round and my best, each its score, average and time. From the winner
// level-stats g2 v1, look 2.
//
// > Stand-in. "Subsection" means a challenge.
// > Stand-in. The mixed round, a step that is no level: one row after the
// > last section, with its questions and minutes, and its stats too.
// > Stand-in. A challenge not built shows a "Coming" tag, and no levels.

function StepStatsView({ s }: { s: StepStats | undefined }) {
  if (!s)
    return (
      <span className="ls-clusters">
        <span className="ls-cl ls-none">Not played yet</span>
      </span>
    );
  return (
    <span className="ls-clusters">
      <span className="ls-cl ls-last" aria-label={`Last round ${s.last.right} of ${s.last.total}`}>
        <span className="ls-cap">Last</span>
        <span className="ls-v">
          <Score right={s.last.right} total={s.last.total} />
        </span>
        <span className="ls-v ls-n">{secs(s.last.avg) ?? "—"}</span>
        <span className="ls-v ls-n">{clock(s.last.secs)}</span>
        <span className="ls-k">score</span>
        <span className="ls-k">avg</span>
        <span className="ls-k">total</span>
      </span>
      <span className="ls-cl ls-best" aria-label={`Best ${s.best.right} of ${s.last.total}`}>
        <span className="ls-cap">Best</span>
        <span className="ls-v">
          <Score right={s.best.right} total={s.last.total} />
        </span>
        <span className="ls-v ls-n">{secs(s.best.avg) ?? "—"}</span>
        <span className="ls-v ls-n">{clock(s.best.secs)}</span>
        <span className="ls-k">score</span>
        <span className="ls-k">avg</span>
        <span className="ls-k">fastest</span>
      </span>
    </span>
  );
}

export function ChapterScreen({
  n,
  stats,
  onHome,
  onPlay,
}: {
  n: number;
  stats: Stats;
  onHome: () => void;
  onPlay: (p: Play) => void;
}) {
  const c = chapterOf(n);
  const facts = (questions: number, minutes: number | null) => (
    <span className="facts">
      {plural(questions, "question", "questions")}
      {minutes !== null ? ` · ${minutes} min` : ""}
    </span>
  );
  return (
    <div className="wrap">
      <nav className="crumb" aria-label="Breadcrumb">
        <button type="button" onClick={onHome}>
          Home
        </button>
        <span>/</span>
        <span>Chapter {c.n}</span>
      </nav>
      <h1>
        {c.n}. {c.name}
      </h1>

      <section className="panel tree" aria-label="Sections">
        {c.sections.map((s) => (
          <div key={s.id} className="tsec" role="group" aria-label={`${s.id} ${s.name}`}>
            <h2 className="trow t1">
              <span className="sid">{s.id}</span> {s.name}
            </h2>
            {s.challenges.map((ch) => (
              <div key={ch.id} className="tch" role="group" aria-label={`${ch.id} ${ch.name}`}>
                <h3 className="trow t2">
                  <span className="cid">{ch.id}</span> {ch.name}
                  {!ch.built && <Tag>Coming</Tag>}
                </h3>
                {ch.built &&
                  ch.levels.map((l) => {
                    const label = levelLabel(ch, l);
                    const step = pathIndex(n, ch.id, l.id);
                    return (
                      <button
                        key={l.id}
                        type="button"
                        className="lvbtn ls-two"
                        onClick={() => onPlay(step >= 0 ? { chapter: n, step } : { chapter: n, challenge: ch.id, level: l.id })}
                      >
                        <span className="ls-who">
                          <span>
                            <b>{l.id}</b>
                            {label ? ` — ${label}` : ""}
                          </span>
                          {facts(l.questions, l.minutes)}
                        </span>
                        <StepStatsView s={stats[levelKey(n, ch.id, l.id, l.questions)]} />
                      </button>
                    );
                  })}
              </div>
            ))}
          </div>
        ))}
        {c.path.map((step, i) =>
          step.kind === "mixed" ? (
            <button key={i} type="button" className="lvbtn ls-two tmix" disabled={!playable(step)} onClick={() => onPlay({ chapter: n, step: i })}>
              <span className="ls-who">
                <span>
                  <b>{step.words}</b>
                  {!playable(step) && <Tag>Coming</Tag>}
                </span>
                {facts(step.questions, step.minutes)}
              </span>
              <StepStatsView s={stats[statsKey(n, step)]} />
            </button>
          ) : null,
        )}
      </section>
    </div>
  );
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

// ---------------------------------------------------------------------------
// The score

// A mixed round's shares, one row per challenge. A challenge with one part keeps
// its level in its label: "2.1.1 L5".
function sharesOf(sheet: Sheet): { label: string; right: number; total: number }[] {
  const rows = new Map<string, { label: string; right: number; total: number; parts: number }>();
  for (const s of sheet.shares) {
    const row = rows.get(s.challenge) ?? { label: `${s.challenge} ${s.level}`, right: 0, total: 0, parts: 0 };
    rows.set(s.challenge, { label: row.label, right: row.right + s.right, total: row.total + s.total, parts: row.parts + 1 });
  }
  return [...rows].map(([challenge, r]) => ({ label: r.parts > 1 ? challenge : r.label, right: r.right, total: r.total }));
}

export function ScoreScreen({
  round,
  sheet,
  onNext,
  onAgain,
  onChapter,
  onHome,
}: {
  round: Round;
  sheet: Sheet;
  onNext: (play: Play) => void;
  onAgain: () => void;
  onChapter: () => void;
  onHome: () => void;
}) {
  const next = nextOf(round);
  const single = round.parts.length === 1 ? round.parts[0]! : null;
  const stats: [string, string][] = [
    ["Average time per answer", secs(sheet.avgAnswer)],
    ["Average look time", secs(sheet.avgLook)],
    ["Average time per move", secs(sheet.avgMove)],
  ].filter((s): s is [string, string] => s[1] !== null);
  return (
    <div className="wrap">
      <h1>Score</h1>
      <section className="panel score">
        <p className="muted">
          {round.title}
          {single ? ` · ${single.level.id}` : ""}
        </p>
        <p className="bigscore" aria-label={`${sheet.right} right answers of ${sheet.total}`}>
          <span className="big">{sheet.right}</span>
          <span className="of"> of {sheet.total}</span>
        </p>
        <p className="muted">right answers</p>

        <dl className="stats">
          {stats.map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
          {sheet.counts.map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
          {sheet.left > 0 && (
            <div>
              {
                // Stand-in. The words for questions the minutes left unasked.
              }
              <dt>Left when time ran out</dt>
              <dd>{sheet.left}</dd>
            </div>
          )}
        </dl>

        {sheet.shares.length > 0 && (
          <>
            <h2>Each challenge</h2>
            <ul className="kinds">
              {
                // A challenge with several parts, one per level, shows as one share.
                sharesOf(sheet).map((s) => (
                  <li key={s.label}>
                    <span>{s.label}</span>
                    <span>
                      {s.right} of {s.total}
                    </span>
                  </li>
                ))
              }
            </ul>
          </>
        )}

        <h2>Mistakes</h2>
        {sheet.mistakes.length === 0 ? (
          <p className="muted">None.</p>
        ) : (
          <ul className="kinds">
            {sheet.mistakes.map(([k, v]) => (
              <li key={k}>
                <span>{k}</span>
                <span>{v}</span>
              </li>
            ))}
          </ul>
        )}

        <h2>Pass mark</h2>
        {
          // Stand-in. The pass mark is the page's own stand-in, word for word.
        }
        <div className="pass">
          <Tag>Stand-in</Tag>
          <p>{round.passMark}</p>
        </div>

        <SendLine />

        {next && (
          <div className="nextup">
            <p className="muted">
              Next{next.step !== null && `, step ${next.step + 1} of ${chapterOf(round.chapter).path.length}`}
            </p>
            <p className="cname">{nextWords(next)}.</p>
          </div>
        )}
        <div className="btns actions">
          {next && (
            <button type="button" className="btn primary" disabled={!next.ok} onClick={() => onNext(next.play)}>
              {next.ok ? "Next step" : "Next step: coming"}
            </button>
          )}
          <button type="button" className={`btn${next ? "" : " primary"}`} onClick={onAgain}>
            Play again
          </button>
          <button type="button" className="btn" onClick={onChapter}>
            Back to the chapter
          </button>
          <button type="button" className="btn" onClick={onHome}>
            Home
          </button>
        </div>
      </section>
    </div>
  );
}

// > Stand-in. The words saying where a finished round is.
function SendLine() {
  const s = useRecordStatus();
  const words =
    LOCAL_RECORD ? "Saved in this browser." : s.waiting === 0 ? "Sent to your progress record." : "Kept on this device. It goes to your progress record when the record answers.";
  return (
    <p className="muted sendline" role="status">
      {words}
    </p>
  );
}

// ---------------------------------------------------------------------------
// My progress record
//
// > Stand-in. The screen where I see how many rounds wait to send.

export function RecordScreen() {
  const s = useRecordStatus();
  if (LOCAL_RECORD) {
    return (
      <div className="wrap">
        <h1>Progress record</h1>
        <section className="panel score">
          <p className="cname" role="status">Progress is saved in this browser.</p>
          <p>Use this browser on this device to continue.</p>
          <p>Clearing this site's browser data removes your progress.</p>
        </section>
      </div>
    );
  }
  return (
    <div className="wrap">
      <h1>Progress record</h1>
      <section className="panel score">
        <p>Each round is kept on this device, then sent to your progress record.</p>
        <p className="cname" role="status">
          {s.waiting === 0 ? "Every round is sent." : `${s.waiting} ${s.waiting === 1 ? "round waits" : "rounds wait"} to send.`}
        </p>
        <div className="btns">
          <button type="button" className="btn" disabled={s.waiting === 0 || s.sending} onClick={() => void flush()}>
            Send now
          </button>
        </div>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// The library: my rules for training my mind, from the winner library-look g2
// v1. One page that scrolls, every rule on it, and nothing opens another
// screen. Under 1100 wide a deck: one rule per screen, snapping, its board
// above its text, a rail of dots. From 1100 wide a reader: an index on the
// left, one column of rules, one board on the right that follows the scroll.
// A screen shows one board, never two.
//
// The board is drawn here, not by Board.tsx. That one draws no dots, no words
// on a square, no quadrant tints, and every square of it is a button: sixty-four
// of them, each under 44 high at this size.
//
// > Stand-in. The evidence line: kept whole, its opening words bold, a dot
// > green for "Proven", grey for "This is my".
// > Stand-in. An "Example:" line sits in its own band.
// > Stand-in. Space: 20 between rules, 28 between groups, the page's own 16 at
// > 390 and 32 at 1440.

const ALL = BOOK.flatMap((g) => g.rules);
const proven = (r: Rule) => r.evidence.startsWith("Proven");
const rid = (r: Rule) => `r-${r.id}`;
const go = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

const FILES = "abcdefgh";

// The one board. A rule with no picture draws it empty and faint.
function LibBoard({ pic }: { pic?: Pic }) {
  const p: Pic = pic ?? { caption: "" };
  const files = [...FILES];
  const ranks = [8, 7, 6, 5, 4, 3, 2, 1];
  const at = new Map((p.pieces ?? []).map((piece) => [piece.square, piece]));
  const shapes = shapesOf(p.arrows ?? []);
  return (
    <div
      className={`board lib-board${pic ? "" : " lib-blank"}`}
      role={pic ? "img" : undefined}
      aria-label={pic ? p.caption : undefined}
      aria-hidden={pic ? undefined : true}
    >
      {ranks.flatMap((r, ri) =>
        files.map((f, fi) => {
          const sq = `${f}${r}` as Square;
          const x = FILES.indexOf(f);
          const cls = [
            "sq",
            (x + r) % 2 === 1 ? "dark" : "light",
            p.quadrants ? `lib-q${(r > 4 ? 2 : 0) + (x > 3 ? 1 : 0)}` : "",
            p.lit?.includes(sq) ? "lit" : "",
            p.bad?.includes(sq) ? "bad" : "",
          ]
            .filter(Boolean)
            .join(" ");
          const piece = at.get(sq);
          return (
            <div key={sq} className={cls}>
              {fi === 0 && <span className="nm rk">{r}</span>}
              {ri === 7 && <span className="nm fl">{f}</span>}
              {piece && <Glyph side={piece.side} kind={piece.kind} />}
              {p.dots?.includes(sq) && <span className="lib-dot" />}
              {p.labels?.[sq] && <span className="num">{p.labels[sq]}</span>}
            </div>
          );
        }),
      )}
      {shapes.length > 0 && (
        <svg className="arrows" viewBox="0 0 8 8" aria-hidden="true">
          {shapes.map(({ arrow, shape }) => (
            <g key={`${arrow.from}${arrow.to}`}>
              <line className="arrow-line" x1={shape.tail[0]} y1={shape.tail[1]} x2={shape.base[0]} y2={shape.base[1]} />
              <polygon className="arrow-head" points={[shape.tip, ...shape.wings].map((q) => q.join(",")).join(" ")} />
            </g>
          ))}
        </svg>
      )}
    </div>
  );
}

// A rule's lines: a run of bullets as one list, any other line as a paragraph.
function LibLines({ rule }: { rule: Rule }) {
  return (
    <>
      {runsOf(rule.lines).map((run, i) =>
        run[0]!.bullet ? (
          <ul key={i} className="lib-ul">
            {run.map((l) => (
              <li key={l.text}>{l.text}</li>
            ))}
          </ul>
        ) : (
          <p key={i} className={run[0]!.text.startsWith("Example:") ? "lib-ex" : undefined}>
            {run[0]!.text}
          </p>
        ),
      )}
    </>
  );
}

function LibEvidence({ rule }: { rule: Rule }) {
  const [, head = "", rest = rule.evidence] = rule.evidence.match(/^(Proven|This is my [^.,:]*)(.*)$/) ?? [];
  return (
    <p className={`lib-ev ${proven(rule) ? "pr" : "me"}`}>
      <b>{head}</b>
      {rest}
    </p>
  );
}

function LibHead() {
  return (
    <header className="lib-head">
      <h1>Library</h1>
      <p className="muted">My rules for training my mind in blindfold chess.</p>
    </header>
  );
}

// The id, of those given, whose element sits in the band `margin` cuts from the screen.
function useInBand(ids: string[], margin: string) {
  const [active, setActive] = useState(ids[0]);
  useEffect(() => {
    const io = new IntersectionObserver(
      (seen) => {
        for (const e of seen) if (e.isIntersecting) setActive(e.target.id);
      },
      { rootMargin: margin },
    );
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    }
    return () => io.disconnect();
  }, [ids.join(), margin]);
  return active;
}

// Whether the page is 1100 wide or more, the line where the left menu opens.
function useWide() {
  const [wide, setWide] = useState(() => window.matchMedia("(min-width: 1100px)").matches);
  useEffect(() => {
    const m = window.matchMedia("(min-width: 1100px)");
    const on = () => setWide(m.matches);
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  return wide;
}

function LibProgress({ n }: { n: number }) {
  return (
    <span className="lib-prog">
      <i>
        <i style={{ width: `${(n / ALL.length) * 100}%` }} />
      </i>
      {n} of {ALL.length}
    </span>
  );
}

// From 1100 wide: one reading column, one board that follows the rule in view.
function LibReader() {
  const active = useInBand(ALL.map(rid), "-20% 0px -70% 0px");
  const now = ALL.find((r) => rid(r) === active) ?? ALL[0]!;
  const pic = PICS[now.id];
  const index = useRef<HTMLElement>(null);
  // The index scrolls on its own: the rule in view stays on its screen.
  useEffect(() => {
    const nav = index.current;
    const on = nav?.querySelector<HTMLElement>("button.on");
    if (!nav || !on) return;
    const bottom = on.offsetTop + on.offsetHeight;
    if (on.offsetTop < nav.scrollTop) nav.scrollTo({ top: on.offsetTop - 8, behavior: "smooth" });
    else if (bottom > nav.scrollTop + nav.clientHeight) nav.scrollTo({ top: bottom - nav.clientHeight + 8, behavior: "smooth" });
  }, [now.id]);
  return (
    <div className="lib-read">
      <LibHead />
      <div className="lib-grid">
        <aside className="lib-follow">
          <LibBoard pic={pic} />
          <div className="lib-where">
            <span className="lib-grp">{now.group}</span>
            <b>{now.title}</b>
            <span className="lib-cap">{pic?.caption ?? "No picture for this rule."}</span>
            <LibProgress n={now.n} />
          </div>
        </aside>
        <nav ref={index} className="lib-index" aria-label="Rules">
          {BOOK.map((g) => (
            <div key={g.name} className="lib-ig">
              <span className="lib-grp">{g.name}</span>
              {g.rules.map((r) => (
                <button key={r.id} type="button" className={r.id === now.id ? "on" : undefined} onClick={() => go(rid(r))}>
                  <span>{r.n}</span>
                  {r.title}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="lib-col">
          {BOOK.map((g) => (
            <section key={g.name}>
              <h2>{g.name}</h2>
              {g.rules.map((r) => (
                <article key={r.id} id={rid(r)} className="lib-rule">
                  <h3>
                    <span className="lib-no">{r.n}</span>
                    {r.title}
                  </h3>
                  <div className="lib-body">
                    <LibLines rule={r} />
                  </div>
                  <LibEvidence rule={r} />
                </article>
              ))}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

// Under 1100 wide: one rule per screen. Only the rule in view draws the board;
// every other picture's place stays empty, so the page never moves.
function LibDeck() {
  const active = useInBand(["r-top", ...ALL.map(rid)], "-45% 0px -45% 0px");
  return (
    <div className="lib-deck">
      <section id="r-top" className="lib-slide">
        <div className="lib-text">
          <LibHead />
          <p>
            {ALL.length} rules, in {BOOK.length} groups. Scroll: one rule per screen.
          </p>
          <div className="lib-toc">
            {BOOK.map((g) => (
              <button key={g.name} type="button" className="lvbtn" onClick={() => go(rid(g.rules[0]!))}>
                <b>{g.name}</b>
                <span>{g.rules.length}</span>
              </button>
            ))}
          </div>
        </div>
      </section>
      {ALL.map((r) => {
        const pic = PICS[r.id];
        return (
          <section key={r.id} id={rid(r)} className="lib-slide">
            <div className="lib-text">
              <span className="lib-grp">
                {r.group} · {r.n} of {ALL.length}
              </span>
              <h2>{r.title}</h2>
              <div className="lib-body lib-lines">
                <LibLines rule={r} />
              </div>
              <LibEvidence rule={r} />
            </div>
            {pic && (
              <figure className="lib-slot">
                <div className="lib-sq">{active === rid(r) && <LibBoard pic={pic} />}</div>
                <figcaption>{pic.caption}</figcaption>
              </figure>
            )}
          </section>
        );
      })}
      <div className="lib-rail" aria-hidden="true">
        {ALL.map((r) => (
          <span key={r.id} className={`${proven(r) ? "pr" : "me"}${active === rid(r) ? " on" : ""}`} />
        ))}
      </div>
    </div>
  );
}

export function LibraryScreen() {
  const wide = useWide();
  return <div className="lib">{wide ? <LibReader /> : <LibDeck />}</div>;
}
