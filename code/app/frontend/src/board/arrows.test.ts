import { describe, expect, it } from "vitest";
import { APART, centreOf, HEAD_HALF_WIDTH, HEAD_LENGTH, shapeOf, shapesOf, TAIL_GAP, TIP_GAP } from "./arrows.ts";

const near = (a: number[], b: number[]) => a.forEach((x, i) => expect(x).toBeCloseTo(b[i]!, 6));
const away = (a: number[], b: number[]) => Math.hypot(a[0]! - b[0]!, a[1]! - b[1]!);

describe("The board's arrows", () => {
  it("puts a square's centre where the board lays it: a1 at the bottom left", () => {
    near(centreOf("a1"), [0.5, 7.5]);
    near(centreOf("h8"), [7.5, 0.5]);
    near(centreOf("e2"), [4.5, 6.5]);
  });

  it("draws as look 3 does: the tail 0.3 off the departure, the tip 0.3 short of the destination, a head 0.5 long and 0.6 wide", () => {
    // A white knight g1 to f3.
    const from = centreOf("g1");
    const to = centreOf("f3");
    const shape = shapeOf({ from: "g1", to: "f3" })!;
    expect(away(shape.tail, from)).toBeCloseTo(TAIL_GAP, 6);
    expect(away(shape.tip, to)).toBeCloseTo(TIP_GAP, 6);
    expect(away(shape.tip, shape.base)).toBeCloseTo(HEAD_LENGTH, 6);
    expect(away(shape.wings[0], shape.wings[1])).toBeCloseTo(2 * HEAD_HALF_WIDTH, 6);
    // The wings are level with the base, and the head points the way the arrow goes.
    near([(shape.wings[0][0] + shape.wings[1][0]) / 2, (shape.wings[0][1] + shape.wings[1][1]) / 2], shape.base);
    expect(away(shape.tail, to)).toBeLessThan(away(from, to));
    expect(away(shape.tip, to)).toBeLessThan(away(shape.tail, to));
  });

  it("points down the board for a Black pawn e7 to e5", () => {
    const shape = shapeOf({ from: "e7", to: "e5" })!;
    near(shape.tail, [4.5, 1.8]);
    near(shape.tip, [4.5, 3.2]);
    near(shape.base, [4.5, 2.7]);
    near(shape.wings[0], [4.2, 2.7]);
    near(shape.wings[1], [4.8, 2.7]);
    expect(shape.tip[1]).toBeGreaterThan(shape.tail[1]);
  });

  it("keeps each arrow of castling apart: the king's and the rook's", () => {
    const king = shapeOf({ from: "e1", to: "g1" })!;
    const rook = shapeOf({ from: "h1", to: "f1" })!;
    // Along the first rank: the king's goes right, the rook's goes left.
    expect(king.tip[0]).toBeGreaterThan(king.tail[0]);
    expect(rook.tip[0]).toBeLessThan(rook.tail[0]);
    expect(king.tail[1]).toBeCloseTo(7.5, 6);
    expect(rook.tail[1]).toBeCloseTo(7.5, 6);
  });

  it("draws castling's two arrows apart: each 0.1 of a square to its own right, where they share a rank", () => {
    const kingside = [{ from: "e1", to: "g1" }, { from: "h1", to: "f1" }] as const;
    const [king, rook] = shapesOf(kingside).map((s) => s.shape);
    // The king's goes east, so its right is down the board; the rook's goes west, so its right is up.
    near(king!.tail, [4.5 + TAIL_GAP, 7.5 + APART]);
    near(king!.tip, [6.5 - TIP_GAP, 7.5 + APART]);
    near(rook!.tail, [7.5 - TAIL_GAP, 7.5 - APART]);
    near(rook!.tip, [5.5 + TIP_GAP, 7.5 - APART]);
    expect(king!.tail[1] - rook!.tail[1]).toBeCloseTo(0.2, 6);
    // The same on the queen's side, and for Black: the arrows keep their directions.
    for (const pair of [[{ from: "e1", to: "c1" }, { from: "a1", to: "d1" }], [{ from: "e8", to: "g8" }, { from: "h8", to: "f8" }], [{ from: "e8", to: "c8" }, { from: "a8", to: "d8" }]] as const) {
      const [a, b] = shapesOf(pair).map((s) => s.shape);
      expect(Math.abs(a!.tail[1] - b!.tail[1])).toBeCloseTo(0.2, 6);
      expect(Math.sign(a!.tip[0] - a!.tail[0])).toBe(-Math.sign(b!.tip[0] - b!.tail[0]));
    }
  });

  it("leaves an arrow alone unless another shares its line", () => {
    const alone = { from: "g1", to: "f3" } as const;
    expect(shapesOf([alone])[0]!.shape).toEqual(shapeOf(alone));
    // Two on different lines are drawn where they go.
    const two = shapesOf([alone, { from: "e7", to: "e5" }]);
    expect(two[0]!.shape).toEqual(shapeOf(alone));
    expect(two[1]!.shape).toEqual(shapeOf({ from: "e7", to: "e5" }));
    // One that goes nowhere is left out.
    expect(shapesOf([{ from: "e4", to: "e4" }])).toEqual([]);
  });

  it("draws no arrow that goes nowhere", () => {
    expect(shapeOf({ from: "e4", to: "e4" })).toBeNull();
  });
});
