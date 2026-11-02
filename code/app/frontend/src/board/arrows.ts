// The arrows a Board draws over its squares, as the opening-lesson winner
// draws them (opening-lesson g1 v1, look 3, "Highlights and arrow"): amber, an
// arrow from the square a piece leaves to the square it lands on. It draws
// nothing, and holds nothing of what a move means.
//
// The measures are the winner's, in the board's own units: the board is 8
// across and 8 down, a square 1 wide. The tail starts 0.3 from the departure's
// centre, the head's tip stops 0.3 short of the destination's centre, the head
// is 0.5 long and 0.6 wide. The line's width, 0.18, and the colour are in
// styles.css.

import type { Arrow, Square } from "../core.ts";

const FILES = "abcdefgh";

export const TAIL_GAP = 0.3;
export const TIP_GAP = 0.3;
export const HEAD_LENGTH = 0.5;
export const HEAD_HALF_WIDTH = 0.3;

type Point = [number, number];

// Where a square's centre sits on the drawn board: x from the left, y from the
// top. a1 is at the bottom left, as Board.tsx lays its squares out.
export function centreOf(square: Square): Point {
  const file = FILES.indexOf(square[0]!);
  const rank = Number(square[1]);
  return [file + 0.5, 8 - rank + 0.5];
}

// One arrow's drawing: the line from tail to base, and the head, a triangle on
// the tip and the two wings.
export type Shape = { tail: Point; base: Point; tip: Point; wings: [Point, Point] };

// An arrow on the board, or null for an arrow that goes nowhere.
// aside: how far to draw it to its own right, as the board looks, across its
// direction; 0 draws it on the line between its two squares.
export function shapeOf(arrow: Arrow, aside = 0): Shape | null {
  const [x1, y1] = centreOf(arrow.from);
  const [x2, y2] = centreOf(arrow.to);
  const length = Math.hypot(x2 - x1, y2 - y1);
  if (length === 0) return null;
  const ux = (x2 - x1) / length;
  const uy = (y2 - y1) / length;
  const move = ([x, y]: Point): Point => [x - uy * aside, y + ux * aside];
  const tip: Point = [x2 - ux * TIP_GAP, y2 - uy * TIP_GAP];
  const base: Point = [tip[0] - ux * HEAD_LENGTH, tip[1] - uy * HEAD_LENGTH];
  const px = -uy * HEAD_HALF_WIDTH;
  const py = ux * HEAD_HALF_WIDTH;
  return {
    tail: move([x1 + ux * TAIL_GAP, y1 + uy * TAIL_GAP]),
    base: move(base),
    tip: move(tip),
    wings: [move([base[0] + px, base[1] + py]), move([base[0] - px, base[1] - py])],
  };
}

// Whether two arrows lie along one line, as castling's king and rook do along
// a rank.
function sameLine(a: Arrow, b: Arrow): boolean {
  const [ax, ay] = centreOf(a.from);
  const [bx, by] = centreOf(a.to);
  const [cx, cy] = centreOf(b.from);
  const [dx, dy] = centreOf(b.to);
  const cross = (px: number, py: number) => (bx - ax) * (py - ay) - (by - ay) * (px - ax);
  return Math.abs(cross(cx, cy)) < 1e-9 && Math.abs(cross(dx, dy)) < 1e-9;
}

// Each arrow, drawn: where two share a line, each is drawn 0.1 of a square to
// its own right, so that each shows its direction.
export const APART = 0.1;
export function shapesOf(arrows: readonly Arrow[]): { arrow: Arrow; shape: Shape }[] {
  return arrows.flatMap((arrow, i) => {
    const shared = arrows.some((other, j) => j !== i && sameLine(arrow, other));
    const shape = shapeOf(arrow, shared ? APART : 0);
    return shape ? [{ arrow, shape }] : [];
  });
}
