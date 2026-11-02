import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { NO_PROGRESS, makeRound, packsOf, type Play } from "../rounds/rounds.ts";
import { bannerWords, headerOf } from "./header.ts";
import { begin } from "./walk.ts";

describe("the Black banner", () => {
  const seat = { side: "black", why: "round" } as const;

  it("names the colour and the level's reason", () => {
    expect(bannerWords(seat)).toEqual({ head: "You play Black", reason: "Drawn for this round. You keep it to the end." });
  });

  it("says nothing of a board, whatever fixes the colour", () => {
    for (const why of ["level", "round", "item"] as const) {
      const w = bannerWords({ side: "black", why });
      expect(`${w.head} ${w.reason}`).not.toMatch(/board|flip/i);
    }
  });
});

const CORE_PACKS = join(import.meta.dirname, "..", "..", "..", "core", "packs");
const packsFor = (play: Play) =>
  Object.fromEntries(packsOf(play).map((name) => [name, name.endsWith(".json") ? JSON.parse(readFileSync(join(CORE_PACKS, name), "utf8")) : readFileSync(join(CORE_PACKS, name))]));

// The first round of a chapter's step that draws Black.
function blackRound(chapter: number, step: number) {
  const play = { chapter, step };
  for (let i = 0; i < 40; i++) {
    const round = makeRound(play, `black ${i}`, NO_PROGRESS, `black ${i}`, packsFor(play));
    if (round.side === "black") return round;
  }
  throw new Error(`No seed drew Black for chapter ${chapter}, step ${step}.`);
}

describe("the side a round draws", () => {
  it("chapters 3, 5 and 6 name Black when the round draws Black, with a chip beside it", () => {
    // 3.1.1 L1, 5.2.1 L1, and 6.2.1 L1, the endgame side drawn for the round.
    for (const [chapter, step] of [[3, 0], [5, 0], [6, 2]] as const) {
      const h = headerOf(begin(blackRound(chapter, step), 0), 0);
      expect(h.seat, `chapter ${chapter}`).toEqual({ side: "black", why: "round" });
      expect(h.chips[0], `chapter ${chapter}`).toMatchObject({ name: "I sit as", value: "Black" });
    }
  });

  it("chapter 4 draws no side whatever the round drew: no banner, no chip", () => {
    // 4.1.1 L1, 4.2.1 L1, 4.1.1 L2 (a real position on a board), 4.2.1 L2, and 4.3.1 L1 to L3.
    for (const step of [0, 1, 2, 3, 11, 12, 13]) {
      const h = headerOf(begin(blackRound(4, step), 0), 0);
      expect(h.seat, `step ${step}`).toEqual({ side: null, why: "none" });
      expect(h.chips.map((c) => c.name), `step ${step}`).not.toContain("I sit as");
    }
  });
});
