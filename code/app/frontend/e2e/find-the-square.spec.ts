// 1.1.1 Find the square, all three levels: right answers, then each level's
// wrong example from its card, each told line word for word.
// Card: code/blueprint/docs/board-coordinates.md, 1.1.1.
//
// Each example's square is set to come back, so the round asks it among
// its 20. The test answers every other question right.

import { expect, test, type Page } from "@playwright/test";
import { checkLayout, comingBack, consoleErrors, fakeRecord, fold, next, openChapter, openLevel, question } from "./helpers.ts";

type Example = {
  level: string;
  step: number; // its index on chapter 1's path
  square: string;
  wrong: string | null; // the square clicked, or null: no click within 2 seconds
  told: string;
  kind: string;
  names: boolean;
};

// The card's examples, one per level.
const EXAMPLES: Example[] = [
  { level: "L1", step: 0, square: "g3", wrong: "g4", told: "No: that is g4, the rank beside. g3 is lit.", kind: "The rank beside", names: true },
  { level: "L2", step: 1, square: "b6", wrong: "c6", told: "No: that is c6, the file beside. b6 is lit.", kind: "The file beside", names: false },
  { level: "L3", step: 9, square: "e2", wrong: null, told: "Too slow. e2 is lit.", kind: "Too slow", names: false },
];

const timed = (level: string) => level === "L3";

const square = (page: Page, sq: string) => page.getByRole("button", { name: sq, exact: true });

// Where a square sits on screen: its column from my left, and its row from my side, 1 to 8.
async function placeOf(page: Page, sq: string) {
  const board = (await page.locator(".board").boundingBox())!;
  const box = (await square(page, sq).boundingBox())!;
  const side = board.width / 8;
  return { col: Math.round((box.x - board.x) / side) + 1, row: 8 - Math.round((box.y - board.y) / side) };
}

for (const ex of EXAMPLES) {
  test(`1.1.1 ${ex.level}: right answers, then "${ex.told}"`, async ({ page }) => {
    const errors = consoleErrors(page);
    // The record and the browser both hold the square to come back: a chapter
    // opens on the record's copy.
    const back = [{ challenge: "1.1.1", facts: { square: ex.square } }];
    const sent = await fakeRecord(page, { comebacks: back.map((b) => ({ ...b, rounds: 2 })) });
    await comingBack(page, back);
    await openChapter(page, 1, "Board coordinates");
    await checkLayout(page);
    await openLevel(page, "1.1.1", ex.level);

    let asked = 0;
    let sawExample = false;
    while (asked < 20) {
      const q = page.locator("h2.q");
      await expect(q).toHaveText(/^Find [a-h][1-8]\.$/);
      await expect(question(page, asked + 1, 20)).toBeVisible();
      const sq = (await q.textContent())!.slice(5, 7);
      if (asked === 0) {
        // The board: edge names at L1 only, a1 at my bottom left.
        await expect(page.locator(".nm")).toHaveCount(ex.names ? 16 : 0);
        expect(await placeOf(page, "a1")).toEqual({ col: 1, row: 1 });
        await expect(page.locator(".timer")).toHaveCount(timed(ex.level) ? 1 : 0);
        // The question shows with the board, with no scroll: on a phone, under it.
        const qb = (await q.boundingBox())!;
        expect(qb.y, "the question starts above the fold").toBeLessThan(fold(page));
        await checkLayout(page);
      }
      if (sq === ex.square && !sawExample) {
        sawExample = true;
        if (ex.wrong) await square(page, ex.wrong).click();
        await expect(page.locator(".told")).toHaveText(ex.told, { timeout: 5000 });
        await expect(page.locator(".told")).toHaveClass(/wrong/);
        // The right square is lit on the board, where the card says it sits.
        await expect(square(page, ex.square)).toHaveClass(/lit/);
      } else {
        await square(page, sq).click();
        await expect(page.locator(".told")).toHaveText(`Right: ${sq}.`);
      }
      // The header keeps the question's own number through its told line.
      await expect(question(page, asked + 1, 20)).toBeVisible();
      if (asked === 0) await checkLayout(page);
      await next(page);
      asked++;
    }
    expect(sawExample, `${ex.square} came back`).toBe(true);

    await expect(page.getByRole("heading", { level: 1, name: "Score" })).toBeVisible();
    await expect(page.locator(".bigscore")).toHaveAttribute("aria-label", "19 right answers of 20");
    await expect(page.locator(".kinds li")).toHaveText([`${ex.kind}1`]);
    await expect(page.locator(".pass p")).toHaveText(
      "Pass mark for 1.1.1 L1 to L3: the right answers in one round, and my average time per answer. My practice sets it.",
    );
    await expect.poll(() => sent.length, { message: "rounds the record kept" }).toBe(1);
    await expect(page.locator(".sendline")).toHaveText("Sent to your progress record.");
    await checkLayout(page);

    // The round reached the record, whole, with the square to come back.
    expect(sent).toHaveLength(1);
    // A level played from the chapter's titles plays as its step: from step 1, I stand on it.
    expect(sent[0]).toMatchObject({ chapter: 1, step: ex.step, place: ex.step });
    expect(sent[0]!.answers).toHaveLength(20);
    expect(sent[0]!.comebacks).toEqual([{ challenge: "1.1.1", facts: { square: ex.square }, rounds: 2 }]);
    expect(errors).toEqual([]);
  });
}
