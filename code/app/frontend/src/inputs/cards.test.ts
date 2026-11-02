import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { Ask, Choice } from "../core.ts";
import { makeRound, NO_PROGRESS, packsOf, type Play } from "../rounds/rounds.ts";
import { act, begin } from "../runner/walk.ts";
import { asCards } from "./Choose.tsx";

const CORE_PACKS = join(import.meta.dirname, "..", "..", "..", "core", "packs");
const packsFor = (play: Play) =>
  Object.fromEntries(packsOf(play).map((name) => [name, name.endsWith(".json") ? JSON.parse(readFileSync(join(CORE_PACKS, name), "utf8")) : readFileSync(join(CORE_PACKS, name))]));

// The choices of a level's first question: its steps pressed through until one asks.
function choicesOf(play: Play): Choice[] {
  const round = makeRound(play, "cards", NO_PROGRESS, "cards", packsFor(play));
  let w = begin(round, 0);
  for (let i = 0; i < 40 && w.step.step !== "ask"; i++) w = act(w, { did: "press" }, 1000 + i);
  const ask = w.step as Ask;
  if (ask.input.how !== "choose") throw new Error("The question holds no choices.");
  return ask.input.choices;
}

describe("which choices draw as piece cards", () => {
  it("draws the thirteen of 4.1.1 and 5.1.1 as cards at every level, and no other challenge's choices", () => {
    for (const [chapter, challenge, levels] of [[4, "4.1.1", ["L1", "L2", "L3", "L4", "L5"]], [5, "5.1.1", ["L1", "L2", "L3", "L4"]]] as const) {
      for (const level of levels) {
        const choices = choicesOf({ chapter, challenge, level });
        expect(choices, `${challenge} ${level}`).toHaveLength(13);
        expect(choices.every((c) => c.stands !== undefined), `${challenge} ${level}`).toBe(true);
        expect(asCards(choices), `${challenge} ${level}`).toBe(true);
      }
    }
    // Every other pick of choices keeps the text picker.
    for (const [chapter, challenge] of [[1, "1.1.2"], [1, "1.2.1"], [3, "3.2.1"], [6, "6.1.1"]] as const) {
      const play = { chapter, challenge, level: "L1" };
      const choices = choicesOf(play);
      expect(choices.length, challenge).toBeGreaterThan(1);
      expect(choices.every((c) => c.stands === undefined), challenge).toBe(true);
      expect(asCards(choices), challenge).toBe(false);
    }
  });

  it("names the right card after a wrong pick, at 5.1.1 as at 4.1.1", () => {
    for (const [chapter, challenge] of [[4, "4.1.1"], [5, "5.1.1"]] as const) {
      const play = { chapter, challenge, level: "L1" };
      // The same round twice: the first pick a wrong card, the second the card the told line names.
      const told = (value: string) => {
        let w = begin(makeRound(play, "cards", NO_PROGRESS, "cards", packsFor(play)), 0);
        for (let i = 0; i < 40 && w.step.step !== "ask"; i++) w = act(w, { did: "press" }, 1000 + i);
        w = act(w, { did: "answer", answer: { kind: "choice", value } }, 5000);
        if (w.step.step !== "told") throw new Error("The answer was not told.");
        return w.step;
      };
      const choices = choicesOf(play);
      const right = told(choices[0]!.value).rightChoice;
      expect(right, challenge).toBeDefined();
      expect(choices.map((c) => c.value), challenge).toContain(right);
      expect(told(right!).verdict, challenge).toBe("right");
    }
  });
});

// The cards' contrast, on the look file's one palette: the colours the cards wear.
// A theme switch would need its own check: none exists in the look file.
describe("the piece cards' contrast", () => {
  const css = readFileSync(join(import.meta.dirname, "..", "shell", "styles.css"), "utf8");
  const token = (name: string) => {
    const m = new RegExp(`--${name}: (#[0-9a-f]{6});`).exec(css);
    if (!m) throw new Error(`No token --${name}.`);
    return m[1]!;
  };
  const channel = (c: number) => (c / 255 <= 0.03928 ? c / 255 / 12.92 : ((c / 255 + 0.055) / 1.055) ** 2.4);
  const luminance = (hex: string) => {
    const [r, g, b] = [1, 3, 5].map((i) => channel(parseInt(hex.slice(i, i + 2), 16)));
    return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
  };
  const ratio = (a: string, b: string) => {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (hi! + 0.05) / (lo! + 0.05);
  };

  it("holds one palette: no theme switch in the look file", () => {
    expect(css.match(/--green:/g)).toHaveLength(1);
    expect(css).not.toMatch(/prefers-color-scheme|data-theme/);
  });

  it("reads its badges and its label at 4.5 to 1, and its rings and pictures at 3 to 1", () => {
    // The check on the right card, the cross on the wrong one, the word Empty.
    expect(ratio("#1e1e1b", token("green"))).toBeGreaterThanOrEqual(4.5);
    expect(ratio("#ffffff", token("red"))).toBeGreaterThanOrEqual(4.5);
    expect(ratio("#ffffff", token("btn2"))).toBeGreaterThanOrEqual(4.5);
    // The rings against the panel the picker sits on.
    expect(ratio(token("green"), token("panel"))).toBeGreaterThanOrEqual(3);
    expect(ratio(token("red"), token("panel"))).toBeGreaterThanOrEqual(3);
    // A piece's black outline and fill on the tile it stands on: White's on the light tone, Black's on the dark.
    expect(ratio("#000000", token("light"))).toBeGreaterThanOrEqual(3);
    expect(ratio("#000000", token("dark"))).toBeGreaterThanOrEqual(3);
    // The two squares of the Empty bar, against the bar.
    expect(ratio(token("light"), token("btn2"))).toBeGreaterThanOrEqual(3);
    expect(ratio(token("dark"), token("btn2"))).toBeGreaterThanOrEqual(3);
  });
});
