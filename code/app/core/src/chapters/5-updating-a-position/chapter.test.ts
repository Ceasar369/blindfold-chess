import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { chapter } from "./chapter.ts";

const page = readFileSync(join(import.meta.dirname, "..", "..", "..", "..", "..", "blueprint", "docs", "updating-a-position.md"), "utf8");

describe("chapter 5", () => {
  it("holds its page's \"What I can do at the end\", each item word for word, its code marks off", () => {
    const from = page.indexOf("## What I can do at the end\n");
    const items = page
      .slice(from, page.indexOf("\n## ", from + 1))
      .split("\n")
      .filter((l) => l.startsWith("- "))
      .map((l) => l.slice(2).replaceAll("`", ""));
    expect(items).toHaveLength(3);
    expect(chapter.abilities).toEqual(items);
  });

  it("builds both its challenges, each path step naming a level in the same words", () => {
    const built = chapter.sections.flatMap((s) => s.challenges);
    expect(built.map((c) => [c.id, c.built])).toEqual([["5.1.1", true], ["5.2.1", true]]);
    for (const step of chapter.path) {
      if (step.kind !== "level") throw new Error("Chapter 5 mixes no round.");
      const c = built.find((x) => x.id === step.challenge)!;
      expect(c.built && c.levels.find((l) => l.id === step.level)?.path).toBe(step.words);
    }
    expect(chapter.path).toHaveLength(9);
  });

  it("holds the page's \"What it needs first\" and each card's \"It needs\", word for word", () => {
    expect(chapter.needs).toEqual([
      "These levels of chapters 1, 3 and 4:",
      "1.1.1 L2 — finding a square on a board with no names.",
      "3.1.1 L6 — a numbered sequence, the position in words renewed after each move. Here nothing renews it.",
      "4.1.1 L1 — the starting position, square by square. Every sequence but one level's starts there.",
      "4.1.1 L4 — naming what stands on a square only named, with no board. 5.1.1 asks it from L2.",
      "4.3.1 L1 — changing a board in the starting position into another position. Every rebuild here answers that way.",
      "4.3.1 L3 — an opening from its name alone. 5.2.1 L3 starts from one.",
      "Each card names the levels it needs. No level needs chapter 3 or chapter 4 finished.",
    ]);
    const needs = chapter.sections.flatMap((s) => s.challenges).map((c) => c.built && c.needs);
    expect(needs).toEqual([
      "3.1.1 L6, 4.1.1 L1 and 1.1.1 L2. From L2, 4.1.1 L4.",
      "3.1.1 L6, 4.3.1 L1 and 1.1.1 L2. From L3, 4.3.1 L3.",
    ]);
  });
});
