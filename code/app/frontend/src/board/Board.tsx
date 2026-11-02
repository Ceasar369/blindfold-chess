// Block 16, the Board: draws one board view, and what an input marks on it.
// A view's cells mark my answer square by square, as 4.2.1 does after an answer.
// Each square is a button, named by its square for a screen reader and a
// keyboard, never in visible text unless the edge names show. A view's arrows
// are drawn over the pieces, from where a piece leaves to where it lands, and
// never take a click. A view that slides moves the piece each arrow ends on in
// from where the arrow starts. It holds no position, and decides nothing about
// a click.
//
// From the winner, app-look g2 v1, lines 68 to 139. Its file,
// code/prototypes/src/routes/app-look/g2/v1.tsx, was deleted once this was
// built; git keeps it.

import type { CSSProperties } from "react";
import type { BoardView, Kind, Side, Square } from "../core.ts";
import { centreOf, shapesOf } from "./arrows.ts";

const FILES = "abcdefgh";

// The cburnett pieces, the winner of piece-styles g1 v1: one picture per side
// and kind, wK to bP, in public/pieces/cburnett/ beside their licence.
const LETTER: Record<Kind, string> = { king: "K", queen: "Q", rook: "R", bishop: "B", knight: "N", pawn: "P" };

// ghost: a piece left out of my answer, drawn faint on the square it belongs on.
export function Glyph({ side, kind, ghost = false }: { side: Side; kind: Kind; ghost?: boolean }) {
  return <img className={`pc ${side}${ghost ? " ghost" : ""}`} src={`${import.meta.env.BASE_URL}pieces/cburnett/${side[0]}${LETTER[kind]}.svg`} alt="" />;
}

// What an input marks: squares picked, a route's numbers, a piece picked up,
// and a square a move missed on (the lesson's, tinted red for a moment).
export type Marks = {
  marks?: string[];
  order?: string[];
  selected?: string | null;
  bad?: string | null;
};

// Every board faces White, a1 at the bottom left, whichever side the view's seat names.
type Props = Marks & {
  view: BoardView;
  onSquare?: (sq: Square) => void;
};

export function Board({ view, marks = [], order = [], selected = null, bad = null, onSquare }: Props) {
  const { names, pieces, lit, arrows = [] } = view;
  const files = [...FILES];
  const ranks = Array.from({ length: 8 }, (_, i) => 8 - i);
  const at = new Map(pieces.map((p) => [p.square as string, p]));
  // 4.2.1's answer board: how my answer stands on a square. The mark is a square colour, the piece drawn above it.
  const cells = new Map((view.cells ?? []).map((c) => [c.square as string, c.state]));
  const shapes = shapesOf(arrows).map(({ arrow, shape }) => ({ key: `${arrow.from}${arrow.to}`, ...shape }));
  // A lesson's move: the piece each arrow ends on slides in, from where the arrow starts, in squares.
  const slides = new Map<string, [number, number]>();
  if (view.slide) {
    for (const a of arrows) {
      const [fx, fy] = centreOf(a.from);
      const [tx, ty] = centreOf(a.to);
      slides.set(a.to, [fx - tx, fy - ty]);
    }
  }
  return (
    <div className="board">
      {ranks.flatMap((r, ri) =>
        files.map((f, fi) => {
          const sq = `${f}${r}` as Square;
          const dark = (FILES.indexOf(f) + r - 1) % 2 === 0;
          const piece = at.get(sq);
          const nums = order.flatMap((s, i) => (s === sq ? [i + 1] : []));
          const marked = marks.includes(sq) || nums.length > 0;
          const cell = cells.get(sq);
          const slide = slides.get(sq);
          const cls = [
            "sq",
            dark ? "dark" : "light",
            cell ? `cell-${cell}` : "",
            slide ? "slide" : "",
            bad === sq ? "bad" : "",
            lit.includes(sq) ? "lit" : "",
            marked ? "mark" : "",
            selected === sq ? "sel" : "",
            onSquare ? "live" : "",
          ]
            .filter(Boolean)
            .join(" ");
          return (
            <button
              key={sq}
              type="button"
              className={cls}
              style={slide ? ({ "--sx": `${slide[0] * 100}%`, "--sy": `${slide[1] * 100}%` } as CSSProperties) : undefined}
              aria-label={sq}
              aria-description={cell}
              title={cell ? `${sq}: ${cell}` : undefined}
              aria-pressed={onSquare ? marked || selected === sq : undefined}
              disabled={!onSquare}
              onClick={() => onSquare?.(sq)}
            >
              {names && fi === 0 && (
                <span className="nm rk" aria-hidden="true">
                  {r}
                </span>
              )}
              {names && ri === 7 && (
                <span className="nm fl" aria-hidden="true">
                  {f}
                </span>
              )}
              {piece && <Glyph side={piece.side} kind={piece.kind} ghost={cell === "missing"} />}
              {nums.length > 0 && <span className="num">{nums.join(",")}</span>}
            </button>
          );
        }),
      )}
      {shapes.length > 0 && (
        <svg className="arrows" viewBox="0 0 8 8" aria-hidden="true">
          {shapes.map((a) => (
            <g key={a.key}>
              <line className="arrow-line" x1={a.tail[0]} y1={a.tail[1]} x2={a.base[0]} y2={a.base[1]} />
              <polygon className="arrow-head" points={[a.tip, a.wings[0], a.wings[1]].map((p) => p.join(",")).join(" ")} />
            </g>
          ))}
        </svg>
      )}
    </div>
  );
}
