import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { chapter } from "./chapter.ts";

// The chapter's page, read whole: its lines are the words the code copies.
const page = readFileSync(join(import.meta.dirname, "..", "..", "..", "..", "..", "blueprint", "docs", "blind-play.md"), "utf8");

// A section's lines, from its heading to the next: each paragraph, or each
// item of a list, one line.
function section(heading: string): string[] {
  const from = page.indexOf(`## ${heading}\n`);
  const to = page.indexOf("\n## ", from + 1);
  return page
    .slice(from, to)
    .split("\n")
    .slice(1)
    .filter((l) => l.trim())
    .map((l) => l.replace(/^- /, ""));
}

describe("chapter 6", () => {
  it("holds its page's \"What I can do at the end\", each item word for word", () => {
    const items = section("What I can do at the end").filter((l) => !l.startsWith("Unproven:"));
    expect(items).toHaveLength(4);
    expect(chapter.abilities).toEqual(items);
  });

  it("holds its page's \"What it needs first\", word for word", () => {
    expect(chapter.needs).toEqual(section("What it needs first"));
  });

  it("holds each built card's \"It needs\", word for word", () => {
    const cards = chapter.sections.flatMap((s) => s.challenges).filter((c) => c.built);
    for (const c of cards) {
      if (!c.built || c.needs === undefined) continue;
      const at = page.indexOf(`### ${c.id} — `);
      const line = page.slice(at).match(/\*\*It needs\.\*\* (.+)\n/)![1];
      expect(c.needs, c.id).toBe(line);
    }
    expect(cards.find((c) => c.id === "6.1.1")).toMatchObject({ needs: expect.any(String) });
  });

  it("builds its three challenges, each path step naming a level in the same words, no round mixed", () => {
    const built = chapter.sections.flatMap((s) => s.challenges);
    expect(built.map((c) => [c.id, c.built])).toEqual([["6.1.1", true], ["6.2.1", true], ["6.3.1", true]]);
    for (const step of chapter.path) {
      if (step.kind !== "level") throw new Error("Chapter 6 mixes no round.");
      const c = built.find((x) => x.id === step.challenge)!;
      expect(c.built && c.levels.find((l) => l.id === step.level)?.path).toBe(step.words);
    }
    const pathLines = section("The path").filter((l) => /^\d+\. /.test(l)).map((l) => l.replace(/^\d+\. /, ""));
    expect(chapter.path.map((s) => (s.kind === "level" ? `${s.challenge} ${s.level} — ${s.words}` : ""))).toEqual(pathLines);
  });
});
