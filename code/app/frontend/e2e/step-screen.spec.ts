// The step screen's header and its parts: the board inside the screen, the
// question starting above the fold; Restart, Next level, Settings; the Black
// banner; the countdown on a timed level.
// The folds, 780 at 1440 and 740 at 390, are the user's estimates for this
// screen alone.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { expect, test, type Page } from "@playwright/test";
import { fastest } from "../../core/src/chapters/6-blind-play/6.2.1/index.ts";
import { positionFacts } from "../../core/src/chapters/2-piece-movement/set-ups.ts";
import { fromWords, piecesOf } from "../../core/src/positions/index.ts";
import type { Square } from "../../core/src/shape/index.ts";
import { checkLayout, comingBack, composeMove, consoleErrors, fakeRecord, fold, keySquares, move, next, openChapter, openLevel, playMixedRound, question } from "./helpers.ts";
import { noReload, seedRounds, seedWhere, sideOf } from "./rounds-5-6.ts";

// The dev server reloads its pages when any session saves a file it serves: a
// page reloaded mid-round lands back on Home.
test.beforeEach(({ page }) => noReload(page));

const TRIALS = ["choose", "keypad", "compose-move", "compose-position", "click-many", "click-route", "place", "move"];

const box = (page: Page, selector: string) => page.locator(selector).first().boundingBox();
const wide = (page: Page) => page.viewportSize()!.width >= 1100;
// The header's height: three rows in the column at 1440, three slim rows on a phone.
const tallest = (page: Page) => (wide(page) ? 250 : 150);

for (const how of TRIALS) {
  test(`header and fold: the trial round of ${how}`, async ({ page }) => {
    const errors = consoleErrors(page);
    await fakeRecord(page);
    await page.goto(`/?try=${how}`);
    await expect(question(page, 1)).toBeVisible();
    const header = (await box(page, ".sx-hd"))!;
    expect(header.height, "the header's height").toBeLessThanOrEqual(tallest(page));
    // The position composer's trial opens on words, with no board.
    const board = (await page.locator(".board").count()) ? await box(page, ".board") : null;
    if (board) expect(board.y + board.height, "the board ends inside the screen").toBeLessThanOrEqual(page.viewportSize()!.height);
    // A look has no question yet: its panel stands for it.
    const q = await box(page, (await page.locator("h2.q, h2.lookname").count()) ? "h2.q, h2.lookname" : ".pbody");
    expect(q!.y, "the question starts above the fold").toBeLessThan(fold(page));
    await checkLayout(page);
    expect(errors).toEqual([]);
  });
}

test("the four tiles, and Restart plays the level again from question 1", async ({ page }) => {
  await fakeRecord(page);
  await page.goto("/?try=choose");
  await expect(question(page, 1, 2)).toBeVisible();
  await expect(page.getByRole("group", { name: "0 right" })).toBeVisible();
  await expect(page.getByRole("group", { name: "0 wrong" })).toBeVisible();
  await page.locator(".choice", { hasText: "b3" }).click();
  await expect(page.getByRole("group", { name: "1 right" })).toBeVisible();
  await next(page);
  await expect(question(page, 2, 2)).toBeVisible();
  await page.getByRole("button", { name: "Restart" }).click();
  await expect(question(page, 1, 2)).toBeVisible();
  await expect(page.getByRole("group", { name: "0 right" })).toBeVisible();
  await expect(page.getByRole("group", { name: "0 wrong" })).toBeVisible();
  // A round on no path has no next step.
  await expect(page.getByRole("button", { name: /^Next level/ })).toBeDisabled();
});

test("Next level plays the challenge's next level, after its last the next challenge's first; Leave goes back to the chapter", async ({ page }) => {
  await fakeRecord(page);
  await openChapter(page, 1, "Board coordinates");
  await openLevel(page, "1.1.1", "L2");
  await expect(page.locator(".sx-lv")).toHaveText("Level 2");
  // The path's next step after 1.1.1 L2 is 1.2.1's: the button stays in 1.1.1.
  await page.getByRole("button", { name: /^Next level/ }).click();
  await expect(page.locator(".sx-lv")).toHaveText("Level 3");
  await expect(page.locator(".sx-t")).toHaveText("1.1.1 Find the square");
  await expect(question(page, 1, 20)).toBeVisible();
  await page.getByRole("button", { name: /Leave/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "1. Board coordinates" })).toBeVisible();
  await openLevel(page, "1.1.1", "L3");
  await page.getByRole("button", { name: /^Next level/ }).click();
  await expect(page.locator(".sx-t")).toHaveText(/^1\.1\.2 /);
  await expect(page.locator(".sx-lv")).toHaveText("Level 1");
});

test("a right answer moves on by itself after 1 second, under an emptying line; a miss waits for Continue", async ({ page }) => {
  await fakeRecord(page);
  await page.goto("/?try=choose");
  await expect(question(page, 1, 2)).toBeVisible();
  // A short question shows big.
  await expect(page.locator("h2.q")).toHaveClass(/big/);
  await page.clock.pauseAt(Date.now() + 1000);
  await page.locator(".choice", { hasText: "b3" }).click();
  await expect(page.locator(".told")).toHaveText("Right: b3.");
  await expect(page.getByRole("button", { name: "Continue" })).toHaveCount(0);
  await expect(page.locator(".next")).toBeVisible();
  await expect(page.locator(".avg-line")).toHaveText(/^Average time per answer \d+\.\d s$/);
  await page.clock.runFor(900);
  await expect(page.locator(".told")).toHaveText("Right: b3.");
  await page.clock.runFor(200);
  await expect(question(page, 2, 2)).toBeVisible();
  await expect(page.locator(".told")).toHaveCount(0);
  await expect(page.locator(".next")).toHaveCount(0);
  await page.clock.resume();
  await page.locator(".choice", { hasText: "c3" }).click();
  await expect(page.locator(".told")).toHaveText("No: it is b3. c3 is the file beside.");
  await page.clock.runFor(5000);
  await expect(page.getByRole("button", { name: "Continue" })).toBeVisible();
  await expect(question(page, 2, 2)).toBeVisible();
});

test("Settings opens over the page, holds the level's conditions, and shuts on Escape", async ({ page }) => {
  await fakeRecord(page);
  await openChapter(page, 1, "Board coordinates");
  await openLevel(page, "1.1.1", "L3");
  const chip = page.getByRole("button", { name: /^Settings/ });
  await expect(chip).toHaveAttribute("aria-expanded", "false");
  const before = (await box(page, ".sx-hd"))!;
  await chip.click();
  await expect(chip).toHaveAttribute("aria-expanded", "true");
  const panel = page.getByRole("region", { name: "Settings" });
  await expect(panel).toContainText("I sit as");
  await expect(panel).toContainText("Names on the edge");
  await expect(panel).toContainText("Time per question");
  await expect(panel).toContainText("2 seconds");
  // It opens over the page: the header does not grow.
  expect((await box(page, ".sx-hd"))!.height).toBe(before.height);
  await page.keyboard.press("Escape");
  await expect(panel).toHaveCount(0);
});

test("a timed level: the countdown sits right of the board at 1440 and under it at 390", async ({ page }) => {
  await fakeRecord(page);
  await openChapter(page, 1, "Board coordinates");
  await openLevel(page, "1.1.1", "L3");
  await expect(page.locator(".timer")).toHaveCount(1);
  const board = (await box(page, ".board"))!;
  const timer = (await box(page, ".timer"))!;
  if (wide(page)) expect(timer.x, "right of the board").toBeGreaterThan(board.x + board.width);
  else expect(timer.y, "under the board").toBeGreaterThanOrEqual(board.y + board.height);
  // A question draws no level's note.
  await expect(page.locator(".sx-nt")).toHaveCount(0);
  await checkLayout(page);
});

test("playing Black: the banner names Black, and the board still faces White", async ({ page }) => {
  await seedRounds(page, [seedWhere("step-black-board", (s) => sideOf(s) === "black")]);
  await fakeRecord(page);
  await openChapter(page, 3, "Notation");
  await openLevel(page, "3.1.1", "L1");
  const banner = page.locator(".sx-bn");
  await expect(banner).toContainText("You play Black");
  // The banner names the colour, never a board.
  await expect(banner).not.toContainText(/board|flip/i);
  await expect(banner).not.toContainText(/[a-h][1-8]/);
  // a1 sits at the bottom left and h8 at the top right, as for White.
  const board = (await box(page, ".board"))!;
  const a1 = (await page.getByRole("button", { name: "a1", exact: true }).boundingBox())!;
  const h8 = (await page.getByRole("button", { name: "h8", exact: true }).boundingBox())!;
  expect([a1.x - board.x < 1, a1.y + a1.height - (board.y + board.height) > -1]).toEqual([true, true]);
  expect([h8.x + h8.width - (board.x + board.width) > -1, h8.y - board.y < 1]).toEqual([true, true]);
  // A strip with the level's reason: above the header at the top of the column on a wide screen, under the board on a phone.
  await expect(banner).toContainText(/Drawn for this round|This level seats you as Black|You move for Black/);
  const strip = (await banner.boundingBox())!;
  if (wide(page)) {
    expect(await page.locator(".rcol > .sx-bn").count(), "the banner tops the column on a wide screen").toBe(1);
    expect(strip.y + strip.height, "the banner sits above the header").toBeLessThanOrEqual((await box(page, ".sx-hd"))!.y);
  } else {
    expect(strip.y, "the banner sits under the board").toBeGreaterThanOrEqual(board.y + board.height);
    expect(strip.y + strip.height, "the banner sits above the question's bar").toBeLessThanOrEqual((await box(page, ".sx-bar"))!.y);
  }
  expect(await page.locator(".sx-flip").count(), "no tag says the board is flipped").toBe(0);
  await checkLayout(page);
});

test("a level with no board seated by the round: the banner names Black and says nothing of a board", async ({ page }) => {
  await fakeRecord(page);
  await openChapter(page, 3, "Notation");
  await openLevel(page, "3.2.1", "L5");
  // The side is drawn for the round, so Black shows the banner and White the chip.
  const black = await page.locator(".sx-bn").count();
  if (black) {
    await expect(page.locator(".sx-bn")).toContainText("You play Black");
    await expect(page.locator(".sx-bn")).not.toContainText(/board|flip/i);
  }
  await expect(page.getByRole("button", { name: /^Settings/ })).toBeVisible();
  await page.getByRole("button", { name: /^Settings/ }).click();
  await expect(page.getByRole("region", { name: "Settings" })).toContainText(/I sit as\s*(White|Black)/);
  await checkLayout(page);
});

test("a mixed round names the level each question comes from, and tallies each challenge's share", async ({ page }) => {
  await fakeRecord(page);
  await openChapter(page, 1, "Board coordinates");
  await playMixedRound(page);
  await expect(question(page, 1, 23)).toBeVisible();
  await expect(page.locator(".sx-lv")).toHaveText("Mixed");
  await expect(page.locator(".sx-now")).toHaveText(/^1\.\d\.\d Level \d$/);
  await page.getByRole("button", { name: /^Settings/ }).click();
  // One tally for each challenge, its levels counted together: 4, 4, 7 and 8 pips.
  await expect(page.locator(".sx-mix > div")).toHaveText(["1.1.1", "1.1.2", "1.2.1", "1.3.1"]);
  await expect(page.locator(".sx-pips i")).toHaveCount(23);
});

// ---------------------------------------------------------------------------
// Live counts: the core hands the screen a game's count and a king's check.

// A move built on the composer, then confirmed.
const playMove = async (page: Page, move: string) => {
  await composeMove(page, move);
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
};
const hint = (page: Page, name: string) => page.getByRole("button", { name: new RegExp(`^${name}, \\d points?$`) });
const tile = (page: Page, name: string) => page.getByRole("group", { name, exact: true });
const endgameTable = (kind: string) => new Uint8Array(readFileSync(fileURLToPath(new URL(`../../core/packs/endgames/${kind}.bin`, import.meta.url))));

const BUTTONS = [
  { n: 6, name: "Blind play", challenge: "6.2.1", level: "L2" },
  { n: 6, name: "Blind play", challenge: "6.3.1", level: "L3" },
  { n: 3, name: "Notation", challenge: "3.2.1", level: "L5" },
];
for (const c of BUTTONS) {
  test(`${c.challenge} ${c.level}: the move composer's button reads Confirm`, async ({ page }) => {
    await fakeRecord(page);
    await openChapter(page, c.n, c.name);
    await openLevel(page, c.challenge, c.level);
    const hide = page.getByRole("button", { name: "Hide", exact: true });
    if (await hide.isVisible()) await hide.click();
    await expect(page.getByRole("status", { name: "Your answer" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Confirm", exact: true })).toBeVisible();
    for (const word of ["Check", "Play"]) await expect(page.getByRole("button", { name: word, exact: true })).toHaveCount(0);
    await checkLayout(page);
  });
}

test("2.3.2 L3: a king in check gets a red note above the question, naming who checks; a king not in check gets none", async ({ page }) => {
  test.slow();
  const errors = consoleErrors(page);
  // The card's example comes back among the round's three kings in check.
  const example = fromWords("White: king e1, rook e4, bishop g4. Black: king e8, knight b8, pawn f7.");
  const back = [{ challenge: "2.3.2", facts: positionFacts(example, "e8") }];
  await fakeRecord(page, { comebacks: back.map((b) => ({ ...b, rounds: 2 })) });
  await comingBack(page, back);
  await openChapter(page, 2, "Piece movement");
  await openLevel(page, "2.3.2", "L3");

  const said: string[] = [];
  for (let i = 1; i <= 10; i++) {
    await expect(question(page, i, 10)).toBeVisible();
    const note = page.locator(".sx-nt.red");
    if (await note.count()) {
      await expect(note).toHaveCount(1);
      const text = (await note.locator("span").textContent())!;
      expect(text).toMatch(/^The king on [a-h][1-8] is in check, from the (queen|rook|bishop|knight|pawn) on [a-h][1-8]( and the (queen|rook|bishop|knight|pawn) on [a-h][1-8])*\.$/);
      said.push(text);
      // At 1440 it sits above the question, as the winner draws it; on a phone,
      // under the board, so the board keeps its place. The question still
      // starts above the fold.
      const q = (await page.locator("h2.q").boundingBox())!;
      const n = (await note.boundingBox())!;
      if (page.viewportSize()!.width >= 1100) expect(n.y + n.height, "the note sits above the question").toBeLessThanOrEqual(q.y + 1);
      else expect(n.y, "the note sits under the board").toBeGreaterThanOrEqual((await page.locator(".board").boundingBox())!.y);
      expect(q.y, "the question starts above the fold").toBeLessThan(fold(page));
      // Red is the app's own.
      expect(await note.evaluate((el) => getComputedStyle(el).borderLeftColor)).toBe("rgb(224, 40, 40)");
      await checkLayout(page);
    }
    await page.getByRole("button", { name: "None", exact: true }).click();
    await next(page);
  }
  expect(said.length, "kings in check in a round of 10: 3 of the 5 king questions").toBe(3);
  expect(said).toContain("The king on e8 is in check, from the rook on e4.");
  expect(errors).toEqual([]);
});

test("2.3.2 L4: an empty board, and a king in check still gets its note", async ({ page }) => {
  test.slow();
  const errors = consoleErrors(page);
  // The card's L4 king, in check from the rook on e1, comes back among the round's.
  const example = fromWords("White: king g1, pawns f2, g2 and h2. Black: king g8, rook e1.");
  const back = [{ challenge: "2.3.2", facts: positionFacts(example, "g1") }];
  await fakeRecord(page, { comebacks: back.map((b) => ({ ...b, rounds: 2 })) });
  await comingBack(page, back);
  await openChapter(page, 2, "Piece movement");
  await openLevel(page, "2.3.2", "L4");
  let seen = false;
  for (let i = 1; i <= 10; i++) {
    await expect(question(page, i, 10)).toBeVisible();
    await expect(page.locator(".board .pc")).toHaveCount(0);
    if ((await page.locator("h2.q").textContent()) === "Which squares may White's king on g1 move to?") {
      seen = true;
      await expect(page.locator(".sx-nt.red span")).toHaveText("The king on g1 is in check, from the rook on e1.");
      await checkLayout(page);
    }
    await page.getByRole("button", { name: "None", exact: true }).click();
    await next(page);
  }
  expect(seen, "the card's king in check was asked").toBe(true);
  expect(errors).toEqual([]);
});

test("2.3.2 L5: no board, so no check note, even for a king in check", async ({ page }) => {
  test.slow();
  // The card's L5 king, in check from the rook on e1, comes back among the round's.
  const example = fromWords("White: king g1, pawns f2, g2 and h2. Black: king g8, rook e1.");
  const back = [{ challenge: "2.3.2", facts: positionFacts(example, "g1") }];
  await fakeRecord(page, { comebacks: back.map((b) => ({ ...b, rounds: 2 })) });
  await comingBack(page, back);
  await openChapter(page, 2, "Piece movement");
  await openLevel(page, "2.3.2", "L5");
  let seen = false;
  for (let i = 1; i <= 10; i++) {
    await expect(question(page, i, 10)).toBeVisible();
    if ((await page.locator("h2.q").textContent()) === "Which squares may White's king on g1 move to?") seen = true;
    await expect(page.locator(".sx-nt.red")).toHaveCount(0);
    await page.getByRole("button", { name: "None", exact: true }).click();
    await next(page);
  }
  expect(seen, "the card's king in check was asked").toBe(true);
});

test("6.2.1: the header's moves, most allowed and illegal moves are the core's own", async ({ page }) => {
  const errors = consoleErrors(page);
  await fakeRecord(page);
  await openChapter(page, 6, "Blind play");
  await openLevel(page, "6.2.1", "L2");
  const goal = (await page.locator("h2.q").textContent())!;
  const allowed = Number(/in (\d+) moves at most/.exec(goal)![1]);
  await expect(tile(page, `Move 1 of ${allowed} at most`)).toBeVisible();
  await expect(tile(page, "0 illegal moves")).toBeVisible();
  expect((await page.locator(".sx-hd").boundingBox())!.height, "the header's height").toBeLessThanOrEqual(tallest(page));
  await checkLayout(page);

  // A move the rules refuse: the farthest corner from my king. It counts as illegal, not as a move.
  const pos = fromWords((await page.locator(".words").textContent())!);
  const king = piecesOf(pos).find((p) => p.side === pos.turn && p.kind === "king")!.square;
  const far = (["a1", "a8", "h1", "h8"] as Square[]).sort((a, b) => dist(b, king) - dist(a, king))[0]!;
  await playMove(page, `K${far}`);
  await expect(page.locator(".unread")).toHaveText("Not counted. The move stays open.");
  await expect(tile(page, "1 illegal moves")).toBeVisible();
  await expect(tile(page, `Move 1 of ${allowed} at most`)).toBeVisible();

  // The refused move leaves the composer empty for the next try.
  await expect(page.getByRole("status", { name: "Your answer" })).toHaveText("Your move");

  // The fastest legal move: it plays, and the header is on the second.
  await playMove(page, fastest(endgameTable("queen"), pos, pos.turn, "queen")[0]!.san);
  await expect(tile(page, `Move 2 of ${allowed} at most`)).toBeVisible();
  await expect(tile(page, "1 illegal moves")).toBeVisible();
  await checkLayout(page);
  expect(errors).toEqual([]);
});

const dist = (a: Square, b: Square) => Math.max(Math.abs(a.charCodeAt(0) - b.charCodeAt(0)), Math.abs(Number(a[1]) - Number(b[1])));

test("6.3.1 L3: the Hints tile counts the points left as each hint is asked", async ({ page }) => {
  const errors = consoleErrors(page);
  await fakeRecord(page);
  await openChapter(page, 6, "Blind play");
  await openLevel(page, "6.3.1", "L3");
  await expect(move(page, 1)).toBeVisible();
  await expect(tile(page, "6 of 6 hint points left")).toBeVisible();
  expect((await page.locator(".sx-hd").boundingBox())!.height, "the header's height").toBeLessThanOrEqual(tallest(page));
  await checkLayout(page);
  // Each hint is a button showing its cost, beside Resign.
  await expect(hint(page, "Square")).toHaveText("Square1 point");
  await expect(hint(page, "Last moves")).toHaveText("Last moves1 point");
  await expect(hint(page, "Board")).toHaveText("Board3 points");
  await expect(page.getByRole("button", { name: "Resign", exact: true })).toBeVisible();

  await hint(page, "Square").click(); // 1 point: the square from the keypad
  await keySquares(page, ["e2"]);
  await expect(page.locator(".unread")).toHaveText("White's pawn.");
  await expect(tile(page, "5 of 6 hint points left")).toBeVisible();
  await hint(page, "Last moves").click(); // 1 point, shown until I hide it
  await expect(tile(page, "4 of 6 hint points left")).toBeVisible();
  await page.getByRole("button", { name: "Hide", exact: true }).click();
  await hint(page, "Board").click(); // 3 points, shown for 5 seconds
  await expect(tile(page, "1 of 6 hint points left")).toBeVisible();
  await checkLayout(page);
  await page.getByRole("button", { name: "Hide", exact: true }).click();
  await hint(page, "Square").click(); // the last point
  await keySquares(page, ["e4"]);
  await expect(tile(page, "0 of 6 hint points left")).toBeVisible();
  // No points left: every hint is off.
  for (const name of ["Square", "Last moves", "Board"]) await expect(hint(page, name)).toBeDisabled();
  expect(errors).toEqual([]);
});

test("6.3.1 L6: no hint is given, and the Hints tile says None", async ({ page }) => {
  await fakeRecord(page);
  await openChapter(page, 6, "Blind play");
  await openLevel(page, "6.3.1", "L6");
  await expect(move(page, 1)).toBeVisible();
  await expect(tile(page, "No hint points")).toBeVisible();
  await expect(tile(page, "No hint points")).toContainText("None");
  // Resign alone, no hint button.
  await expect(hint(page, "Square")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Resign", exact: true })).toBeVisible();
  await checkLayout(page);
});

// ---------------------------------------------------------------------------
// A verdict lands whole and the page stays still (phone-verdict g1 v1, look 3).
// On a phone the verdict and Continue ride in a sheet fixed to the screen's
// foot, over the keys, which stay drawn and locked; a refusal rides in a slim
// sheet in the same place. At 1440 both stay in the panel.

// The page's scroll, and where the first key stands in the window.
const stand = (page: Page) =>
  page.evaluate(() => ({ scroll: Math.round(window.scrollY), key: Math.round(document.querySelector(".nt-key")?.getBoundingClientRect().top ?? -1) }));

// The foot of the page, where the keys are.
const toKeys = (page: Page) => page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));

// Inside the window, whole.
async function inWindow(page: Page, selector: string) {
  const b = (await page.locator(selector).boundingBox())!;
  expect(b.y, `${selector} starts inside the window`).toBeGreaterThanOrEqual(0);
  expect(b.y + b.height, `${selector} ends inside the window`).toBeLessThanOrEqual(page.viewportSize()!.height);
}

test("3.2.1 L2: a wrong move lands whole, in a sheet at a phone's foot, and the page stays still; at 1440 it stays in the panel", async ({ page }) => {
  await fakeRecord(page);
  await openChapter(page, 3, "Notation");
  await openLevel(page, "3.2.1", "L2");
  await composeMove(page, "Ka1");
  await toKeys(page);
  const before = await stand(page);
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(page.locator(".told")).toBeVisible();
  await inWindow(page, ".told");
  await expect(page.getByRole("button", { name: "Continue" })).toBeVisible();
  if (wide(page)) {
    await expect(page.locator(".sx-sheet")).toHaveCount(0);
    await expect(page.locator(".panel .told")).toHaveCount(1);
  } else {
    await expect(page.locator(".sx-sheet .told")).toHaveCount(1);
    await expect(page.locator(".sx-sheet").getByRole("button", { name: "Continue" })).toBeVisible();
    // The sheet is fixed to the foot, 8 from it at least.
    const sheet = (await page.locator(".sx-sheet").boundingBox())!;
    expect(sheet.y + sheet.height, "the sheet sits at the foot").toBeGreaterThan(page.viewportSize()!.height - 24);
    // The page does not move, and the keys stay where they were, drawn and shut.
    expect(await stand(page), "the page stays still").toEqual(before);
    expect(await page.locator(".nt-key").count(), "the keys stay drawn").toBeGreaterThan(0);
    await expect(page.locator(".sx-keys")).toHaveAttribute("inert", "");
    await expect(page.locator(".sx-keys")).toHaveClass(/sx-lock/);
  }
  await checkLayout(page);
  // Continue goes on, and the sheet goes.
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.locator(".told")).toHaveCount(0);
  await expect(page.locator(".sx-sheet")).toHaveCount(0);
  await expect(question(page, 2, 10)).toBeVisible();
});

test("3.2.1 L2: a refusal speaks in the verdict's place, lets a tap through, and the move typed is cleared", async ({ page }) => {
  await fakeRecord(page);
  await openChapter(page, 3, "Notation");
  await openLevel(page, "3.2.1", "L2");
  await composeMove(page, "N");
  await toKeys(page);
  const before = await stand(page);
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  const note = page.locator(".unread");
  await expect(note).toHaveText("Not counted. The question stays open.");
  await inWindow(page, ".unread");
  await expect(page.getByRole("status", { name: "Your answer" })).toHaveText("Your move");
  if (wide(page)) {
    await expect(page.locator(".sx-sheet")).toHaveCount(0);
    const confirm = (await page.getByRole("button", { name: "Confirm", exact: true }).boundingBox())!;
    expect((await note.boundingBox())!.y, "under the buttons").toBeGreaterThan(confirm.y);
  } else {
    await expect(page.locator(".sx-sheet.sx-slim .unread")).toHaveCount(1);
    expect(await stand(page), "the page stays still").toEqual(before);
    // A tap goes through the slim sheet to the key under it.
    await page.getByRole("button", { name: "O-O-O", exact: true }).tap();
    await expect(page.getByRole("status", { name: "Your answer" })).toHaveText("O-O-O");
  }
  await checkLayout(page);
});

test("6.3.1 L3: Resign lands the verdict and Continue in the sheet, and the keys stay where they were on screen", async ({ page }) => {
  await fakeRecord(page);
  await openChapter(page, 6, "Blind play");
  await openLevel(page, "6.3.1", "L3");
  await expect(move(page, 1)).toBeVisible();
  await page.getByRole("button", { name: "Resign", exact: true }).click();
  await toKeys(page);
  const before = await stand(page);
  await page.getByRole("button", { name: "Yes, resign" }).click();
  await expect(page.locator(".told")).toBeVisible();
  await inWindow(page, ".told");
  await expect(page.getByRole("button", { name: "Continue" })).toBeFocused();
  // The game's board comes in above the keys: the keys stay where they were on screen.
  if (!wide(page)) expect((await stand(page)).key, "the keys stay where they were on screen").toBe(before.key);
  expect(await page.locator(".board").count(), "one board").toBe(1);
  await checkLayout(page);
});
