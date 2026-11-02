// Chapter 5 — Updating a position: every level of 5.1.1 and 5.2.1, at both
// widths: right answers, then each level's wrong example from its card, each
// told line word for word.
// Card: code/blueprint/docs/updating-a-position.md.
//
// The examples' games sit in no pack the site serves: the test serves a lines
// pack holding each example and a few real games, and seeds each round so it
// asks the example, where the card asks it. The round is made here first, as
// the site makes it, so the test knows each move and square before the site
// shows them.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { challenge as c511 } from "../../core/src/chapters/5-updating-a-position/5.1.1/index.ts";
import { challenge as c521 } from "../../core/src/chapters/5-updating-a-position/5.2.1/index.ts";
import type { AfterOpening, FirstLine, LinesPack, OpeningsPack } from "../../core/src/packs/index.ts";
import { fromFen, moveByHand, piecesOf, type Position, put, standsValue, standsWords, startingPosition } from "../../core/src/positions/index.ts";
import { seeded } from "../../core/src/random/index.ts";
import { playLine } from "../../core/src/rules/index.ts";
import type { Challenge, Item, Side, Square, Stands } from "../../core/src/shape/index.ts";
import { SQUARES } from "../../core/src/squares/index.ts";
import { checkLayout, checkTree, consoleErrors, fakeRecord, next, openChapter, openLevel, question } from "./helpers.ts";
import { expectLook } from "./look.ts";
import { noReload, seedRounds, seedWhere, servePack } from "./rounds-5-6.ts";

test.beforeEach(({ page }) => noReload(page));

const PACKS = join(import.meta.dirname, "..", "..", "core", "packs");
const real = JSON.parse(readFileSync(join(PACKS, "lines.json"), "utf8")) as LinesPack;
const openings = JSON.parse(readFileSync(join(PACKS, "openings.json"), "utf8")) as OpeningsPack;

const first = (sans: string, white: number, black: number): FirstLine => ({ game: `example-${white}-${black}`, white, black, sans: sans.split(" "), plies: 60 });

// The cards' examples.
const E511 = {
  L1: first("e4 e5 Nf3 d6 d4 Nc6 dxe5 dxe5", 1352, 1365),
  L2: first("Nf3 Nc6 Nc3 e5 d4 exd4 Nxd4 Qf6", 1384, 1222),
  L3: first("e4 e6 Nf3 Nc6 Nc3 e5 d4 d6 dxe5 dxe5 Qxd8+ Kxd8", 1439, 1355),
  L4: first("e4 d5 exd5 Qxd5 Nc3 Qa5 Nf3 c6 Bc4 Nf6 O-O Bf5 d3 e6 Re1 Bb4 Bd2 O-O a3 Bd6", 1466, 1237),
};
const E521 = {
  L1: first("e4 e5 Nf3 Nf6 Nxe5 Nc6", 1429, 1388),
  L2: first("e4 d5 exd5 Qxd5 Nc3 Qe6+", 1469, 1386),
  L4: first("e4 e5 Nf3 Nc6 Nc3 Bc5 Nd5 Nf6 Nxf6+ Qxf6 Bc4 O-O", 1414, 1424),
  L5: first("e4 c5 d4 cxd4 Qxd4 Nc6 Qc3 a6 Nf3 d6 Bc4 e6 O-O Nf6 Nbd2 g6 e5 dxe5 Nxe5 Nxe5", 1263, 1365),
};
const ITALIAN: AfterOpening = { game: "l42nthgl", white: 1316, black: 1361, opening: "Italian Game", reachedAt: 5, sans: ["Bc5", "b4", "Bxb4", "c3", "Bc5", "d4"] };

// A few real games beside the examples, none holding a promotion, so every
// position is built from the starting position's own pieces.
const others = real.first.filter((l) => !l.sans.some((s) => s.includes("="))).slice(0, 12);
const opened = real.afterOpening.filter((l) => l.game !== ITALIAN.game && !l.sans.some((s) => s.includes("="))).slice(0, 6);
const LINES: LinesPack = { first: [...Object.values(E511), ...Object.values(E521), ...others], afterOpening: [ITALIAN, ...opened], mid: [] };
const PACK = { "lines.json": LINES, "openings.json": openings };

const fromWords = (l: { white: number; black: number }) => `From a Lichess game of January 2013, players rated ${l.white} and ${l.black}.`;
const san = (move: string) => move.replace(/^\d+\.(\.\.)?\s/, "");

// What one item shows and asks, walked here with every answer right.
type Script = {
  from: string;
  shows: { move?: string; words?: string; name?: string; button: string; time: "look" | "move"; moves?: number }[];
  asks: { square: Square; right: Stands; at: number }[];
};

// The button of each look, by its kind: a list of moves shown whole is hidden; moves read one at a time, or from an opening's name, step with Next.
const buttonsOf = (scripts: Script[]) => new Set(scripts.flatMap((s) => s.shows.map((x) => x.button)));

function script(item: Item, start: (name: string | null) => Position): Script {
  const out: Script = { from: "", shows: [], asks: [] };
  const sans: string[] = [];
  let name: string | null = null;
  let step = item.first();
  while (step.step !== "done") {
    if (step.step === "show") {
      out.from ||= step.lines?.[0] ?? "";
      out.shows.push({ move: step.move, words: step.words, name: step.name, button: step.button, time: step.time, moves: step.moves });
      if (step.name) name = step.name.replace(/^The (.*)\.$/, "$1");
      if (step.move) sans.push(san(step.move));
      if (step.words) sans.push(...step.words.split(" ").filter((w) => !/^\d+\./.test(w)));
      step = item.next({ did: "press" });
    } else if (step.step === "ask") {
      const pos = playLine(start(name), sans).positions.at(-1)!;
      if (step.input.how === "move") {
        out.asks.push({ square: "a1", right: null, at: out.shows.length });
        step = item.next({ did: "answer", answer: { kind: "position", pieces: piecesOf(pos) } });
      } else {
        const square = step.question.slice(15, 17) as Square;
        const right = pos.board[square] ?? null;
        out.asks.push({ square, right, at: out.shows.length });
        step = item.next({ did: "answer", answer: { kind: "choice", value: standsValue(right) } });
      }
    } else step = item.next({ did: "press" });
  }
  return out;
}

const startOf = (name: string | null) => {
  if (!name) return startingPosition();
  return fromFen(openings.thirteen.find((o) => o.name === name)!.fen);
};

// The round a seed makes, as src/rounds/rounds.ts makes it: the side drawn first.
function roundOf(c: Challenge, levelId: string, seed: string, packs: typeof PACK = PACK): { side: Side; scripts: Script[] } {
  const random = seeded(seed);
  const side = random.pick<Side>(["white", "black"]);
  const level = c.levels.find((l) => l.id === levelId)!;
  const items = c.makeRound(level, random, { side, back: [], packs });
  return { side, scripts: items.map((i) => script(i, startOf)) };
}

const square = (page: Page, sq: string) => page.getByRole("button", { name: sq, exact: true });

// a1 at the bottom left and h8 at the top right, whichever side the round drew; the screen
// names Black when it drew Black, and says nothing of a board.
async function expectFacingWhite(page: Page, side: Side | null) {
  const a1 = (await square(page, "a1").boundingBox())!;
  const h8 = (await square(page, "h8").boundingBox())!;
  expect(a1.y > h8.y, "a1 below h8").toBe(true);
  expect(a1.x < h8.x, "a1 left of h8").toBe(true);
  const banner = page.locator(".sx-bn");
  await expect(banner).toHaveCount(side === "black" ? 1 : 0);
  if (side === "black") {
    await expect(banner).toContainText("You play Black");
    await expect(banner).not.toContainText(/board|flip/i);
  }
}

async function startRound(page: Page, seed: string, challenge: string, level: string, lines: LinesPack = LINES) {
  const errors = consoleErrors(page);
  const sent = await fakeRecord(page);
  await seedRounds(page, [seed]);
  await servePack(page, "lines.json", lines);
  await openChapter(page, 5, "Updating a position");
  await checkLayout(page);
  await openLevel(page, challenge, level);
  return { errors, sent };
}

async function seeShow(page: Page, show: Script["shows"][number], i: number) {
  if (show.move) await expect(page.locator(".stepmove")).toHaveText(show.move);
  if (show.words) await expect(page.locator(".words")).toHaveText(show.words);
  if (show.name) await expect(page.locator(".lookname")).toHaveText(show.name);
  await expectLook(page, show.button, show);
  if (i === 0) await checkLayout(page);
  await page.getByRole("button", { name: show.button, exact: true }).click();
}

async function checkScore(page: Page, sent: unknown[], right: number, total: number, kinds: string[], passMark: string, counts: [string, string][]) {
  await expect(page.getByRole("heading", { level: 1, name: "Score" })).toBeVisible();
  await expect(page.locator(".bigscore")).toHaveAttribute("aria-label", `${right} right answers of ${total}`);
  await expect(page.locator(".kinds li")).toHaveText(kinds.map((k) => `${k}1`));
  for (const [k, v] of counts) await expect(page.locator(".stats div").filter({ has: page.locator("dt", { hasText: new RegExp(`^${k}$`) }) }).locator("dd")).toHaveText(v);
  await expect(page.locator(".pass p")).toHaveText(passMark.replace(/\bL(\d+)\b/g, "Level $1"));
  await expect.poll(() => sent.length, { message: "rounds the record kept" }).toBe(1);
  await expect(page.locator(".sendline")).toHaveText("Sent to your progress record.");
  await checkLayout(page);
}

// ---------------------------------------------------------------------------
// 5.1.1 Name what stands there now

type Ex511 = { level: "L1" | "L2" | "L3" | "L4"; step: number; square: Square; after: number; side: Side | null; wrong: string; told: string; kind: string; lost: string };

const EX511: Ex511[] = [
  { level: "L1", step: 1, square: "e5", after: 8, side: "white", wrong: "White's pawn", told: "No: Black's pawn stands on e5, since 4... dxe5. White's pawn stood there until 4... dxe5 took it.", kind: "An old square", lost: "Lost the thread at a capture" },
  { level: "L2", step: 3, square: "f3", after: 8, side: null, wrong: "White's knight", told: "No: f3 is empty since 4. Nxd4. White's knight stood there until 4. Nxd4 moved it.", kind: "An old square", lost: "Lost the thread at a capture" },
  { level: "L3", step: 5, square: "d8", after: 12, side: null, wrong: "Black's queen", told: "No: Black's king stands on d8, since 6... Kxd8. Black's queen stood there until 6. Qxd8+ took it.", kind: "An old square", lost: "Lost the thread at a capture" },
  { level: "L4", step: 7, square: "f1", after: 20, side: null, wrong: "White's rook", told: "No: f1 is empty since 8. Re1. White's rook stood there until 8. Re1 moved it.", kind: "An old square", lost: "Lost the thread at a move" },
];

// The thirteen answers are piece cards: all on screen with no scroll, each inside the window, and inside the column that holds them.
async function cardsOnScreen(page: Page) {
  await expect(page.locator(".choices .pk")).toHaveCount(13);
  await expect(page.locator(".choices .choice")).toHaveCount(0);
  const out = await page.evaluate(() => {
    const col = document.querySelector(".rcol")?.getBoundingClientRect().bottom ?? window.innerHeight;
    const limit = Math.min(window.innerHeight, col);
    return [...document.querySelectorAll(".choices .pk")].filter((c) => c.getBoundingClientRect().top < 0 || c.getBoundingClientRect().bottom > limit).map((c) => c.getAttribute("aria-label"));
  });
  expect(out, "cards off screen").toEqual([]);
}

for (const ex of EX511) {
  test(`5.1.1 ${ex.level}: right answers, then "${ex.told}"`, async ({ page }) => {
    const line = E511[ex.level];
    const asksExample = (s: Script) => s.from === fromWords(line) && s.asks.some((a) => a.square === ex.square && a.at === ex.after);
    const seed = seedWhere(`ch5-511-${ex.level}`, (seed) => {
      const r = roundOf(c511, ex.level, seed);
      return (!ex.side || r.side === ex.side) && r.scripts.some(asksExample);
    });
    const { side, scripts } = roundOf(c511, ex.level, seed);
    expect(buttonsOf(scripts)).toEqual(new Set(["Next"]));
    const { errors, sent } = await startRound(page, seed, "5.1.1", ex.level);
    const level = c511.levels.find((l) => l.id === ex.level)!;

    let asked = 0;
    for (const s of scripts) {
      const example = asksExample(s);
      let shown = 0;
      for (const ask of [...s.asks, null]) {
        for (; shown < (ask ? ask.at : s.shows.length); shown++) await seeShow(page, s.shows[shown]!, shown);
        if (!ask) break;
        await expect(page.locator("h2.q")).toHaveText(`What stands on ${ask.square} now?`);
        await expect(question(page, asked + 1, level.questions)).toBeVisible();
        if (ex.level === "L1") {
          // An empty board, no names, the square lit, facing White whichever side the round drew.
          await expect(page.locator(".nm")).toHaveCount(0);
          await expect(page.locator(".board .pc")).toHaveCount(0);
          await expect(square(page, ask.square)).toHaveClass(/lit/);
          await expectFacingWhite(page, side);
        } else {
          await expect(page.locator(".board")).toHaveCount(0);
        }
        if (asked === 0) {
          await expect(page.locator(".choices button")).toHaveCount(13);
          await cardsOnScreen(page);
          await checkLayout(page);
        }
        const theExample = example && ask.square === ex.square && ask.at === ex.after;
        const words = theExample ? ex.wrong : standsWords(ask.right);
        await page.locator(".choices").getByRole("button", { name: words, exact: true }).click();
        if (theExample) {
          await expect(page.locator(".told")).toHaveText(ex.told);
          await expect(page.locator(".told")).toHaveClass(/wrong/);
          // After a wrong pick the right card is ringed too, with a check; all thirteen stay on screen.
          const shown = page.locator(".choices").getByRole("button", { name: standsWords(ask.right), exact: true });
          await expect(shown).toHaveClass(/\bshow\b/);
          await expect(shown.locator(".pk-bdg")).toHaveText("✓");
          await expect(page.locator(".choices").getByRole("button", { name: ex.wrong, exact: true }).locator(".pk-bdg")).toHaveText("✕");
          await cardsOnScreen(page);
        } else {
          await expect(page.locator(".told")).toHaveText(/^Right: /);
        }
        if (asked === 0) await checkLayout(page);
        await next(page);
        asked++;
      }
    }
    expect(asked).toBe(level.questions);

    await checkScore(page, sent, level.questions - 1, level.questions, [ex.kind], level.passMark, [[ex.lost, "1"]]);
    // A level played from the chapter's tree plays as its step: from step 1, I stand on it.
    expect(sent[0]).toMatchObject({ chapter: 5, step: ex.step, place: ex.step });
    expect(sent[0]!.answers).toHaveLength(level.questions);
    expect(sent[0]!.comebacks).toEqual([{ challenge: "5.1.1", facts: { game: line.game, misses: [{ ply: expect.any(Number), kind: expect.any(String) }] }, rounds: 2 }]);
    expect(errors).toEqual([]);
  });
}

// ---------------------------------------------------------------------------
// 5.2.1 Rebuild after the moves

type Board = Position["board"];
const same = (a: Stands | undefined, b: Stands | undefined) => (a && b ? a.side === b.side && a.kind === b.kind : !a && !b);

// Changes the board shown, the starting position, into `target` by hand:
// each piece moved where it is wanted, then what is left over taken off.
async function build(page: Page, target: Board, from: Partial<Record<Square, Stands>> = startingPosition().board) {
  const cur: Partial<Record<Square, Stands>> = { ...from };
  const takeOff = async (s: Square) => {
    await square(page, s).click();
    await page.getByRole("button", { name: "Take off" }).click();
    delete cur[s];
  };
  for (;;) {
    const needs = SQUARES.filter((s) => target[s] && !same(cur[s], target[s]));
    if (!needs.length) break;
    const spare = (s: Square) => !!cur[s] && !same(cur[s], target[s]);
    const s = needs.find((n) => {
      const there = cur[n];
      if (!there) return true;
      // What stands here is taken off: only when no need elsewhere waits on it.
      const wanted = needs.filter((m) => m !== n && same(target[m], there)).length;
      const spares = SQUARES.filter((x) => x !== n && spare(x) && same(cur[x], there)).length;
      return spares >= wanted;
    });
    if (!s) throw new Error("No piece to move next.");
    const from = SQUARES.find((x) => x !== s && spare(x) && same(cur[x], target[s]));
    if (!from) throw new Error(`No ${standsWords(target[s]!)} to move to ${s}.`);
    if (cur[s]) await takeOff(s);
    await square(page, from).click();
    await square(page, s).click();
    cur[s] = cur[from];
    delete cur[from];
  }
  for (const s of SQUARES) if (cur[s] && !target[s]) await takeOff(s);
}

type Ex521 = { level: "L1" | "L2" | "L3" | "L4" | "L5"; step: number; side: Side; question: string; change: (p: Position) => Position; told: string; kinds: string[]; lost: string };

const black = (kind: string) => ({ side: "black" as const, kind: kind as never });
const white = (kind: string) => ({ side: "white" as const, kind: kind as never });

const EX521: Ex521[] = [
  { level: "L1", step: 0, side: "black", question: "Rebuild the position after 3... Nc6.", change: (p) => put(put(p, "f3", white("knight")), "e5", black("pawn")), told: "No: 7 of 9 squares. You lost the thread at 3. Nxe5: White's knight took Black's pawn on e5.", kinds: ["An old square", "A piece taken, left on"], lost: "Lost the thread at a capture" },
  { level: "L2", step: 2, side: "white", question: "Rebuild the position after 3... Qe6+.", change: (p) => moveByHand(p, "e6", "d5"), told: "No: 4 of 6 squares. You lost the thread at 3... Qe6+: Black's queen went on from d5 to e6.", kinds: ["An old square"], lost: "Lost the thread at a move" },
  { level: "L3", step: 4, side: "black", question: "Rebuild the position after 6. d4.", change: (p) => moveByHand(p, "c5", "b4"), told: "No: 15 of 17 squares. You lost the thread at 5... Bc5: Black's bishop went back from b4 to c5.", kinds: ["An old square"], lost: "Lost the thread at a move" },
  { level: "L4", step: 6, side: "white", question: "Rebuild the position after 6... O-O.", change: (p) => moveByHand(p, "f8", "h8"), told: "No: 16 of 18 squares. You lost the thread at 6... O-O: castling on the king's side takes Black's rook from h8 to f8.", kinds: ["An old square"], lost: "Lost the thread at castling" },
  { level: "L5", step: 8, side: "black", question: "Rebuild the position after 10... Nxe5.", change: (p) => put(put(p, "c6", black("knight")), "e5", white("knight")), told: "No: 20 of 22 squares. You lost the thread at 10... Nxe5: Black's knight from c6 took White's knight on e5.", kinds: ["An old square", "A piece taken, left on"], lost: "Lost the thread at a capture" },
];

for (const ex of EX521) {
  test(`5.2.1 ${ex.level}: right answers, then "${ex.told}"`, async ({ page }) => {
    // Up to five positions built click by click: 2.2 minutes at 390 in WebKit.
    test.setTimeout(300_000);
    const line = ex.level === "L3" ? ITALIAN : E521[ex.level];
    const isExample = (s: Script) => s.from === fromWords(line);
    const seed = seedWhere(`ch5-521-${ex.level}`, (seed) => {
      const r = roundOf(c521, ex.level, seed);
      return r.side === ex.side && r.scripts.some(isExample);
    });
    const { scripts } = roundOf(c521, ex.level, seed);
    expect(buttonsOf(scripts)).toEqual(new Set([ex.level === "L1" ? "Hide" : "Next"]));
    const { errors, sent } = await startRound(page, seed, "5.2.1", ex.level);
    const level = c521.levels.find((l) => l.id === ex.level)!;

    let asked = 0;
    for (const s of scripts) {
      for (const [i, show] of s.shows.entries()) await seeShow(page, show, i);
      const moves = s.shows.flatMap((x) => (x.move ? [san(x.move)] : x.words ? x.words.split(" ").filter((w) => !/^\d+\./.test(w)) : []));
      const name = s.shows.find((x) => x.name)?.name?.replace(/^The (.*)\.$/, "$1") ?? null;
      const right = playLine(startOf(name), moves).positions.at(-1)!;
      const example = isExample(s);
      await expect(question(page, asked + 1, level.questions)).toBeVisible();
      await expect(page.locator("h2.q")).toHaveText(example ? ex.question : /^Rebuild the position after \d+\.(\.\.)? \S+\.$/);
      // The board in the starting position, no names, facing White whichever side the round drew.
      await expect(page.locator(".board .pc")).toHaveCount(32);
      await expect(page.locator(".nm")).toHaveCount(0);
      await expectFacingWhite(page, ex.side);
      if (asked === 0) await checkLayout(page);

      await build(page, example ? ex.change(right).board : right.board);
      await page.getByRole("button", { name: "Confirm" }).click();
      if (example) {
        await expect(page.locator(".told")).toHaveText(ex.told);
        await expect(page.locator(".told")).toHaveClass(/wrong/);
      } else {
        await expect(page.locator(".told")).toHaveText(/^Right: all \d+ squares\.$/);
      }
      // The position shows again on the board, with the moves.
      await expect(page.locator(".board .pc")).toHaveCount(piecesOf(right).length);
      if (asked === 0) await checkLayout(page);
      await next(page);
      asked++;
    }
    expect(asked).toBe(level.questions);

    await checkScore(page, sent, level.questions - 1, level.questions, ex.kinds, level.passMark, [[ex.lost, "1"]]);
    // My average time per move is counted: at L1, the list's time, once per move.
    await expect(statOf(page, "Average time per move")).toHaveText(/^\d+\.\d s$/);
    if (ex.level === "L1") await expect(statOf(page, "Average look time")).toHaveCount(0);
    expect(sent[0]).toMatchObject({ chapter: 5, step: ex.step, place: ex.step });
    expect(sent[0]!.comebacks).toEqual([{ challenge: "5.2.1", facts: { game: line.game, misses: [{ ply: expect.any(Number), kind: expect.any(String) }] }, rounds: 2 }]);
    expect(errors).toEqual([]);
  });
}

// Record line 5-104: a pawn I move onto its last rank asks which piece it
// becomes, Queen, Rook, Bishop or Knight, and becomes it. A line holding a
// promotion ends with more queens than the starting set holds: rebuilt whole.
test("5.2.1 L5: a pawn moved onto its last rank asks which piece it becomes, and a position with a promoted queen is rebuilt whole", async ({ page }) => {
  test.setTimeout(300_000);
  const promoted = real.first.filter((l) => l.plies > 20 && l.sans.slice(0, 20).some((s) => s.includes("=")));
  expect(promoted.length, "a real line of 20 half-moves holding a promotion").toBeGreaterThan(0);
  const lines: LinesPack = { first: promoted.slice(0, 1), afterOpening: [], mid: [] };
  const seed = "ch5-521-promotion";
  const { scripts } = roundOf(c521, "L5", seed, { ...PACK, "lines.json": lines });
  expect(scripts).toHaveLength(1);
  const { errors, sent } = await startRound(page, seed, "5.2.1", "L5", lines);
  const s = scripts[0]!;
  for (const [i, show] of s.shows.entries()) await seeShow(page, show, i);
  const moves = s.shows.flatMap((x) => (x.move ? [san(x.move)] : []));
  const right = playLine(startingPosition(), moves).positions.at(-1)!;
  await expect(page.locator("h2.q")).toHaveText(/^Rebuild the position after \d+\.(\.\.)? \S+\.$/);

  // A black pawn onto b1 asks what it becomes: the four pieces, and no Confirm until one is picked.
  await square(page, "b7").click();
  await square(page, "b1").click();
  for (const name of ["Queen", "Rook", "Bishop", "Knight"]) await expect(page.getByRole("button", { name, exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Confirm", exact: true })).toHaveCount(0);
  await checkLayout(page);
  await page.getByRole("button", { name: "Knight", exact: true }).click();
  await expect(square(page, "b1").locator(".pc")).toHaveAttribute("src", /bN\.svg$/);
  await expect(square(page, "b1").locator(".pc")).toHaveClass(/black/);
  await expect(square(page, "b7").locator(".pc")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Confirm", exact: true })).toBeVisible();
  // A click on the board drops the question and counts as the click it is: the pawn, still picked, goes there.
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await square(page, "g7").click();
  await square(page, "g1").click();
  await expect(page.getByRole("button", { name: "Queen", exact: true })).toBeVisible();
  await square(page, "a6").click();
  await expect(page.getByRole("button", { name: "Queen", exact: true })).toHaveCount(0);
  await expect(square(page, "g1").locator(".pc")).toHaveClass(/white/);
  await expect(square(page, "a6").locator(".pc")).toHaveClass(/black/);
  await expect(square(page, "g7").locator(".pc")).toHaveCount(0);
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(page.locator(".board .pc")).toHaveCount(32);

  // The position the line ends in is built by hand, a promoted queen made on the way, and is right whole.
  await buildPromoting(page, right.board);
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(page.locator(".told")).toHaveText(/^Right: all \d+ squares\.$/);
  await expect(page.locator(".board .pc")).toHaveCount(piecesOf(right).length);
  await next(page);
  await expect(page.getByRole("heading", { level: 1, name: "Score" })).toBeVisible();
  await expect(page.locator(".bigscore")).toHaveAttribute("aria-label", "1 right answers of 1");
  await expect.poll(() => sent.length, { message: "rounds the record kept" }).toBe(1);
  await checkLayout(page);
  expect(errors).toEqual([]);
});

// Builds a target from the starting position by hand, as build() does, after
// making each piece the target holds beyond the starting set: a pawn of that
// side moved onto a last-rank square, and made that piece.
async function buildPromoting(page: Page, target: Board) {
  const start = startingPosition().board;
  const cur: Partial<Record<Square, Stands>> = { ...start };
  const count = (b: Board, side: Side, kind: string) => SQUARES.filter((x) => b[x]?.side === side && b[x]?.kind === kind).length;
  for (const side of ["white", "black"] as const) {
    for (const kind of ["queen", "rook", "bishop", "knight"] as const) {
      for (let extra = count(target, side, kind) - count(start, side, kind); extra > 0; extra--) {
        const pawn = SQUARES.find((x) => cur[x]?.side === side && cur[x]?.kind === "pawn" && !same(cur[x], target[x]));
        const last = SQUARES.find((x) => x[1] === (side === "white" ? "8" : "1") && !same(cur[x], target[x]));
        if (!pawn || !last) throw new Error(`No pawn to make a ${kind}.`);
        await square(page, pawn).click();
        await square(page, last).click();
        await page.getByRole("button", { name: kind[0]!.toUpperCase() + kind.slice(1), exact: true }).click();
        cur[last] = { side, kind };
        delete cur[pawn];
      }
    }
  }
  await build(page, target, cur);
}

const statOf = (page: Page, name: string) =>
  page.locator(".stats div").filter({ has: page.locator("dt", { hasText: new RegExp(`^${name}$`) }) }).locator("dd");

// ---------------------------------------------------------------------------
// The page's other lines a person sees

test("chapter 5's screen: one tree of its sections, challenges and levels", async ({ page }) => {
  const errors = consoleErrors(page);
  await fakeRecord(page);
  await openChapter(page, 5, "Updating a position");
  await checkTree(page, 5);
  await checkLayout(page);
  expect(errors).toEqual([]);
});

test("5.1.1 L2: a miss says why, by its kind", async ({ page }) => {
  const seed = "ch5-511-why";
  const { scripts } = roundOf(c511, "L2", seed);
  const first = scripts[0]!.asks[0]!;
  // The right piece's other side, or, on an empty square, a black knight.
  const answer: Stands = first.right ? { side: first.right.side === "white" ? "black" : "white", kind: first.right.kind } : { side: "black", kind: "knight" };
  // The core's own told line for it, from the same round.
  const level = c511.levels.find((l) => l.id === "L2")!;
  const random = seeded(seed);
  random.pick(["white", "black"]);
  const item = c511.makeRound(level, random, { side: "white", back: [], packs: PACK })[0]!;
  let step = item.first();
  while (step.step === "show") step = item.next({ did: "press" });
  const told = item.next({ did: "answer", answer: { kind: "stands", stands: answer } });
  if (told.step !== "told") throw new Error("No told line.");
  expect(told.line).toMatch(first.right ? /It is \w+'s \w+, not \w+'s\.$/ : /and no Black knight stood there or stands one square off it\.$/);

  const { errors } = await startRound(page, seed, "5.1.1", "L2");
  for (const [i, show] of scripts[0]!.shows.slice(0, first.at).entries()) await seeShow(page, show, i);
  await page.locator(".choices").getByRole("button", { name: standsWords(answer), exact: true }).click();
  await expect(page.locator(".told")).toHaveText(told.line);
  await checkLayout(page);
  expect(errors).toEqual([]);
});

test("5.2.1 L5: a question left when the minutes run out is a miss, its squares wrong", async ({ page }) => {
  const seed = "ch5-521-time";
  const { scripts } = roundOf(c521, "L5", seed);
  const moves = scripts[0]!.shows.map((s) => san(s.move!));
  const right = playLine(startingPosition(), moves).positions.at(-1)!;
  const changed = SQUARES.filter((s) => !same(startingPosition().board[s], right.board[s])).length;
  // fakeRecord installs the clock.
  const { errors, sent } = await startRound(page, seed, "5.2.1", "L5");
  await seeShow(page, scripts[0]!.shows[0]!, 0);
  // The round's 4 minutes run out before its one question is told.
  await page.clock.fastForward("04:01");
  await expect(page.getByRole("heading", { level: 1, name: "Score" })).toBeVisible();
  await expect(page.locator(".bigscore")).toHaveAttribute("aria-label", "0 right answers of 1");
  await expect(statOf(page, "Squares right")).toHaveText("0");
  await expect(statOf(page, "Squares that changed")).toHaveText(String(changed));
  await expect(statOf(page, "Left when time ran out")).toHaveText("1");
  await expect.poll(() => sent.length, { message: "rounds the record kept" }).toBe(1);
  await checkLayout(page);
  expect(errors).toEqual([]);
});
