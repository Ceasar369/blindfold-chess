// The library: a menu entry, Library, opens one page with every rule on it,
// and nothing opens another screen. Under 1100 wide a deck, one rule per
// screen; from 1100 wide a reader, an index, a column of rules, one board that
// follows the scroll. Never two boards.

import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";
import { checkLayout, consoleErrors, fakeRecord, menu } from "./helpers.ts";

// Every rule file the library holds: its id, and its title on line one.
const LIBRARY = fileURLToPath(new URL("../../core/library/", import.meta.url));
const RULES = readdirSync(LIBRARY)
  .filter((f) => f.endsWith(".md"))
  .map((f) => ({ id: f.slice(0, -".md".length), title: readFileSync(LIBRARY + f, "utf8").match(/^# (.+)$/m)![1]! }));

test("Library opens from the menu and holds every rule on one page", async ({ page }) => {
  const errors = consoleErrors(page);
  await fakeRecord(page);
  await page.goto("/");
  await menu(page, "Library");
  await expect(page.getByRole("heading", { level: 1, name: "Library" })).toBeVisible();
  await expect(page.locator("#menu-links a[aria-current=page]")).toContainText("Library");
  await checkLayout(page);

  expect(RULES.length).toBeGreaterThan(0);
  for (const rule of RULES) await expect(page.locator(`#r-${rule.id}`), rule.id).toContainText(rule.title);

  // A watcher in the page counts the boards at every change while I walk down to the last rule.
  await page.evaluate(() => {
    const seen = window as unknown as { boards: number };
    const count = () => document.querySelectorAll(".board").length;
    seen.boards = count();
    new MutationObserver(() => (seen.boards = Math.max(seen.boards, count()))).observe(document.body, { childList: true, subtree: true });
  });
  for (const rule of RULES) {
    await page.locator(`#r-${rule.id}`).evaluate((el) => el.scrollIntoView());
    await page.waitForTimeout(100);
    expect(await page.locator(".board").count(), `boards at ${rule.id}`).toBeLessThanOrEqual(1);
  }
  const most = await page.evaluate(() => (window as unknown as { boards: number }).boards);
  expect(most, "most boards at once").toBe(1);
  await checkLayout(page);
  expect(errors).toEqual([]);
});

test("Library brings a rule on screen from its index or its group", async ({ page }) => {
  const errors = consoleErrors(page);
  await fakeRecord(page);
  await page.goto("/");
  await menu(page, "Library");
  await expect(page.getByRole("heading", { level: 1, name: "Library" })).toBeVisible();

  if (page.viewportSize()!.width >= 1100) {
    // The index's last button brings the last rule up, and marks itself.
    const last = page.getByRole("navigation", { name: "Rules" }).getByRole("button").last();
    await expect(page.locator(".lib-rule").last()).not.toBeInViewport();
    await last.click();
    await expect(page.locator(".lib-rule").last()).toBeInViewport();
    await expect(last).toHaveClass(/\bon\b/);
  } else {
    // The first screen's last group button brings that group's first rule up.
    const last = page.locator(".lib-toc button").last();
    const group = (await last.locator("b").textContent())!;
    const first = page.locator(".lib-slide", { has: page.locator(".lib-grp", { hasText: group }) }).first();
    await expect(first).not.toBeInViewport();
    await last.click();
    await expect(first).toBeInViewport();
  }
  expect(errors).toEqual([]);
});
