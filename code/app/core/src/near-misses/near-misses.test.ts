import { describe, expect, it } from "vitest";
import { nearMiss, nearMissesOf } from "./index.ts";

describe("Near misses", () => {
  it("names f6's five, as 1.1.1's card does", () => {
    expect(nearMiss("f6", "e6")).toBe("file beside");
    expect(nearMiss("f6", "f5")).toBe("rank beside");
    expect(nearMiss("f6", "c3")).toBe("board turned");
    expect(nearMiss("f6", "c6")).toBe("files reversed");
    expect(nearMiss("f6", "f3")).toBe("ranks reversed");
    expect(nearMiss("f6", "a1")).toBeNull();
    expect(nearMiss("f6", "f6")).toBeNull();
  });

  it("names b3's five, as 1.1.2's card does", () => {
    expect(nearMiss("b3", "c3")).toBe("file beside");
    expect(nearMiss("b3", "b4")).toBe("rank beside");
    expect(nearMiss("b3", "g6")).toBe("board turned");
    expect(nearMiss("b3", "g3")).toBe("files reversed");
    expect(nearMiss("b3", "b6")).toBe("ranks reversed");
  });

  it("names 1.1.2's wrong examples, and 2.1.1's", () => {
    expect(nearMiss("e5", "e6")).toBe("rank beside");
    expect(nearMiss("g2", "g7")).toBe("ranks reversed");
    expect(nearMiss("d2", "e7")).toBe("board turned");
    expect(nearMiss("f3", "c3")).toBe("files reversed");
    expect(nearMiss("f6", "f5")).toBe("rank beside");
    expect(nearMiss("f8", "g8")).toBe("file beside"); // 2.3.2 L3
    expect(nearMiss("f8", "c1")).toBe("board turned");
  });

  it("takes the first of the five that fits", () => {
    // d5 is d4's rank beside and its ranks reversed: the rank beside comes first.
    expect(nearMiss("d4", "d5")).toBe("rank beside");
    // e4 is d4's file beside and its files reversed: the file beside comes first.
    expect(nearMiss("d4", "e4")).toBe("file beside");
  });

  it("names the pages' other examples", () => {
    expect(nearMiss("g3", "f3")).toBe("file beside"); // 2.1.1
    expect(nearMiss("g3", "b6")).toBe("board turned");
    expect(nearMiss("g3", "b3")).toBe("files reversed");
    expect(nearMiss("g3", "g6")).toBe("ranks reversed");
    expect(nearMiss("a8", "h1")).toBe("board turned"); // 2.2.1
    expect(nearMiss("a8", "h8")).toBe("files reversed");
    expect(nearMiss("a8", "a1")).toBe("ranks reversed");
    expect(nearMiss("f3", "c6")).toBe("board turned"); // 3.2.1
    expect(nearMiss("f3", "c3")).toBe("files reversed");
    expect(nearMiss("f3", "f6")).toBe("ranks reversed");
    expect(nearMiss("c4", "f5")).toBe("board turned"); // 4.3.1
    expect(nearMiss("c4", "f4")).toBe("files reversed");
  });

  it("lists a square's near misses, for 3.2.1 L1's choices", () => {
    const b3 = nearMissesOf("b3");
    expect(b3["file beside"]).toEqual(["a3", "c3"]);
    expect(b3["rank beside"]).toEqual(["b2", "b4"]);
    expect(b3["board turned"]).toEqual(["g6"]);
    expect(nearMissesOf("a1")["file beside"]).toEqual(["b1"]);
  });
});
