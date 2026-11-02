import { describe, expect, it } from "vitest";
import {
  besidesKings, fromFen, fromPieces, fromWords, inWords, mirrorPosition, moveByHand, piecesOf, put, standsFromValue,
  standsOn, standsValue, standsWords, startingPosition, takeOff, THIRTEEN, toFen,
} from "./index.ts";

describe("Positions", () => {
  it("writes the book's example in the pages' words", () => {
    const pos = fromPieces([
      { side: "white", kind: "pawn", square: "f2" },
      { side: "white", kind: "king", square: "g1" },
      { side: "white", kind: "pawn", square: "e4" },
      { side: "white", kind: "queen", square: "e2" },
    ]);
    expect(inWords(pos)).toBe("White: king g1, queen e2, pawns e4 and f2.");
    expect(inWords(mirrorPosition(pos))).toBe("White: king b1, queen d2, pawns c2 and d4.");
  });

  it("writes and reads back every position the pages give in words", () => {
    const pages = [
      "White: king g1, queen e2, pawns e4 and f2. Black: king g8, rook e8, bishop b5, knight h5.",
      "White: king g1, queen c2, rook h1, bishop d3, knight g5, pawn h2. Black: king g8, pawn h7.",
      "White: king h2, rook f5, pawn h3. Black: king g7, rook b1, pawn h6.",
      "White: king b1, rook b5, pawns b2, g4 and h3. Black: king d3, rook c8, pawns g5 and h7.",
      "White: king e1, queen d1, rooks a1 and h1, bishops c1 and f1, knights b1 and f3, pawns a2, b2, c2, d4, e4, f2, g2 and h2. Black: king e8, queen d8, rooks a8 and h8, bishops c8 and f8, knights b8 and g8, pawns a7, b7, c5, d6, e7, f7, g7 and h7.",
      "White: king b4. Black: king g8, queen f7. Black to move.",
      "White: king f7, rook f3. Black: king h6, rook e4, bishop d4, pawns b6, f4, g5 and h7. White to move.",
    ];
    for (const words of pages) {
      const pos = fromWords(words);
      expect(inWords(pos, { toMove: words.endsWith("to move.") })).toBe(words);
    }
    expect(fromWords("White: king b4. Black: king g8, queen f7. Black to move.").turn).toBe("black");
    expect(() => fromWords("white Kb1 Rb5")).toThrow();
  });

  it("makes the starting position, as 4.1.1 writes it", () => {
    const start = startingPosition();
    expect(inWords(start)).toBe(
      "White: king e1, queen d1, rooks a1 and h1, bishops c1 and f1, knights b1 and g1, pawns a2, b2, c2, d2, e2, f2, g2 and h2. Black: king e8, queen d8, rooks a8 and h8, bishops c8 and f8, knights b8 and g8, pawns a7, b7, c7, d7, e7, f7, g7 and h7.",
    );
    expect(toFen(start)).toBe("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
    expect(besidesKings(start)).toBe(30);
    expect(standsOn(start, "c8")).toEqual({ side: "black", kind: "bishop" });
    expect(standsOn(start, "e4")).toBeNull();
  });

  it("mirrors the pages' positions a to h", () => {
    // 4.1.1 L2's example, mirrored.
    expect(inWords(mirrorPosition(fromWords("White: king a5, rook d4, knight f5. Black: king e6, pawns f6 and h5.")))).toBe(
      "White: king h5, rook e4, knight c5. Black: king d6, pawns a5 and c6.",
    );
    // 4.2.1 L1's example, mirrored.
    expect(inWords(mirrorPosition(fromWords("White: king h2, rook f5, pawn h3. Black: king g7, rook b1, pawn h6.")))).toBe(
      "White: king a2, rook c5, pawn a3. Black: king b7, rook g1, pawn a6.",
    );
    // 6.3.1 L1's example, mirrored.
    expect(inWords(mirrorPosition(fromWords("White: king b3, rook d6, pawns b6 and c4. Black: king f3, rook h2, pawns g5 and h4. White to move.")), { toMove: true })).toBe(
      "White: king g3, rook e6, pawns f4 and g6. Black: king c3, rook a2, pawns a4 and b5. White to move.",
    );
    // 6.2.1 L1's example, mirrored.
    expect(inWords(mirrorPosition(fromWords("White: king e1, queen d1. Black: king e5.")))).toBe("White: king d1, queen e1. Black: king d5.");
  });

  it("puts, takes off and moves a piece, as a hand does", () => {
    let pos = fromWords("White: king e1. Black: king e8.");
    pos = put(pos, "d4", { side: "white", kind: "knight" });
    pos = moveByHand(pos, "d4", "e8");
    expect(inWords(pos)).toBe("White: king e1, knight e8.");
    pos = takeOff(pos, "e8");
    expect(piecesOf(pos)).toEqual([{ side: "white", kind: "king", square: "e1" }]);
  });

  it("reads and writes FEN", () => {
    const fen = "r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4";
    expect(toFen(fromFen(fen))).toBe(fen);
    expect(fromFen("8/8/8/3pP3/8/8/8/4K2k w - d6 0 1").enPassant).toBe("d6");
    expect(() => fromFen("8/8/8 w - - 0 1")).toThrow();
  });

  it("names the 13 answers", () => {
    expect(THIRTEEN.map(standsWords)).toEqual([
      "White's king", "White's queen", "White's rook", "White's bishop", "White's knight", "White's pawn",
      "Black's king", "Black's queen", "Black's rook", "Black's bishop", "Black's knight", "Black's pawn",
      "Empty",
    ]);
    for (const s of THIRTEEN) expect(standsFromValue(standsValue(s))).toEqual(s);
    expect(standsFromValue("purple-king")).toBeUndefined();
  });
});
