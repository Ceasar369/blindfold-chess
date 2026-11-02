import { describe, expect, it } from "vitest";
import { at, between, colourOf, fileNumber, lineOf, mirror, ranksReversed, SQUARES, turned } from "./index.ts";

describe("Squares", () => {
  it("holds 64 squares", () => {
    expect(SQUARES).toHaveLength(64);
    expect(new Set(SQUARES).size).toBe(64);
  });

  it("gives f5's file, rank and colour: f is file 6, and 6 + 5 = 11 is odd", () => {
    expect(fileNumber("f5")).toBe(6);
    expect(colourOf("f5")).toBe("light");
  });

  it("names the colours the pages name", () => {
    expect(colourOf("a1")).toBe("dark");
    expect(colourOf("c7")).toBe("dark"); // 3 + 7 = 10 is even
    expect(colourOf("h7")).toBe("light");
    expect(colourOf("h5")).toBe("light");
    expect(colourOf("e4")).toBe("light");
    expect(colourOf("e6")).toBe("light");
  });

  it("gives the squares between, or none", () => {
    expect(between("c4", "f7")).toEqual(["d5", "e6"]);
    expect(between("c4", "e7")).toBeNull();
    expect(between("c1", "g4")).toBeNull();
    expect(between("h3", "e6")).toEqual(["g4", "f5"]);
    expect(between("a1", "e5")).toEqual(["b2", "c3", "d4"]);
    expect(between("d4", "e5")).toEqual([]);
    expect(between("a1", "a8")).toHaveLength(6);
    expect(lineOf("e4", "e4")).toBeNull();
  });

  it("mirrors a to h, keeping the rank", () => {
    expect(mirror("g1")).toBe("b1");
    expect(mirror("f2")).toBe("c2");
    expect(mirror("d5")).toBe("e5");
  });

  it("turns the board and reverses the ranks", () => {
    expect(turned("f6")).toBe("c3");
    expect(turned("b3")).toBe("g6");
    expect(ranksReversed("f6")).toBe("f3");
  });

  it("gives no square off the board", () => {
    expect(at(0, 1)).toBeNull();
    expect(at(8, 8)).toBe("h8");
  });
});
