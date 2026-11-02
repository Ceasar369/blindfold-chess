import { describe, expect, it } from "vitest";
import { BOOK, GROUPS, PICS, RULES, grouped, parseRule, runsOf } from "./library.ts";

describe("a rule file", () => {
  it("reads as its title, its lines and its evidence", () => {
    const rule = parseRule("x", "# Title\n\nFirst.\n\n- One\n- Two\n\nLast.\n\nThis is my preferred approach.\n");
    expect(rule.title).toBe("Title");
    expect(rule.lines.map((l) => [l.bullet, l.text])).toEqual([
      [false, "First."],
      [true, "One"],
      [true, "Two"],
      [false, "Last."],
    ]);
    expect(rule.evidence).toBe("This is my preferred approach.");
  });

  it("is refused with no title, or with no lines and evidence", () => {
    expect(() => parseRule("x", "First.\n\nEvidence.\n")).toThrow(/no title/);
    expect(() => parseRule("x", "# Title\n\nEvidence.\n")).toThrow(/no title/);
  });

  it("runs its bullets together as one list", () => {
    const runs = runsOf(parseRule("x", "# T\n\nA.\n- B\n- C\nD.\nE.\n").lines);
    expect(runs.map((r) => r.map((l) => l.text))).toEqual([["A."], ["B", "C"], ["D."]]);
  });
});

describe("the library", () => {
  it("holds a rule per file, each with a unique title, lines, and evidence last", () => {
    expect(RULES.length).toBeGreaterThan(0);
    expect(new Set(RULES.map((r) => r.title)).size).toBe(RULES.length);
    for (const r of RULES) {
      expect(r.lines.length, r.id).toBeGreaterThan(0);
      expect(r.evidence, r.id).toMatch(/^(Proven|This is my)/);
    }
  });

  it("lists its rules by file name", () => {
    const ids = RULES.map((r) => r.id);
    expect(ids).toEqual([...ids].sort());
  });
});

describe("the page", () => {
  const rule = (id: string) => parseRule(id, `# ${id}\n\nA line.\n\nProven: a source.\n`);

  it("puts the rules in their groups' order, and a rule no group names last", () => {
    const book = grouped([rule("c"), rule("a"), rule("z"), rule("b")], [
      { name: "First", ids: ["b", "gone"] },
      { name: "Empty", ids: ["gone"] },
      { name: "Second", ids: ["a", "c"] },
    ]);
    expect(book.map((g) => [g.name, g.rules.map((r) => r.id)])).toEqual([
      ["First", ["b"]],
      ["Second", ["a", "c"]],
      ["Not yet grouped", ["z"]],
    ]);
    expect(book.flatMap((g) => g.rules.map((r) => [r.n, r.group]))).toEqual([
      [1, "First"],
      [2, "Second"],
      [3, "Second"],
      [4, "Not yet grouped"],
    ]);
  });

  it("holds every rule once, numbered from 1", () => {
    const rules = BOOK.flatMap((g) => g.rules);
    expect(rules.map((r) => r.id).sort()).toEqual(RULES.map((r) => r.id).sort());
    expect(rules.map((r) => r.n)).toEqual(rules.map((_, i) => i + 1));
  });

  it("names only rules that exist, in its groups and its pictures", () => {
    const ids = new Set(RULES.map((r) => r.id));
    const named = GROUPS.flatMap((g) => g.ids);
    expect(named.filter((id) => !ids.has(id))).toEqual([]);
    expect(new Set(named).size).toBe(named.length);
    expect(Object.keys(PICS).filter((id) => !ids.has(id))).toEqual([]);
  });
});
