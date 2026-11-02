import { Chess, validateFen } from "chess.js";
import { describe, expect, it } from "vitest";
import { fromFen, fromWords, inWords, startingPosition } from "../positions/index.ts";
import { gameEnd, isCheck, isCheckmate, isDead, isLegalPosition, isStalemate, legalMoves, legalProblem, matingMoves, play, playLine } from "./index.ts";

const START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

// Each hole the book names, tested first, on chess.js alone.
describe("chess.js's holes, as the book names them", () => {
  it("a pawn on an edge rank: refused by its check, a crash once the check is skipped (#577)", () => {
    expect(validateFen("4k2P/8/8/8/8/8/8/4K3 w - - 0 1").ok).toBe(false);
    expect(() => new Chess("4k2P/8/8/8/8/8/8/4K3 w - - 0 1")).toThrow(/edge/);
    expect(() => new Chess("4k2P/8/8/8/8/8/8/4K3 w - - 0 1", { skipValidation: true }).moves()).toThrow();
    const put = new Chess("4k3/8/8/8/8/8/8/4K3 w - - 0 1");
    put.put({ type: "p", color: "w" }, "h8");
    expect(() => put.moves()).toThrow();
  });

  it("the side not to move left in check: loaded without a word (#558)", () => {
    // White to move, and Black's king on e8 stands in check from the rook on e1.
    const fen = "4k3/8/8/8/8/8/8/4R1K1 w - - 0 1";
    expect(validateFen(fen).ok).toBe(true);
    expect(() => new Chess(fen)).not.toThrow();
  });

  it("loose move texts: a needless letter or square, and signs passed over", () => {
    expect(new Chess(START).move("Ngf3").san).toBe("Nf3");
    expect(new Chess(START).move("Ng1f3").san).toBe("Nf3");
    expect(new Chess(START).move("Nf3#").san).toBe("Nf3");
    const bishop = "6k1/5p1p/8/8/2B5/8/8/6K1 w - - 0 1";
    expect(new Chess(bishop).move("Bf7").san).toBe("Bxf7+");
    expect(new Chess(bishop).move("Bxf7", { strict: true }).san).toBe("Bxf7+");
    expect(new Chess(bishop).move("Bxf7#", { strict: true }).san).toBe("Bxf7+");
  });
});

describe("Rules", () => {
  it("refuses what chess.js would mishandle", () => {
    expect(legalProblem(fromFen("4k2P/8/8/8/8/8/8/4K3 w - - 0 1"))).toMatch(/pawn stands on h8/);
    expect(legalProblem(fromFen("4k3/8/8/8/8/8/8/4R1K1 w - - 0 1"))).toMatch(/not to move stands in check/);
    expect(legalProblem(fromWords("White: knight e4."))).toMatch(/kings/);
    expect(() => legalMoves(fromFen("4k3/8/8/8/8/8/8/4R1K1 w - - 0 1"))).toThrow();
    expect(isLegalPosition(startingPosition())).toBe(true);
  });

  // A step-screen run drew White's king on g2 in check from the queens on b2
  // and e4 and the bishop on h1. No move gives three checks at once.
  it("refuses a king in check from three pieces, and takes one in check from two", () => {
    expect(legalProblem(fromFen("k7/8/8/8/4q3/8/1q4K1/7b w - - 0 1"))).toBe("the side to move stands in check from 3 pieces on g2");
    expect(legalProblem(fromFen("k7/8/8/8/4q3/8/1q4K1/8 w - - 0 1"))).toBeNull();
  });

  it("lists the starting position's 20 moves, and plays one", () => {
    expect(legalMoves(startingPosition())).toHaveLength(20);
    const after = play(startingPosition(), { from: "e2", to: "e4" })!;
    expect(after.turn).toBe("black");
    expect(after.board.e4).toEqual({ side: "white", kind: "pawn" });
    expect(play(startingPosition(), { from: "e2", to: "e5" })).toBeNull();
  });

  it("handles castling, a pawn taken in passing, and promotion", () => {
    const castling = legalMoves(fromFen("r3k2r/8/8/8/8/8/8/R3K2R b KQkq - 0 1")).filter((m) => m.castle);
    expect(castling.map((m) => [m.san, m.castle])).toEqual([["O-O", "king"], ["O-O-O", "queen"]]);
    // 3.1.1 L5: White's last move f2 to f4, then Black's exf3.
    const ep = legalMoves(fromFen("3r2k1/7p/8/8/4pP2/8/6P1/3R2K1 b - f3 0 1")).find((m) => m.enPassant)!;
    expect([ep.from, ep.to, ep.san]).toEqual(["e4", "f3", "exf3"]);
    // 3.2.1 L3: b2 to b1, a queen.
    const promo = legalMoves(fromWords("White: king g1, bishop f1, pawns g2 and h2. Black: king g8, rook e8, pawns b2 and h7. Black to move."))
      .filter((m) => m.from === "b2");
    expect(promo.map((m) => m.san).sort()).toEqual(["b1=B", "b1=N", "b1=Q", "b1=R"]);
  });

  it("tells check, mate, stalemate and a dead position on 6.2.1's examples", () => {
    // L1: 1. Qd5+ Kxd5 leaves king against king.
    const l1 = fromWords("White: king e1, queen d1. Black: king e5. White to move.");
    const thrown = playLine(l1, ["Qd5+", "Kxd5"]);
    expect(isDead(thrown.positions[1]!)).toBe(true);
    expect(gameEnd(l1, thrown.moves)).toBe("dead");
    const won = playLine(l1, ["Qd7", "Kf6", "Ke2", "Kg5", "Qd6", "Kf5", "Kf3", "Kg5", "Qe6", "Kh5", "Kf4", "Kh4", "Qg4#"]);
    expect(isCheckmate(won.positions.at(-1)!)).toBe(true);
    expect(gameEnd(l1, won.moves)).toBe("checkmate");
    // L3: 7. Qf7 stalemates; 7. Kf6 keeps the win.
    const l3 = fromWords("White: king g1, queen c3. Black: king d6. White to move.");
    const before7 = playLine(l3, ["Kf2", "Kd5", "Kf3", "Kd6", "Ke4", "Ke7", "Qc6", "Kf8", "Qd7", "Kg8", "Ke5", "Kh8"]);
    const at7 = before7.positions.at(-1)!;
    expect(inWords(at7)).toBe("White: king e5, queen d7. Black: king h8.");
    expect(isStalemate(play(at7, { from: "d7", to: "f7" })!)).toBe(true);
    expect(isStalemate(play(at7, { from: "e5", to: "f6" })!)).toBe(false);
    expect(isCheck(fromWords("White: king g1, rook e4. Black: king e8. Black to move."))).toBe(true);
  });

  it("lists the moves that mate: 34. Rxe8 in puzzle 0030b", () => {
    const board = fromWords(
      "White: king h1, queen h3, rooks d1 and g1, knight f3, pawns a2, g2 and h4. Black: king g8, queen b2, rooks e2 and g4, bishop e4, knight f6, pawns a5, b5, f7, g7 and h7. White to move.",
    );
    const after = playLine(board, ["Rd8+", "Ne8"]).positions.at(-1)!;
    expect(matingMoves(after).map((m) => m.san)).toContain("Rxe8#");
  });

  it("lists 6.3.1 L5's mates at once: 17. Qg5# and 17. Qg4#", () => {
    const line = "e4 c5 f4 d6 c4 Nf6 d3 Nc6 Nf3 g6 Be2 Bh6 O-O Nh5 g3 Bg7 Nc3 Bd4+ Nxd4 Nxd4 Nd5 O-O Bxh5 gxh5 Qxh5 Kh8 f5 e6 Bg5 Qe8 Bf6+ Kg8".split(" ");
    const at17 = playLine(startingPosition(), line).positions.at(-1)!;
    expect(matingMoves(at17).map((m) => m.san).sort()).toEqual(["Qg4#", "Qg5#"]);
  });

  it("draws at a position's third appearance, and at 50 moves with no capture or pawn move", () => {
    const shuffle = ["Nf3", "Nf6", "Ng1", "Ng8", "Nf3", "Nf6", "Ng1", "Ng8"];
    const { moves } = playLine(startingPosition(), shuffle);
    expect(gameEnd(startingPosition(), moves.slice(0, 7))).toBeNull();
    expect(gameEnd(startingPosition(), moves)).toBe("repetition");
    const late = fromFen("4k3/8/8/8/8/8/8/R3K3 w - - 99 80");
    const one = legalMoves(late).find((m) => m.san === "Ra2")!;
    expect(gameEnd(late, [one])).toBe("fifty moves");
  });

  it("lists where 2.3.2's pawns and kings may move", () => {
    const to = (words: string, from: string) => legalMoves(fromWords(words)).filter((m) => m.from === from).map((m) => m.to).sort();
    expect(to("White: king e1, bishop e3, pawn d2. Black: king e8, knight c3, pawn d4.", "d2")).toEqual(["c3", "d3"]);
    expect(to("White: king g1, pawns f2 and g2. Black: king g8, rook h8, bishop c5.", "g1")).toEqual(["f1"]);
    expect(to("White: king e1, rook e4, bishop g4. Black: king e8, knight b8, pawn f7. Black to move.", "e8")).toEqual(["d8", "f8"]);
    expect(to("White: king g1, pawns f2, g2 and h2. Black: king g8, rook e1.", "g1")).toEqual([]);
    expect(to("White: king g1, bishop f5, knight e6. Black: king g8, rook d8, pawn f7. Black to move.", "f7")).toEqual(["e6", "f6"]);
  });

  it("plays out 6.2.1's examples to their goal", () => {
    const end = (words: string, line: string) => {
      const start = fromWords(words);
      const { moves, positions } = playLine(start, line.split(" "));
      return { end: gameEnd(start, moves), last: moves.at(-1)!.san, pos: positions.at(-1)! };
    };
    expect(end("White: king b4. Black: king g8, queen f7. Black to move.", "Qc7 Kb5 Kf7 Ka4 Qb7 Ka3 Ke6 Ka4 Qb2 Ka5 Kd6 Ka4 Kc5 Ka5 Qa2#")).toMatchObject({ end: "checkmate" });
    expect(end("White: king g1, queen c3. Black: king d6. White to move.", "Kf2 Kd5 Kf3 Kd6 Ke4 Ke7 Qc6 Kf8 Qd7 Kg8 Ke5 Kh8 Kf6 Kg8 Qg7#")).toMatchObject({ end: "checkmate" });
    expect(end("White: king g1, rook b2. Black: king c5. White to move.", "Rd2 Kc6 Kf2 Kb6 Rc2 Kb7 Ke3 Kb6 Ke4 Kb7 Rc3 Ka6 Rb3 Ka5 Kd5 Ka4 Rb1 Ka5 Kc4 Ka6 Kc5 Ka7 Kc6 Ka8 Kc7 Ka7 Ra1#")).toMatchObject({ end: "checkmate" });
    expect(end("White: king e1, rook c1. Black: king d4. White to move.", "Kd2 Ke5 Kd3 Kd6 Re1 Kd5 Kc3 Kc6 Kd4 Kd6 Kc4 Kc6 Rd1 Kb6 Rd6+ Kb7 Kb5 Kc7 Rd3 Kb7 Rc3 Ka8 Rc7 Kb8 Kb6 Ka8 Rc8#")).toMatchObject({ end: "checkmate" });
    const pawn = end("White: king e6, pawn e5. Black: king e8. White to move.", "Kd6 Kf8 e6 Ke8 e7 Kf7 Kd7 Kg8 e8=Q+");
    expect(pawn.last).toBe("e8=Q+");
    expect(pawn.pos.board.e8).toEqual({ side: "white", kind: "queen" });
    // L4's wrong move: 13. Rb7 stalemates.
    const l4 = playLine(fromWords("White: king g1, rook b2. Black: king c5. White to move."), "Rd2 Kc6 Kf2 Kb6 Rc2 Kb7 Ke3 Kb6 Ke4 Kb7 Rc3 Ka6 Rb3 Ka5 Kd5 Ka4 Rb1 Ka5 Kc4 Ka6 Kc5 Ka7 Kc6 Ka8".split(" "));
    expect(isStalemate(play(l4.positions.at(-1)!, { from: "b1", to: "b7" })!)).toBe(true);
  });

  it("mates in 00OXc mirrored: 51. Ra3#", () => {
    const mirrored = fromWords("White: king c7, rook c3. Black: king a6, rook d4, bishop e4, pawns a7, b5, c4 and g6. White to move.");
    expect(matingMoves(mirrored).map((m) => m.san)).toEqual(["Ra3#"]);
    const original = fromWords("White: king f7, rook f3. Black: king h6, rook e4, bishop d4, pawns b6, f4, g5 and h7. White to move.");
    expect(matingMoves(original).map((m) => m.san)).toEqual(["Rh3#"]);
  });

  it("reads the long forms game files write", () => {
    expect(playLine(startingPosition(), ["e4", "e5", "Ng1f3"]).moves[2]!.san).toBe("Nf3");
  });
});
