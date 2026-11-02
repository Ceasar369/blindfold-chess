// 6.3.1 Play the game, all six levels: each level's example game played
// right, then its wrong example, each question, told line and slip word for
// word. Card: code/blueprint/docs/blind-play.md, 6.3.1.
//
// The dev server replays the example game behind the bot's door, at
// /?replay=<game> (src/fixtures/replay.ts), so the bot plays the game's other
// player's moves. At L1 and L2 the site fetches a positions pack holding the
// example's position alone. At L5 and L6 the round's seed seats me as the
// example does.

import { expect, test, type Page } from "@playwright/test";
import { EXAMPLE_GAMES, type ExampleGame } from "../../../core/src/chapters/6-blind-play/6.3.1/examples.ts";
import { numbered } from "../../../core/src/notation/index.ts";
import { inWords, other, sideWord, toFen } from "../../../core/src/positions/index.ts";
import { playLine } from "../../../core/src/rules/index.ts";
import {
  challengeNode, checkLayout, checkTree, composeMove, consoleErrors, fakeRecord, keySquares, menu, move, next, openChallenge, openChapter, openLevel,
} from "../helpers.ts";
import { expectLook } from "../look.ts";
import { seedRounds, seedWhere, servePack, sideOf } from "../rounds-5-6.ts";

type Run = {
  line: "right" | "wrong";
  before: Record<number, string[]>; // what I do before my move of that number: see act()
  told: string;
  notes: string[];
};

type Example = { level: string; step: number; right: Run; wrong: Run };

// The card's six examples. step: its index on chapter 6's path.
const EXAMPLES: Example[] = [
  {
    level: "L1",
    step: 7,
    right: { line: "right", before: {}, told: "Checkmate: you won, in 12 moves. A clean game.", notes: [] },
    wrong: { line: "right", before: { 47: ["b8"] }, told: "Checkmate: you won, in 12 moves. A clean game. 1 move left unclear.", notes: [] },
  },
  {
    level: "L2",
    step: 11,
    right: { line: "right", before: { 53: ["Square h2"] }, told: "Checkmate: you won, in 14 moves. 1 hint point.", notes: [] },
    wrong: {
      line: "right",
      before: { 50: ["Rd4"], 53: ["Square h2"] },
      told: "Checkmate: you won, in 14 moves. 1 illegal move, 1 hint point.",
      notes: ["50. Rd4 was not legal: 49... Rb2+ gave check, and your king on b6 stayed in it."],
    },
  },
  {
    level: "L3",
    step: 13,
    right: { line: "right", before: { 15: ["Last moves"] }, told: "Checkmate: you won, in 19 moves. 1 hint point.", notes: [] },
    wrong: {
      line: "right",
      before: { 15: ["Last moves", "Bxe5"] },
      told: "Checkmate: you won, in 19 moves. 1 illegal move, 1 hint point.",
      notes: ["15. Bxe5 was not legal: your pawn on d4 stands between b2 and e5."],
    },
  },
  {
    level: "L4",
    step: 14,
    right: { line: "right", before: {}, told: "Checkmate: you won, in 18 moves. A clean game.", notes: [] },
    wrong: {
      line: "right",
      before: { 5: ["O-O"] },
      told: "Checkmate: you won, in 18 moves. 1 illegal move.",
      notes: ["5... O-O was not legal: your bishop on f8 stands between your king and your rook."],
    },
  },
  {
    level: "L5",
    step: 15,
    right: { line: "right", before: {}, told: "Checkmate: you won, in 17 moves. A clean game.", notes: [] },
    wrong: {
      line: "wrong",
      before: {},
      told: "Checkmate: you won, in 19 moves. A clean game. 1 mate in one missed.",
      notes: ["17. Qh6: 17. Qg5# and 17. Qg4# mated at once."],
    },
  },
  {
    level: "L6",
    step: 16,
    right: { line: "right", before: {}, told: "Checkmate: you won, in 18 moves. A clean game.", notes: [] },
    wrong: {
      line: "right",
      before: { 15: ["Nxd4"] },
      told: "Checkmate: you won, in 18 moves. 1 illegal move.",
      notes: ["15... Nxd4 was not legal: your knight from c6 was taken on f3 at 13. Bxf3."],
    },
  },
];

const PASS_MARK = "Pass mark for 6.3.1 Level 1 to Level 6: my results and my clean games, over my last games at the level. My practice sets it.";

// The note the site gives what I do before a move: a hint's answer, an
// unclear move's question, or a refusal.
function noteFor(text: string): string {
  if (text === "Square h2") return "Black's pawn.";
  if (text === "b8") return "Say which piece your pawn becomes.";
  return "Not counted. The move stays open.";
}

// A hint's button, named by its words and its cost: "Square, 1 point".
const hint = (page: Page, name: string) => page.getByRole("button", { name: new RegExp(`^(${name}),? \\d points?$`) });

// The board drawn faces White whichever side I play: a1 at its bottom left, h8 at its top right.
async function expectFacingWhite(page: Page) {
  const a1 = (await page.getByRole("button", { name: "a1", exact: true }).boundingBox())!;
  const h8 = (await page.getByRole("button", { name: "h8", exact: true }).boundingBox())!;
  expect(a1.x < h8.x, "a1 left of h8").toBe(true);
  expect(a1.y > h8.y, "a1 below h8").toBe(true);
}

// The screen names Black when I play Black, and says nothing of a board.
async function expectBlackNamed(page: Page) {
  await expect(page.locator(".sx-bn")).toContainText("You play Black");
  await expect(page.locator(".sx-bn")).not.toContainText(/board|flip/i);
}

// A move built on the move composer, then confirmed. Each question, a move
// refused too, starts the composer empty.
async function playMove(page: Page, san: string) {
  await expect(page.getByRole("status", { name: "Your answer" })).toHaveText("Your move");
  await composeMove(page, san);
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
}

// What I do before a move: "Square h2", the square hint with its square on
// the keypad; "Last moves", its hint; or a move, built and played.
async function act(page: Page, what: string) {
  const square = what.match(/^Square ([a-h][1-8])$/);
  if (square) {
    await hint(page, "Square").click();
    await keySquares(page, [square[1]!]);
  } else if (what === "Last moves") await hint(page, "Last moves").click();
  else await playMove(page, what);
}

// Resign, then yes when it asks once more.
async function resign(page: Page) {
  await page.getByRole("button", { name: "Resign", exact: true }).click();
  await expect(page.getByText("Resign this game?")).toBeVisible();
  await page.getByRole("button", { name: "Yes, resign", exact: true }).click();
}

// One game, played on screen from its first step to its told line.
async function playGame(page: Page, ex: Example, game: ExampleGame, run: Run) {
  const sans = game[run.line];
  const { moves, positions } = playLine(game.start, sans);
  const at = [game.start, ...positions];
  const them = other(game.me);

  if (ex.level === "L2") {
    // The position in words, until I hide them.
    await expect(page.locator(".words")).toHaveText(inWords(game.start, { toMove: true }));
    await expectLook(page, "Hide", { time: "look" });
    await checkLayout(page);
    await page.getByRole("button", { name: "Hide", exact: true }).click();
  }

  let mine = 0;
  for (let i = 0; i < sans.length; i++) {
    const pos = at[i]!;
    if (pos.turn !== game.me) continue;
    const theirs = i > 0 ? numbered(moves[i - 1]!.san, them, at[i - 1]!.moveNumber) : null;
    const question = theirs ? `${sideWord(them)} played ${theirs}. Your move.` : "Your move.";
    await expect(page.locator("h2.q")).toHaveText(question);
    await expect(move(page, mine + 1)).toBeVisible();
    if (ex.level === "L1") await expect(page.locator(".words")).toHaveText(inWords(pos, { toMove: true }));
    else await expect(page.locator(".words")).toHaveCount(0);
    if (mine > 0) await expect(page.locator(".note-line")).toHaveText(`You played ${numbered(moves[i - 2]!.san, game.me, at[i - 2]!.moveNumber)}.`);
    if (mine === 0) {
      // A button per hint at the levels that give hint points; Resign at every level.
      await expect(hint(page, "Square|Last moves|Board")).toHaveCount(ex.level === "L1" || ex.level === "L6" ? 0 : 3);
      await expect(page.getByRole("button", { name: "Resign", exact: true })).toBeVisible();
      await checkLayout(page);
    }

    for (const text of run.before[pos.moveNumber] ?? []) {
      await act(page, text);
      if (text === "Last moves") {
        // The last 6 half-moves, until I hide them.
        const from = Math.max(0, i - 6);
        const words = moves.slice(from, i).map((m, k) => {
          const p = at[from + k]!;
          return m.side === "white" ? `${p.moveNumber}. ${m.san}` : k === 0 ? `${p.moveNumber}... ${m.san}` : m.san;
        });
        await expect(page.locator(".words")).toHaveText(words.join(" "));
        await expectLook(page, "Hide", { time: "look" });
        await checkLayout(page);
        await page.getByRole("button", { name: "Hide", exact: true }).click();
        await expect(page.locator("h2.q")).toHaveText(question);
      } else {
        await expect(page.locator(".unread")).toHaveText(noteFor(text));
        await expect(page.locator("h2.q")).toHaveText(question);
      }
    }
    await playMove(page, sans[i]!);
    mine++;
  }

  await expect(page.locator(".told")).toHaveText(run.told);
  await expect(page.locator(".told")).toHaveClass(/right/);
  // The game's notes follow the told line at 1440; on a phone, under the board.
  const notes = page.viewportSize()!.width >= 1100 ? ".told ~ .note-line" : ".again > .note-line";
  await expect(page.locator(notes)).toHaveText(run.notes);
  // The game shows again on a board, as it ended, with its moves, facing White as I played Black or White.
  await expect(page.locator(".board")).toBeVisible();
  await expectFacingWhite(page);
  if (game.me === "black") await expectBlackNamed(page);
  await expect(page.locator(".sq .pc")).toHaveCount(Object.keys(at.at(-1)!.board).length);
  await checkLayout(page);
  // Then move by move, back to its first position, each slip at its move.
  const replay = page.locator(".replay");
  const slips: string[][] = [];
  for (let k = moves.length; k >= 0; k--) {
    const said = k === 0 ? "The first position." : numbered(moves[k - 1]!.san, at[k - 1]!.turn, at[k - 1]!.moveNumber);
    await expect(replay.locator(".stepmove")).toHaveText(said);
    await expect(page.locator(".sq .pc")).toHaveCount(Object.keys(at[k]!.board).length);
    slips.unshift(await replay.locator(".note-line").allTextContents());
    if (k > 0) await replay.getByRole("button", { name: "Move back" }).click();
  }
  await expect(replay.getByRole("button", { name: "Move back" })).toBeDisabled();
  expect(slips.flat()).toEqual(run.notes);
  await checkLayout(page);
  await next(page);

  await expect(page.getByRole("heading", { level: 1, name: "Score" })).toBeVisible();
  await expect(page.locator(".bigscore")).toHaveAttribute("aria-label", "1 right answers of 1");
  await expect(page.locator(".pass p")).toHaveText(PASS_MARK);
  await checkLayout(page);
}

for (const ex of EXAMPLES) {
  const game = EXAMPLE_GAMES.find((g) => g.level === ex.level)!;
  test(`6.3.1 ${ex.level}: game ${game.game} right, then "${ex.wrong.told}"`, async ({ page }) => {
    const errors = consoleErrors(page);
    const sent = await fakeRecord(page);
    if (ex.level === "L1" || ex.level === "L2") {
      // The pack holds the example's position alone, so the round asks it.
      const [placement, turn, , , half, move] = toFen(game.start).split(" ");
      const fen = `${placement} ${turn} - - ${half} ${move}`;
      await servePack(page, "positions.json", {
        memory: [],
        even: [{ game: game.game, white: 0, black: 0, fen, moveNumber: game.start.moveNumber - 1, moved: "black" }],
      });
    }
    if (ex.level === "L5" || ex.level === "L6") {
      // Two rounds, each seated as the example sits.
      const seats = (name: string) => seedWhere(name, (s) => sideOf(s) === game.me);
      await seedRounds(page, [seats(`e2e-631-${ex.level}-right`), seats(`e2e-631-${ex.level}-wrong`)]);
    }
    await page.goto(`/?replay=${game.game}`);
    await menu(page, /^(6 )?Blind play$/);
    await expect(page.getByRole("heading", { level: 1, name: "6. Blind play" })).toBeVisible();
    await openLevel(page, "6.3.1", ex.level);

    await playGame(page, ex, game, ex.right);
    await page.getByRole("button", { name: "Play again" }).click();
    await playGame(page, ex, game, ex.wrong);

    await expect.poll(() => sent.length, { message: "rounds the record kept" }).toBe(2);
    for (const round of sent) {
      expect(round).toMatchObject({ chapter: 6, step: ex.step });
      expect(round.answers).toHaveLength(1);
    }
    expect(errors).toEqual([]);
  });
}

test("chapter 6's screen: one tree of its sections, challenges and levels, 6.3.1's six among them", async ({ page }) => {
  const errors = consoleErrors(page);
  await fakeRecord(page);
  await openChapter(page, 6, "Blind play");
  await openChallenge(page, "6.3.1");
  await checkTree(page, 6);
  await expect(challengeNode(page, "6.3.1").locator(".lvbtn")).toHaveCount(6);
  await checkLayout(page);
  expect(errors).toEqual([]);
});

// I play Black at L4: nothing shows, the board hint shows one, and it faces White
// like the game shown again after it ends.
test("6.3.1 L4: playing Black, the board hint and the game shown again face White", async ({ page }) => {
  const errors = consoleErrors(page);
  await fakeRecord(page);
  await openChapter(page, 6, "Blind play");
  await openLevel(page, "6.3.1", "L4");
  await expect(page.locator("h2.q")).toHaveText(/^White played 1\. \S+\. Your move\.$/);
  await expectBlackNamed(page);
  await expect(page.locator(".board")).toHaveCount(0);
  await hint(page, "Board").click();
  await expect(page.locator(".board")).toBeVisible();
  await expectFacingWhite(page);
  await page.getByRole("button", { name: "Hide", exact: true }).click();
  await expect(page.locator(".board")).toHaveCount(0);
  await resign(page);
  await expect(page.locator(".told")).toBeVisible();
  await expect(page.locator(".board")).toBeVisible();
  await expectFacingWhite(page);
  await expectBlackNamed(page);
  await checkLayout(page);
  expect(errors).toEqual([]);
});

// Record lines 6-136 and 6-183: my time per move runs from the question
// opening my turn to the legal move played, through a refusal, a note and a hint.
test("6.3.1 L3: a move's time runs on through a refusal and a hint, from the question that opened my turn", async ({ page }) => {
  const errors = consoleErrors(page);
  await fakeRecord(page);
  await openChapter(page, 6, "Blind play");
  await openLevel(page, "6.3.1", "L3");
  await playMove(page, "e4");
  await expect(page.locator("h2.q")).toHaveText(/^Black played 1\.\.\. \S+\. Your move\.$/);
  // This turn lasts over 4.5 seconds: a refusal after 1.5, a hint after 1.5 more, the hint read for 1.5 more.
  await page.waitForTimeout(1500);
  await playMove(page, "Ke3");
  await expect(page.locator(".unread")).toHaveText("Not counted. The move stays open.");
  await page.waitForTimeout(1500);
  await act(page, "Last moves");
  await expectLook(page, "Hide", { time: "look" });
  await page.waitForTimeout(1500);
  await page.getByRole("button", { name: "Hide", exact: true }).click();
  await playMove(page, "a3");
  await expect(page.locator(".note-line")).toHaveText("You played 2. a3.");
  await resign(page);
  await expect(page.locator(".told")).toBeVisible();
  await next(page);
  await expect(page.getByRole("heading", { level: 1, name: "Score" })).toBeVisible();
  const average = page.locator(".stats div").filter({ has: page.locator("dt", { hasText: /^Average time per move$/ }) }).locator("dd");
  // The moves were about 0.2, 4.6 and 0.1 seconds: over 1.2 on average. A clock that restarts at the
  // refusal and the hint counts the long turn as about 0.1, and averages about 0.1.
  expect(parseFloat((await average.textContent())!)).toBeGreaterThan(1.2);
  await checkLayout(page);
  expect(errors).toEqual([]);
});
