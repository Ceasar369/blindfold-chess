import { describe, expect, it } from "vitest";
import { besidesKings, inWords, kingSquare, other, piecesOf } from "../positions/index.ts";
import { attackedPieces, attackersOf } from "../reach/index.ts";
import { isLegalPosition } from "../rules/index.ts";
import type { Kind, Piece, Square } from "../shape/index.ts";
import { seeded } from "./index.ts";
import { setUp } from "./set-up.ts";

const KINDS: Kind[] = ["queen", "rook", "bishop", "knight", "pawn"];

describe("Random draws: the set-up maker", () => {
  it("keeps the book's rules on every draw: both kings apart, the side not to move out of check, no edge-rank pawn", () => {
    const random = seeded("set-up base");
    for (let i = 0; i < 300; i++) {
      const pos = setUp(random, {
        pieces: (r) => Array.from({ length: 6 }, (): Piece => ({ side: r.pick(["white", "black"] as const), kind: r.pick(KINDS) })),
        turn: (r) => r.pick(["white", "black"] as const),
      });
      expect(isLegalPosition(pos)).toBe(true);
      expect(besidesKings(pos)).toBe(6);
      const [w, b] = [kingSquare(pos, "white")!, kingSquare(pos, "black")!];
      const apart = Math.max(Math.abs(w.charCodeAt(0) - b.charCodeAt(0)), Math.abs(Number(w[1]) - Number(b[1])));
      expect(apart).toBeGreaterThan(1);
      expect(attackersOf(pos.board, kingSquare(pos, other(pos.turn))!, pos.turn)).toEqual([]);
      for (const p of piecesOf(pos)) if (p.kind === "pawn") expect(["1", "8"]).not.toContain(p.square[1]);
    }
  });

  it("draws again until a challenge's own rules hold: a bishop that attacks two pieces", () => {
    const random = seeded("set-up own");
    for (let i = 0; i < 50; i++) {
      const pos = setUp(random, {
        pieces: [{ side: "white", kind: "bishop" }, { side: "black", kind: "rook" }, { side: "black", kind: "knight" }, { side: "black", kind: "pawn" }],
        turn: "white",
        holds: (p) => {
          const bishop = piecesOf(p).find((x) => x.kind === "bishop")!;
          return attackedPieces(p.board, bishop.square).length >= 2;
        },
      });
      const bishop = piecesOf(pos).find((x) => x.kind === "bishop")!;
      expect(attackedPieces(pos.board, bishop.square).length, inWords(pos)).toBeGreaterThanOrEqual(2);
    }
  });

  it("puts each piece only where the challenge allows", () => {
    const centre: Square[] = ["c3", "c4", "c5", "c6", "d3", "d4", "d5", "d6", "e3", "e4", "e5", "e6", "f3", "f4", "f5", "f6"];
    const pos = setUp(seeded("where"), {
      pieces: [{ side: "white", kind: "knight" }],
      turn: "white",
      where: (p) => (p.kind === "knight" ? centre : ["a1", "h8"]),
    });
    expect(centre).toContain(piecesOf(pos).find((p) => p.kind === "knight")!.square);
  });

  it("gives one position from one seed, and says so when no draw can meet the rules", () => {
    const rules = { pieces: [{ side: "white", kind: "rook" }] as Piece[], turn: "white" as const };
    expect(inWords(setUp(seeded("same"), rules))).toBe(inWords(setUp(seeded("same"), rules)));
    expect(() => setUp(seeded("never"), { ...rules, holds: () => false, tries: 20 })).toThrow(/20 tries/);
  });
});
