import { describe, expect, it } from "vitest";
import { numbered, readMove, type Written } from "../notation/index.ts";
import { fromWords, type Position, startingPosition } from "../positions/index.ts";
import { playLine } from "../rules/index.ts";
import { follow, type Thread } from "../thread/index.ts";
import { whyIllegal, whyLine } from "./index.ts";

// A game from a position, its moves played, then the move I wrote: the line said after the game.
function told(start: Position, line: string, typed: string): string {
  const { moves, positions } = playLine(start, line ? line.split(" ") : []);
  const pos = positions.at(-1) ?? start;
  const t: Thread = follow(start, moves);
  const written = (readMove(typed) as Written[])[0]!;
  return whyLine(whyIllegal(pos, written, t), numbered(typed, pos.turn, pos.moveNumber), pos.turn, t);
}

const castling = (pos: Position): Position => ({ ...pos, castling: { white: { king: true, queen: true }, black: { king: true, queen: true } } });

describe("Why a move is illegal, on chapter 6's examples", () => {
  it("6.3.1 L3: a line blocked", () => {
    const line = "e4 e5 Nf3 Nc6 Bb5 d6 c3 a6 Ba4 b5 Bb3 Bb7 O-O b4 d4 bxc3 bxc3 exd4 cxd4 Qf6 Re1 h6 Bb2 Qg6 Ba4 Be7 e5 dxe5";
    expect(told(startingPosition(), line, "Bxe5")).toBe("15. Bxe5 was not legal: your pawn on d4 stands between b2 and e5.");
  });

  it("6.3.1 L4: castling not allowed, a piece between", () => {
    expect(told(startingPosition(), "e4 c5 Nc3 Nf6 Bc4 e6 Nf3 b6 d3", "O-O")).toBe(
      "5... O-O was not legal: your bishop on f8 stands between your king and your rook.",
    );
  });

  it("6.3.1 L6: a piece not there, and the move that took it", () => {
    const line = "e4 e5 d3 Nc6 Nf3 Nf6 a3 d5 exd5 Nxd5 Be2 Be6 O-O Be7 h3 O-O Nc3 Nf6 Be3 Qd7 Qe1 Nd4 Bd1 Nxf3+ Bxf3 c6 Rd1 Bd6 d4";
    expect(told(startingPosition(), line, "Nxd4")).toBe("15... Nxd4 was not legal: your knight from c6 was taken on f3 at 13. Bxf3.");
  });

  it("6.3.1 L2: my king left in check", () => {
    const start = { ...fromWords("White: king b6, rook c7, pawns c6 and g3. Black: king d5, rook f2, pawns g5 and h5. White to move."), moveNumber: 48 };
    expect(told(start, "Rd7+ Ke6 Rd3 Rb2+", "Rd4")).toBe("50. Rd4 was not legal: 49... Rb2+ gave check, and your king on b6 stayed in it.");
  });

  it("6.2.1 L2: a king next to the other king", () => {
    const start = fromWords("White: king b4. Black: king g8, queen f7. Black to move.");
    expect(told(start, "Qc7 Kb5 Kf7 Ka4 Qb7 Ka3 Ke6 Ka4 Qb2 Ka5 Kd6 Ka4 Kc5 Ka5", "Kb5")).toBe("8... Kb5 would stand next to White's king on a5.");
  });

  it("6.1.1 L4 and L5: a line blocked by an enemy piece, and a pawn taken", () => {
    const l4 = { ...fromWords("White: king f7, rook f3. Black: king h6, rook e4, bishop d4, pawns b6, f4, g5 and h7. White to move."), moveNumber: 51 };
    expect(told(l4, "", "Rf6")).toBe("51. Rf6 was not legal: Black's pawn on f4 stands between f3 and f6.");
    const l5 = { ...fromWords("White: king d3, rook c4, pawn h4. Black: king g6, knight f3, pawns c2 and f5. White to move."), moveNumber: 49 };
    expect(told(l5, "Rxc2", "c1=Q")).toBe("49... c1=Q was not legal: your pawn on c2 was taken by 49. Rxc2.");
  });

  it("names the other reasons: into check, castling's other rules, another", () => {
    const pinned = fromWords("White: king e1, knights c3 and g1. Black: king g8, bishop b4.");
    expect(told(pinned, "", "Nd5")).toBe("1. Nd5 was not legal: your king on e1 would stand in check from Black's bishop on b4.");
    const walk = fromWords("White: king g1, pawns f2 and g2. Black: king g8, rook h8, bishop c5.");
    expect(told(walk, "", "Kh2")).toBe("1. Kh2 was not legal: your king on h2 would stand in check from Black's rook on h8.");
    const checked = castling(fromWords("White: king e1, rooks a1 and h1. Black: king g8, rook e7."));
    expect(told(checked, "", "O-O")).toBe("1. O-O was not legal: your king stands in check.");
    const crossed = castling(fromWords("White: king e1, rooks a1 and h1. Black: king d7, bishop c4."));
    expect(told(crossed, "", "O-O")).toBe("1. O-O was not legal: Black's bishop on c4 attacks f1, where your king would pass or land.");
    const moved = fromWords("White: king e1, rooks a1 and h1. Black: king d7.");
    expect(told(moved, "", "O-O")).toBe("1. O-O was not legal: your king has moved.");
    expect(told(fromWords("White: king e1, rook a1. Black: king d7."), "", "O-O")).toBe("1. O-O was not legal: your rook from h1 has moved.");
    expect(told(startingPosition(), "", "e5")).toBe("1. e5 was not legal: no pawn of yours reaches e5.");
    expect(told(fromWords("White: king g1, pawn e4. Black: king g8, pawn e5."), "", "e5")).toBe("1. e5 was not legal.");
    expect(told(fromWords("White: king g1, rook a1, knight a3. Black: king g8."), "", "Ra3")).toBe("1. Ra3 was not legal.");
  });
});
