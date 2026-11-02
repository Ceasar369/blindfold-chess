// Home: one card, the step I played last, and nothing else.
// Before any round the card offers chapter 1, step 1. A step counts as played
// once its round starts, a round I leave too, and the browser keeps it through
// a reload. Play again plays it again; Next level plays the level after it.
// Once a round there ends, the card shows my last score against my best.

import { expect, test, type Page } from "@playwright/test";
import { checkLayout, consoleErrors, fakeRecord, openChapter, openLevel, playFindTheSquare, question } from "./helpers.ts";

const card = (page: Page, name: string) => page.getByRole("region", { name });

// Leaves the round on screen, then goes home through the chapter's breadcrumb.
async function leaveToHome(page: Page) {
  await page.getByRole("button", { name: /Leave/ }).click();
  await page.getByRole("navigation", { name: "Breadcrumb" }).getByRole("button", { name: "Home" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Home" })).toBeVisible();
}

test("before any round, home offers chapter 1, step 1, and no list of chapters", async ({ page }) => {
  const errors = consoleErrors(page);
  await fakeRecord(page);
  await page.goto("/");
  const first = card(page, "First step");
  await expect(first.locator(".ls-title")).toHaveText("Find the square L1 — names on the edge");
  await expect(first).toContainText("1.1.1 · Chapter 1, Board coordinates · 20 questions · 3 min");
  await expect(first).toContainText("no round yet");
  await expect(first.getByRole("button", { name: /^Next level/ })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Chapters" })).toHaveCount(0);
  await first.getByRole("button", { name: "Play", exact: true }).click();
  await expect(question(page, 1, 20)).toBeVisible();
  await expect(page.locator(".sx-lv")).toHaveText("L1");
  await checkLayout(page);
  expect(errors).toEqual([]);
});

test("the step I played last is home's card, through a reload, and its two buttons play", async ({ page }) => {
  await fakeRecord(page);
  await openChapter(page, 1, "Board coordinates");
  await openLevel(page, "1.1.1", "L1");
  await expect(question(page, 1, 20)).toBeVisible();
  await leaveToHome(page);

  const last = card(page, "Last played");
  await expect(last.locator(".ls-title")).toHaveText("Find the square L1 — names on the edge");
  await expect(last.getByRole("button", { name: "Next level: 1.1.1 L2" })).toBeVisible();
  await checkLayout(page);

  await page.reload();
  await expect(last.locator(".ls-title")).toHaveText("Find the square L1 — names on the edge");

  await last.getByRole("button", { name: "Play again" }).click();
  await expect(question(page, 1)).toBeVisible();
  await expect(page.locator(".sx-lv")).toHaveText("L1");
  await leaveToHome(page);

  await last.getByRole("button", { name: "Next level: 1.1.1 L2" }).click();
  await expect(question(page, 1)).toBeVisible();
  await expect(page.locator(".sx-lv")).toHaveText("L2");
  await leaveToHome(page);
  await expect(last.locator(".ls-title")).toHaveText("Find the square L2 — no names");
  await expect(last).toContainText("1.1.1 · Chapter 1, Board coordinates");
});

// The browser keeps the step I played last by its challenge and level, so a
// change to the path leaves it on the same level. A step number from before
// shows nothing: home offers step 1.
test("home's last played follows the level, never a step number", async ({ page }) => {
  await fakeRecord(page);
  await page.addInitScript(() => {
    if (!sessionStorage.getItem("seeded")) {
      localStorage.setItem("bc.last", JSON.stringify({ chapter: 1, step: "1.3.1 L2" }));
      sessionStorage.setItem("seeded", "1");
    }
  });
  await page.goto("/");
  const last = card(page, "Last played");
  await expect(last.locator(".ls-title")).toHaveText("Name the squares between L2 — nothing lit");
  await expect(last).toContainText("1.3.1 · Chapter 1, Board coordinates · 20 questions · 8 min");
  await page.evaluate(() => localStorage.setItem("bc.last", JSON.stringify({ chapter: 1, step: 9 })));
  await page.reload();
  await expect(card(page, "First step").locator(".ls-title")).toHaveText("Find the square L1 — names on the edge");
});

test("after a round, home shows my last score big, against my best", async ({ page }) => {
  await fakeRecord(page);
  await openChapter(page, 1, "Board coordinates");
  await openLevel(page, "1.1.1", "L2");
  await playFindTheSquare(page);
  await page.getByRole("button", { name: "Home" }).first().click();
  const last = card(page, "Last played");
  // Every answer right, my first round there: 20/20, green.
  await expect(last.locator(".ls-hero .ls-sc")).toHaveText("20/20");
  await expect(last.locator(".ls-hero .ls-green")).toHaveText("20");
  await expect(last.locator(".ls-mark")).toHaveText("best 20");
  await expect(last.locator(".ls-vs")).toContainText("Your first round on this level.");
  await expect(last.locator(".ls-vs")).toContainText("Average");
  await expect(last.locator(".ls-vs")).toContainText("fastest");
  await checkLayout(page);
});
