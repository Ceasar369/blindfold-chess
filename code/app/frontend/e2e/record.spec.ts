// The progress record, from the site's side (building-blocks.md, block 20).
// The site plays with no backend; a round that fails to send waits in the
// browser, and goes again once the record answers.

import { expect, test } from "@playwright/test";
import { checkLayout, consoleErrors, fakeRecord, menu, openChapter, openLevel, playFindTheSquare } from "./helpers.ts";

const WAITING = "Kept on this device. It goes to your progress record when the record answers.";

test("a round waits in the browser with no backend, and goes when the record answers", async ({ page }) => {
  const errors = consoleErrors(page);
  let up = false;
  const sent = await fakeRecord(page, { up: () => up });
  await openChapter(page, 1, "Board coordinates");
  await openLevel(page, "1.1.1", "L1");
  await playFindTheSquare(page);
  await expect(page.locator(".sendline")).toHaveText(WAITING);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("bc.outbox") ?? "[]").length)).toBe(1);

  // Still waiting after the page loads again.
  await page.reload();
  await menu(page, "Progress record");
  await expect(page.getByRole("status")).toHaveText("1 round waits to send.");
  await checkLayout(page);

  // The record answers, and the network says so: the round goes.
  up = true;
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  await expect(page.getByRole("status")).toHaveText("Every round is sent.");
  expect(sent).toHaveLength(1);
  expect(sent[0]).toMatchObject({ chapter: 1, step: 0, place: 0 });
  expect(await page.evaluate(() => localStorage.getItem("bc.outbox"))).toBe("[]");
  // Every console error is a send that found no server.
  expect(errors.filter((e) => !/Failed to load resource|Could not connect|ERR_CONNECTION_REFUSED/.test(e))).toEqual([]);
});
