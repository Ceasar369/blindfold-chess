import { expect, type Locator, type Page } from "@playwright/test";
import { checkRound, type Round as Kept } from "../../backend/src/contract.ts";
import { CHAPTERS } from "../../core/src/chapters/index.ts";

// A stand-in for the progress record's server, answering as its contract
// says (code/app/backend/src/contract.ts). Every round sent is checked
// against the contract and kept here.
// up: while it says no, the server does not answer at all.
// It also installs the page's clock, still running, so `next` can skip the
// 1 second a right answer waits.
export async function fakeRecord(page: Page, start: { comebacks?: unknown[]; up?: () => boolean } = {}) {
  await page.clock.install();
  const kept: Kept[] = [];
  let comebacks = start.comebacks ?? [];
  let places: { chapter: number; step: number }[] = [];
  await page.route("**/api/**", async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname;
    if (start.up && !start.up()) return route.abort("connectionrefused");
    if (req.method() === "POST" && path === "/api/rounds") {
      const round = checkRound(req.postDataJSON());
      if (typeof round === "string") return route.fulfill({ status: 400, json: { error: round } });
      if (kept.some((k) => k.id === round.id)) return route.fulfill({ status: 200, json: { kept: "already" } });
      kept.push(round);
      comebacks = round.comebacks;
      places = [...places.filter((p) => p.chapter !== round.chapter), { chapter: round.chapter, step: round.place }];
      return route.fulfill({ status: 201, json: { kept: "new" } });
    }
    if (req.method() === "GET" && path === "/api/record") {
      // Each round's summary, newest first, as the real record answers.
      const rounds = kept.map(({ id, chapter, step, startedAt, endedAt, score, place }) => ({ id, chapter, step, startedAt, endedAt, score, place })).reverse();
      return route.fulfill({ status: 200, json: { rounds, comebacks, places } });
    }
    return route.fulfill({ status: 404, json: { error: "No such address." } });
  });
  return kept;
}

// Console errors, gathered from the page's first load.
export function consoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(e.message));
  return errors;
}

// What comes back, set in the browser before the site loads, as a round
// before this one would have left it.
export async function comingBack(page: Page, facts: { challenge: string; facts: unknown }[]) {
  const progress = { back: facts.map((f) => ({ ...f, rounds: 2 })), places: {} };
  await page.addInitScript((p) => {
    if (!sessionStorage.getItem("seeded")) {
      localStorage.setItem("bc.progress", JSON.stringify(p));
      sessionStorage.setItem("seeded", "1");
    }
  }, progress);
}

// A chapter, through the menu.
export async function openChapter(page: Page, n: number, name: string) {
  await page.goto("/");
  await menu(page, new RegExp(`^(${n} )?${name}$`));
  await expect(page.getByRole("heading", { level: 1, name: `${n}. ${name}` })).toBeVisible();
}

// A menu link: behind the Menu button on a phone, in the left menu at 1440.
export async function menu(page: Page, name: string | RegExp) {
  // The menu's links are in the page once the app has drawn, shown or not: only then is its button's state read.
  await page.locator("#menu-links").waitFor({ state: "attached" });
  const button = page.getByRole("button", { name: "Menu", exact: true });
  if (await button.isVisible()) await button.click();
  await page.getByRole("navigation", { name: "Menu" }).getByRole("link", { name }).click();
}

// A challenge on the open chapter's tree: its title and its levels.
export function challengeNode(page: Page, challenge: string) {
  return page.locator(".tch", { has: page.locator(".cid", { hasText: new RegExp(`^${challenge.replace(/\./g, "\\.")}$`) }) });
}

// The tree shows whole: a challenge needs no opening, only to be drawn.
export async function openChallenge(page: Page, challenge: string) {
  await challengeNode(page, challenge).waitFor();
}

// Plays a level of the open chapter: its button, under its challenge.
export async function openLevel(page: Page, challenge: string, level: string) {
  await challengeNode(page, challenge)
    .locator(".lvbtn", { has: page.locator("b", { hasText: new RegExp(`^Level ${level.slice(1)}$`) }) })
    .click();
}

// A level's row, on the chapter page.
const levelRow = (page: Page, challenge: string, level: string) =>
  challengeNode(page, challenge).locator(".lvbtn", { has: page.locator("b", { hasText: new RegExp(`^Level ${level.slice(1)}$`) }) });

// A level's last score, in its row's Last cluster: "20/20", or "Not played yet".
export function lastScore(page: Page, challenge: string, level: string) {
  return levelRow(page, challenge, level).locator(".ls-last .ls-sc, .ls-none");
}

// A level's best score, in its row's Best cluster.
export function bestScore(page: Page, challenge: string, level: string) {
  return levelRow(page, challenge, level).locator(".ls-best .ls-sc");
}

// Plays the mixed round of the open chapter: its row, after the last section.
export async function playMixedRound(page: Page) {
  await page.getByRole("button", { name: /^The mixed round\./ }).click();
}

// The open chapter's tree, as its core holds it: each section, its
// challenges, and each built challenge's levels with their questions and
// minutes, then its mixed rounds. No about block, no "It needs".
export async function checkTree(page: Page, n: number) {
  const ch = CHAPTERS.find((c) => c.n === n)!;
  const facts = (questions: number, minutes: number | null) =>
    `${questions} question${questions === 1 ? "" : "s"}${minutes !== null ? ` · ${minutes} min` : ""}`;
  await expect(page.locator(".tsec .sid")).toHaveText(ch.sections.map((s) => s.id));
  await expect(page.locator(".tch .cid")).toHaveText(ch.sections.flatMap((s) => s.challenges.map((c) => c.id)));
  for (const c of ch.sections.flatMap((s) => s.challenges)) {
    const node = challengeNode(page, c.id);
    if (!c.built) {
      await expect(node.locator(".tag")).toHaveText("Coming");
      continue;
    }
    await expect(node.locator(".lvbtn b")).toHaveText(c.levels.map((l) => `Level ${l.id.slice(1)}`));
    await expect(node.locator(".lvbtn .facts")).toHaveText(c.levels.map((l) => facts(l.questions, l.minutes)));
  }
  const mixed = ch.path.flatMap((s) => (s.kind === "mixed" ? [s] : []));
  await expect(page.locator(".lvbtn.tmix .facts")).toHaveText(mixed.map((s) => facts(s.questions, s.minutes)));
  await expect(page.getByText("About this chapter")).toHaveCount(0);
  await expect(page.getByText("It needs.")).toHaveCount(0);
}

// The step screen's header tile for the question on screen: "Question 3 of 20".
// Without `of`, any round's length matches.
export function question(page: Page, n: number, of?: number) {
  return of === undefined
    ? page.getByRole("group", { name: new RegExp(`^Question ${n} of \\d+$`) })
    : page.getByRole("group", { name: `Question ${n} of ${of}`, exact: true });
}

// A game's or an endgame's header tile for the move on screen: "Move 3", and
// an endgame's "Move 3 of 14 at most".
export function move(page: Page, n: number) {
  return page.getByRole("group", { name: new RegExp(`^Move ${n}( of \\d+ at most)?$`) });
}

// The step screen's fold, as ruled for it alone: 780 at 1440, 740 at 390. They
// are estimates, no rule for every screen yet. The question starts above it.
export const fold = (page: Page) => (page.viewportSize()!.width >= 1100 ? 780 : 740);

// In a mixed round, the level the question on screen comes from: "1.1.1 Level 3".
export const nowAt = (page: Page) => page.locator(".sx-now");

// Moves past the told line. A miss shows Continue, and waits for it. A right
// answer shows none, and moves on by itself after 1 second: the clock
// fakeRecord installs skips it.
export async function next(page: Page) {
  const told = page.locator(".told");
  await told.waitFor();
  const go = page.getByRole("button", { name: "Continue" });
  if (await go.count()) return go.click();
  await page.clock.fastForward(1000);
  await expect(told).toHaveCount(0);
}

// Plays one round of 1.1.1, every answer right.
export async function playFindTheSquare(page: Page) {
  for (let i = 0; i < 20; i++) {
    const q = page.locator("h2.q");
    await expect(question(page, i + 1, 20)).toBeVisible();
    const sq = (await q.textContent())!.slice(5, 7);
    await page.getByRole("button", { name: sq, exact: true }).click();
    await expect(page.locator(".told")).toHaveText(`Right: ${sq}.`);
    // The header keeps the question's own number through its told line.
    await expect(question(page, i + 1, 20)).toBeVisible();
    await next(page);
  }
  await expect(page.getByRole("heading", { level: 1, name: "Score" })).toBeVisible();
}

// Plays one round of 1.1.2 L1, every answer right: the lit square, picked from four.
export async function playNameTheSquare(page: Page) {
  for (let i = 0; i < 20; i++) {
    await expect(question(page, i + 1, 20)).toBeVisible();
    const lit = (await page.locator(".board .sq.lit").first().getAttribute("aria-label"))!;
    await page.locator(".choice", { hasText: lit }).click();
    await expect(page.locator(".told")).toHaveText(`Right: ${lit}.`);
    await next(page);
  }
  await expect(page.getByRole("heading", { level: 1, name: "Score" })).toBeVisible();
}

// The keypad's two rows: each square a file, then a rank.
export async function keySquares(page: Page, squares: string[]) {
  for (const s of squares) {
    await page.getByRole("group", { name: "Files" }).getByRole("button", { name: s[0], exact: true }).click();
    await page.getByRole("group", { name: "Ranks" }).getByRole("button", { name: s[1], exact: true }).click();
  }
}

// A level with no board shows none until Reveal board is pressed: 1.3.1 L3,
// and each level that answered on the keypad or the position composer.
export async function reveal(page: Page) {
  const button = page.getByRole("button", { name: "Reveal board" });
  if (await button.count()) await button.click();
}

// The move composer: a move written key by key, castling as one key. It does
// not send: Check, or Play, does.
export async function composeMove(page: Page, move: string) {
  for (const key of move.match(/O-O-O|O-O|./g)!) {
    const group = /[a-h]/.test(key) ? "Files" : /[1-8]/.test(key) ? "Ranks" : /^[KQRBNx+#]$/.test(key) ? "Pieces, capture and signs" : null;
    const scope = group ? page.getByRole("group", { name: group }) : page;
    await scope.getByRole("button", { name: key, exact: true }).click();
  }
}

// The position composer: each piece from the palette, then its square.
export async function composePosition(page: Page, pieces: { side: string; kind: string; square: string }[]) {
  for (const p of pieces) {
    const name = `${p.side[0]!.toUpperCase()}${p.side.slice(1)} ${p.kind}`;
    const pen = page.getByRole("button", { name, exact: true });
    if ((await pen.getAttribute("aria-pressed")) !== "true") await pen.click();
    await keySquares(page, [p.square]);
  }
}

// The page scrolls sideways nowhere, and every button is at least 44px tall.
export async function checkLayout(page: Page) {
  const wide = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(wide, "sideways scroll").toBeLessThanOrEqual(0);
  const short = await page.evaluate(() =>
    [...document.querySelectorAll("button, a")]
      .filter((b) => (b as HTMLElement).offsetParent !== null)
      .map((b) => ({ name: b.getAttribute("aria-label") ?? b.textContent?.trim(), h: b.getBoundingClientRect().height }))
      .filter((b) => b.h < 44),
  );
  expect(short, "buttons under 44px").toEqual([]);
}
