import { describe, expect, it } from "vitest";
import { fromWords, type Position, startingPosition } from "../positions/index.ts";
import { playLine } from "../rules/index.ts";
import { follow, historyOf, lastChange, lastTakenOff, moveWords, pathOf, standsAfter, type Thread } from "./index.ts";

const thread = (line: string, start: Position = startingPosition()): Thread => follow(start, playLine(start, line.split(" ")).moves);
const said = (t: Thread, taken: { ply: number } | null) => (taken ? moveWords(t, taken.ply) : null);

describe("Thread finder", () => {
  it("finds the book's example: White's pawn for e5 gives 4... dxe5", () => {
    const t = thread("e4 e5 Nf3 d6 d4 Nc6 dxe5 dxe5");
    expect(standsAfter(t, "e5")).toEqual({ side: "black", kind: "pawn" });
    expect(said(t, lastTakenOff(t, "e5", { side: "white", kind: "pawn" }))).toBe("4... dxe5");
    expect(said(t, lastTakenOff(t, "d6", { side: "black", kind: "pawn" }))).toBe("4... dxe5");
    expect(said(t, lastChange(t, "e5"))).toBe("4... dxe5");
    expect(said(t, lastChange(t, "c6"))).toBe("3... Nc6");
    expect(said(t, lastChange(t, "d7"))).toBe("2... d6");
    expect(standsAfter(t, "c7")).toEqual({ side: "black", kind: "pawn" });
    expect(lastChange(t, "a1")).toBeNull();
  });

  it("5.1.1 L2: f3 is empty since 4. Nxd4", () => {
    const t = thread("Nf3 Nc6 Nc3 e5 d4 exd4 Nxd4 Qf6");
    expect(standsAfter(t, "f3")).toBeNull();
    expect(said(t, lastTakenOff(t, "f3", { side: "white", kind: "knight" }))).toBe("4. Nxd4");
    expect(standsAfter(t, "f6")).toEqual({ side: "black", kind: "queen" });
  });

  it("5.1.1 L3: d8 held Black's queen, White's queen, then Black's king", () => {
    const t = thread("e4 e6 Nf3 Nc6 Nc3 e5 d4 d6 dxe5 dxe5 Qxd8+ Kxd8");
    expect(said(t, lastChange(t, "d8"))).toBe("6... Kxd8");
    expect(said(t, lastTakenOff(t, "d8", { side: "black", kind: "queen" }))).toBe("6. Qxd8+");
    const kinds = historyOf(t, "d8").map((s) => (s ? `${s.side} ${s.kind}` : "empty"));
    expect([...new Set(kinds)]).toEqual(["black queen", "white queen", "black king"]);
  });

  it("5.1.1 L4: f1 is empty since 8. Re1", () => {
    const t = thread("e4 d5 exd5 Qxd5 Nc3 Qa5 Nf3 c6 Bc4 Nf6 O-O Bf5 d3 e6 Re1 Bb4 Bd2 O-O a3 Bd6");
    expect(standsAfter(t, "f1")).toBeNull();
    expect(said(t, lastTakenOff(t, "f1", { side: "white", kind: "rook" }))).toBe("8. Re1");
  });

  it("3.1.1 L6: the pawn on c5 left c7 at move 1", () => {
    const t = thread("e4 c5 Nf3 d6 d4 cxd4");
    expect(said(t, lastTakenOff(t, "c7", { side: "black", kind: "pawn" }))).toBe("1... c5");
  });

  it("6.3.1 L6: the knight from c6 was taken on f3 at 13. Bxf3", () => {
    const t = thread("e4 e5 d3 Nc6 Nf3 Nf6 a3 d5 exd5 Nxd5 Be2 Be6 O-O Be7 h3 O-O Nc3 Nf6 Be3 Qd7 Qe1 Nd4 Bd1 Nxf3+ Bxf3 c6 Rd1 Bd6 d4");
    const path = pathOf(t, "c6", 4)!;
    expect(path.piece).toEqual({ side: "black", kind: "knight" });
    expect(path.moved.map((m) => moveWords(t, m.ply))).toEqual(["11... Nd4", "12... Nxf3+"]);
    expect(moveWords(t, path.takenBy!.ply)).toBe("13. Bxf3");
    expect(path.takenOn).toBe("f3");
  });

  it("6.1.1 L5: the pawn on c2 was taken by 49. Rxc2", () => {
    const start = { ...fromWords("White: king d3, rook c4, pawn h4. Black: king g6, knight f3, pawns c2 and f5. White to move."), moveNumber: 49 };
    const t = thread("Rxc2", start);
    const path = pathOf(t, "c2", 0)!;
    expect(moveWords(t, path.takenBy!.ply)).toBe("49. Rxc2");
    expect(pathOf(t, "f3", 0)).toMatchObject({ takenBy: null, standsOn: "f3" });
  });

  it("follows castling's rook, a pawn taken in passing, and a promotion", () => {
    const t = thread("e4 e5 Nf3 Nc6 Bc4 Bc5 O-O");
    expect(said(t, lastTakenOff(t, "h1", { side: "white", kind: "rook" }))).toBe("4. O-O");
    expect(pathOf(t, "h1", 0)).toMatchObject({ standsOn: "f1" });
    const ep = thread("e4 a6 e5 d5 exd6");
    expect(said(ep, lastTakenOff(ep, "d5", { side: "black", kind: "pawn" }))).toBe("3. exd6");
    const promo = follow(fromWords("White: king a1, pawn e7. Black: king h1."), playLine(fromWords("White: king a1, pawn e7. Black: king h1."), ["e8=Q"]).moves);
    expect(standsAfter(promo, "e8")).toEqual({ side: "white", kind: "queen" });
    expect(pathOf(promo, "e7", 0)).toMatchObject({ standsOn: "e8", takenBy: null });
  });
});
