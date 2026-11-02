// The top strip and where I stand. At 390 the strip is not drawn while a round
// plays, a trial round too; it comes back on every other screen, and the menu
// stays at 1440 everywhere. A level on the chapters page plays as its path
// step, and where I stand moves forward only: a later step moves it, an
// earlier one or the same one moves nothing, a trial or a round I leave
// moves nothing.

import { expect, test, type Page } from "@playwright/test";
import {
  bestScore,
  challengeNode,
  checkLayout,
  consoleErrors,
  fakeRecord,
  fold,
  lastScore,
  next,
  openChallenge,
  openChapter,
  openLevel,
  playFindTheSquare,
  playNameTheSquare,
  question,
} from "./helpers.ts";

const narrow = (page: Page) => page.viewportSize()!.width < 1100;

// The shell's top bar, in either of its two shapes at 390: the shut strip, and the open bar with its Menu button.
const strips = (page: Page) => page.locator(".side:visible, .strip390:visible");

async function menuOpen(page: Page) {
  return (await page.locator("#menu-links").getAttribute("class"))!.includes("open");
}

async function backToChapter(page: Page) {
  await page.getByRole("button", { name: "Back to the chapter" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "1. Board coordinates" })).toBeVisible();
}

// Waits for the record's send: the round reached it.
const keptCount = (kept: unknown[], n: number) => expect.poll(() => kept.length, { message: "rounds the record kept" }).toBe(n);

test("a trial round draws no strip at 390, and the menu at 1440", async ({ page }) => {
  const errors = consoleErrors(page);
  await fakeRecord(page);
  await page.goto("/?try=choose");
  await expect(question(page, 1)).toBeVisible();
  if (narrow(page)) {
    await expect(strips(page)).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Menu", exact: true })).toHaveCount(0);
    // The round starts the page: nothing above it.
    expect((await page.locator(".rd").boundingBox())!.y).toBeLessThanOrEqual(0);
  } else {
    await expect(page.locator(".side")).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Menu" }).getByRole("link", { name: /Board coordinates/ })).toBeVisible();
  }
  await checkLayout(page);
  expect(errors).toEqual([]);
});

test("a round from the chapter draws no strip at 390, and Leave brings it back", async ({ page }) => {
  await fakeRecord(page);
  await openChapter(page, 1, "Board coordinates");
  if (narrow(page)) await expect(page.locator(".strip390")).toBeVisible();
  await openLevel(page, "1.1.1", "L1");
  await expect(question(page, 1, 20)).toBeVisible();
  if (narrow(page)) await expect(strips(page)).toHaveCount(0);
  else await expect(page.locator(".side")).toBeVisible();
  await page.getByRole("button", { name: /Leave/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "1. Board coordinates" })).toBeVisible();
  if (narrow(page)) {
    await expect(page.locator(".strip390")).toBeVisible();
    await expect(page.getByRole("button", { name: "Menu", exact: true })).toBeVisible();
  } else await expect(page.locator(".side")).toBeVisible();
  await checkLayout(page);
});

test("the score screen keeps the strip", async ({ page }) => {
  await fakeRecord(page);
  await openChapter(page, 1, "Board coordinates");
  await openLevel(page, "1.1.1", "L1");
  await playFindTheSquare(page);
  if (narrow(page)) await expect(page.locator(".strip390")).toBeVisible();
  else await expect(page.locator(".side")).toBeVisible();
});

test("an open menu is open again after the round, a shut one shut", async ({ page }) => {
  test.skip(!narrow(page), "The menu is drawn in a round at 1440; the strip only hides at 390.");
  await fakeRecord(page);
  await openChapter(page, 1, "Board coordinates");
  // Shut before the round.
  expect(await menuOpen(page)).toBe(false);
  await openLevel(page, "1.1.1", "L1");
  await expect(strips(page)).toHaveCount(0);
  await page.getByRole("button", { name: /Leave/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "1. Board coordinates" })).toBeVisible();
  expect(await menuOpen(page)).toBe(false);

  // Open before the round: its list lies over the page, so the level is pressed by event.
  await openChallenge(page, "1.1.1");
  await page.getByRole("button", { name: "Menu", exact: true }).click();
  expect(await menuOpen(page)).toBe(true);
  await challengeNode(page, "1.1.1").locator(".lvbtn", { has: page.locator("b", { hasText: /^Level 1$/ }) }).dispatchEvent("click");
  await expect(question(page, 1, 20)).toBeVisible();
  await expect(strips(page)).toHaveCount(0);
  await page.getByRole("button", { name: /Leave/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "1. Board coordinates" })).toBeVisible();
  expect(await menuOpen(page)).toBe(true);
  await expect(page.getByRole("button", { name: "Close", exact: true })).toBeVisible();
});

// Black rounds are drawn for some levels: Restart draws again, until the banner says Black.
async function asBlack(page: Page) {
  const banner = page.locator(".sx-bn");
  for (let i = 0; i < 14 && !(await banner.count()); i++) {
    await page.getByRole("button", { name: "Restart" }).click();
    await expect(page.locator(".sx-hd")).toBeVisible();
  }
  await expect(banner).toContainText("You play Black");
}

// Where the question starts on the page, the page's own scroll added back.
const questionTop = async (page: Page) =>
  page.locator("h2.q, h2.lookname").first().evaluate((e) => e.getBoundingClientRect().top + window.scrollY);

const BLACK_LEVELS: [string, string, string, number, string][] = [
  ["3.2.1", "L4", "Black, with its signs", 3, "Notation"],
  ["6.2.1", "L1", "Black, on a board facing White", 6, "Blind play"],
];

for (const [challenge, level, words, chapter, name] of BLACK_LEVELS) {
  test(`${challenge} ${level} as Black (${words}) starts its question above the fold at 390`, async ({ page }) => {
    test.skip(!narrow(page), "The fold is the phone's.");
    const errors = consoleErrors(page);
    await fakeRecord(page);
    await openChapter(page, chapter, name);
    await openLevel(page, challenge, level);
    await asBlack(page);
    const top = await questionTop(page);
    expect(top, `the question's top on ${challenge} ${level}`).toBeLessThan(fold(page));
    await checkLayout(page);
    expect(errors).toEqual([]);
  });
}

// Where I stand: the record keeps it with each round. Each level's row shows
// my last round and my best there. Chapter 1's path: 1.1.1 L1 is step 1, 1.1.1
// L2 step 2, 1.1.2 L1 step 4. Their levels have no clock, so a slow phone
// cannot fail a round by time.
test("a later level moves where I stand to its step, the steps between skipped, and its row shows my score", async ({ page }) => {
  const kept = await fakeRecord(page);
  await openChapter(page, 1, "Board coordinates");
  await expect(lastScore(page, "1.1.1", "L2")).toHaveText("Not played yet");

  await openLevel(page, "1.1.1", "L2");
  await playFindTheSquare(page);
  // Next is the chapter's own order, 1.1.1 L3: never the path's step 3, 1.2.1 L1.
  await expect(page.locator(".nextup")).toContainText("1.1.1 Level 3");
  await keptCount(kept, 1);
  expect(kept[0]).toMatchObject({ chapter: 1, step: 1, place: 1 });
  await backToChapter(page);
  // Every answer right: 20/20, its 20 green, and my best too.
  await expect(lastScore(page, "1.1.1", "L2")).toHaveText("20/20");
  await expect(lastScore(page, "1.1.1", "L2").locator(".ls-green")).toHaveText("20");
  await expect(bestScore(page, "1.1.1", "L2")).toHaveText("20/20");
  await expect(lastScore(page, "1.1.1", "L1")).toHaveText("Not played yet");

  await openLevel(page, "1.1.2", "L1");
  await playNameTheSquare(page);
  await keptCount(kept, 2);
  expect(kept[1]).toMatchObject({ chapter: 1, step: 3, place: 3 });
  await backToChapter(page);
  await expect(lastScore(page, "1.1.2", "L1")).toHaveText("20/20");
  await checkLayout(page);
});

test("an earlier level, and the same one, move nothing; the record's rounds show on the rows", async ({ page }) => {
  const kept = await fakeRecord(page);
  // The record already has me on step 4, from a round of 1.1.2 L1, and two rounds of 1.1.1 L2, from another device.
  // Each round holds its challenge and level in its parts: its stats and my place come from them.
  const round = (id: string, challenge: string, level: string, step: number, right: number, avgAnswer: number, startedAt: string, endedAt: string) => ({
    id, chapter: 1, step, startedAt, endedAt,
    score: { revision: 2, parts: [{ challenge, level, count: 20 }], sheet: { right, total: 20, avgAnswer } }, place: 3,
  });
  // Newest first, as the real record answers.
  const rounds = [
    round("r-0", "1.1.2", "L1", 3, 12, 4, "2026-10-18T08:00:00.000Z", "2026-10-18T08:02:00.000Z"),
    round("r-1", "1.1.1", "L2", 1, 14, 3.6, "2026-10-19T08:00:00.000Z", "2026-10-19T08:01:50.000Z"),
    round("r-2", "1.1.1", "L2", 1, 9, 4.4, "2026-10-19T09:00:00.000Z", "2026-10-19T09:02:48.000Z"),
  ].reverse();
  await page.route("**/api/record", (route) => route.fulfill({ status: 200, json: { rounds, comebacks: [], places: [{ chapter: 1, step: 3 }] } }));
  await openChapter(page, 1, "Board coordinates");
  // Last, 9 of 20, 45%: red, with its average and its time. Best, 14 of 20,
  // 70%: yellow, with the best average and the fastest round.
  await expect(lastScore(page, "1.1.1", "L2")).toHaveText("9/20");
  await expect(lastScore(page, "1.1.1", "L2").locator(".ls-red")).toHaveText("9");
  const row = challengeNode(page, "1.1.1").locator(".lvbtn", { has: page.locator("b", { hasText: /^Level 2$/ }) });
  await expect(row.locator(".ls-last")).toContainText("4.4 s");
  await expect(row.locator(".ls-last")).toContainText("2:48");
  await expect(bestScore(page, "1.1.1", "L2")).toHaveText("14/20");
  await expect(bestScore(page, "1.1.1", "L2").locator(".ls-yellow")).toHaveText("14");
  await expect(row.locator(".ls-best")).toContainText("3.6 s");
  await expect(row.locator(".ls-best")).toContainText("1:50");

  // 1.1.1 L1 is step 1, earlier.
  await openLevel(page, "1.1.1", "L1");
  await playFindTheSquare(page);
  await keptCount(kept, 1);
  expect(kept[0]).toMatchObject({ chapter: 1, step: 0, place: 3 });
  await backToChapter(page);

  // 1.1.2 L1 is step 4, the same one.
  await openLevel(page, "1.1.2", "L1");
  await playNameTheSquare(page);
  await keptCount(kept, 2);
  expect(kept[1]).toMatchObject({ chapter: 1, step: 3, place: 3 });
});

// A level's stats follow the challenge and level its rounds hold, never a step
// number. 1.3.1's old levels, of 10 questions, stay in the record and show on none
// of its new ones, of 20.
test("rounds of 1.3.1's old levels show on none of its new levels", async ({ page }) => {
  await fakeRecord(page);
  const round = (id: string, level: string, total: number, right: number, hour: number) => ({
    id,
    chapter: 1,
    step: 7,
    startedAt: `2026-10-19T0${hour}:00:00.000Z`,
    endedAt: `2026-10-19T0${hour}:03:00.000Z`,
    score: { revision: 2, parts: [{ challenge: "1.3.1", level, count: total }], sheet: { right, total, avgAnswer: 5 } },
    place: 7,
  });
  // Newest first, as the real record answers.
  const rounds = [
    round("old-1", "L1", 10, 9, 1),
    round("old-2", "L2", 10, 8, 2),
    round("old-3", "L3", 10, 7, 3),
    round("old-4", "L4", 10, 6, 4),
    round("new-1", "L1", 20, 15, 5),
  ].reverse();
  await page.route("**/api/record", (route) => route.fulfill({ status: 200, json: { rounds, comebacks: [], places: [] } }));
  await openChapter(page, 1, "Board coordinates");
  await expect(lastScore(page, "1.3.1", "L1")).toHaveText("15/20");
  await expect(bestScore(page, "1.3.1", "L1")).toHaveText("15/20");
  await expect(lastScore(page, "1.3.1", "L2")).toHaveText("Not played yet");
  await expect(lastScore(page, "1.3.1", "L3")).toHaveText("Not played yet");
});

// Chapter 1's levels were cut: its rounds kept before carry no revision and
// count nowhere, the 30-question mixed round too. They stay in the record.
test("chapter 1's rounds kept before its levels were cut show on no row", async ({ page }) => {
  await fakeRecord(page);
  const round = (id: string, challenges: string[], total: number, right: number, revision: number | null, hour: number) => ({
    id,
    chapter: 1,
    step: 0,
    startedAt: `2026-10-19T0${hour}:00:00.000Z`,
    endedAt: `2026-10-19T0${hour}:03:00.000Z`,
    score: {
      ...(revision === null ? {} : { revision }),
      parts: challenges.map((challenge) => ({ challenge, level: "L1", count: total / challenges.length })),
      sheet: { right, total, avgAnswer: 5 },
    },
    place: 0,
  });
  // Newest first, as the real record answers.
  const rounds = [
    round("old-level", ["1.1.1"], 20, 15, null, 1),
    round("old-mixed", ["1.1.1", "1.1.2", "1.2.1", "1.3.1"], 30, 24, null, 2),
    round("new-level", ["1.2.1"], 20, 14, 2, 3),
  ].reverse();
  await page.route("**/api/record", (route) => route.fulfill({ status: 200, json: { rounds, comebacks: [], places: [] } }));
  await openChapter(page, 1, "Board coordinates");
  await expect(lastScore(page, "1.1.1", "L1")).toHaveText("Not played yet");
  await expect(page.locator(".lvbtn.tmix .ls-none")).toHaveText("Not played yet");
  await expect(lastScore(page, "1.2.1", "L1")).toHaveText("14/20");
});

test("a trial round moves nothing and keeps nothing", async ({ page }) => {
  const kept = await fakeRecord(page);
  await page.goto("/?try=choose");
  for (let i = 1; i <= 2; i++) {
    await expect(question(page, i, 2)).toBeVisible();
    await page.locator(".choice").first().click();
    await next(page);
  }
  await expect(page.getByRole("heading", { level: 1, name: "Score" })).toBeVisible();
  expect(kept).toHaveLength(0);
  expect(await page.evaluate(() => localStorage.getItem("bc.outbox") ?? "[]")).toBe("[]");
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("bc.progress") ?? "{}").places ?? {})).toEqual({});
});

test("a round I leave moves nothing and sends nothing", async ({ page }) => {
  const kept = await fakeRecord(page);
  await openChapter(page, 1, "Board coordinates");
  await openLevel(page, "1.1.1", "L2");
  await expect(question(page, 1, 20)).toBeVisible();
  await page.getByRole("button", { name: /Leave/ }).click();
  await expect(lastScore(page, "1.1.1", "L2")).toHaveText("Not played yet");
  expect(kept).toHaveLength(0);
  expect(await page.evaluate(() => localStorage.getItem("bc.outbox") ?? "[]")).toBe("[]");
});
