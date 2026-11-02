// Each answer input plays a trial round on its card's examples: Pick one
// choice, the square keypad, the move composer, the position composer, Click
// several, Click in order, Place pieces, Move pieces. Right first, then
// wrong, each told line the card's. The trial rounds live in the dev server
// alone: /?try=<input>.

import { expect, test, type Page } from "@playwright/test";
import { checkLayout, composeMove, composePosition, consoleErrors, fakeRecord, keySquares, next, question } from "./helpers.ts";

const sq = (page: Page, name: string) => page.locator(".board").getByRole("button", { name, exact: true });
const told = (page: Page) => page.locator(".told");
const pieces = (page: Page) => page.locator(".board .pc");
// The answer the keypad or a composer has built so far.
const built = (page: Page) => page.getByRole("status", { name: "Your answer" });

async function start(page: Page, how: string) {
  const errors = consoleErrors(page);
  await fakeRecord(page);
  await page.goto(`/?try=${how}`);
  await expect(question(page, 1)).toBeVisible();
  await checkLayout(page);
  return errors;
}

async function score(page: Page, right: number, total: number, errors: string[]) {
  await expect(page.getByRole("heading", { level: 1, name: "Score" })).toBeVisible();
  await expect(page.locator(".bigscore")).toHaveAttribute("aria-label", `${right} right answers of ${total}`);
  await checkLayout(page);
  expect(errors).toEqual([]);
}

test("Pick one choice", async ({ page }) => {
  const errors = await start(page, "choose");
  await expect(page.locator(".choice")).toHaveText(["b3", "c3", "b4", "c4"]);
  // The choice I picked takes the verdict's colour at every width. On a phone
  // the choices stay drawn, shut, so the page keeps its height, and the verdict
  // rides in the sheet over them.
  await page.locator(".choice", { hasText: "b3" }).click();
  await expect(told(page)).toHaveText("Right: b3.");
  await expect(page.locator(".choice.right")).toHaveText("b3");
  await expect(page.locator(".choice")).toHaveCount(4);
  await checkLayout(page);
  await next(page);
  await page.locator(".choice", { hasText: "c3" }).click();
  await expect(told(page)).toHaveText("No: it is b3. c3 is the file beside.");
  await expect(page.locator(".choice.wrong")).toHaveText("c3");
  await expect(page.locator(".choice")).toHaveCount(4);
  await next(page);
  await score(page, 1, 2, errors);
  await expect(page.locator(".kinds li")).toHaveText(["The file beside1"]);
});

test("Square keypad", async ({ page }) => {
  const errors = await start(page, "keypad");
  const files = page.getByRole("group", { name: "Files" });
  const ranks = page.getByRole("group", { name: "Ranks" });
  // No text box anywhere. The ranks wait for a file.
  await expect(page.getByRole("textbox")).toHaveCount(0);
  await expect(ranks.getByRole("button", { name: "5", exact: true })).toBeDisabled();
  // One square is the answer at once: two clicks.
  await keySquares(page, ["e5"]);
  await expect(told(page)).toHaveText("Right: e5.");
  await next(page);
  // A file held shows in the line, and Undo last lets it go.
  await files.getByRole("button", { name: "d", exact: true }).click();
  await expect(built(page)).toHaveText("d…");
  await page.getByRole("button", { name: "Undo last" }).click();
  await expect(built(page)).toHaveText("Your answer");
  await keySquares(page, ["e6"]);
  await expect(told(page)).toHaveText("No: it is e5. e6 is the rank beside.");
  await next(page);
  // Several squares add up, one tapped again comes off, then Confirm.
  const confirm = page.getByRole("button", { name: "Confirm" });
  await expect(confirm).toBeDisabled();
  await keySquares(page, ["e4", "f3", "h7", "h7", "f4"]);
  await expect(built(page)).toHaveText("e4f3f4");
  await checkLayout(page);
  await confirm.click();
  await expect(told(page)).toHaveText("Right: e4, f3 and f4.");
  await next(page);
  await score(page, 2, 3, errors);
});

test("Move composer", async ({ page }) => {
  const errors = await start(page, "compose-move");
  const confirm = page.getByRole("button", { name: "Confirm" });
  await expect(confirm).toBeDisabled();
  // Every key is always on, never only the legal moves. Delete takes the last off.
  await composeMove(page, "Rx");
  await expect(built(page)).toHaveText("Rx");
  await page.getByRole("button", { name: "Delete" }).click();
  await composeMove(page, "1a3");
  await expect(built(page)).toHaveText("R1a3");
  await checkLayout(page);
  await confirm.click();
  await expect(told(page)).toHaveText("Right: R1a3.");
  await next(page);
  await composeMove(page, "Ra3");
  await confirm.click();
  await expect(told(page)).toHaveText("No: it is R1a3. Your rook on a5 reaches a3 too. Both stand on the a-file, so the rank tells them apart: 1.");
  await next(page);
  await score(page, 1, 2, errors);
});

const L6_421 = [
  { side: "white", kind: "king", square: "b1" },
  { side: "white", kind: "rook", square: "b5" },
  { side: "white", kind: "pawn", square: "b2" },
  { side: "white", kind: "pawn", square: "g4" },
  { side: "white", kind: "pawn", square: "h3" },
  { side: "black", kind: "king", square: "d3" },
  { side: "black", kind: "rook", square: "c8" },
  { side: "black", kind: "pawn", square: "g5" },
  { side: "black", kind: "pawn", square: "h7" },
];

test("Position composer", async ({ page }) => {
  const errors = await start(page, "compose-position");
  for (const [pawnAt, line] of [
    ["h3", "Right: all 9 pieces."],
    ["h4", "No: 8 of 9. White's pawn stands on h3, not h4: the rank beside."],
  ]) {
    // The position shows on a board, with no list of squares beside it, until I hide it. Then no board: the squares wait for a piece.
    await expect(page.locator(".board .pc")).toHaveCount(L6_421.length);
    await expect(page.locator(".words")).toHaveCount(0);
    await page.getByRole("button", { name: "Hide", exact: true }).click();
    await expect(page.locator(".board")).toHaveCount(0);
    await expect(page.getByRole("group", { name: "Files" }).getByRole("button", { name: "a", exact: true })).toBeDisabled();
    await composePosition(page, L6_421.map((x) => (x.square === "h3" ? { ...x, square: pawnAt! } : x)));
    // A piece tapped in the list comes off.
    await composePosition(page, [{ side: "black", kind: "queen", square: "a8" }]);
    await expect(built(page)).toHaveText("10 pieces placed");
    await page.getByRole("button", { name: "Take off Black's queen on a8" }).click();
    await expect(built(page)).toHaveText("9 pieces placed");
    await checkLayout(page);
    await page.getByRole("button", { name: "Confirm" }).click();
    await expect(told(page)).toHaveText(line!);
    await next(page);
  }
  await score(page, 1, 2, errors);
});

test("Click several", async ({ page }) => {
  const errors = await start(page, "click-many");
  const confirm = page.getByRole("button", { name: "Confirm" });
  await expect(confirm).toBeDisabled();
  await sq(page, "d5").click();
  await sq(page, "f6").click();
  await sq(page, "f6").click(); // clicked again, it comes off
  await sq(page, "e6").click();
  await expect(sq(page, "f6")).toHaveAttribute("aria-pressed", "false");
  await expect(sq(page, "e6")).toHaveAttribute("aria-pressed", "true");
  await confirm.click();
  await expect(told(page)).toHaveText("Right: d5 and e6.");
  await next(page);
  await sq(page, "d5").click();
  await confirm.click();
  await expect(told(page)).toHaveText("No: between c4 and f7 lie d5 and e6. You left out e6.");
  await next(page);
  await page.getByRole("button", { name: "No diagonal" }).click();
  await expect(told(page)).toHaveText("Right: c1 and g4 share no diagonal.");
  await next(page);
  await score(page, 2, 3, errors);
});

test("Click in order", async ({ page }) => {
  const errors = await start(page, "click-route");
  await expect(pieces(page)).toHaveCount(1);
  await sq(page, "h3").click();
  await page.getByRole("button", { name: "Undo last" }).click();
  await sq(page, "f3").click();
  await sq(page, "e5").click();
  await expect(page.locator(".board .num")).toHaveText(["2", "1"]); // e5 sits above f3
  await page.getByRole("button", { name: "Confirm" }).click();
  await expect(told(page)).toHaveText("Right: f3, e5, in 2 moves.");
  await next(page);
  for (const s of ["h3", "f4", "e5"]) await sq(page, s).click();
  await page.getByRole("button", { name: "Confirm" }).click();
  await expect(told(page)).toHaveText("No: f4 to e5 is no knight move. The only route: g1, f3, e5.");
  await next(page);
  await score(page, 1, 2, errors);
});

const L1_421: [string, string][] = [
  ["White king", "h2"],
  ["White rook", "f5"],
  ["White pawn", "h3"],
  ["Black king", "g7"],
  ["Black rook", "b1"],
  ["Black pawn", "h6"],
];

test("Place pieces", async ({ page }) => {
  const errors = await start(page, "place");
  for (const [rookAt, line] of [
    ["b1", "Right: all 6 pieces."],
    ["a1", "No: 5 of 6. Black's rook stands on b1, not a1: the file beside."],
  ]) {
    // The position shows until I hide it.
    await expect(pieces(page)).toHaveCount(6);
    await page.getByRole("button", { name: "Hide", exact: true }).click();
    await expect(pieces(page)).toHaveCount(0);
    for (const [piece, at] of L1_421) {
      await page.getByRole("button", { name: piece, exact: true }).click();
      await sq(page, piece === "Black rook" ? rookAt! : at).click();
    }
    // A placed piece clicked again comes off.
    await sq(page, "a8").click();
    await expect(pieces(page)).toHaveCount(7);
    await sq(page, "a8").click();
    await expect(pieces(page)).toHaveCount(6);
    await page.getByRole("button", { name: "Confirm" }).click();
    await expect(told(page)).toHaveText(line!);
    await checkLayout(page);
    await next(page);
  }
  await score(page, 1, 2, errors);
  await expect(page.locator(".stats")).toContainText("Pieces right11");
  await expect(page.locator(".stats")).toContainText("Average look time");
});

test("Move pieces from the starting position", async ({ page }) => {
  const errors = await start(page, "move");
  for (const [bishopTo, line] of [
    ["c4", "Right: the Italian Game."],
    ["b5", "No: in the Italian Game, White's bishop stands on c4. On b5, it is the Ruy Lopez."],
  ]) {
    await expect(page.locator(".lookname")).toHaveText("Italian Game");
    await page.getByRole("button", { name: "Hide", exact: true }).click();
    await expect(pieces(page)).toHaveCount(32);
    // Take off, then Reset, puts the board back.
    await sq(page, "a2").click();
    await page.getByRole("button", { name: "Take off" }).click();
    await expect(pieces(page)).toHaveCount(31);
    await page.getByRole("button", { name: "Reset" }).click();
    await expect(pieces(page)).toHaveCount(32);
    for (const [from, to] of [["e2", "e4"], ["g1", "f3"], ["f1", bishopTo!], ["e7", "e5"], ["b8", "c6"]]) {
      await sq(page, from!).click();
      await expect(sq(page, from!)).toHaveClass(/sel/);
      await sq(page, to!).click();
    }
    await page.getByRole("button", { name: "Confirm" }).click();
    await expect(told(page)).toHaveText(line!);
    await checkLayout(page);
    await next(page);
  }
  await score(page, 1, 2, errors);
});
