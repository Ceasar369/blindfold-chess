// Block 19, the shell: the screens around the rounds, in the look I locked in,
// app-look g2 v1 (its file deleted once this was built; git keeps it). Home,
// a chapter, a round, its score, my progress record, and the library. The left menu at 1440, a top bar with a
// Menu button at 390. Screens are state: no router, as in the winner.
//
// The menu shuts to a strip: 56 wide at 1440, one row of chapter numbers at
// 390 (winner rail-and-home, look 2). Home holds the step I played last
// (winner home-screen g1 v1, look 2).
//
// > Stand-in. A round I leave is not kept: no score, no record, and nothing
// > comes back from it. Its step is still the one Home shows as played last.
// > Stand-in. The menu stays shut or open while the app is open, and does not
// > survive a reload. It starts open at 1440 and shut at 390.
// > Stand-in. At 390, choosing a menu link shuts the list again, as it did
// > before the menu could shut. At 1440 it stays as it is.
// > Stand-in. A step counts as played once its round starts.
// > Stand-in. Library sits after the chapters, before Progress record.
// > Stand-in. At 390, the top strip is not drawn while a round plays, a trial
// > round too. The menu keeps its shut or open state through the round, and
// > comes back with it. At 1440 the menu is there in a round.

import { useCallback, useEffect, useState } from "react";
import { CHAPTERS } from "../core.ts";
import {
  addRound,
  keptOf,
  keyOfRound,
  loadLast,
  loadProgress,
  loadStats,
  playedOf,
  pull,
  queue,
  saveLast,
  saveProgress,
  saveStats,
  startSending,
  type Stats,
} from "../record/record.ts";
import {
  afterRound,
  makeRound,
  packsOf,
  pathIndex,
  scoreSheet,
  type Play,
  type Progress,
  type Results,
  type Round,
  type Sheet,
} from "../rounds/rounds.ts";
import { loadPacks } from "../rounds/packs.ts";
import { Runner } from "../runner/Runner.tsx";
import { ChapterScreen, HomeScreen, LibraryScreen, RecordScreen, ScoreScreen } from "./screens.tsx";

// The widths below the left menu: the top bar, as styles.css draws it.
const NARROW = "(max-width: 1099.98px)";

type Screen =
  | { at: "home" }
  | { at: "chapter"; n: number }
  | { at: "round"; play: Play; round: Round }
  | { at: "score"; play: Play; round: Round; sheet: Sheet }
  | { at: "record" }
  | { at: "library" };

const newId = () => crypto.randomUUID();

// The dev server's trial round, at /?try=<input>: one input's examples.
function trialScreen(): Screen | null {
  const how = import.meta.env.DEV ? new URLSearchParams(window.location.search).get("try") : null;
  if (!how) return null;
  const play: Play = { chapter: 1, challenge: `trial-${how}`, level: "L1" };
  const id = newId();
  return { at: "round", play, round: makeRound(play, id, loadProgress(), id) };
}

export function App() {
  const [screen, setScreen] = useState<Screen>(() => trialScreen() ?? { at: "home" });
  const [progress, setProgress] = useState<Progress>(loadProgress);
  const [last, setLast] = useState(loadLast);
  const [stats, setStats] = useState<Stats>(loadStats);
  const [shut, setShut] = useState(() => window.matchMedia(NARROW).matches);

  const keep = (p: Progress) => {
    saveProgress(p);
    setProgress(p);
  };

  const keepStats = (s: Stats) => {
    saveStats(s);
    setStats(s);
  };

  // The record's copy of my progress and stats, when it answers.
  const pullRecord = () =>
    void pull().then((r) => {
      if (!r) return;
      keep(r.progress);
      keepStats(r.stats);
    });

  // Home opens on the record's copy too, so a round from my other device shows.
  useEffect(() => {
    startSending();
    pullRecord();
  }, []);

  const go = (s: Screen) => {
    setScreen(s);
    window.scrollTo(0, 0);
  };

  // A chapter opens on the record's copy of my progress, when it answers.
  const openChapter = (n: number) => {
    go({ at: "chapter", n });
    pullRecord();
  };

  // A round opens once its challenge's packs have loaded: at once, for a
  // challenge that reads none.
  // > Stand-in. A pack that fails to load leaves me where I was.
  // A level on no path, a trial's, is never the step I played last.
  const play = (p: Play) => {
    const step = "step" in p ? p.step : pathIndex(p.chapter, p.challenge, p.level);
    if (step >= 0) {
      saveLast({ chapter: p.chapter, step });
      setLast({ chapter: p.chapter, step });
    }
    const id = newId();
    void loadPacks(packsOf(p)).then((packs) => go({ at: "round", play: p, round: makeRound(p, id, progress, id, packs) }));
  };

  const screenRound = screen.at === "round" ? screen : null;
  const onEnd = useCallback(
    (results: Results, startedAt: Date) => {
      if (!screenRound) return;
      const { round, play: p } = screenRound;
      const sheet = scoreSheet(round, results);
      // A round on no path, a trial's, changes nothing kept.
      const after = afterRound(progress, round, results);
      const kept = keptOf(round, results, sheet, after, startedAt, new Date());
      if (kept) {
        keep(after);
        const played = playedOf(kept.score, kept.startedAt, kept.endedAt);
        const key = keyOfRound(kept.chapter, kept.score);
        if (played && key) keepStats({ ...stats, [key]: addRound(stats[key], played) });
        queue(kept);
      }
      go({ at: "score", play: p, round, sheet });
    },
    [screenRound, progress, stats],
  );

  const activeN = screen.at === "chapter" ? screen.n : screen.at === "round" || screen.at === "score" ? screen.round.chapter : null;
  const active = screen.at === "record" ? "record" : screen.at === "library" ? "library" : activeN;

  return (
    <div className={`app${shut ? " shut" : ""}${screen.at === "round" ? " playing" : ""}`}>
      <SideMenu
        active={active}
        shut={shut}
        onToggle={() => setShut(!shut)}
        onHome={() => go({ at: "home" })}
        onChapter={openChapter}
        onLibrary={() => go({ at: "library" })}
        onRecord={() => go({ at: "record" })}
      />
      <main className={`main${screen.at === "round" ? " is-round" : ""}${screen.at === "chapter" ? " ls-wide" : ""}`}>
        {screen.at === "home" && <HomeScreen last={last} stats={stats} onPlay={play} />}
        {screen.at === "chapter" && (
          <ChapterScreen key={screen.n} n={screen.n} stats={stats} onHome={() => go({ at: "home" })} onPlay={play} />
        )}
        {screen.at === "round" && (
          <Runner
            key={screen.round.id}
            round={screen.round}
            onLeave={() => openChapter(screen.round.chapter)}
            onRestart={() => play(screen.play)}
            onNext={play}
            onEnd={onEnd}
          />
        )}
        {screen.at === "score" && (
          <ScoreScreen
            round={screen.round}
            sheet={screen.sheet}
            onNext={play}
            onAgain={() => play(screen.play)}
            onChapter={() => openChapter(screen.round.chapter)}
            onHome={() => go({ at: "home" })}
          />
        )}
        {screen.at === "record" && <RecordScreen />}
        {screen.at === "library" && <LibraryScreen />}
      </main>
    </div>
  );
}

function SideMenu({
  active,
  shut,
  onToggle,
  onHome,
  onChapter,
  onLibrary,
  onRecord,
}: {
  active: number | "library" | "record" | null;
  shut: boolean;
  onToggle: () => void;
  onHome: () => void;
  onChapter: (n: number) => void;
  onLibrary: () => void;
  onRecord: () => void;
}) {
  const pick = (fn: () => void) => (e: { preventDefault: () => void }) => {
    e.preventDefault();
    if (!shut && window.matchMedia(NARROW).matches) onToggle();
    fn();
  };
  const link = (on: boolean) => ({ className: `lk${on ? " on" : ""}`, "aria-current": on ? ("page" as const) : undefined });
  // Shut, a link shows its number alone: its name stays for a screen reader.
  const named = (name: string) => (shut ? { title: name, "aria-label": name } : {});
  return (
    <>
      <aside className="side">
        <div className="side-top">
          <span className="word">Blindfold Chess</span>
          <button
            type="button"
            className="btn sm menubtn"
            aria-expanded={!shut}
            aria-controls="menu-links"
            onClick={onToggle}
          >
            {shut ? "Menu" : "Close"}
          </button>
        </div>
        <nav id="menu-links" className={`links${shut ? "" : " open"}`} aria-label="Menu">
          <a href="#" {...link(active === null)} {...named("Home")} onClick={pick(onHome)}>
            <span className="n x">H</span>
            <span className="t">Home</span>
          </a>
          {CHAPTERS.map((c) => (
            <a key={c.n} href="#" {...link(active === c.n)} {...named(c.name)} onClick={pick(() => onChapter(c.n))}>
              <span className="n">{c.n}</span>
              <span className="t">{c.name}</span>
            </a>
          ))}
          <a href="#" {...link(active === "library")} {...named("Library")} onClick={pick(onLibrary)}>
            <span className="n x">L</span>
            <span className="t">Library</span>
          </a>
          {
            // Stand-in. The progress record's own screen, last in the menu.
          }
          <a href="#" {...link(active === "record")} {...named("Progress record")} onClick={pick(onRecord)}>
            <span className="n x">P</span>
            <span className="t">Progress record</span>
          </a>
        </nav>
        <button
          type="button"
          className="railbtn"
          aria-expanded={!shut}
          aria-controls="menu-links"
          aria-label={shut ? "Show the menu" : "Hide the menu"}
          onClick={onToggle}
        >
          <span className="a">{shut ? "»" : "«"}</span>
          <span className="w">{shut ? "Show" : "Hide"}</span>
        </button>
      </aside>
      {
        // Shut at 390, the top bar is one row: chapters 1 to 6, then Menu.
      }
      {shut && (
        <div className="strip390">
          {CHAPTERS.map((c) => (
            <a
              key={c.n}
              href="#"
              className={`sn${active === c.n ? " on" : ""}`}
              aria-current={active === c.n ? "page" : undefined}
              aria-label={c.name}
              title={c.name}
              onClick={pick(() => onChapter(c.n))}
            >
              {c.n}
            </a>
          ))}
          <button type="button" className="sn more" aria-expanded={false} aria-controls="menu-links" onClick={onToggle}>
            Menu
          </button>
        </div>
      )}
    </>
  );
}
