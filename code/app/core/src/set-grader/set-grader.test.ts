import { describe, expect, it } from "vitest";
import { gradeSet } from "./index.ts";

const E4 = ["c3", "c5", "d2", "d6", "f2", "f6", "g3", "g5"] as const;

describe("Set grader", () => {
  it("calls a set right in any order", () => {
    expect(gradeSet(["g5", "c3", "f6", "d2", "f2", "d6", "c5", "g3"], E4)).toEqual({ right: true, leftOut: [], added: [], pairs: [] });
  });

  it("grades the book's example: a knight on e4, g4 given, g3 left out", () => {
    const g = gradeSet(["c3", "c5", "d2", "d6", "f2", "f6", "g4", "g5"], E4);
    expect(g.right).toBe(false);
    expect(g.leftOut).toEqual(["g3"]);
    expect(g.added).toEqual(["g4"]);
    expect(g.pairs).toEqual([{ added: "g4", leftOut: "g3", kind: "rank beside" }]);
  });

  it("grades the pages' wrong answers", () => {
    // 1.3.1 L2: g4 and f6, for g4 and f5. f5 left out, f6 off the diagonal.
    expect(gradeSet(["g4", "f6"], ["g4", "f5"])).toMatchObject({ leftOut: ["f5"], added: ["f6"], pairs: [{ added: "f6", leftOut: "f5", kind: "rank beside" }] });
    // 1.3.1 L1: d5 alone, for d5 and e6.
    expect(gradeSet(["d5"], ["d5", "e6"])).toMatchObject({ leftOut: ["e6"], added: [], pairs: [] });
    // 2.1.1 L2: h5 too, for f6, f8 and g5. No square left out to pair with.
    expect(gradeSet(["f6", "f8", "g5", "h5"], ["f6", "f8", "g5"])).toMatchObject({ leftOut: [], added: ["h5"], pairs: [] });
    // 2.2.1 L2: d4 and d2, for d4 and a8. d2 is no near miss of a8.
    expect(gradeSet(["d4", "d2"], ["d4", "a8"])).toMatchObject({ leftOut: ["a8"], added: ["d2"], pairs: [] });
    // 2.3.2 L1: d3 and d4, for c3 and d3. d4 is no near miss of c3.
    expect(gradeSet(["d3", "d4"], ["c3", "d3"])).toMatchObject({ leftOut: ["c3"], added: ["d4"], pairs: [] });
    // 3.1.1 L2: e4 and e5, for e4 and d5. e5 is the file beside d5.
    expect(gradeSet(["e4", "e5"], ["e4", "d5"]).pairs).toEqual([{ added: "e5", leftOut: "d5", kind: "file beside" }]);
  });

  it("counts a square given twice once", () => {
    expect(gradeSet(["d5", "d5", "e6"], ["d5", "e6"]).right).toBe(true);
  });

  it("pairs each added square with the left-out one it fits first", () => {
    // f3 is g3's file beside and f2's rank beside: the file beside comes first.
    expect(gradeSet(["f3"], ["f2", "g3"]).pairs).toEqual([{ added: "f3", leftOut: "g3", kind: "file beside" }]);
    // Two added squares never share one left-out square.
    expect(gradeSet(["f3", "h3"], ["g3"]).pairs).toEqual([{ added: "f3", leftOut: "g3", kind: "file beside" }]);
  });
});
