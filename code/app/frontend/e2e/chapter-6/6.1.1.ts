// 6.1.1 Find the winning move, all five levels: right answers, then each
// level's wrong example from its card, each told line word for word.
// Card: code/blueprint/docs/blind-play.md, 6.1.1.
//
// The site fetches a puzzles pack holding the level's example and real
// puzzles enough for one round, so every round asks the example. The test
// makes the same round in node, from the same seed and pack, so it knows each
// puzzle's answer.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { expect, test, type Page } from "@playwright/test";
import { EXAMPLES } from "../../../core/src/chapters/6-blind-play/6.1.1/examples.ts";
import { LEVELS, mirrorPuzzle, roundPuzzles, type Seen } from "../../../core/src/chapters/6-blind-play/6.1.1/index.ts";
import { numbered } from "../../../core/src/notation/index.ts";
import type { Puzzle, PuzzlesPack } from "../../../core/src/packs/index.ts";
import { fromFen } from "../../../core/src/positions/index.ts";
import { seeded } from "../../../core/src/random/index.ts";
import { moveBetween, play } from "../../../core/src/rules/index.ts";
import type { Kind, Side, Square } from "../../../core/src/shape/index.ts";
import { checkLayout, composeMove, consoleErrors, fakeRecord, next, openChapter, openLevel, question } from "../helpers.ts";
import { expectLook } from "../look.ts";
import { seedRounds, servePack } from "../rounds-5-6.ts";

const real = JSON.parse(readFileSync(fileURLToPath(new URL("../../../core/packs/puzzles.json", import.meta.url)), "utf8")) as PuzzlesPack;
const PROMOTION: Record<string, Kind> = { q: "queen", r: "rook", b: "bishop", n: "knight" };

type Example = {
  level: "L1" | "L2" | "L3" | "L4" | "L5";
  step: number; // its index on chapter 6's path
  question: string;
  words?: string; // the position in words: on screen at L4, before the move at L5
  wrong: string; // the choice picked, or the move built on the move composer
  told: string;
  kind: string;
};

// The card's five examples, each a wrong answer.
const CASES: Example[] = [
  {
    level: "L1", step: 0, question: "White played 28. Bxh6. Find your winning move.", wrong: "Rh2+",
    told: "No: it is 28... Nxg3#. Rh2+ is check, but White's king takes the rook on h2.", kind: "A check that is not mate",
  },
  {
    level: "L2", step: 1, question: "White played 26. Kxg1. Find your winning move.", wrong: "Qg2",
    told: "No: it is 26... Qh1#. Qg2+ is check, but White's queen on h3 takes it.", kind: "A check that is not mate",
  },
  {
    level: "L3", step: 3, question: "Black played 32... Be4. Find your winning move.", wrong: "Rd7",
    told: "No: it is 33. Rd8+, and after 33... Ne8, 34. Rxe8#. d7 is the rank beside d8.", kind: "The rank beside",
  },
  {
    level: "L4", step: 5, question: "Black played 50... g5. Find your winning move.", wrong: "Rg3",
    words: "White: king f7, rook f3. Black: king h6, rook e4, bishop d4, pawns b6, f4, g5 and h7. White to move.",
    told: "No: it is 51. Rh3#. g3 is the file beside h3.", kind: "The file beside",
  },
  {
    level: "L5", step: 9, question: "White played 49. Rxc2. Find your winning move.", wrong: "c1=Q",
    words: "White: king d3, rook c4, pawn h4. Black: king g6, knight f3, pawns c2 and f5. White to move.",
    told: "No: your pawn on c2 was taken by 49. Rxc2. It is 49... Ne1+, then 50... Nxc2: the knight checks the king, then takes the rook.",
    kind: "A move from before my opponent's move",
  },
];

// A pack for one level's round: its example, and the first real puzzles of
// each kind it asks, just enough for the round.
function packFor(level: Example["level"]): PuzzlesPack {
  const l = LEVELS.find((x) => x.id === level)!;
  const most = level === "L4" || level === "L5" ? 7 : Infinity;
  const example = EXAMPLES[level];
  const twoMove = level !== "L1" && level !== "L2";
  const want = { one: twoMove ? l.questions / 2 : l.questions, two: twoMove ? l.questions / 2 : 0 };
  const isOne = (p: Puzzle) => p.kind === "mate in one";
  const take = (one: boolean, n: number) => real.puzzles.filter((p) => isOne(p) === one && p.besides <= most).slice(0, n);
  const ones = take(true, want.one - (isOne(example) ? 1 : 0));
  const twos = take(false, want.two - (isOne(example) ? 0 : 1));
  return { puzzles: [example, ...ones, ...twos] };
}

// My moves in a puzzle as I meet it, written, with their UCI forms, and
// numbered as the page shows them back: "33. Rd8+".
function answers(seen: Seen): { uci: string; san: string; said: string }[] {
  const p = seen.mirrored ? mirrorPuzzle(seen.puzzle) : seen.puzzle;
  let pos = fromFen(p.fen);
  const out: { uci: string; san: string; said: string }[] = [];
  p.moves.forEach((uci, i) => {
    const m = moveBetween(pos, uci.slice(0, 2) as Square, uci.slice(2, 4) as Square, PROMOTION[uci[4] ?? ""] ?? null)!;
    if (i % 2 === 1) out.push({ uci, san: m.san, said: numbered(m.san, m.side, pos.moveNumber) });
    pos = play(pos, m)!;
  });
  return out;
}

// The round the site makes from a seed, as rounds.ts makes it: the side
// drawn first, then the challenge's round.
function roundOf(level: Example["level"], seed: string, pack: PuzzlesPack): Seen[] {
  const random = seeded(seed);
  const side = random.pick<Side>(["white", "black"]);
  return roundPuzzles(LEVELS.find((l) => l.id === level)!, random, { side, back: [], packs: { "puzzles.json": pack } });
}

const square = (page: Page, sq: string) => page.getByRole("button", { name: sq, exact: true });

// Where a square sits on screen: its column from the left, and its row from the bottom, 1 to 8.
async function placeOf(page: Page, sq: string) {
  const board = (await page.locator(".board").boundingBox())!;
  const box = (await square(page, sq).boundingBox())!;
  const side = board.width / 8;
  return { col: Math.round((box.x - board.x) / side) + 1, row: 8 - Math.round((box.y - board.y) / side) };
}

// L1 picks one of four; from L2, the move composer, then Confirm.
async function answer(page: Page, level: string, move: string) {
  if (level === "L1") {
    await page.locator(".choices").getByRole("button", { name: move, exact: true }).click();
  } else {
    await composeMove(page, move);
    await page.getByRole("button", { name: "Confirm", exact: true }).click();
  }
}

for (const ex of CASES) {
  test(`6.1.1 ${ex.level}: right answers, then "${ex.told}"`, async ({ page }) => {
    const errors = consoleErrors(page);
    const seed = `e2e-611-${ex.level}`; // a round id: letters, digits, - or _
    const pack = packFor(ex.level);
    const round = roundOf(ex.level, seed, pack);
    const level = LEVELS.find((l) => l.id === ex.level)!;
    expect(round).toHaveLength(level.questions);
    expect(round.some((s) => s.puzzle.id === EXAMPLES[ex.level].id)).toBe(true);

    const sent = await fakeRecord(page);
    await seedRounds(page, [seed]);
    await servePack(page, "puzzles.json", pack);
    await openChapter(page, 6, "Blind play");
    await checkLayout(page);
    await openLevel(page, "6.1.1", ex.level);

    for (let i = 0; i < round.length; i++) {
      const seen = round[i]!;
      const isExample = seen.puzzle.id === EXAMPLES[ex.level].id;
      await expect(question(page, i + 1, level.questions)).toBeVisible();
      if (ex.level === "L5") {
        // The position in words before my opponent's move, until I hide it.
        if (isExample) await expect(page.locator(".words")).toHaveText(ex.words!);
        await expectLook(page, "Hide", { time: "look" });
        await page.getByRole("button", { name: "Hide", exact: true }).click();
      }
      const q = page.locator("h2.q");
      await expect(q).toHaveText(/ played .+\. Find your winning move\.$/);
      // A board at L1 to L3, facing White; words at L4; nothing at L5.
      await expect(page.locator(".board")).toHaveCount(ex.level === "L1" || ex.level === "L2" || ex.level === "L3" ? 1 : 0);
      await expect(page.locator(".words")).toHaveCount(ex.level === "L4" ? 1 : 0);
      if (i === 0) await checkLayout(page);

      if (isExample) {
        await expect(q).toHaveText(ex.question);
        if (ex.level === "L4") await expect(page.locator(".words")).toHaveText(ex.words!);
        if (ex.level === "L1") {
          // I play Black, the side to move, and the board still faces White: a1 at the bottom left, f4 and h6 lit.
          expect(await placeOf(page, "a1")).toEqual({ col: 1, row: 1 });
          expect(await placeOf(page, "h8")).toEqual({ col: 8, row: 8 });
          await expect(page.locator(".sx-bn")).toContainText("You play Black");
          await expect(page.locator(".sx-bn")).not.toContainText(/board|flip/i);
          await expect(square(page, "f4")).toHaveClass(/lit/);
          await expect(square(page, "h6")).toHaveClass(/lit/);
          await expect(page.locator(".choices button")).toHaveCount(4);
          for (const w of ["Nxg3#", "Rh2+", "Bf3+"]) await expect(page.locator(".choices").getByRole("button", { name: w, exact: true })).toBeVisible();
        }
        if (ex.level === "L3") {
          await expect(square(page, "g6")).toHaveClass(/lit/);
          await expect(square(page, "e4")).toHaveClass(/lit/);
        }
        await answer(page, ex.level, ex.wrong);
        await expect(page.locator(".told")).toHaveText(ex.told);
        await expect(page.locator(".told")).toHaveClass(/wrong/);
        // The puzzle's moves show on a board.
        await expect(page.locator(".board")).toHaveCount(1);
        await checkLayout(page);
      } else {
        const moves = answers(seen);
        for (const [k, m] of moves.entries()) {
          if (k > 0) {
            await expect(q).toHaveText(/ played .+\. Your next move\.$/);
            // My own move shows back once, before the reply.
            await expect(page.locator(".note-line")).toHaveText(`You played ${moves[k - 1]!.said}.`);
            await checkLayout(page);
          } else {
            await expect(page.locator(".note-line")).toHaveCount(0);
          }
          await answer(page, ex.level, ex.level === "L1" ? m.san : m.san.replace(/[+#]$/, ""));
        }
        await expect(page.locator(".told")).toHaveText(/^Right: /);
      }
      await next(page);
    }

    await expect(page.getByRole("heading", { level: 1, name: "Score" })).toBeVisible();
    await expect(page.locator(".bigscore")).toHaveAttribute("aria-label", `${level.questions - 1} right answers of ${level.questions}`);
    await expect(page.locator(".kinds li")).toHaveText([`${ex.kind}1`]);
    await expect(page.locator(".pass p")).toHaveText("Pass mark for 6.1.1 Level 1 to Level 5: the right answers in one round. My practice sets it.");
    await expect.poll(() => sent.length, { message: "rounds the record kept" }).toBe(1);
    await checkLayout(page);
    // A level played from the chapter's tree plays as its step: from step 1, I stand on it.
    expect(sent[0]).toMatchObject({ chapter: 6, step: ex.step, place: ex.step });
    expect(sent[0]!.answers).toHaveLength(level.questions);
    // The example missed comes back, mirrored.
    expect(sent[0]!.comebacks).toEqual([{ challenge: "6.1.1", facts: { id: EXAMPLES[ex.level].id, mirrored: true }, rounds: 2 }]);
    expect(errors).toEqual([]);
  });
}
