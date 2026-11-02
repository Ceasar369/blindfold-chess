// The step screen's header: three rows, Leave, Restart, Next level and
// Settings, then the level's name, then four tiles. Under it, my average time
// per answer, from the winner average-time g1 v1, look 3. The level's conditions
// fold behind Settings, which opens over the page. It sits in the column right
// of the board at 1440, and under the board's bar on a phone, where its four
// buttons read as links. It decides nothing: header.ts says what it shows.

import { useEffect, useRef, useState } from "react";
import type { Play } from "../rounds/rounds.ts";
import type { Chip, Header, Mix, Tile } from "./header.ts";

// A wide screen: the 1440 look. The page's own media query, read in code.
export function useWide(): boolean {
  const q = "(min-width: 1100px)";
  const [wide, setWide] = useState(() => window.matchMedia(q).matches);
  useEffect(() => {
    const m = window.matchMedia(q);
    const on = () => setWide(m.matches);
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  return wide;
}

function Pips({ of, asked, cur }: { of: number; asked: number; cur: boolean }) {
  return (
    <span className="sx-pips" aria-hidden="true">
      {Array.from({ length: of }, (_, i) => (
        <i key={i} className={i < asked ? "on" : cur && i === asked ? "cur" : ""} />
      ))}
    </span>
  );
}

function ChipView({ lead, name, value, extra }: Chip) {
  return (
    <span className={`sx-chip${lead ? " key" : ""}`}>
      <i>{name}</i>
      <span>
        {value}
        {extra && <span className="sx-dsk">{extra}</span>}
      </span>
    </span>
  );
}

function TileView({ t }: { t: Tile }) {
  return (
    <div className={`sx-tile${t.tone ? ` ${t.tone}` : ""}${t.low ? " low" : ""}`} role="group" aria-label={t.say}>
      <span className="sx-tl">{t.label}</span>
      <span className="sx-tv">
        {t.value}
        {t.of !== undefined && (
          <small>
            <span className="sx-dsk"> of {t.of}</span>
            <span className="sx-mob">/{t.of}</span>
          </small>
        )}
      </span>
      {t.sub && <span className="sx-ts">{t.sub}</span>}
    </div>
  );
}

function MixView({ mix }: { mix: Mix }) {
  return (
    <div className="sx-mix">
      {mix.map((g) => (
        <div key={g.label} className={g.cur ? "on" : ""}>
          <span>{g.label}</span>
          <Pips of={g.of} asked={g.asked} cur={g.cur} />
        </div>
      ))}
    </div>
  );
}

type Props = {
  h: Header;
  onLeave: () => void;
  onRestart: () => void;
  onNext: (play: Play) => void;
};

export function StepHeader({ h, onLeave, onRestart, onNext }: Props) {
  const [open, setOpen] = useState(false);
  const set = useRef<HTMLDivElement>(null);

  // The panel opens over the page: Escape or a tap outside shuts it.
  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const tap = (e: Event) => set.current && !set.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("keydown", key);
    document.addEventListener("pointerdown", tap);
    return () => {
      document.removeEventListener("keydown", key);
      document.removeEventListener("pointerdown", tap);
    };
  }, [open]);

  const folded = h.chips.length + (h.mix ? 1 : 0);
  return (
    <>
      <header className="sx-hd">
        <div className="sx-nav">
          <button type="button" className="btn sm" onClick={onLeave}>
            ‹ Leave
          </button>
          {/* > Stand-in. Restart plays this level again from question 1, and is white: red already means wrong here. */}
          <button type="button" className="btn sm white" onClick={onRestart}>
            Restart
          </button>
          <button
            type="button"
            className="btn sm primary"
            disabled={!h.next || !h.nextOk}
            title={h.next ? `${h.next.label} — ${h.next.words}` : "The last step of the chapter"}
            onClick={() => h.next && onNext(h.next.play)}
          >
            Next level ›
          </button>
          {folded > 0 && (
            <div className="sx-set" ref={set}>
              <button type="button" className="sx-chip more" aria-expanded={open} aria-controls="settings-panel" onClick={() => setOpen(!open)}>
                Settings · {h.chips.length}
              </button>
              {open && (
                <div className="sx-pop" id="settings-panel" role="region" aria-label="Settings">
                  {h.mix && <MixView mix={h.mix} />}
                  <div className="sx-chips">
                    {h.chips.map((c) => (
                      <ChipView key={c.name} {...c} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="sx-name">
          <span className={`sx-t${h.now ? " sx-dsk" : ""}`}>{h.name}</span>
          <span className="sx-lv">{h.level}</span>
          {h.now && (
            <span className="sx-lw keep">
              <span className="sx-dsk">now </span>
              <b className="sx-now">{h.now.id}</b> · {h.now.asked} of {h.now.of}
            </span>
          )}
          {h.label && <span className="sx-lw">{h.label}</span>}
        </div>

        <div className="sx-tiles">
          {h.tiles.map((t) => (
            <TileView key={t.label} t={t} />
          ))}
        </div>
      </header>
      <p className="avg-line">
        Average time per answer <b>{h.avg}</b>
      </p>
    </>
  );
}
