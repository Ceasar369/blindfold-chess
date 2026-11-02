import { Chess } from "chess.js";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { fromFen, fromWords } from "../positions/index.ts";
import type { Square } from "../shape/index.ts";
import { SQUARES } from "../squares/index.ts";
import { attackedPieces, attackersOf, attacks, piecesBetween, reachOnEmpty } from "./index.ts";

const squaresOf = (pieces: { square: Square }[]) => pieces.map((p) => p.square).sort();

describe("Reach on the pages' examples", () => {
  it("gives a knight's and a pawn's reach on an empty board", () => {
    expect(reachOnEmpty({ side: "white", kind: "knight" }, "e4")).toEqual(["c3", "c5", "d2", "d6", "f2", "f6", "g3", "g5"]);
    expect(reachOnEmpty({ side: "white", kind: "pawn" }, "e2")).toEqual(["e3", "e4"]);
    expect(reachOnEmpty({ side: "black", kind: "pawn" }, "d7")).toEqual(["d5", "d6"]);
    expect(reachOnEmpty({ side: "white", kind: "pawn" }, "e4")).toEqual(["e5"]);
    expect(reachOnEmpty({ side: "white", kind: "pawn" }, "e8")).toEqual([]);
    expect(reachOnEmpty({ side: "white", kind: "king" }, "g1")).toEqual(["f1", "f2", "g2", "h1", "h2"]);
  });

  it("gives 2.1.1's knight squares", () => {
    const n = (s: Square) => reachOnEmpty({ side: "white", kind: "knight" }, s);
    expect(n("d5")).toEqual(["b4", "b6", "c3", "c7", "e3", "e7", "f4", "f6"]);
    expect(n("h7")).toEqual(["f6", "f8", "g5"]);
    expect(n("b1")).toEqual(["a3", "c3", "d2"]);
    expect(n("g2")).toEqual(["e1", "e3", "f4", "h4"]);
    expect(n("c6")).toEqual(["a5", "a7", "b4", "b8", "d4", "d8", "e5", "e7"]);
  });

  it("follows each line to its first piece: the book's bishop on c4", () => {
    const board = fromWords("White: bishop c4. Black: king g8, pawn f7.").board;
    expect(attacks(board, "c4")).toContain("f7");
    expect(attacks(board, "c4")).not.toContain("g8");
  });

  it("gives piece-movement's one real case", () => {
    const board = fromWords("White: king g1, pawn e4. Black: king g8, knight d5, pawn e5.").board;
    expect(attacks(board, "e4")).toEqual(["d5", "f5"]);
    const rook = fromWords("White: king g1. Black: king g8, rook a2.").board;
    expect(reachOnEmpty({ side: "white", kind: "king" }, "g1")).toEqual(["f1", "f2", "g2", "h1", "h2"]);
    expect(["f1", "f2", "g2", "h1", "h2"].filter((s) => attackersOf(rook, s as Square, "black").length === 0)).toEqual(["f1", "h1"]);
  });

  it("names what 2.2.1's pieces attack", () => {
    const l1 = fromWords("White: king g1, bishop c4. Black: king g8, rook c8, knight a6, pawn f7.").board;
    expect(squaresOf(attackedPieces(l1, "c4"))).toEqual(["a6", "f7"]);
    const l2 = fromWords("White: king g1, queen d2, bishop a8, knight d4, pawn c5. Black: king g8, rook d8, pawn f7.").board;
    expect(squaresOf(attackedPieces(l2, "d8"))).toEqual(["a8", "d4"]);
    const l3 = fromWords("White: king g1, queen e2, pawns e4 and f2. Black: king g8, rook e8, bishop b5, knight h5.").board;
    expect(squaresOf(attackedPieces(l3, "e2"))).toEqual(["b5", "h5"]);
  });

  it("names who attacks 2.3.1's squares", () => {
    const l1 = fromWords("White: king g1, knight f3, pawns d4 and e4. Black: king g8, knight c6.").board;
    expect(attackersOf(l1, "e5", "white")).toEqual(["d4", "f3"]);
    const l2 = fromWords("White: king g1, knight d4. Black: king g8, queen d8, bishop b6, knight f5, pawns c5 and d5.").board;
    expect(attackersOf(l2, "d4", "black")).toEqual(["c5", "f5"]);
    expect(squaresOf(piecesBetween(l2, "b6", "d4")!)).toEqual(["c5"]);
    const l3 = fromWords("White: king c1, rook g3, bishop b3, knight e7. Black: king g8, rook a8, pawns f7 and g6.").board;
    expect(attackersOf(l3, "g8", "white")).toEqual(["e7"]);
    expect(squaresOf(piecesBetween(l3, "g3", "g8")!)).toEqual(["g6"]);
    const l4 = fromWords("White: king g1, queen c2, rook h1, bishop d3, knight g5, pawn h2. Black: king g8, pawn h7.").board;
    expect(attackersOf(l4, "h7", "white")).toEqual(["d3", "g5"]);
    expect(piecesBetween(l4, "c4", "f7")).toEqual([]);
    expect(squaresOf(piecesBetween(l4, "c2", "h7")!)).toEqual(["d3"]);
    expect(piecesBetween(l4, "c4", "e5")).toBeNull();
  });

  it("answers with no kings at all", () => {
    const board = fromWords("White: rook a1, pawn a4. Black: knight a6.").board;
    expect(attacks(board, "a1")).toEqual(["a2", "a3", "b1", "c1", "d1", "e1", "f1", "g1", "h1"]);
    expect(attackersOf(board, "a4", "white")).toEqual(["a1"]);
  });
});

// A legal position: the starting position after up to 80 random legal moves.
function randomGame(seeds: number[]): Chess {
  const chess = new Chess();
  for (const seed of seeds) {
    const moves = chess.moves();
    if (moves.length === 0) break;
    chess.move(moves[seed % moves.length]!);
  }
  return chess;
}

// Its 300 runs take about 3 seconds alone and took 9.9 seconds in the core's
// whole run, past the default 5 seconds: it gets 60.
describe("Reach against chess.js's attackers", () => {
  it("agrees on every square, for both sides, on legal positions at random", { timeout: 60_000 }, () => {
    fc.assert(
      fc.property(fc.array(fc.nat(), { maxLength: 80 }), (seeds) => {
        const chess = randomGame(seeds);
        const board = fromFen(chess.fen()).board;
        for (const square of SQUARES) {
          for (const side of ["white", "black"] as const) {
            const theirs = chess.attackers(square, side === "white" ? "w" : "b").sort();
            expect(attackersOf(board, square, side).sort(), `${chess.fen()} ${square} ${side}`).toEqual(theirs);
          }
        }
      }),
      { numRuns: 300 },
    );
  });
});
