import { describe, expect, it } from "vitest";
import { fromWords, type Position, startingPosition } from "../positions/index.ts";
import { legalMoves, playLine } from "../rules/index.ts";
import { arrowsOf, changes, findMove, moveKind, numbered, numberedLine, readMove, type Written } from "./index.ts";

const castles = (pos: Position, white = true, black = true): Position => ({
  ...pos,
  castling: { white: { king: white, queen: white }, black: { king: black, queen: black } },
});

// The move a move's text names, as its written form, or what Notation says instead.
function named(pos: Position, text: string): string {
  const f = findMove(pos, text);
  if ("found" in f) return f.found.san;
  if ("unclear" in f) return f.line;
  if ("none" in f) return "none";
  return "not counted";
}

const first = (text: string): Written => {
  const r = readMove(text);
  if (r === "not counted") throw new Error(`not counted: ${text}`);
  return r[0]!;
};

describe("Notation: writing", () => {
  it("numbers a move alone, and a line as the game numbers it", () => {
    expect(numbered("Bxh6", "white", 28)).toBe("28. Bxh6");
    expect(numbered("Rb2+", "black", 49)).toBe("49... Rb2+");
    const najdorf3 = playLine(startingPosition(), ["e4", "c5", "Nf3", "d6", "d4"]).positions.at(-1)!;
    const line = playLine(najdorf3, ["cxd4", "Nxd4", "Nf6", "Nc3"]);
    expect(numberedLine(najdorf3, line.moves)).toBe("3... cxd4 4. Nxd4 Nf6 5. Nc3");
    const l5 = playLine(startingPosition(), "e4 c5 d4 cxd4 Qxd4 Nc6 Qc3 a6 Nf3 d6 Bc4 e6 O-O Nf6 Nbd2 g6 e5 dxe5 Nxe5 Nxe5".split(" "));
    expect(numberedLine(startingPosition(), l5.moves)).toBe(
      "1. e4 c5 2. d4 cxd4 3. Qxd4 Nc6 4. Qc3 a6 5. Nf3 d6 6. Bc4 e6 7. O-O Nf6 8. Nbd2 g6 9. e5 dxe5 10. Nxe5 Nxe5",
    );
  });

  it("names the squares a move changes, and its kind", () => {
    const l1 = fromWords("White: king g1, rook e1, pawn g2. Black: king g8, knights b8 and f6. Black to move.");
    const nd5 = legalMoves(l1).find((m) => m.san === "Nd5")!;
    expect(changes(nd5)).toEqual(["f6", "d5"]);
    expect(moveKind(nd5)).toBe("move");
    const l3 = castles(fromWords("White: king g1, queen b3, pawns f2 and g2. Black: king e8, rooks a8 and h8, pawn f7. Black to move."), false);
    const ooo = legalMoves(l3).find((m) => m.san === "O-O-O")!;
    expect(changes(ooo)).toEqual(["e8", "c8", "a8", "d8"]);
    expect(moveKind(ooo)).toBe("castling");
    const l5: Position = { ...fromWords("White: king g1, rook d1, pawns f4 and g2. Black: king g8, rook d8, pawns e4 and h7. Black to move."), enPassant: "f3" };
    const exf3 = legalMoves(l5).find((m) => m.enPassant)!;
    expect(exf3.san).toBe("exf3");
    expect(changes(exf3)).toEqual(["e4", "f3", "f4"]);
    expect(moveKind(exf3)).toBe("en passant");
    const promo = legalMoves(fromWords("White: king a1, pawn e7. Black: king h8.")).find((m) => m.san === "e8=Q+")!;
    expect(changes(promo)).toEqual(["e7", "e8"]);
    expect(moveKind(promo)).toBe("promotion");
    const capture = legalMoves(fromWords("White: king g1, knight c3, pawns d4 and e4. Black: king g8, knight f6, pawns c5 and d5.")).find((m) => m.san === "exd5")!;
    expect(changes(capture)).toEqual(["e4", "d5"]);
    expect(moveKind(capture)).toBe("capture");
    const l4 = legalMoves(fromWords("White: king g1, knights b1 and f3, pawn e4. Black: king g8, rook e8, knight c6, pawn d6.")).find((m) => m.san === "Nbd2")!;
    expect(changes(l4)).toEqual(["b1", "d2"]);
  });

  it("gives a move's arrows: each piece that moves, from where it leaves to where it lands", () => {
    const arrows = (pos: Position, san: string) => arrowsOf(legalMoves(pos).find((m) => m.san.replace(/[+#]$/, "") === san)!);
    // A move, for White and for Black.
    const knight = fromWords("White: king e1, knights c3 and g1. Black: king e8, knight b8, pawn d7.");
    expect(arrows(knight, "Nf3")).toEqual([{ from: "g1", to: "f3" }]);
    const pawn = fromWords("White: king e1, pawn a2. Black: king e8, pawn e7. Black to move.");
    expect(arrows(pawn, "e5")).toEqual([{ from: "e7", to: "e5" }]);
    // Castling: the king's arrow, then the rook's, on both wings, for both colours.
    const white = castles(fromWords("White: king e1, rooks a1 and h1, pawns f2 and g2. Black: king g8, bishop g7, pawn f7."), true, false);
    expect(arrows(white, "O-O")).toEqual([{ from: "e1", to: "g1" }, { from: "h1", to: "f1" }]);
    expect(arrows(white, "O-O-O")).toEqual([{ from: "e1", to: "c1" }, { from: "a1", to: "d1" }]);
    const black = castles(fromWords("White: king g1, queen b3, pawns f2 and g2. Black: king e8, rooks a8 and h8, pawn f7. Black to move."), false, true);
    expect(arrows(black, "O-O")).toEqual([{ from: "e8", to: "g8" }, { from: "h8", to: "f8" }]);
    expect(arrows(black, "O-O-O")).toEqual([{ from: "e8", to: "c8" }, { from: "a8", to: "d8" }]);
    // A promotion shows the pawn's movement, taking or not.
    const promo = fromWords("White: king a1, pawn e7. Black: king h8, rook d8.");
    expect(arrows(promo, "e8=Q")).toEqual([{ from: "e7", to: "e8" }]);
    expect(arrows(promo, "exd8=Q")).toEqual([{ from: "e7", to: "d8" }]);
    // A pawn taken in passing shows the capturing pawn's movement, and none from the pawn taken.
    const passing: Position = { ...fromWords("White: king g1, rook d1, pawns f4 and g2. Black: king g8, rook d8, pawns e4 and h7. Black to move."), enPassant: "f3" };
    expect(arrows(passing, "exf3")).toEqual([{ from: "e4", to: "f3" }]);
    // A capture shows the capturing piece only.
    const capture = fromWords("White: king g1, bishop c4. Black: king a8, pawn f7.");
    expect(arrows(capture, "Bxf7")).toEqual([{ from: "c4", to: "f7" }]);
  });

  it("names the squares each move of 3.1.1 L6's sequence changes", () => {
    const najdorf3 = playLine(startingPosition(), ["e4", "c5", "Nf3", "d6", "d4"]).positions.at(-1)!;
    expect(playLine(najdorf3, ["cxd4", "Nxd4", "Nf6", "Nc3"]).moves.map(changes)).toEqual([["c5", "d4"], ["f3", "d4"], ["g8", "f6"], ["b1", "c3"]]);
  });
});

describe("Notation: reading every form 3.2.1 accepts", () => {
  const l1 = fromWords("White: king e1, knights c3 and g1. Black: king e8, knight b8, pawn d7.");

  it("reads the piece by its letter, either case, or its word", () => {
    for (const t of ["Nf3", "nf3", "N f3", "N-f3", "knight f3", "Knight F three", "knight to f3", "night f3", "Nf3."]) expect(named(l1, t), t).toBe("Nf3");
  });

  it("reads a pawn with no letter, and passes over the word pawn", () => {
    const start = startingPosition();
    expect(named(start, "e4")).toBe("e4");
    expect(named(start, "pawn e4")).toBe("e4");
    expect(named(start, "e four")).toBe("e4");
    expect(first("Pe4")).toMatchObject({ piece: "pawn", pawnLetter: true, to: "e4" });
  });

  it("reads to after a file letter as a 2: rook to e to", () => {
    const pos = fromWords("White: king g1, rook e5. Black: king g8.");
    expect(named(pos, "rook to e to")).toBe("Re2");
  });

  it("reads a capture by x, takes, captures, or nothing", () => {
    const pos = fromWords("White: king g1, bishop b5. Black: king g8, knight c6.");
    for (const t of ["Bxc6", "Bc6", "bishop takes c6", "bishop captures c6", "B takes c6"]) expect(named(pos, t), t).toBe("Bxc6");
    const pawns = fromWords("White: king g1, knight c3, pawns d4 and e4. Black: king g8, knight f6, pawns c5 and d5.");
    for (const t of ["exd5", "ed5", "e takes d5", "E takes D five"]) expect(named(pawns, t), t).toBe("exd5");
    expect(first("xc4")).toMatchObject({ piece: "pawn", fromFile: null, capture: true, to: "c4" });
  });

  it("reads castling in every form", () => {
    const pos = castles(fromWords("White: king e1, rooks a1 and h1, pawns f2 and g2. Black: king g8, bishop g7, pawn f7."), true, false);
    for (const t of ["O-O-O", "0-0-0", "o-o-o", "OOO", "O - O - O", "castles queenside", "queenside castling", "long castling", "castles long", "queen side castling", "long castle"]) {
      expect(named(pos, t), t).toBe("O-O-O");
    }
    for (const t of ["O-O", "0-0", "oo", "castles kingside", "kingside castling", "short castling", "castles short", "short castle"]) {
      expect(named(pos, t), t).toBe("O-O");
    }
    expect(readMove("castles")).toBe("not counted");
  });

  it("reads a promotion and its piece", () => {
    const pos = fromWords("White: king a1, pawn e7. Black: king h1.");
    for (const t of ["e8=Q", "e8Q", "e8=q", "e8 queen", "e8 equals queen", "e8 promotes to queen", "e eight queen"]) expect(named(pos, t), t).toBe("e8=Q");
    expect(named(pos, "e8=N")).toBe("e8=N");
    expect(named(pos, "e8 knight")).toBe("e8=N");
    // 3.2.1 L3: "b one queen" reads as b1=Q.
    const l3 = fromWords("White: king g1, bishop f1, pawns g2 and h2. Black: king g8, rook e8, pawns b2 and h7. Black to move.");
    expect(named(l3, "b one queen")).toBe("b1=Q");
    expect(named(l3, "b1")).toBe("Say which piece your pawn becomes.");
  });

  it("reads a pawn taken in passing, with or without e.p.", () => {
    const pos: Position = { ...fromWords("White: king g1, rook f1, pawns e5 and g2. Black: king g8, rook c8, pawns d5 and h7."), enPassant: "d6" };
    for (const t of ["exd6", "exd6 e.p.", "exd6 ep", "exd6 en passant", "e takes d6 en passant"]) expect(named(pos, t), t).toBe("exd6");
    expect(first("exd6 e.p.").enPassant).toBe(true);
    expect(named(pos, "exd5")).toBe("none");
  });

  it("reads which of two pieces goes, by file or by rank", () => {
    const l4 = fromWords("White: king g1, rooks a1 and a5, pawns f2 and g2. Black: king g8, pawns f7 and h7.");
    expect(named(l4, "R1a3")).toBe("R1a3");
    expect(named(l4, "rook one a three")).toBe("R1a3");
    expect(named(l4, "Ra3")).toBe("Two of your rooks reach a3: say which.");
    const knights = fromWords("White: king g1, knights b1 and f3, pawn e4. Black: king g8, rook e8, knight c6, pawn d6.");
    expect(named(knights, "Nbd2")).toBe("Nbd2");
    expect(named(knights, "Nd2")).toBe("Two of your knights reach d2: say which.");
    expect(named(knights, "Nb1d2")).toBe("Nbd2");
  });

  it("passes over a pinned piece, which needs no telling apart", () => {
    const pinned = fromWords("White: king e1, knights c3 and g1. Black: king g8, bishop b4.");
    expect(named(pinned, "Ne2")).toBe("Ne2");
  });

  it("reads check and mate signs, and their words", () => {
    expect(first("Bxf7+").sign).toBe("+");
    expect(first("bishop takes f7 check").sign).toBe("+");
    for (const t of ["Re8#", "Re8 mate", "Re8 checkmate", "Re8++", "rook e8 mate"]) expect(first(t).sign, t).toBe("#");
    expect(first("Bb5").sign).toBeNull();
    const l5 = fromWords("White: king g1, queen d1, bishop c4, knight f3. Black: king g8, rook e8, pawns f7 and h7.");
    for (const t of ["Bxf7+", "bishop takes f7 check", "Bxf7", "Bf7", "Bxf7#"]) expect(named(l5, t), t).toBe("Bxf7+");
  });

  it("reads the small b as the b-file, and B as the bishop, never the other", () => {
    const pawn = fromWords("White: king g1, bishop f1, pawn b2. Black: king g8, knight c3.");
    expect(named(pawn, "bxc3")).toBe("bxc3");
    expect(named(pawn, "Bxc3")).toBe("none");
    const bishop = fromWords("White: king g1, bishop f1. Black: king g8.");
    expect(named(bishop, "bd3")).toBe("none");
    expect(named(bishop, "Bd3")).toBe("Bd3");
    expect(named(pawn, "B3")).toBe("not counted");
    expect(named(pawn, "b3")).toBe("b3");
    // 3.2.1 L2: "bxc4", the b-pawn, is legal: the challenge judges it wrong.
    const l2 = fromWords("White: king g1, knight f3, pawn c4. Black: king g8, pawns b5 and d5. Black to move.");
    expect(named(l2, "dxc4")).toBe("dxc4");
    expect(named(l2, "bxc4")).toBe("bxc4");
  });

  it("reads a needless square or file, which 3.2.1 calls a miss and chapter 6 passes", () => {
    expect(first("Ngf3")).toMatchObject({ piece: "knight", fromFile: "g", to: "f3" });
    expect(first("Ng1f3")).toMatchObject({ piece: "knight", fromFile: "g", fromRank: "1", to: "f3" });
    expect(named(l1, "Ngf3")).toBe("Nf3");
    expect(named(l1, "Kf3")).toBe("none");
    expect(named(l1, "Ng1")).toBe("none");
  });

  it("counts nothing that names no move: Zf3, N", () => {
    for (const t of ["Zf3", "N", "", "knight", "i3", "takes"]) expect(readMove(t), t).toBe("not counted");
  });
});

describe("Notation: finding the move in chapter 6's examples", () => {
  it("6.1.1 L2: queen h1 mate", () => {
    const pos = fromWords(
      "White: king g1, queen h3, rooks a1 and e2, bishop c4, knight c3, pawns a4, b3, c2, f2 and h2. Black: king h8, queen c6, rook a8, bishop b7, knight f6, pawns a6, c5, e6, f7, g7 and h6. Black to move.",
    );
    expect(named(pos, "queen h1 mate")).toBe("Qh1#");
    expect(named(pos, "Qg2")).toBe("Qg2+");
  });

  it("6.1.1 L4: Rh3, Rg3, and Rf6, a move that is no move", () => {
    const pos = fromWords("White: king f7, rook f3. Black: king h6, rook e4, bishop d4, pawns b6, f4, g5 and h7. White to move.");
    expect(named(pos, "Rh3")).toBe("Rh3#");
    expect(named(pos, "Rg3")).toBe("Rg3");
    expect(named(pos, "Rf6")).toBe("none");
  });

  it("6.1.1 L5: Ne1 after 49. Rxc2, and c1=Q, gone", () => {
    const before = fromWords("White: king d3, rook c4, pawn h4. Black: king g6, knight f3, pawns c2 and f5. White to move.");
    const after = playLine(before, ["Rxc2"]).positions[0]!;
    expect(named(after, "Ne1")).toBe("Ne1+");
    expect(named(after, "c1=Q")).toBe("none");
  });

  it("6.3.1 L1: b8 asks which piece", () => {
    const pos = fromWords("White: king b3, rook d6, pawns b6 and c4. Black: king f3, rook h2, pawns g5 and h4. White to move.");
    const at47 = playLine(pos, ["b7", "g4"]).positions[1]!;
    expect(named(at47, "b8")).toBe("Say which piece your pawn becomes.");
    expect(named(at47, "b8=Q")).toBe("b8=Q");
  });
});
