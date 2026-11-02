// The library: my rules for training my mind. Each rule is one text file in
// code/app/core/library/, beside the packs, and the site reads every one by
// path. The files are small, so they ship inside the site: a rule is always
// there to read, online or not.
//
// A rule file: its title on line one as "# Title", then its lines, one per
// line, a "- " line a bullet. Its last line is its evidence.
//
// The Library page reads them in groups (GROUPS), and some draw a picture
// (PICS). A rule no group names comes last, and a rule with no picture draws
// none.
//
// Source: code/blueprint/building-blocks.md, "The app's folders".

import type { Arrow, Placed, Square } from "../core.ts";

export type Line = { bullet: boolean; text: string };
export type Rule = { id: string; title: string; lines: Line[]; evidence: string };

// A rule's file text, as a rule. The id is its file name without the folder
// and ".md".
export function parseRule(id: string, source: string): Rule {
  const rows = source.split("\n").filter((row) => row.trim() !== "");
  const title = rows[0]?.match(/^# (.+)$/)?.[1];
  if (!title || rows.length < 3) throw new Error(`The rule ${id} has no title, or no lines and evidence after it.`);
  const lines = rows.slice(1).map((row) => (row.startsWith("- ") ? { bullet: true, text: row.slice(2) } : { bullet: false, text: row }));
  return { id, title, lines: lines.slice(0, -1), evidence: lines[lines.length - 1]!.text };
}

// A rule's lines, each run of bullets as one list.
export function runsOf(lines: Line[]): Line[][] {
  const runs: Line[][] = [];
  for (const line of lines) {
    const last = runs[runs.length - 1];
    if (line.bullet && last?.[0]!.bullet) last.push(line);
    else runs.push([line]);
  }
  return runs;
}

// Every file under code/app/core/library/, by its path there.
const FILES = import.meta.glob<string>("../../../core/library/*.md", { query: "?raw", import: "default", eager: true });

// > Stand-in. The rules read alphabetically by file name. The page orders them
// by group, and only the rules no group names keep this order.
export const RULES: Rule[] = Object.entries(FILES)
  .map(([path, source]) => parseRule(path.slice(path.lastIndexOf("/") + 1, -".md".length), source))
  .sort((a, b) => (a.id < b.id ? -1 : 1));

// ---------------------------------------------------------------------------
// The page: the rules in groups, and the picture each draws.

// > Stand-in. The grouping and order of the rules: the board first, then its
// colours, then the pieces, then what it is all for. The groups after them
// hold the rules written since: each is a stand-in, and none joins an earlier
// group.
export const GROUPS: { name: string; ids: string[] }[] = [
  {
    name: "The board in my mind",
    ids: ["mental-orientation", "spatial-organization", "bidirectional-coordinate-recognition"],
  },
  { name: "Square colours", ids: ["square-colour-rule", "colour-relationships", "colour-learning-strategy"] },
  {
    name: "How pieces move",
    ids: ["knight-destinations", "knight-routes-backward", "tracing-sliding-attacks", "finding-attackers", "legal-moves"],
  },
  { name: "What it is for", ids: ["long-term-objective", "recognition-is-not-visualization"] },
  { name: "Holding a position", ids: ["holding-a-position", "holding-an-opening", "real-positions"] },
  { name: "Reading and writing moves", ids: ["reading-a-move", "writing-a-move"] },
  { name: "Drills from other players", ids: ["reciting-the-empty-board", "shortest-routes"] },
  {
    name: "How I practise",
    ids: ["recognise-recall-update", "produce-the-answer", "learn-from-a-miss", "mix-what-looks-alike", "spread-your-practice", "accuracy-before-speed"],
  },
];

// A rule on the page: its number in the whole book, and its group's name.
export type Ruled = Rule & { n: number; group: string };
export type Group = { name: string; rules: Ruled[] };

// The rules in the groups' order, numbered from 1 across the whole book. A rule
// no group names goes last, under "Not yet grouped"; a group none of whose
// rules exist is left out.
export function grouped(rules: Rule[], groups = GROUPS): Group[] {
  const used = new Set(groups.flatMap((g) => g.ids));
  const all = [
    ...groups.map((g) => ({ name: g.name, rules: g.ids.flatMap((id) => rules.filter((r) => r.id === id)) })),
    { name: "Not yet grouped", rules: rules.filter((r) => !used.has(r.id)) },
  ];
  let n = 0;
  return all
    .filter((g) => g.rules.length > 0)
    .map((g) => ({ name: g.name, rules: g.rules.map((r) => ({ ...r, n: ++n, group: g.name })) }));
}

export const BOOK = grouped(RULES);

// What the page's one board draws for a rule, over an empty board facing White.
// A rule with none draws no board on a phone.
// dots: squares a piece reaches. labels: the words on a square. quadrants:
// each 4×4 quarter tinted. bad: squares marked red.
export type Pic = {
  caption: string;
  pieces?: Placed[];
  lit?: Square[];
  bad?: Square[];
  dots?: Square[];
  labels?: Partial<Record<Square, string>>;
  arrows?: Arrow[];
  quadrants?: boolean;
};

// > Stand-in. The picture each rule draws, from its own lines. A rule with no
// entry here draws none.
export const PICS: Record<string, Pic> = {
  "mental-orientation": {
    caption: "a1 bottom left, h8 top right, whichever colour I play.",
    lit: ["a1", "h8"],
    labels: { a1: "a1", h8: "h8" },
  },
  "spatial-organization": { caption: "Four quadrants: a1–d4, e1–h4, a5–d8, e5–h8.", quadrants: true },
  "bidirectional-coordinate-recognition": {
    caption: "e4: the name finds the square, the square gives the name.",
    lit: ["e4"],
    labels: { e4: "e4" },
  },
  "square-colour-rule": { caption: "f5 → 6 + 5 = 11 → light.", lit: ["f5"], labels: { f5: "11" } },
  "colour-relationships": {
    caption: "The c1 bishop keeps to dark squares. e4 is light: out of its reach.",
    pieces: [{ side: "white", kind: "bishop", square: "c1" }],
    dots: ["b2", "a3", "d2", "e3", "f4", "g5", "h6"],
    bad: ["e4"],
  },
  "colour-learning-strategy": { caption: "a1, a dark square: the reference.", lit: ["a1"], labels: { a1: "a1" } },
  "knight-destinations": {
    caption: "A knight on f4 reaches eight squares.",
    pieces: [{ side: "white", kind: "knight", square: "f4" }],
    dots: ["d3", "d5", "e2", "e6", "g2", "g6", "h3", "h5"],
  },
  "knight-routes-backward": {
    caption: "g1 to e5, planned from e5: f3 reaches e5, g1 reaches f3.",
    pieces: [{ side: "white", kind: "knight", square: "g1" }],
    lit: ["e5"],
    arrows: [
      { from: "g1", to: "f3" },
      { from: "f3", to: "e5" },
    ],
  },
  "tracing-sliding-attacks": {
    caption: "The c4 bishop's line stops at f7. g8, behind it, is not attacked.",
    pieces: [
      { side: "white", kind: "bishop", square: "c4" },
      { side: "black", kind: "pawn", square: "f7" },
      { side: "black", kind: "king", square: "g8" },
    ],
    dots: ["d5", "e6"],
    lit: ["f7"],
  },
  "finding-attackers": {
    caption: "From e5 out: f3 and d4 attack it. b2 stands behind d4.",
    pieces: [
      { side: "white", kind: "knight", square: "f3" },
      { side: "white", kind: "pawn", square: "d4" },
      { side: "white", kind: "bishop", square: "b2" },
    ],
    lit: ["e5"],
    arrows: [
      { from: "f3", to: "e5" },
      { from: "d4", to: "e5" },
    ],
  },
  "legal-moves": {
    caption: "h1 is not legal: the e1 rook's rank runs on through g1.",
    pieces: [
      { side: "white", kind: "king", square: "g1" },
      { side: "black", kind: "rook", square: "e1" },
    ],
    bad: ["h1"],
    arrows: [{ from: "e1", to: "h1" }],
  },
};
