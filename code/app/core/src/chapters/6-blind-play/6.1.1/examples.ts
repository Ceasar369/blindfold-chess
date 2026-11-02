// 6.1.1's five example puzzles, as Lichess's puzzle file holds them: each
// before my opponent's move. None sits in the capped pack, so the tests,
// core and browser, hand them in.
//
// Source: code/blueprint/docs/blind-play.md, 6.1.1's "Examples"; the rows
// read from code/app/core/scripts/.downloads/lichess_db_puzzle.csv.zst.

import type { Puzzle } from "../../../packs/index.ts";

export const EXAMPLES: Record<"L1" | "L2" | "L3" | "L4" | "L5", Puzzle> = {
  L1: { id: "002Q2", rating: 956, kind: "mate in one", fen: "7k/p4R1p/3p3r/2pN1n2/2PbBBb1/3P2P1/P3r3/5R1K w - - 1 28", moves: ["f4h6", "f5g3"], besides: 18 },
  L2: { id: "004WZ", rating: 866, kind: "mate in one", fen: "r6k/1b3pp1/p1q1pn1p/2p5/P1B5/1PN4Q/2P1RP1P/R4Kr1 w - - 2 26", moves: ["f1g1", "c6h1"], besides: 21 },
  L3: { id: "0030b", rating: 538, kind: "mate in two", fen: "6k1/5ppp/5nb1/pp6/6rP/5N1Q/Pq2r1P1/3R2RK b - - 4 32", moves: ["g6e4", "d1d8", "f6e8", "d8e8"], besides: 17 },
  L4: { id: "00OXc", rating: 841, kind: "mate in one", fen: "8/5K1p/1p4pk/8/3brp2/5R2/8/8 b - - 5 50", moves: ["g6g5", "f3h3"], besides: 7 },
  L5: { id: "01FzV", rating: 946, kind: "fork", fen: "8/8/6k1/5p2/2R4P/3K1n2/2p5/8 w - - 2 49", moves: ["c4c2", "f3e1", "d3c4", "e1c2"], besides: 5 },
};
