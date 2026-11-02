// Chapter 1's cards on screen, 1.1.2, 1.2.1 and 1.3.1, every level from the
// chapter's path: right answers, then each level's wrong example from its
// card, each told line word for word. Then the mixed round, every answer right.
// Cards: code/blueprint/docs/board-coordinates.md. 1.1.1's own test is
// find-the-square.spec.ts.
//
// Each example is set to come back, so the round asks it among its own.

import { expect, test, type Page } from "@playwright/test";
import { between, colourOf, lineOf } from "../../core/src/squares/index.ts";
import { checkLayout, checkTree, comingBack, consoleErrors, fakeRecord, fold, keySquares, next, nowAt, openChapter, openLevel, playMixedRound, question, reveal } from "./helpers.ts";

const and = (xs: string[]) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);

const sq = (page: Page, name: string) => page.locator(".board").getByRole("button", { name, exact: true });
const keypad = (page: Page) => page.getByRole("group", { name: "Files" });

async function clickAll(page: Page, squares: string[]) {
  await reveal(page);
  for (const s of squares) await sq(page, s).click();
  await page.getByRole("button", { name: "Confirm" }).click();
}

// Where a square sits on screen: its column from my left, and its row from my side, 1 to 8.
async function placeOf(page: Page, name: string) {
  const board = (await page.locator(".board").boundingBox())!;
  const b = (await sq(page, name).boundingBox())!;
  const side = board.width / 8;
  return { col: Math.round((b.x - board.x) / side) + 1, row: 8 - Math.round((b.y - board.y) / side) };
}

// What a question shows: its words and the squares lit.
async function shown(page: Page) {
  const q = (await page.locator("h2.q").textContent())!;
  const lit = await page.locator(".board .sq.lit").evaluateAll((els) => els.map((e) => e.getAttribute("aria-label")!));
  return { q, lit };
}

// Answers any chapter 1 question right, as its card counts right, and gives
// its told line.
async function answerRight(page: Page): Promise<string> {
  const { q, lit } = await shown(page);
  let m = q.match(/^Find ([a-h][1-8])\.$/);
  if (m) {
    await sq(page, m[1]!).click();
    return `Right: ${m[1]}.`;
  }
  if (q === "Which square is lit?") {
    const s = lit[0]!;
    if (await keypad(page).count()) await keySquares(page, [s]);
    else await page.locator(".choice", { hasText: s }).click();
    return `Right: ${s}.`;
  }
  m = q.match(/^What colour is ([a-h][1-8])\?$/);
  if (m) {
    const colour = colourOf(m[1] as "a1");
    await page.getByRole("button", { name: colour === "light" ? "Light" : "Dark", exact: true }).click();
    return `Right: ${m[1]} is ${colour}.`;
  }
  m = q.match(/^Which squares lie between ([a-h][1-8]) and ([a-h][1-8]) on their diagonal\?$/);
  if (m) {
    const lying = lineOf(m[1] as "a1", m[2] as "a1") === "diagonal" ? between(m[1] as "a1", m[2] as "a1") : null;
    if (!lying) {
      await page.getByRole("button", { name: "No diagonal" }).click();
      return `Right: ${m[1]} and ${m[2]} share no diagonal.`;
    }
    await clickAll(page, lying);
    return `Right: ${and(lying)}.`;
  }
  throw new Error(`No chapter 1 question: ${q}`);
}

type Example = {
  card: string;
  level: string;
  step: number; // its index on chapter 1's path
  questions: number;
  facts: Record<string, string>;
  ask: string; // the question that asks it
  lit?: string; // the square lit, for 1.1.2
  wrong: (page: Page) => Promise<void>;
  told: string | RegExp;
  kinds: string[];
  pass: string;
};

const PASS_112 = "Pass mark for 1.1.2 Level 1 to Level 3: the right answers in one round, and my average time per answer. My practice sets it.";
const PASS_121 = "Pass mark for 1.2.1 Level 1 and Level 2: the right answers in one round, and my average time per answer. My practice sets it.";
const PASS_131 = "Pass mark for 1.3.1 Level 1 to Level 3: the right answers in one round. My practice sets it.";

const name112 = (level: string, step: number, square: string, given: string | RegExp, told: string | RegExp, kind: string): Example => ({
  card: "1.1.2",
  level,
  step,
  questions: 20,
  facts: { square },
  ask: "Which square is lit?",
  lit: square,
  wrong: (page) => (level === "L1" ? page.locator(".choice", { hasText: given }).click() : keySquares(page, [given as string])),
  told,
  kinds: [kind],
  pass: PASS_112,
});

const colour121 = (level: string, step: number, square: string, pick: string, told: string): Example => ({
  card: "1.2.1",
  level,
  step,
  questions: 20,
  facts: { square },
  ask: `What colour is ${square}?`,
  wrong: (page) => page.getByRole("button", { name: pick, exact: true }).click(),
  told,
  kinds: ["The wrong colour"],
  pass: PASS_121,
});

const between131 = (level: string, step: number, facts: Record<string, string>, wrong: (page: Page) => Promise<void>, told: string, kinds: string[]): Example => ({
  card: "1.3.1",
  level,
  step,
  questions: 20,
  facts,
  ask: `Which squares lie between ${facts.a} and ${facts.b} on their diagonal?`,
  wrong,
  told,
  kinds,
  pass: PASS_131,
});

// Each level's example, from its card.
const EXAMPLES: Example[] = [
  // L1's block holding b3 shows one square on the file beside: c3, as on the card, or a3.
  name112("L1", 3, "b3", /^[ac]3$/, /^No: it is b3\. [ac]3 is the file beside\.$/, "The file beside"),
  name112("L2", 4, "e5", "e6", "No: it is e5. e6 is the rank beside.", "The rank beside"),
  name112("L3", 7, "g2", "g7", "No: it is g2. g7 is the ranks reversed.", "The ranks reversed"),
  colour121("L1", 2, "f5", "Dark", "No: f5 is light. f is file 6, and 6 + 5 = 11 is odd."),
  colour121("L2", 5, "c7", "Light", "No: c7 is dark. c is file 3, and 3 + 7 = 10 is even."),
  between131("L1", 6, { a: "c4", b: "f7" }, (page) => clickAll(page, ["d5"]), "No: between c4 and f7 lie d5 and e6. You left out e6.", ["A square left out"]),
  // A pair on no diagonal says why, by counting: moved a file off a diagonal, then on one file.
  between131(
    "L1",
    6,
    { a: "c4", b: "e7", reach: "f7" },
    (page) => clickAll(page, ["d5", "e6", "f7"]),
    "No: c4 and e7 share no diagonal. They sit 2 files and 3 ranks apart; a diagonal needs both equal.",
    ["A diagonal that is not there"],
  ),
  between131(
    "L2",
    8,
    { a: "h3", b: "e6" },
    (page) => clickAll(page, ["g4", "f6"]),
    "No: between h3 and e6 lie g4 and f5. You left out f5, and f6 is off the diagonal.",
    ["A square left out", "A square off the diagonal"],
  ),
  between131("L2", 8, { a: "c4", b: "c7" }, (page) => clickAll(page, ["c5"]), "No: c4 and c7 share a file, not a diagonal.", ["A diagonal that is not there"]),
  between131("L3", 10, { a: "a1", b: "e5" }, (page) => clickAll(page, ["b2", "c3"]), "No: between a1 and e5 lie b2, c3 and d4. You left out d4.", ["A square left out"]),
];

// What each level shows: a board or none, what is lit.
async function checkBoard(page: Page, ex: Example) {
  if (ex.card === "1.2.1") {
    await expect(page.locator(".board")).toHaveCount(0);
    return;
  }
  // 1.3.1 L3: no board, only the question, "No diagonal" and "Reveal board". Reveal shows an empty board to click, then Confirm.
  if (ex.card === "1.3.1" && ex.level === "L3") {
    await expect(page.locator(".board")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "No diagonal" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Reveal board" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Confirm" })).toHaveCount(0);
    await expect(keypad(page)).toHaveCount(0);
    await reveal(page);
    await expect(page.getByRole("button", { name: "Reveal board" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "No diagonal" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Confirm" })).toBeVisible();
  }
  const { lit } = await shown(page);
  await expect(page.locator(".nm")).toHaveCount(0);
  expect(await placeOf(page, "a1")).toEqual({ col: 1, row: 1 });
  if (ex.card === "1.1.2") expect(lit).toHaveLength(1);
  if (ex.card === "1.3.1") expect(lit).toHaveLength(ex.level === "L1" ? 2 : 0);
  const timed = (ex.card === "1.1.2" && ex.level === "L3") || (ex.card === "1.2.1" && ex.level === "L2");
  await expect(page.locator(".timer")).toHaveCount(timed ? 1 : 0);
}

for (const ex of EXAMPLES) {
  test(`${ex.card} ${ex.level}: right answers, then "${ex.told}"`, async ({ page }) => {
    // Up to 20 questions, some of several clicks: in WebKit, about 1.2 seconds a click.
    test.slow();
    const errors = consoleErrors(page);
    const back = [{ challenge: ex.card, facts: ex.facts }];
    const sent = await fakeRecord(page, { comebacks: back.map((b) => ({ ...b, rounds: 2 })) });
    await comingBack(page, back);
    await openChapter(page, 1, "Board coordinates");
    await checkLayout(page);
    await openLevel(page, ex.card, ex.level);

    let sawExample = false;
    for (let asked = 0; asked < ex.questions; asked++) {
      await expect(question(page, asked + 1, ex.questions)).toBeVisible();
      const { q, lit } = await shown(page);
      if (asked === 0) {
        await checkBoard(page, ex);
        const qb = (await page.locator("h2.q").boundingBox())!;
        expect(qb.y, "the question starts above the fold").toBeLessThan(fold(page));
        await checkLayout(page);
      }
      if (!sawExample && q === ex.ask && (!ex.lit || lit[0] === ex.lit)) {
        sawExample = true;
        await ex.wrong(page);
        await expect(page.locator(".told")).toHaveText(ex.told);
        await expect(page.locator(".told")).toHaveClass(/wrong/);
      } else {
        const line = await answerRight(page);
        await expect(page.locator(".told")).toHaveText(line);
      }
      if (asked === 0) await checkLayout(page);
      await next(page);
    }
    expect(sawExample, `${ex.ask} came back`).toBe(true);

    await expect(page.getByRole("heading", { level: 1, name: "Score" })).toBeVisible();
    await expect(page.locator(".bigscore")).toHaveAttribute("aria-label", `${ex.questions - 1} right answers of ${ex.questions}`);
    await expect(page.locator(".kinds li")).toHaveText(ex.kinds.map((k) => `${k}1`));
    await expect(page.locator(".pass p")).toHaveText(ex.pass);
    await expect.poll(() => sent.length, { message: "rounds the record kept" }).toBe(1);
    await expect(page.locator(".sendline")).toHaveText("Sent to your progress record.");
    await checkLayout(page);
    // A level played from the chapter's tree plays as its step: from step 1, I stand on it.
    expect(sent[0]).toMatchObject({ chapter: 1, step: ex.step, place: ex.step });
    expect(sent[0]!.answers).toHaveLength(ex.questions);
    expect(sent[0]!.comebacks).toEqual([{ challenge: ex.card, facts: ex.facts, rounds: 2 }]);
    expect(errors).toEqual([]);
  });
}

test("chapter 1's screen: one tree of its sections, challenges and levels", async ({ page }) => {
  const errors = consoleErrors(page);
  await fakeRecord(page);
  await openChapter(page, 1, "Board coordinates");
  await checkTree(page, 1);
  await checkLayout(page);
  expect(errors).toEqual([]);
});

test("chapter 1's mixed round: 23 questions, every level at least once, every board facing White, every answer right", async ({ page }) => {
  // Up to 23 questions, some of several clicks: in WebKit, about 1.2 seconds a click.
  test.slow();
  const errors = consoleErrors(page);
  const sent = await fakeRecord(page);
  await openChapter(page, 1, "Board coordinates");
  await playMixedRound(page);
  const seen: Record<string, number> = {};
  for (let asked = 0; asked < 23; asked++) {
    await expect(question(page, asked + 1, 23)).toBeVisible();
    // In a mixed round, the header names each question's challenge and level.
    const lvl = (await nowAt(page).textContent())!;
    seen[lvl] = (seen[lvl] ?? 0) + 1;
    // The board faces White, and no banner says Black.
    if (lvl.startsWith("1.1.1") || lvl.startsWith("1.1.2")) {
      expect(await placeOf(page, "a1"), lvl).toEqual({ col: 1, row: 1 });
      await expect(page.locator(".sx-bn"), lvl).toHaveCount(0);
    }
    if (asked < 2) await checkLayout(page);
    const line = await answerRight(page);
    await expect(page.locator(".told")).toHaveText(line);
    await next(page);
  }
  expect(seen).toEqual({
    "1.1.1 L1": 1, "1.1.1 L2": 1, "1.1.1 L3": 2,
    "1.1.2 L1": 1, "1.1.2 L2": 1, "1.1.2 L3": 2,
    "1.2.1 L1": 3, "1.2.1 L2": 4,
    "1.3.1 L1": 2, "1.3.1 L2": 3, "1.3.1 L3": 3,
  });
  await expect(page.locator(".bigscore")).toHaveAttribute("aria-label", "23 right answers of 23");
  // One row for each challenge, its levels counted together: 4, 4, 7 and 8.
  const rows = page.getByRole("heading", { name: "Each challenge" }).locator("xpath=following-sibling::ul[1]/li");
  await expect(rows).toHaveCount(4);
  for (const [i, [challenge, n]] of [["1.1.1", 4], ["1.1.2", 4], ["1.2.1", 7], ["1.3.1", 8]].entries()) {
    await expect(rows.nth(i)).toContainText(String(challenge));
    await expect(rows.nth(i)).toContainText(`${n} of ${n}`);
  }
  await expect(page.locator(".pass p")).toHaveText(
    "Pass mark for the mixed round: the right answers in one round, and in each challenge's share. My practice sets it.",
  );
  await expect.poll(() => sent.length).toBe(1);
  expect(sent[0]).toMatchObject({ chapter: 1, step: 11 });
  await checkLayout(page);
  expect(errors).toEqual([]);
});
