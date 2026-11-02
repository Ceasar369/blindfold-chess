import { describe, expect, it } from "vitest";
import { fromWords, moveByHand, put, startingPosition, takeOff, type Position } from "../positions/index.ts";
import { playLine } from "../rules/index.ts";
import { gradePosition, squaresRight } from "./index.ts";

const after = (line: string, start: Position = startingPosition()) => playLine(start, line.split(" ")).positions.at(-1)!;

describe("Position grader on 4.2.1's examples", () => {
  it("L1: Black's rook on a1, not b1: 5 of 6, the file beside", () => {
    const right = fromWords("White: king h2, rook f5, pawn h3. Black: king g7, rook b1, pawn h6.");
    const g = gradePosition(moveByHand(right, "b1", "a1").board, right.board);
    expect(g.whole).toBe(false);
    expect([g.piecesRight, g.pieces]).toEqual([5, 6]);
    expect(g.pairs).toEqual([{ piece: { side: "black", kind: "rook" }, placed: "a1", belongs: "b1", kind: "file beside" }]);
    expect(gradePosition(right.board, right.board)).toMatchObject({ whole: true, piecesRight: 6, pieces: 6 });
  });

  it("L1: White's pawn added on g2, nothing left out: 5 of 6", () => {
    const right = fromWords("White: king h2, rook f5, pawn h3. Black: king g7, rook b1, pawn h6.");
    const g = gradePosition(put(right, "g2", { side: "white", kind: "pawn" }).board, right.board);
    expect(g.wrong).toEqual([{ square: "g2", built: { side: "white", kind: "pawn" }, right: null, verdict: "added" }]);
    expect(g.pairs).toEqual([]);
    expect(g.piecesRight).toBe(5);
  });

  it("L2: White's knight on h6, not a6: 8 of 9, the files reversed; and a bishop for the rook on d1", () => {
    const right = fromWords("White: king g2, knight a6, pawns f4, g4 and h3. Black: king g7, rook d1, pawns g6 and h7.");
    const g = gradePosition(moveByHand(right, "a6", "h6").board, right.board);
    expect([g.piecesRight, g.pieces]).toEqual([8, 9]);
    expect(g.pairs[0]).toMatchObject({ placed: "h6", belongs: "a6", kind: "files reversed" });
    const bishop = gradePosition(put(right, "d1", { side: "black", kind: "bishop" }).board, right.board);
    expect(bishop.wrong).toEqual([{ square: "d1", built: { side: "black", kind: "bishop" }, right: { side: "black", kind: "rook" }, verdict: "wrong piece" }]);
    expect(bishop.piecesRight).toBe(8);
  });

  it("L3: Black's rook and bishop swapped: 10 of 12", () => {
    const right = fromWords("White: king h1, rooks e6 and f1, pawns c4, g2 and h2. Black: king g8, rook d3, bishop c5, pawns a6, g4 and h6.");
    let built = put(right, "c5", { side: "black", kind: "rook" });
    built = put(built, "d3", { side: "black", kind: "bishop" });
    const g = gradePosition(built.board, right.board);
    expect(g.swaps).toEqual([["c5", "d3"]]);
    expect(g.pairs).toEqual([]);
    expect([g.piecesRight, g.pieces]).toEqual([10, 12]);
  });

  it("L4: White's pawn on f7, where Black's stands: 5 of 6, the wrong side", () => {
    const right = fromWords("White: king e1, queen e2, pawn g3. Black: king g6, bishop c4, pawn f7.");
    const g = gradePosition(put(right, "f7", { side: "white", kind: "pawn" }).board, right.board);
    expect(g.wrong.map((w) => [w.square, w.verdict])).toEqual([["f7", "wrong side"]]);
    expect(g.piecesRight).toBe(5);
  });

  it("L5: Black's pawn on h6 left out: 8 of 9", () => {
    const right = fromWords("White: king f1, rooks d1 and d3, pawn a2. Black: king g4, pawns a7, d4, h6 and h7.");
    const g = gradePosition(takeOff(right, "h6").board, right.board);
    expect(g.wrong.map((w) => [w.square, w.verdict])).toEqual([["h6", "left out"]]);
    expect([g.piecesRight, g.pieces]).toEqual([8, 9]);
  });

  it("L6: White's pawn on h4, not h3: 8 of 9, the rank beside", () => {
    const right = fromWords("White: king b1, rook b5, pawns b2, g4 and h3. Black: king d3, rook c8, pawns g5 and h7.");
    const typed = fromWords("White: king b1, rook b5, pawns b2, g4 and h4. Black: king d3, rook c8, pawns g5 and h7.");
    const g = gradePosition(typed.board, right.board);
    expect(g.pairs[0]).toMatchObject({ placed: "h4", belongs: "h3", kind: "rank beside" });
    expect(g.piecesRight).toBe(8);
  });
});

describe("Position grader on 4.3's examples", () => {
  const italian = after("e4 e5 Nf3 Nc6 Bc4");

  it("the Italian Game's bishop on b5: not whole", () => {
    const g = gradePosition(moveByHand(italian, "c4", "b5").board, italian.board);
    expect(g.whole).toBe(false);
    expect(g.pairs[0]).toMatchObject({ placed: "b5", belongs: "c4" });
    expect(gradePosition(italian.board, italian.board).whole).toBe(true);
  });

  it("the Italian Game's mistakes: the bishop on d4, c3, f5, f4; the knight on f6", () => {
    const kind = (from: "c4" | "f3", to: "d4" | "c3" | "f5" | "f4" | "f6") => gradePosition(moveByHand(italian, from, to).board, italian.board).pairs[0]!.kind;
    expect(kind("c4", "d4")).toBe("file beside");
    expect(kind("c4", "c3")).toBe("rank beside");
    expect(kind("c4", "f5")).toBe("board turned");
    expect(kind("c4", "f4")).toBe("files reversed");
    expect(kind("f3", "f6")).toBe("ranks reversed");
  });

  it("the Sicilian Defense, White's pawn left on d2", () => {
    const sicilian = after("e4 c5 Nf3 d6 d4 cxd4 Nxd4");
    const g = gradePosition(put(sicilian, "d2", { side: "white", kind: "pawn" }).board, sicilian.board);
    expect(g.wrong.map((w) => [w.square, w.verdict])).toEqual([["d2", "added"]]);
  });

  it("the Slav Defense, Black's pawn on c7, not c6: the rank beside", () => {
    const slav = after("d4 d5 c4 c6");
    const g = gradePosition(moveByHand(slav, "c6", "c7").board, slav.board);
    expect(g.pairs[0]).toMatchObject({ placed: "c7", belongs: "c6", kind: "rank beside" });
  });
});

describe("Position grader on 5.2.1's examples", () => {
  it("L1: 7 of 9 squares", () => {
    const right = after("e4 e5 Nf3 Nf6 Nxe5 Nc6");
    expect(squaresRight(right.board, right.board)).toEqual({ changed: 9, right: 9 });
    let built = moveByHand(right, "e5", "f3");
    built = put(built, "e5", { side: "black", kind: "pawn" });
    expect(squaresRight(built.board, right.board)).toEqual({ changed: 9, right: 7 });
  });

  it("L2: Black's queen on d5: 4 of 6 squares", () => {
    const right = after("e4 d5 exd5 Qxd5 Nc3 Qe6+");
    expect(squaresRight(moveByHand(right, "e6", "d5").board, right.board)).toEqual({ changed: 6, right: 4 });
  });

  it("L3: Black's bishop on b4: 15 of 17 squares", () => {
    const right = after("e4 e5 Nf3 Nc6 Bc4 Bc5 b4 Bxb4 c3 Bc5 d4");
    expect(squaresRight(moveByHand(right, "c5", "b4").board, right.board)).toEqual({ changed: 17, right: 15 });
  });

  it("L4: the rook left on h8: 16 of 18 squares; the queen and bishop swapped: 16 of 18", () => {
    const right = after("e4 e5 Nf3 Nc6 Nc3 Bc5 Nd5 Nf6 Nxf6+ Qxf6 Bc4 O-O");
    expect(squaresRight(moveByHand(right, "f8", "h8").board, right.board)).toEqual({ changed: 18, right: 16 });
    let swapped = put(right, "c5", { side: "black", kind: "queen" });
    swapped = put(swapped, "f6", { side: "black", kind: "bishop" });
    expect(squaresRight(swapped.board, right.board)).toEqual({ changed: 18, right: 16 });
    expect(gradePosition(swapped.board, right.board).swaps).toEqual([["c5", "f6"]]);
  });

  it("L5: Black's knight on c6 and White's on e5: 20 of 22 squares", () => {
    const right = after("e4 c5 d4 cxd4 Qxd4 Nc6 Qc3 a6 Nf3 d6 Bc4 e6 O-O Nf6 Nbd2 g6 e5 dxe5 Nxe5 Nxe5");
    let built = put(right, "c6", { side: "black", kind: "knight" });
    built = put(built, "e5", { side: "white", kind: "knight" });
    expect(squaresRight(built.board, right.board)).toEqual({ changed: 22, right: 20 });
  });
});
