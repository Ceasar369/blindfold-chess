// 6.2.1 Play out the endgame, all six levels: an endgame won, then each
// level's example from its card, each told line word for word.
// Card: code/blueprint/docs/blind-play.md, 6.2.1.
//
// Each round's endgames are the level's example: it comes back, mirrored, as
// a missed endgame does. The won endgame plays the fastest moves the tables
// give, against whatever the lone king replies. The example's own line needs
// the king's replies the card gives: where two replies put the goal off
// alike, the king picks at random from the item's seed, so the test finds a
// round seed whose king replies as the card does, playing the same round in
// node first.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { expect, test, type Page } from "@playwright/test";
import { challenge, fastest, LEVELS } from "../../../core/src/chapters/6-blind-play/6.2.1/index.ts";
import type { Endgame } from "../../../core/src/chapters/6-blind-play/6.2.1/solver.ts";
import { numbered } from "../../../core/src/notation/index.ts";
import { fromWords, inWords, type Position } from "../../../core/src/positions/index.ts";
import { seeded } from "../../../core/src/random/index.ts";
import { playLine } from "../../../core/src/rules/index.ts";
import type { Facts, Packs, Side, Step } from "../../../core/src/shape/index.ts";
import { checkLayout, comingBack, composeMove, consoleErrors, fakeRecord, move, next, openChapter, openLevel } from "../helpers.ts";
import { expectLook } from "../look.ts";
import { seedRounds, seedWhere, sideOf } from "../rounds-5-6.ts";

const ENDGAMES: Endgame[] = ["queen", "rook", "pawn"];
const packs: Packs = Object.fromEntries(
  ENDGAMES.map((k) => [`endgames/${k}.bin`, readFileSync(fileURLToPath(new URL(`../../../core/packs/endgames/${k}.bin`, import.meta.url)))]),
);
const table = (k: Endgame) => packs[`endgames/${k}.bin`] as Uint8Array;

type Example = {
  level: string;
  step: number; // its index on chapter 6's path
  endgame: Endgame;
  side: Side;
  words: string; // the example's position, in words
  back: string; // what comes back: its mirror, as the tables hold it
  see: "board" | "words" | "held";
  goal: string;
  // The example's own line: my moves, as built, and the lone king's replies, up to the wrong one.
  mine: string[];
  replies: string[];
  told: string;
  kind: string | null; // the mistake it names
  right: boolean;
};

const EXAMPLES: Example[] = [
  {
    level: "L1", step: 2, endgame: "queen", side: "white", see: "board",
    words: "White: king e1, queen d1. Black: king e5. White to move.", back: "White: king d1, queen e1. Black: king d5.",
    goal: "Mate Black's king, in 14 moves at most.", mine: ["Qd5"], replies: [],
    told: "No: 1. Qd5+ put your queen next to Black's king, unguarded, and 1... Kxd5 took it. King against king: a draw.",
    kind: "A piece left to the king", right: false,
  },
  {
    level: "L2", step: 4, endgame: "queen", side: "black", see: "words",
    words: "White: king b4. Black: king g8, queen f7. Black to move.", back: "White: king b1, queen c2. Black: king g5.",
    goal: "Mate White's king, in 16 moves at most.",
    mine: ["Qc7", "Kf7", "Qb7", "Ke6", "Qb2", "Kd6", "Kc5", "Kb5", "Qa2"],
    replies: ["Kb5", "Ka4", "Ka3", "Ka4", "Ka5", "Ka4", "Ka5"],
    told: "Right: mate in 8 moves, the fewest. One illegal move: 8... Kb5 would stand next to White's king on a5.",
    kind: "An illegal move", right: true,
  },
  {
    level: "L3", step: 6, endgame: "queen", side: "white", see: "held",
    words: "White: king g1, queen c3. Black: king d6. White to move.", back: "White: king b1, queen f3. Black: king e6.",
    goal: "Mate Black's king, in 16 moves at most.",
    mine: ["Kf2", "Kf3", "Ke4", "Qc6", "Qd7", "Ke5", "Qf7"],
    replies: ["Kd5", "Kd6", "Ke7", "Kf8", "Kg8", "Kh8"],
    told: "No: 7. Qf7 left Black's king on h8 no move, and not in check: stalemate, a draw. 7. Kf6 kept the win.",
    kind: "A stalemate", right: false,
  },
  {
    level: "L4", step: 8, endgame: "rook", side: "white", see: "words",
    words: "White: king g1, rook b2. Black: king c5. White to move.", back: "White: king b1, rook g2. Black: king f5.",
    goal: "Mate Black's king, in 28 moves at most.",
    mine: ["Rd2", "Kf2", "Rc2", "Ke3", "Ke4", "Rc3", "Rb3", "Kd5", "Rb1", "Kc4", "Kc5", "Kc6", "Rb7"],
    replies: ["Kc6", "Kb6", "Kb7", "Kb6", "Kb7", "Ka6", "Ka5", "Ka4", "Ka5", "Ka6", "Ka7", "Ka8"],
    told: "No: 13. Rb7 left Black's king on a8 no move, and not in check: stalemate, a draw. 13. Kc7 kept the win.",
    kind: "A stalemate", right: false,
  },
  {
    level: "L5", step: 10, endgame: "rook", side: "white", see: "held",
    words: "White: king e1, rook c1. Black: king d4. White to move.", back: "White: king d1, rook f1. Black: king e4.",
    goal: "Mate Black's king, in 28 moves at most.", mine: ["Rc4"], replies: [],
    told: "No: 1. Rc4+ put your rook next to Black's king, unguarded, and 1... Kxc4 took it. King against king: a draw.",
    kind: "A piece left to the king", right: false,
  },
  {
    level: "L6", step: 12, endgame: "pawn", side: "white", see: "held",
    words: "White: king e6, pawn e5. Black: king e8. White to move.", back: "White: king d6, pawn d5. Black: king d8.",
    goal: "Make your pawn a queen, in 10 moves at most.", mine: ["Kd5"], replies: [],
    told: "No: after 1. Kd5, Black draws with 1... Ke7. Your king left e6, a key square for your pawn.",
    kind: "The win let slip", right: false,
  },
];

const REPLY = /played \d+\.(?:\.\.)? (\S+)\. Your move\.$/;

// The round a seed makes, as Rounds makes it: the side drawn first, then the
// challenge's own items.
function roundOf(seed: string, ex: Example, back: Facts[]) {
  const random = seeded(seed);
  const side = random.pick<Side>(["white", "black"]);
  const level = LEVELS.find((l) => l.id === ex.level)!;
  return { side, items: challenge.makeRound(level, random, { side, back, packs }) };
}

// Whether the item at `index` of a seed's round replies as the card's line does.
function repliesAsCard(seed: string, ex: Example, back: Facts[], index: number): boolean {
  const { side, items } = roundOf(seed, ex, back);
  if (side !== ex.side) return false;
  const item = items[index]!;
  let step: Step = item.first();
  if (step.step === "show") step = item.next({ did: "press" });
  let reply = 0;
  for (const text of ex.mine) {
    if (reply === ex.replies.length) break;
    step = item.next({ did: "answer", answer: { kind: "text", text } });
    if (step.step !== "ask") return false;
    if (step.reopened) continue;
    if (step.question.match(REPLY)?.[1] !== ex.replies[reply]) return false;
    reply++;
  }
  return true;
}

// A move built on the move composer, then confirmed. Each question, a move
// refused too, starts the composer empty.
async function send(page: Page, text: string) {
  await expect(page.getByRole("status", { name: "Your answer" })).toHaveText("Your move");
  await composeMove(page, text);
  await expect(page.getByRole("status", { name: "Your answer" })).toHaveText(text);
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
}

// What the level shows before and with its first question.
async function opening(page: Page, ex: Example) {
  if (ex.see === "held") {
    await expect(page.locator(".words")).toHaveText(ex.words);
    await expectLook(page, "Hide", { time: "look" });
    await checkLayout(page);
    await page.getByRole("button", { name: "Hide", exact: true }).click();
  }
  await expect(page.locator("h2.q")).toHaveText(ex.goal);
  if (ex.see === "board") await expect(page.locator(".board .pc")).toHaveCount(3);
  else await expect(page.locator(".board")).toHaveCount(0);
  if (ex.see === "words") await expect(page.locator(".words")).toHaveText(ex.words);
  if (ex.see === "held") await expect(page.locator(".words")).toHaveCount(0);
  await checkLayout(page);
}

// One endgame won, the fastest moves the tables give, whatever the king replies.
async function win(page: Page, ex: Example) {
  await opening(page, ex);
  let pos: Position = fromWords(ex.words);
  const told = page.locator(".told");
  for (let i = 0; i < 30; i++) {
    const best = fastest(table(ex.endgame), pos, ex.side, ex.endgame)[0]!;
    const said = numbered(best.san, ex.side, pos.moveNumber);
    pos = playLine(pos, [best.san]).positions[0]!;
    await send(page, best.san);
    // My move shown back once, with the king's reply; or the told line.
    await expect(told.or(page.locator(".note-line", { hasText: `You played ${said}.` })).first()).toBeVisible({ timeout: 15_000 });
    if (await told.isVisible()) break;
    const text = (await page.locator("h2.q").textContent())!;
    pos = playLine(pos, [text.match(REPLY)![1]!]).positions[0]!;
    if (ex.see === "words") await expect(page.locator(".words")).toHaveText(inWords(pos, { toMove: true }));
    if (ex.see === "board") await expect(page.locator(".board .pc")).toHaveCount(3);
  }
  await expect(page.locator(".told")).toHaveText(/^Right: (mate|a queen) in \d+ moves, the fewest\.$/);
  await expect(page.locator(".told")).toHaveClass(/right/);
  await checkLayout(page);
  await next(page);
}

// The card's example, its own line, to its told line.
async function example(page: Page, ex: Example) {
  await opening(page, ex);
  let reply = 0;
  for (const text of ex.mine) {
    await send(page, text);
    // L2's 8th move: refused, never said why before the endgame ends.
    if (ex.level === "L2" && text === "Kb5") {
      await expect(page.locator(".unread")).toHaveText("Not counted. The move stays open.");
      continue;
    }
    if (reply < ex.replies.length) {
      await expect(page.locator("h2.q")).toHaveText(new RegExp(` ${ex.replies[reply]!}\\. Your move\\.$`));
      reply++;
    }
  }
  await expect(page.locator(".told")).toHaveText(ex.told);
  await expect(page.locator(".told")).toHaveClass(ex.right ? /right/ : /wrong/);
  // The endgame shows again on a board, with its moves.
  await expect(page.locator(".board")).toHaveCount(1);
  await expect(page.locator(".words").last()).not.toBeEmpty();
  await checkLayout(page);
  // Move by move, back to its first position: each half-move on the board,
  // L2's illegal move where I tried it, after 8. Ka5.
  const halves = (await page.locator(".words").last().textContent())!.split(" ").filter((t) => !/^\d+\.(\.\.)?$/.test(t));
  const replay = page.locator(".replay");
  const slips: [string, string][] = [];
  for (let k = halves.length; k >= 0; k--) {
    const move = (await replay.locator(".stepmove").textContent())!;
    expect(k === 0 ? move : move.split(" ").at(-1)).toBe(k === 0 ? "The first position." : halves[k - 1]);
    for (const n of await replay.locator(".note-line").allTextContents()) slips.push([move, n]);
    if (k > 0) await replay.getByRole("button", { name: "Move back" }).click();
  }
  await expect(replay.getByRole("button", { name: "Move back" })).toBeDisabled();
  await expect(page.locator(".board .pc")).toHaveCount(3);
  for (const p of piecesOfWords(ex.words)) await expect(page.getByRole("button", { name: p, exact: true }).locator(".pc")).toHaveCount(1);
  expect(slips).toEqual(ex.level === "L2" ? [["8. Ka5", "8... Kb5 would stand next to White's king on a5."]] : []);
  await checkLayout(page);
  await next(page);
}

// The squares a position in words holds a piece on.
const piecesOfWords = (words: string) => Object.keys(fromWords(words).board);

// L1 shows a board. A round that draws Black seats me with the queen on Black's side, and the
// board still faces White: a1 at its bottom left, h8 at its top right. The screen names Black.
test("6.2.1 L1: playing Black, the board faces White", async ({ page }) => {
  const errors = consoleErrors(page);
  await seedRounds(page, [seedWhere("e621-black-board", (s) => sideOf(s) === "black")]);
  await fakeRecord(page);
  await openChapter(page, 6, "Blind play");
  await openLevel(page, "6.2.1", "L1");
  await expect(page.locator("h2.q")).toHaveText(/^Mate White's king, in \d+ moves at most\.$/);
  await expect(page.locator(".board .pc")).toHaveCount(3);
  const a1 = (await page.getByRole("button", { name: "a1", exact: true }).boundingBox())!;
  const h8 = (await page.getByRole("button", { name: "h8", exact: true }).boundingBox())!;
  expect(a1.x < h8.x, "a1 left of h8").toBe(true);
  expect(a1.y > h8.y, "a1 below h8").toBe(true);
  await expect(page.locator(".sx-bn")).toContainText("You play Black");
  await expect(page.locator(".sx-bn")).not.toContainText(/board|flip/i);
  await checkLayout(page);
  expect(errors).toEqual([]);
});

for (const ex of EXAMPLES) {
  test(`6.2.1 ${ex.level}: an endgame won, then "${ex.told}"`, async ({ page }) => {
    test.setTimeout(240_000);
    const errors = consoleErrors(page);
    const twoRounds = LEVELS.find((l) => l.id === ex.level)!.questions === 1;
    // The example comes back once per endgame of the round.
    const back = Array.from({ length: twoRounds ? 1 : 2 }, () => ({ challenge: "6.2.1", facts: { endgame: ex.endgame, start: ex.back } }));
    const facts = back.map((b) => b.facts);
    // One endgame a round: the won one, then the card's, in a second round.
    // Two a round: the won one first, the card's second. A seed is also the
    // round's id: letters, digits, - and _ only.
    const seeds = twoRounds
      ? [
          seedWhere(`e621-${ex.level}-won`, (s) => roundOf(s, ex, facts).side === ex.side),
          seedWhere(`e621-${ex.level}-card`, (s) => repliesAsCard(s, ex, facts, 0)),
        ]
      : [seedWhere(`e621-${ex.level}-card`, (s) => repliesAsCard(s, ex, facts, 1))];
    await seedRounds(page, seeds);
    const sent = await fakeRecord(page, { comebacks: back.map((b) => ({ ...b, rounds: 2 })) });
    await comingBack(page, back);
    await openChapter(page, 6, "Blind play");
    await openLevel(page, "6.2.1", ex.level);

    await expect(move(page, 1)).toBeVisible();
    await win(page, ex);
    if (twoRounds) {
      await expect(page.getByRole("heading", { level: 1, name: "Score" })).toBeVisible();
      await expect(page.locator(".bigscore")).toHaveAttribute("aria-label", "1 right answers of 1");
      await page.getByRole("button", { name: "Play again" }).click();
    }
    await example(page, ex);

    await expect(page.getByRole("heading", { level: 1, name: "Score" })).toBeVisible();
    const right = (twoRounds ? 0 : 1) + (ex.right ? 1 : 0);
    await expect(page.locator(".bigscore")).toHaveAttribute("aria-label", `${right} right answers of ${twoRounds ? 1 : 2}`);
    if (ex.kind) await expect(page.locator(".kinds li")).toHaveText([`${ex.kind}1`]);
    await expect(page.locator(".pass p")).toHaveText(
      "Pass mark for 6.2.1 Level 1 to Level 6: the endgames won in one round, and my illegal moves. My practice sets it.",
    );
    await expect(page.locator(".stats")).toContainText("Moves played");
    await expect(page.locator(".stats")).toContainText("Fewest moves");
    await expect(page.locator(".stats")).toContainText("Illegal moves");
    await expect.poll(() => sent.length, { message: "rounds the record kept" }).toBe(twoRounds ? 2 : 1);
    await expect(page.locator(".sendline")).toHaveText("Sent to your progress record.");
    await checkLayout(page);

    // The round reached the record. A missed endgame comes back as the tables
    // hold it, the stronger side White: each wrong example here sits as White.
    const last = sent.at(-1)!;
    expect(last).toMatchObject({ chapter: 6, step: ex.step });
    if (!ex.right) {
      const start = ex.words.replace(/ White to move\.$/, "");
      expect(last.comebacks).toContainEqual({ challenge: "6.2.1", facts: { endgame: ex.endgame, start }, rounds: 2 });
    }
    expect(errors).toEqual([]);
  });
}
