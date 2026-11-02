// Chapter 4, Position memory: every level of 4.1.1 and 4.2.1, and the three
// levels of each of the nine openings, 4.3.1 to 4.3.9. Each level of 4.1.1 and
// 4.2.1 plays a whole round: right answers, then the card's wrong example,
// each told line word for word. Each opening's three levels play their one
// question.
// Cards: code/blueprint/docs/position-memory.md, 4.1.1, 4.2.1 and 4.3.
//
// Each example is set to come back, so the round asks it among its own. The
// test reads every other position off the screen before hiding it, and
// answers from what it read.

import { expect, test, type Page } from "@playwright/test";
import { OPENINGS, type Opening } from "../../core/src/chapters/4-position-memory/openings/definitions.ts";
import { CHAPTERS } from "../../core/src/chapters/index.ts";
import { fromWords, inWords, piecesOf, standsWords, startingPosition, THIRTEEN, toFen } from "../../core/src/positions/index.ts";
import type { Kind, Placed, Square, Stands } from "../../core/src/shape/index.ts";
import { checkLayout, checkTree, comingBack, consoleErrors, fakeRecord, next, openChapter, openLevel, question, reveal } from "./helpers.ts";
import { expectLook } from "./look.ts";

// A whole round, piece by piece at a phone's width, may take its full minutes.
test.describe.configure({ timeout: 300_000 });

// A piece's picture is named by its file: bN.svg is Black's knight.
const KIND: Record<string, Kind> = { K: "king", Q: "queen", R: "rook", B: "bishop", N: "knight", P: "pawn" };

async function boardPieces(page: Page): Promise<Placed[]> {
  const raw = await page.locator(".board button.sq").evaluateAll((els) =>
    els.flatMap((el) => {
      const pc = el.querySelector(".pc");
      return pc ? [{ square: el.getAttribute("aria-label")!, white: pc.classList.contains("white"), letter: pc.getAttribute("src")!.at(-5)! }] : [];
    }),
  );
  return raw.map((r) => ({ square: r.square as Square, side: r.white ? "white" : "black", kind: KIND[r.letter]! }));
}

const key = (pieces: readonly Placed[]) => JSON.stringify([...pieces].map((p) => `${p.side} ${p.kind} ${p.square}`).sort());
const piecesOfWords = (w: string) => piecesOf(fromWords(w));
const square = (page: Page, sq: string) => page.getByRole("button", { name: sq, exact: true });
const told = (page: Page) => page.locator(".told");
const cap = (s: string) => s[0]!.toUpperCase() + s.slice(1);

// Where a square sits on screen: its column from the left, its row from the bottom.
async function placeOf(page: Page, sq: string) {
  const board = (await page.locator(".board").boundingBox())!;
  const box = (await square(page, sq).boundingBox())!;
  const side = board.width / 8;
  return { col: Math.round((box.x - board.x) / side) + 1, row: 8 - Math.round((box.y - board.y) / side) };
}

// Other sessions save the core while a round plays: the dev server would then
// reload the page mid-round. Its reload socket answers nothing here.
async function start(page: Page, challenge: string, facts: unknown, level: string) {
  await page.routeWebSocket(/.*/, () => {});
  const errors = consoleErrors(page);
  const back = [{ challenge, facts }];
  const sent = await fakeRecord(page, { comebacks: back.map((b) => ({ ...b, rounds: 2 })) });
  await comingBack(page, back);
  await openChapter(page, 4, "Position memory");
  await checkLayout(page);
  await openLevel(page, challenge, level);
  return { errors, sent };
}

async function scoreShows(page: Page, sent: unknown[], right: number, total: number, kind: string, passMark: string) {
  await expect(page.getByRole("heading", { level: 1, name: "Score" })).toBeVisible();
  await expect(page.locator(".bigscore")).toHaveAttribute("aria-label", `${right} right answers of ${total}`);
  await expect(page.locator(".kinds li")).toHaveText([`${kind}1`]);
  await expect(page.locator(".pass p")).toHaveText(passMark);
  await expect.poll(() => sent.length, { message: "rounds the record kept" }).toBe(1);
  await expect(page.locator(".sendline")).toHaveText("Sent to your progress record.");
  await checkLayout(page);
}

// What the Show holds: the pieces on its board, or in its words, and where it comes from.
async function readShow(page: Page): Promise<{ pieces: Placed[]; from: string }> {
  await expectLook(page, "Hide", { time: "look" });
  const from = (await page.locator(".pbody .from").first().textContent()) ?? "";
  const wordsShown = page.locator(".pbody p.words");
  const pieces = (await wordsShown.count()) ? piecesOfWords((await wordsShown.textContent())!) : await boardPieces(page);
  return { pieces, from };
}

// ---------------------------------------------------------------------------
// 4.1.1 Name what stands there

const PASS_411 = "Pass mark for 4.1.1 L1 to L5: the right answers in one round, and my average look time. My practice sets it.";
type Ex411 = { words: string; from: string; squares: Square[]; asked: Square; wrong: string; told: string; kind: string };
const EX_411: Record<string, Ex411> = {
  L2: {
    words: "White: king a5, rook d4, knight f5. Black: king e6, pawns f6 and h5.",
    from: "From a Lichess game of January 2013, players rated 1415 and 1500, after White's 46th move.",
    squares: ["f6", "d4", "h5", "e5", "g6"],
    asked: "f6",
    wrong: "White's knight",
    told: "No: Black's pawn stands on f6. White's knight stands on f5, the rank beside.",
    kind: "The rank beside",
  },
  L3: {
    words: "White: king g2, rooks a4 and b6, pawns f2 and g3. Black: king g8, rook b7, pawns a5 and g5.",
    from: "From a Lichess game of January 2013, players rated 1413 and 1409, after White's 40th move.",
    squares: ["b7", "a4", "g5", "c7", "h8"],
    asked: "b7",
    wrong: "White's rook",
    told: "No: Black's rook stands on b7. White's rook stands on b6, the rank beside.",
    kind: "The rank beside",
  },
  L4: {
    words: "White: king g3, bishop a6, pawns f3 and h3. Black: king g7, rook d6, pawns f7, g6 and h7.",
    from: "From a Lichess game of January 2013, players rated 1252 and 1322, after Black's 33rd move.",
    squares: ["g6", "d6", "a6", "e5", "f6"],
    asked: "g6",
    wrong: "Empty",
    told: "No: Black's pawn stands on g6. You left it out.",
    kind: "A piece left out",
  },
  L5: {
    words: "White: king d3, rook h6, pawns c2, g2 and h2. Black: king d6, rook a6, pawns c5 and g6.",
    from: "From a Lichess game of January 2013, players rated 1402 and 1322, after Black's 43rd move.",
    squares: ["h5", "c2", "a6", "c4", "g6"],
    asked: "h5",
    wrong: "White's rook",
    told: "No: h5 is empty. White's rook stands on h6, the rank beside.",
    kind: "The rank beside",
  },
};

// Picks one of the 13, by its words: "White's knight", or "Empty".
async function answerStands(page: Page, s: Stands | string) {
  const text = typeof s === "string" ? s : standsWords(s);
  await page.locator(".choices").getByRole("button", { name: text, exact: true }).click();
}

test(`4.1.1 L1: right answers, then "No: Black's bishop stands on c8. Black's knight stands on b8, the file beside."`, async ({ page }) => {
  const { errors, sent } = await start(page, "4.1.1", { square: "c8" }, "L1");
  const startPos = startingPosition();
  let sawExample = false;
  for (let i = 0; i < 20; i++) {
    await expect(question(page, i + 1, 20)).toBeVisible();
    const q = (await page.locator("h2.q").textContent())!;
    const sq = q.match(/^At the start, what stands on ([a-h][1-8])\?$/)![1] as Square;
    await expect(square(page, sq)).toHaveClass(/lit/);
    if (i === 0) {
      await expect(page.locator(".choices button")).toHaveCount(13);
      await checkLayout(page);
    }
    if (sq === "c8" && !sawExample) {
      sawExample = true;
      await answerStands(page, "Black's knight");
      await expect(told(page)).toHaveText("No: Black's bishop stands on c8. Black's knight stands on b8, the file beside.");
    } else {
      const s = startPos.board[sq] ?? null;
      await answerStands(page, s);
      await expect(told(page)).toHaveText(s ? `Right: ${standsWords(s)} stands on ${sq}.` : `Right: ${sq} is empty.`);
    }
    await next(page);
  }
  expect(sawExample).toBe(true);
  await scoreShows(page, sent, 19, 20, "The file beside", PASS_411);
  expect(errors).toEqual([]);
});

// The thirteen answers are piece cards: named as ever, laid out alike at every width, and never saying which is right.
const CARD_NAMES = THIRTEEN.map((s) => standsWords(s));
const LETTER: Record<Kind, string> = { king: "K", queen: "Q", rook: "R", bishop: "B", knight: "N", pawn: "P" };
// All thirteen cards on screen with no scroll: each inside the window, and inside the column that holds them.
async function cardsOnScreen(page: Page) {
  const out = await page.evaluate(() => {
    const col = document.querySelector(".rcol")?.getBoundingClientRect().bottom ?? window.innerHeight;
    const limit = Math.min(window.innerHeight, col);
    return [...document.querySelectorAll(".choices .pk")].filter((c) => c.getBoundingClientRect().top < 0 || c.getBoundingClientRect().bottom > limit).map((c) => c.getAttribute("aria-label"));
  });
  expect(out, "cards off screen").toEqual([]);
  expect(await page.locator(".choices .pk").count()).toBe(13);
}
const rightAt = async (page: Page) => {
  const sq = (await page.locator("h2.q").textContent())!.match(/stands on ([a-h][1-8])\?$/)![1] as Square;
  return startingPosition().board[sq] ?? null;
};

test("4.1.1: the thirteen answers are piece cards, named as before, and a card never says which is right", async ({ page }) => {
  const { errors } = await start(page, "4.1.1", { square: "c8" }, "L1");
  const cards = page.locator(".choices .pk");
  await expect(cards).toHaveCount(13);
  await expect(page.locator(".choices .choice")).toHaveCount(0);
  await expect(page.locator(".choices button")).toHaveCount(13);
  // Each card's name for a screen reader, as the text picker had it, in the same order.
  expect(await page.locator(".choices button").evaluateAll((els) => els.map((e) => e.getAttribute("aria-label")))).toEqual(CARD_NAMES);
  for (const name of CARD_NAMES) await expect(page.locator(".choices").getByRole("button", { name, exact: true })).toHaveCount(1);
  // White's six, then Black's six, then Empty: a picture each, the side's own.
  const sides = ["white", "black"] as const;
  for (const [i, side] of sides.entries()) {
    const group = page.getByRole("group", { name: `${side === "white" ? "White" : "Black"}'s pieces` });
    await expect(group.locator(".pk")).toHaveCount(6);
    for (const [k, kind] of (["king", "queen", "rook", "bishop", "knight", "pawn"] as Kind[]).entries()) {
      const img = group.locator(".pk").nth(k).locator("img.pc");
      await expect(img).toHaveClass(new RegExp(`\\b${side}\\b`));
      await expect(img).toHaveAttribute("src", `/pieces/cburnett/${side[0]}${LETTER[kind]}.svg`);
      expect(await group.locator(".pk").nth(k).getAttribute("aria-label"), `${side} ${kind}`).toBe(CARD_NAMES[i * 6 + k]);
    }
  }
  await expect(page.locator(".pk-empty")).toHaveText("Empty");
  // Before my pick, no card says anything of the answer: every card is its tile alone, no ring, no badge, none dimmed.
  expect(await cards.evaluateAll((els) => els.map((e) => e.className))).toEqual([...Array(6).fill("pk s-w"), ...Array(6).fill("pk s-b"), "pk pk-empty"]);
  await expect(page.locator(".pk-bdg")).toHaveCount(0);
  // The layout, at every width: White's six in a row, Black's six under it, Empty one tall tile at their right end.
  const box = async (name: string) => (await page.getByRole("button", { name, exact: true }).boundingBox())!;
  const [wK, wP, bK, bP, empty] = [await box("White's king"), await box("White's pawn"), await box("Black's king"), await box("Black's pawn"), await box("Empty")];
  expect(wP.y, "White's six in one row").toBeCloseTo(wK.y, 0);
  expect(bK.y, "Black's row under White's").toBeGreaterThan(wK.y + wK.height - 1);
  expect(bK.x).toBeCloseTo(wK.x, 0);
  expect(bP.y, "Black's six in one row").toBeCloseTo(bK.y, 0);
  expect(empty.x, "Empty at the right end").toBeGreaterThan(wP.x + wP.width - 1);
  expect(empty.y, "Empty from White's row").toBeCloseTo(wK.y, 0);
  expect(empty.y + empty.height, "to the foot of Black's").toBeCloseTo(bK.y + bK.height, 0);
  await cardsOnScreen(page);
  await checkLayout(page);
  expect(errors).toEqual([]);
});

test("4.1.1: a card is picked by the keyboard, and after my pick it wears a ring and a badge: the right card too after a wrong pick, the others dimmed", async ({ page }) => {
  const { errors } = await start(page, "4.1.1", { square: "c8" }, "L1");
  for (const how of ["right", "wrong"]) {
    const right = await rightAt(page);
    const rightName = standsWords(right);
    // A right pick by the mouse, then a wrong one by the keyboard: the card focused, Enter or Space.
    const pickedName = how === "right" ? rightName : CARD_NAMES.find((n) => n !== rightName)!;
    const card = page.locator(".choices").getByRole("button", { name: pickedName, exact: true });
    if (how === "right") await card.click();
    else {
      await card.focus();
      await expect(card).toBeFocused();
      await page.keyboard.press("Enter");
    }
    await expect(told(page)).toBeVisible();
    // The picked card keeps its tile, and gains its badge: a check or a cross.
    await expect(card).toHaveClass(new RegExp(`\\b${how}\\b`));
    await expect(card.locator(".pk-bdg")).toHaveText(how === "right" ? "✓" : "✕");
    // After a wrong pick, the right card is ringed too, with a check; the others rest.
    if (how === "wrong") {
      const shown = page.locator(".choices").getByRole("button", { name: rightName, exact: true });
      await expect(shown).toHaveClass(/\bshow\b/);
      await expect(shown.locator(".pk-bdg")).toHaveText("✓");
    }
    await expect(page.locator(".pk-bdg")).toHaveCount(how === "right" ? 1 : 2);
    await expect(page.locator(".choices .pk.rest")).toHaveCount(how === "right" ? 12 : 11);
    // The picks are over: every card waits.
    await expect(page.locator(".choices .pk:not(:disabled)")).toHaveCount(0);
    // The tallest state, with the verdict told: still all thirteen on screen.
    await cardsOnScreen(page);
    // The names stay, for a screen reader.
    expect(await page.locator(".choices button").evaluateAll((els) => els.map((e) => e.getAttribute("aria-label")))).toEqual(CARD_NAMES);
    await checkLayout(page);
    await next(page);
  }
  expect(errors).toEqual([]);
});

for (const id of ["L2", "L3", "L4", "L5"]) {
  const ex = EX_411[id]!;
  test(`4.1.1 ${id}: right answers, then "${ex.told}"`, async ({ page }) => {
    const facts = { fen: toFen(fromWords(ex.words)), from: ex.from, squares: ex.squares };
    const { errors, sent } = await start(page, "4.1.1", facts, id);
    let sawExample = false;
    let asked = 0;
    for (let p = 0; p < 4; p++) {
      const shown = await readShow(page);
      expect(shown.from).toMatch(/^(From|Mirrored, a to h, from) a Lichess game of January 2013/);
      await expect(page.locator(".board")).toHaveCount(id === "L5" ? 0 : 1);
      if (p === 0) await checkLayout(page);
      const example = !sawExample && shown.from === ex.from && key(shown.pieces) === key(piecesOfWords(ex.words));
      const at = new Map(shown.pieces.map((x) => [x.square as string, x]));
      await page.getByRole("button", { name: "Hide", exact: true }).click();
      for (let k = 0; k < 5; k++) {
        await expect(question(page, asked + 1, 20)).toBeVisible();
        const sq = (await page.locator("h2.q").textContent())!.match(/^What stands on ([a-h][1-8])\?$/)![1] as Square;
        // An empty board, the square lit, to L3; no board from L4.
        if (id === "L2" || id === "L3") {
          await expect(square(page, sq)).toHaveClass(/lit/);
          expect(await boardPieces(page)).toEqual([]);
        } else await expect(page.locator(".board")).toHaveCount(0);
        if (p === 0 && k === 0) {
          await expect(page.locator(".choices button")).toHaveCount(13);
          await checkLayout(page);
        }
        if (example && sq === ex.asked) {
          sawExample = true;
          await answerStands(page, ex.wrong);
          await expect(told(page)).toHaveText(ex.told);
        } else {
          const s = at.get(sq) ?? null;
          await answerStands(page, s ? { side: s.side, kind: s.kind } : null);
          await expect(told(page)).toHaveText(/^Right: /);
        }
        await next(page);
        asked++;
      }
    }
    expect(sawExample, "the example came back").toBe(true);
    await scoreShows(page, sent, 19, 20, ex.kind, PASS_411);
    await expect(page.locator(".stats")).toContainText("Average look time");
    expect(errors).toEqual([]);
  });
}

// ---------------------------------------------------------------------------
// 4.2.1 Rebuild the position

const PASS_421 = "Pass mark for 4.2.1 L1 to L6: the positions rebuilt whole and the pieces right in one round, and my average look time. My practice sets it.";
type Ex421 = { words: string; from: string; wrong: (p: Placed[]) => Placed[]; told: string; kind: string };
const moved = (from: string, to: string) => (ps: Placed[]) => ps.map((p) => (p.square === from ? { ...p, square: to as Square } : p));
const EX_421: Record<string, Ex421> = {
  L1: {
    words: "White: king h2, rook f5, pawn h3. Black: king g7, rook b1, pawn h6.",
    from: "From a Lichess game of January 2013, players rated 1343 and 1336, after White's 38th move.",
    wrong: moved("b1", "a1"),
    told: "No: 5 of 6. Black's rook stands on b1, not a1: the file beside.",
    kind: "The file beside",
  },
  L2: {
    words: "White: king g2, knight a6, pawns f4, g4 and h3. Black: king g7, rook d1, pawns g6 and h7.",
    from: "From a Lichess game of January 2013, players rated 1395 and 1393, after White's 50th move.",
    wrong: moved("a6", "h6"),
    told: "No: 8 of 9. White's knight stands on a6, not h6: the files reversed.",
    kind: "The files reversed",
  },
  L3: {
    words: "White: king h1, rooks e6 and f1, pawns c4, g2 and h2. Black: king g8, rook d3, bishop c5, pawns a6, g4 and h6.",
    from: "From a Lichess game of January 2013, players rated 1233 and 1249, after White's 30th move.",
    wrong: (ps) => ps.map((p) => (p.square === "d3" ? { ...p, square: "c5" as Square } : p.square === "c5" ? { ...p, square: "d3" as Square } : p)),
    told: "No: 10 of 12. Black's rook stands on d3, and its bishop on c5: you swapped them.",
    kind: "Two pieces swapped",
  },
  L4: {
    words: "White: king e1, queen e2, pawn g3. Black: king g6, bishop c4, pawn f7.",
    from: "From a Lichess game of January 2013, players rated 1153 and 1395, after White's 63rd move.",
    wrong: (ps) => ps.map((p) => (p.square === "f7" ? { ...p, side: "white" as const } : p)),
    told: "No: 5 of 6. f7 holds Black's pawn, not White's: the wrong side.",
    kind: "The wrong side",
  },
  L5: {
    words: "White: king f1, rooks d1 and d3, pawn a2. Black: king g4, pawns a7, d4, h6 and h7.",
    from: "From a Lichess game of January 2013, players rated 1360 and 1301, after Black's 40th move.",
    wrong: (ps) => ps.filter((p) => p.square !== "h6"),
    told: "No: 8 of 9. You left out Black's pawn on h6.",
    kind: "A piece left out",
  },
  L6: {
    words: "White: king b1, rook b5, pawns b2, g4 and h3. Black: king d3, rook c8, pawns g5 and h7.",
    from: "From a Lichess game of January 2013, players rated 1408 and 1287, after White's 36th move.",
    wrong: moved("h3", "h4"),
    told: "No: 8 of 9. White's pawn stands on h3, not h4: the rank beside.",
    kind: "The rank beside",
  },
};
const COUNT_421: Record<string, number> = { L1: 5, L2: 4, L3: 3, L4: 5, L5: 4, L6: 3 };

// Places each piece: its palette button, then its square. L6 reveals its board first.
async function place(page: Page, pieces: Placed[]) {
  await reveal(page);
  const sorted = [...pieces].sort((a, b) => `${a.side}${a.kind}`.localeCompare(`${b.side}${b.kind}`));
  let pen = "";
  for (const p of sorted) {
    const name = `${cap(p.side)} ${p.kind}`;
    if (pen !== name) {
      await page.getByRole("button", { name, exact: true }).click();
      pen = name;
    }
    await square(page, p.square).click();
  }
  await page.getByRole("button", { name: "Confirm" }).click();
}

// How my answer stands on each square, found by diffing it against the position, square by square.
type CellState = "right" | "wrong" | "extra" | "missing";
function expectedCells(correct: Placed[], mine: Placed[]): Map<string, CellState> {
  const right = new Map(correct.map((p) => [p.square as string, p]));
  const out = new Map<string, CellState>();
  for (const p of mine) {
    const c = right.get(p.square);
    out.set(p.square, !c ? "extra" : c.side === p.side && c.kind === p.kind ? "right" : "wrong");
  }
  for (const c of correct) if (!out.has(c.square)) out.set(c.square, "missing");
  return out;
}

// The marks the board on screen wears, by square: the one board, its squares coloured, a missing piece ghosted.
async function expectMarked(page: Page, correct: Placed[], mine: Placed[]) {
  await expect(page.locator(".board")).toHaveCount(1);
  const want = expectedCells(correct, mine);
  const got = await page.locator(".board button.sq").evaluateAll((els) =>
    els.flatMap((el) => {
      const cell = [...el.classList].find((c) => c.startsWith("cell-"));
      return cell ? [[el.getAttribute("aria-label")!, cell.slice(5)] as const] : [];
    }),
  );
  expect(Object.fromEntries(got)).toEqual(Object.fromEntries(want));
  // Every square a piece stands on is marked, and no other.
  const ghosts = await page.locator(".board button.sq:has(.pc.ghost)").evaluateAll((els) => els.map((el) => el.getAttribute("aria-label")!));
  expect(ghosts.sort()).toEqual([...want].filter(([, s]) => s === "missing").map(([sq]) => sq).sort());
  // My pieces, and each missing piece drawn on its square.
  expect(key(await boardPieces(page))).toBe(key([...mine, ...correct.filter((p) => want.get(p.square) === "missing")]));
  // The board faces White, and no square is lit.
  await expect(page.locator(".board .sq.lit")).toHaveCount(0);
  expect(await placeOf(page, "a1")).toEqual({ col: 1, row: 1 });
}

// One piece off (missing), one the other side's (wrong), and one where nothing stands (extra).
function fourStates(correct: Placed[]): Placed[] {
  const free = (["a4", "h5", "d4", "b6"] as Square[]).find((s) => !correct.some((p) => p.square === s))!;
  const turned = correct[1]!;
  return [...correct.filter((p, i) => i !== correct.length - 1 && i !== 1), { ...turned, side: turned.side === "white" ? "black" : "white" }, { side: "white", kind: "queen", square: free }];
}

for (const id of ["L1", "L2", "L3", "L4", "L5", "L6"]) {
  const ex = EX_421[id]!;
  // After every counted answer, right or wrong, the screen shows my reconstruction on one board, each cell marked.
  test(`4.2.1 ${id}: after each answer one board, each cell marked right, wrong, extra or missing`, async ({ page }) => {
    const { errors } = await start(page, "4.2.1", { fen: toFen(fromWords(ex.words)), from: ex.from, level: id }, id);
    const n = COUNT_421[id]!;
    for (let i = 0; i < n; i++) {
      await expect(question(page, i + 1, n)).toBeVisible();
      const shown = await readShow(page);
      await page.getByRole("button", { name: "Hide", exact: true }).click();
      // The first answer shows all four states; the others are right, all green.
      const answer = i === 0 ? fourStates(shown.pieces) : shown.pieces;
      await place(page, answer);
      await expect(told(page)).toHaveText(i === 0 ? /^No: / : `Right: all ${shown.pieces.length} pieces.`);
      await expectMarked(page, shown.pieces, answer);
      const states = new Set(expectedCells(shown.pieces, answer).values());
      if (i === 0) expect([...states].sort(), "all four states on one board").toEqual(["extra", "missing", "right", "wrong"]);
      else expect([...states]).toEqual(["right"]);
      // A right answer moves on by itself after a second; a miss waits for Continue, so the marks can be read.
      if (i === 0) {
        await expect(page.getByRole("button", { name: "Continue" })).toBeVisible();
        await page.clock.fastForward(5000);
        await expect(told(page)).toBeVisible();
      } else await expect(page.getByRole("button", { name: "Continue" })).toHaveCount(0);
      await next(page);
    }
    expect(errors).toEqual([]);
  });

  test(`4.2.1 ${id}: right answers, then "${ex.told}"`, async ({ page }) => {
    // A miss comes back at its own level: the example is stored as missed here.
    const { errors, sent } = await start(page, "4.2.1", { fen: toFen(fromWords(ex.words)), from: ex.from, level: id }, id);
    const n = COUNT_421[id]!;
    let sawExample = false;
    let piecesRight = 0;
    let piecesAll = 0;
    for (let i = 0; i < n; i++) {
      await expect(question(page, i + 1, n)).toBeVisible();
      const shown = await readShow(page);
      // The question shows with the position, during the look too, after the "From a Lichess game" line.
      await expect(page.locator("h2.q")).toHaveText("Rebuild this position.");
      await expect(page.locator(".pbody .from")).toHaveCount(1);
      // At 1440 the From line comes first. On a phone the question sits in the
      // bar under the board, the From line in the panel further down.
      const fromFirst = await page.evaluate(() => {
        const line = document.querySelector(".pbody .from");
        const q = document.querySelector("h2.q");
        return !!line && !!q && !!(line.compareDocumentPosition(q) & Node.DOCUMENT_POSITION_FOLLOWING);
      });
      expect(fromFirst, "the From line comes before the question").toBe(page.viewportSize()!.width >= 1100);
      // On a board at L1 to L3 and L6; in words at L4 and L5, with no list of squares beside a board.
      const onBoard = id === "L1" || id === "L2" || id === "L3" || id === "L6";
      await expect(page.locator(".board")).toHaveCount(onBoard ? 1 : 0);
      await expect(page.locator(".pbody p.words")).toHaveCount(onBoard ? 0 : 1);
      if (i === 0) await checkLayout(page);
      const example = !sawExample && shown.from === ex.from && key(shown.pieces) === key(piecesOfWords(ex.words));
      await page.getByRole("button", { name: "Hide", exact: true }).click();
      await expect(page.getByRole("button", { name: "Hide", exact: true })).toHaveCount(0);
      await expect(page.locator("h2.q")).toHaveText("Rebuild this position.");
      // After Hide, L6 shows no board until Reveal board, and no hint, no palette.
      if (id === "L6") {
        await expect(page.locator(".board")).toHaveCount(0);
        await expect(page.locator("p.words")).toHaveCount(0);
        await expect(page.locator(".unread")).toHaveCount(0);
        await expect(page.getByRole("button", { name: "Reveal board" })).toHaveCount(1);
        await expect(page.getByRole("button", { name: "White king", exact: true })).toHaveCount(0);
      } else expect(await boardPieces(page)).toEqual([]);
      if (i === 0) await checkLayout(page);
      const answer = example ? ex.wrong(shown.pieces) : shown.pieces;
      await place(page, answer);
      piecesAll += shown.pieces.length;
      if (example) {
        sawExample = true;
        await expect(told(page)).toHaveText(ex.told);
        piecesRight += shown.pieces.length - (id === "L3" ? 2 : 1);
      } else {
        await expect(told(page)).toHaveText(`Right: all ${shown.pieces.length} pieces.`);
        piecesRight += shown.pieces.length;
      }
      // After the answer, one board: my reconstruction, each cell marked. A position read in words shows again in words.
      await expectMarked(page, shown.pieces, answer);
      if (!onBoard) await expect(page.locator(".pbody p.words").last()).toHaveText(inWords(fromWords(inWords({ ...startingPosition(), board: Object.fromEntries(shown.pieces.map((p) => [p.square, { side: p.side, kind: p.kind }])) }))));
      if (i === 0) await checkLayout(page);
      await next(page);
    }
    expect(sawExample, "the example came back").toBe(true);
    await scoreShows(page, sent, n - 1, n, ex.kind, PASS_421);
    await expect(page.locator(".stats")).toContainText(`Pieces right${piecesRight}`);
    await expect(page.locator(".stats")).toContainText(`Pieces in all${piecesAll}`);
    expect(errors).toEqual([]);
  });
}

// ---------------------------------------------------------------------------
// 4.3 The nine openings, 4.3.1 to 4.3.9: three levels each, one question a round

const PASS_L1 = (o: Opening) => `Pass mark for ${o.challenge} L1: none. The level ends when the guided reconstruction is right.`;
const PASS_L23 = (o: Opening) => `Pass mark for ${o.challenge} L2 and L3: the right answer in one round, and my look time at L2. My practice sets it.`;
const targetOf = (o: Opening) => new Map(piecesOf(o.final).map((p) => [p.square as string, p as Placed]));

// A wrong rebuild of one opening at one level, and what it is told.
type Wrong = { level: string; change: (target: Map<string, Placed>) => Map<string, Placed>; told: string; kind: string };
const WRONG: Record<string, Wrong> = {
  "Italian Game": {
    level: "L2",
    change: (t) => {
      const b = t.get("c4")!;
      t.delete("c4");
      t.set("b5", { ...b, square: "b5" });
      return t;
    },
    told: "No: in the Italian Game, White's bishop stands on c4. On b5, it is the Ruy Lopez.",
    kind: "Another opening's square",
  },
  "Sicilian Defense": {
    level: "L2",
    change: (t) => t.set("d2", { side: "white", kind: "pawn", square: "d2" }),
    told: "No: in the Sicilian Defense, d2 is empty. White's pawn from d2 is gone, traded for Black's pawn from c7.",
    kind: "A piece taken, left on",
  },
  "Slav Defense": {
    level: "L3",
    change: (t) => {
      t.delete("c6");
      t.set("c7", { side: "black", kind: "pawn", square: "c7" });
      return t;
    },
    told: "No: in the Slav Defense, ...c6 was left out. Black's pawn is still on c7.",
    kind: "A piece left at home",
  },
};

// From the starting position to the target: each piece moved to its square,
// then each piece left over taken off.
async function rebuildBoard(page: Page, target: Map<string, Placed>) {
  const now = new Map(piecesOf(startingPosition()).map((p) => [p.square as string, p as Placed]));
  const same = (a?: Placed, b?: Placed) => !!a && !!b && a.side === b.side && a.kind === b.kind;
  for (const [sq, want] of target) {
    if (same(now.get(sq), want)) continue;
    const from = [...now].find(([s, p]) => same(p, want) && !same(target.get(s), p))?.[0];
    if (!from) throw new Error(`No ${want.side} ${want.kind} to move to ${sq}`);
    await square(page, from).click();
    await square(page, sq).click();
    now.set(sq, { ...now.get(from)!, square: sq as Square });
    now.delete(from);
  }
  for (const [sq] of [...now].filter(([s, p]) => !same(target.get(s), p))) {
    await square(page, sq).click();
    await page.getByRole("button", { name: "Take off" }).click();
    now.delete(sq);
  }
  await page.getByRole("button", { name: "Confirm" }).click();
}

// The score of a one-question round: right or not, its mistakes by kind, its pass mark, and what the record kept.
async function scoreOfOne(page: Page, sent: { comebacks: unknown[] }[], right: 0 | 1, kinds: string[], passMark: string) {
  await expect(page.getByRole("heading", { level: 1, name: "Score" })).toBeVisible();
  await expect(page.locator(".bigscore")).toHaveAttribute("aria-label", `${right} right answers of 1`);
  if (kinds.length) await expect(page.locator(".kinds li")).toHaveText(kinds);
  else await expect(page.locator(".kinds")).toHaveCount(0);
  await expect(page.locator(".pass p")).toHaveText(passMark);
  await expect.poll(() => sent.length, { message: "rounds the record kept" }).toBe(1);
  await expect(page.locator(".sendline")).toHaveText("Sent to your progress record.");
  await checkLayout(page);
}

// L2 and L3: the checkpoint rebuilt on a board that starts in the starting position.
for (const o of OPENINGS) {
  for (const id of ["L2", "L3"] as const) {
    const wrong = WRONG[o.name]?.level === id ? WRONG[o.name] : undefined;
    test(`${o.challenge} ${id}: ${o.name}, ${wrong ? `"${wrong.told}"` : `"Right: the ${o.name}."`}`, async ({ page }) => {
      const miss = { opening: o.id, level: id };
      const { errors, sent } = await start(page, o.challenge, miss, id);
      await expect(question(page, 1, 1)).toBeVisible();
      if (id === "L2") {
        // The name and the checkpoint on a board until Hide: no move list, no departure or destination.
        await expect(page.locator(".lookname")).toHaveText(o.name);
        await expect(page.locator("h2.q")).toHaveText(`Rebuild the ${o.name}.`);
        expect(key(await boardPieces(page))).toBe(key(piecesOf(o.final)));
        await expect(page.locator(".board .sq.lit")).toHaveCount(0);
        await expect(page.locator(".stepmove, .pbody .from, .pbody p.words")).toHaveCount(0);
        await expectLook(page, "Hide", { time: "look" });
        await checkLayout(page);
        await page.getByRole("button", { name: "Hide", exact: true }).click();
        await expect(page.getByRole("button", { name: "Hide", exact: true })).toHaveCount(0);
      } else {
        // The name alone, in the question: no look, no board but the one to answer on.
        await expect(page.getByRole("button", { name: "Hide", exact: true })).toHaveCount(0);
        await expect(page.locator(".lookname")).toHaveCount(0);
      }
      await expect(page.locator("h2.q")).toHaveText(`Rebuild the ${o.name}.`);
      // One board, in the starting position; the checkpoint is gone.
      await expect(page.locator(".board")).toHaveCount(1);
      expect(key(await boardPieces(page))).toBe(key(piecesOf(startingPosition())));
      await checkLayout(page);
      const target = targetOf(o);
      await rebuildBoard(page, wrong ? wrong.change(target) : target);
      await expect(told(page)).toHaveText(wrong ? wrong.told : `Right: the ${o.name}.`);
      // After the answer, the checkpoint shows, whole.
      expect(key(await boardPieces(page))).toBe(key(piecesOf(o.final)));
      await next(page);
      await scoreOfOne(page, sent, wrong ? 0 : 1, wrong ? [`${wrong.kind}1`] : [], PASS_L23(o));
      // The look and the answer are counted apart: a look at L2 only.
      await expect(page.locator(".stats")).toContainText("Average time per answer");
      if (id === "L2") await expect(page.locator(".stats")).toContainText("Average look time");
      else await expect(page.locator(".stats")).not.toContainText("Average look time");
      // A miss comes back in this opening, at this level, with two rounds; a right answer ages it to one.
      expect((sent[0] as { comebacks: unknown[] }).comebacks).toEqual([{ challenge: o.challenge, facts: miss, rounds: wrong ? 2 : 1 }]);
      expect(errors).toEqual([]);
    });
  }
}

// L1: each move shown on its own, played by me with no Confirm, then one
// reconstruction from the starting position.
const label = (o: Opening, i: number) => `${Math.floor(i / 2) + 1}${i % 2 === 0 ? "." : "..."} ${o.moves[i]!.san}`;
const wordsOf = (o: Opening, i: number) => `${o.moves[i]!.side === "white" ? "White" : "Black"}'s ${o.moves[i]!.kind}`;
const arrowsOnBoard = (page: Page) => page.locator(".board .arrow-line");
const chip = (page: Page, name: string) => page.getByRole("button", { name, exact: true });

async function playMove(page: Page, o: Opening, i: number, to: string = o.moves[i]!.to, from: string = o.moves[i]!.from) {
  await square(page, from).click();
  await square(page, to).click();
}

// A move that is not the lesson's stays on its square for a moment, then the piece goes back.
async function missMove(page: Page, o: Opening, i: number, from: string, to: string) {
  await playMove(page, o, i, to, from);
  await expect(square(page, to)).toHaveClass(/bad/);
  await expect(page.locator(".board .sq.bad")).toHaveCount(0);
  expect(key(await boardPieces(page))).toBe(key(piecesOf(o.positions[i]!)));
}

// Move i demonstrated: the position after it, its departure and destination lit, an arrow, its lines, the strip.
async function expectDemo(page: Page, o: Opening, i: number) {
  const m = o.moves[i]!;
  await expect(page.locator(".lookname")).toHaveText(o.name);
  await expect(page.locator(".stepmove")).toHaveText(label(o, i));
  expect(key(await boardPieces(page))).toBe(key(piecesOf(o.positions[i + 1]!)));
  await expect(page.locator(".board .sq.lit")).toHaveCount(2);
  await expect(square(page, m.from)).toHaveClass(/lit/);
  await expect(square(page, m.to)).toHaveClass(/lit/);
  await expect(arrowsOnBoard(page)).toHaveCount(1);
  await expect(page.locator(".board .sq.slide")).toHaveCount(1);
  await expect(page.locator(".pbody p.note-line")).toHaveText(`${wordsOf(o, i)} goes from ${m.from} to ${m.to}.`);
  if (o.teach[i]) await expect(page.locator(".pbody p.words")).toHaveText(o.teach[i]!);
  else await expect(page.locator(".pbody p.words")).toHaveCount(0);
  await expect(page.locator(".les-chip")).toHaveCount(o.moves.length);
  await expect(page.locator(".les-chip.on")).toHaveAttribute("aria-label", label(o, i));
  await expectLook(page, "Your turn", { time: "move" });
}

// A move told right: its look times no move, and its button is Next, or at the last move Start the reconstruction.
async function goOn(page: Page, o: Opening, i: number) {
  const button = i < o.moves.length - 1 ? "Next" : "Start the reconstruction";
  await expectLook(page, button, { time: "move", moves: 0 });
  await page.getByRole("button", { name: button, exact: true }).click();
}

// Every move of an opening, shown, played and told right, up to the button that starts the reconstruction.
async function lessonThrough(page: Page, o: Opening) {
  for (let i = 0; i < o.moves.length; i++) {
    await expectDemo(page, o, i);
    await page.getByRole("button", { name: "Your turn" }).click();
    await playMove(page, o, i);
    await goOn(page, o, i);
  }
}

for (const o of OPENINGS) {
  test(`${o.challenge} L1: ${o.name}, the ${o.sans.length} moves shown and played, then the reconstruction`, async ({ page }) => {
    const { errors, sent } = await start(page, o.challenge, { opening: o.id, level: "L1" }, "L1");
    const n = o.moves.length;
    // The Italian Game's first move is played wrong first: the wrong piece, then the right piece to another square.
    const corrected = o.id === "italian-game";
    await expect(question(page, 1, 1)).toBeVisible();
    for (let i = 0; i < n; i++) {
      const m = o.moves[i]!;
      await expectDemo(page, o, i);
      if (i === 0) await checkLayout(page);
      await page.getByRole("button", { name: "Your turn" }).click();
      // Played by me, from the position before it, with no Confirm and no arrow.
      await expect(page.locator("h2.q")).toHaveText(`Play ${label(o, i)}.`);
      expect(key(await boardPieces(page))).toBe(key(piecesOf(o.positions[i]!)));
      await expect(arrowsOnBoard(page)).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Play the move" })).toBeDisabled();
      await expect(page.getByRole("button", { name: "Confirm" })).toHaveCount(0);
      if (corrected && i === 0) {
        // Each miss is told in the exact words, with the right move's arrow, and the question stays open.
        const knight = o.moves[2]!;
        await missMove(page, o, i, knight.from, knight.to);
        await expect(page.locator(".les-say.no")).toHaveText(`Not that piece. Move the ${m.kind} on ${m.from} to ${m.to}.`);
        const short = `${m.to[0]}${Number(m.to[1]) - 1}`;
        await missMove(page, o, i, m.from, short);
        await expect(page.locator(".les-say.no")).toHaveText(`Right piece. It goes to ${m.to}, not ${short}.`);
        await expect(page.locator("h2.q")).toHaveText(`Play ${label(o, i)}.`);
        await expect(arrowsOnBoard(page)).toHaveCount(1);
        await checkLayout(page);
      }
      await playMove(page, o, i);
      // Told right, the position after it kept until I go on.
      await expect(page.locator(".les-say.ok")).toHaveText(`Yes. ${label(o, i)}.`);
      expect(key(await boardPieces(page))).toBe(key(piecesOf(o.positions[i + 1]!)));
      await expect(page.locator(".board .sq.lit")).toHaveCount(0);
      if (i === n - 1) await checkLayout(page);
      await goOn(page, o, i);
    }
    // Then the reconstruction, from the starting position, the moves written in front of me.
    for (let i = 0; i < n; i++) {
      await expect(page.locator("h2.q")).toHaveText(`Play ${label(o, i)}.`);
      await expect(page.locator(".les-seq span")).toHaveText(o.moves.map((_, k) => label(o, k)));
      await expect(page.locator(".les-seq .cur")).toHaveText(label(o, i));
      await expect(page.locator(".les-seq .done")).toHaveCount(i);
      await expect(page.locator(".les-chip")).toHaveCount(0);
      if (i > 0) await expect(page.locator(".les-say.ok")).toHaveText(`Yes. ${label(o, i - 1)}.`);
      else await expect(page.locator(".les-say")).toHaveCount(0);
      expect(key(await boardPieces(page))).toBe(key(piecesOf(o.positions[i]!)));
      if (i === n - 1) await checkLayout(page);
      await playMove(page, o, i);
    }
    await expect(told(page)).toHaveText(`Right: the ${o.name}, ${o.line}. Anchor: ${o.anchor}.`);
    expect(key(await boardPieces(page))).toBe(key(piecesOf(o.final)));
    await next(page);
    // It ends right, whatever was corrected on the way, and each correction shows by its kind.
    await scoreOfOne(page, sent, 1, corrected ? ["The wrong piece1", "Another square1"] : [], PASS_L1(o));
    await expect(page.locator(".stats")).toContainText("Average time per answer");
    // Self-paced, and it feeds no come-back.
    expect((sent[0] as { comebacks: unknown[] }).comebacks).toEqual([{ challenge: o.challenge, facts: { opening: o.id, level: "L1" }, rounds: 2 }]);
    expect(errors).toEqual([]);
  });
}

test("4.3.1 L1: the strip and Replay watch a move again, Guide, Try again and Show the move help a practice move", async ({ page }) => {
  const o = OPENINGS[0]!;
  const { errors } = await start(page, o.challenge, { opening: o.id, level: "L1" }, "L1");
  await expectDemo(page, o, 0);
  // The strip: a tap watches that move, its position and arrow.
  await chip(page, label(o, 4)).click();
  await expectDemo(page, o, 4);
  await expect(page.locator(".les-chip.done")).toHaveCount(4);
  // Replay draws the board anew, so its piece slides again.
  const before = await page.locator(".board").elementHandle();
  await page.getByRole("button", { name: "Replay" }).click();
  expect(await before!.evaluate((el) => el.isConnected)).toBe(false);
  await expectDemo(page, o, 4);
  await chip(page, label(o, 0)).click();
  await expectDemo(page, o, 0);
  await page.getByRole("button", { name: "Your turn" }).click();
  // In practice Replay and the strip go back to a move's demonstration.
  await page.getByRole("button", { name: "Replay" }).click();
  await expectDemo(page, o, 0);
  await page.getByRole("button", { name: "Your turn" }).click();
  await chip(page, label(o, 1)).click();
  await expectDemo(page, o, 1);
  await chip(page, label(o, 0)).click();
  await page.getByRole("button", { name: "Your turn" }).click();
  // Guide draws the arrow of the move asked, and Hide guide takes it off.
  await expect(arrowsOnBoard(page)).toHaveCount(0);
  await page.getByRole("button", { name: "Guide", exact: true }).click();
  await expect(arrowsOnBoard(page)).toHaveCount(1);
  await page.getByRole("button", { name: "Hide guide" }).click();
  await expect(arrowsOnBoard(page)).toHaveCount(0);
  // A miss: the words and the arrow at once; Try again clears both; Show the move draws the arrow again.
  await missMove(page, o, 0, "e2", "e3");
  await expect(page.locator(".les-say.no")).toBeVisible();
  await expect(arrowsOnBoard(page)).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Show the move" })).toBeDisabled();
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.locator(".les-say")).toHaveCount(0);
  await expect(arrowsOnBoard(page)).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Try again" })).toHaveCount(0);
  await missMove(page, o, 0, "e2", "e3");
  // A miss fails nothing: the header's Wrong stays 0.
  await expect(page.getByRole("group", { name: "0 wrong" })).toBeVisible();
  await playMove(page, o, 0);
  await expect(page.locator(".les-say.ok")).toHaveText("Yes. 1. e4.");
  // Replay on a move told right goes back to its demonstration.
  await page.getByRole("button", { name: "Replay" }).click();
  await expectDemo(page, o, 0);
  expect(errors).toEqual([]);
});

test("4.3.1 L1: in the reconstruction, Watch this move shows the move again and Show the arrow gives it away", async ({ page }) => {
  const o = OPENINGS[0]!;
  const { errors } = await start(page, o.challenge, { opening: o.id, level: "L1" }, "L1");
  await lessonThrough(page, o);
  // Move 1: watch it, with its words; the board is the position after it, then back to my turn.
  await expect(page.locator("h2.q")).toHaveText(`Play ${label(o, 0)}.`);
  await page.getByRole("button", { name: "Watch this move" }).click();
  expect(key(await boardPieces(page))).toBe(key(piecesOf(o.positions[1]!)));
  await expect(page.locator(".stepmove")).toHaveText(label(o, 0));
  await expect(page.locator(".pbody p.note-line")).toHaveText(`${wordsOf(o, 0)} goes from e2 to e4.`);
  await expect(page.locator(".pbody p.words")).toHaveText(o.teach[0]!);
  await expect(arrowsOnBoard(page)).toHaveCount(1);
  await expect(page.locator(".board .sq.slide")).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Show the arrow" })).toBeDisabled();
  await page.getByRole("button", { name: "Back to my turn" }).click();
  expect(key(await boardPieces(page))).toBe(key(piecesOf(o.positions[0]!)));
  await expect(arrowsOnBoard(page)).toHaveCount(0);
  await expect(page.locator(".stepmove")).toHaveCount(0);
  // Show the arrow: it stays, even when I pick a piece.
  await page.getByRole("button", { name: "Show the arrow" }).click();
  await expect(arrowsOnBoard(page)).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Arrow shown" })).toBeDisabled();
  await missMove(page, o, 0, "e2", "e3");
  await square(page, "a2").click();
  await expect(arrowsOnBoard(page)).toHaveCount(1);
  await playMove(page, o, 0);
  // Move 2: a miss brings the arrow and the words; picking a piece again hides the arrow.
  await expect(page.locator("h2.q")).toHaveText(`Play ${label(o, 1)}.`);
  await expect(arrowsOnBoard(page)).toHaveCount(0);
  await missMove(page, o, 1, "e7", "e6");
  await expect(page.locator(".les-say.no")).toHaveText(`Right piece. It goes to e5, not e6.`);
  await expect(arrowsOnBoard(page)).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Try again" })).toHaveCount(0);
  await square(page, "a7").click();
  await expect(arrowsOnBoard(page)).toHaveCount(0);
  await square(page, "a7").click();
  await playMove(page, o, 1);
  for (let i = 2; i < o.moves.length; i++) await playMove(page, o, i);
  await expect(told(page)).toHaveText(`Right: the ${o.name}, ${o.line}. Anchor: ${o.anchor}.`);
  await next(page);
  await expect(page.getByRole("heading", { level: 1, name: "Score" })).toBeVisible();
  expect(errors).toEqual([]);
});

// The Sicilian takes a piece: its seven moves fit one strip, and its capture is told in the lesson's words.
test("4.3.6 L1: the seven moves of the Sicilian Defense fit the strip, and a capture slides in", async ({ page }) => {
  const o = OPENINGS.find((x) => x.id === "sicilian-defense")!;
  const { errors } = await start(page, o.challenge, { opening: o.id, level: "L1" }, "L1");
  expect(o.moves).toHaveLength(7);
  await chip(page, label(o, 5)).click();
  await expectDemo(page, o, 5);
  const clipped = await page.locator(".les-chip").evaluateAll((els) => els.filter((e) => e.scrollWidth > e.clientWidth).map((e) => e.getAttribute("aria-label")));
  expect(clipped).toEqual([]);
  await chip(page, label(o, 6)).click();
  await expectDemo(page, o, 6);
  await checkLayout(page);
  expect(errors).toEqual([]);
});

test("chapter 4's screen: one tree of its eleven cards built and their levels, the whole path of 38 playable", async ({ page }) => {
  await page.routeWebSocket(/.*/, () => {});
  const errors = consoleErrors(page);
  await fakeRecord(page);
  await openChapter(page, 4, "Position memory");
  await checkTree(page, 4);
  // The whole path playable: a button for each of its 38 steps, no mixed round.
  await expect(page.locator(".lvbtn")).toHaveCount(38);
  await expect(page.locator(".lvbtn:disabled")).toHaveCount(0);
  await expect(page.locator(".tag", { hasText: "Coming" })).toHaveCount(0);
  await checkLayout(page);
  expect(errors).toEqual([]);
});

// Every level of the path starts: its button opens a round of its challenge and level, and Leave comes back.
test("chapter 4: all 38 levels are reachable, each opening a round of its own challenge and level", async ({ page }) => {
  await page.routeWebSocket(/.*/, () => {});
  const errors = consoleErrors(page);
  await fakeRecord(page);
  await openChapter(page, 4, "Position memory");
  const path = CHAPTERS.find((c) => c.n === 4)!.path;
  expect(path).toHaveLength(38);
  for (const step of path) {
    if (step.kind !== "level") throw new Error("Chapter 4 mixes no round.");
    await openLevel(page, step.challenge, step.level);
    await expect(page.locator(".sx-lv"), `${step.challenge} ${step.level}`).toHaveText(step.level);
    await expect(page.locator(".sx-t"), `${step.challenge} ${step.level}`).toContainText(step.challenge);
    await page.getByRole("button", { name: /Leave/ }).click();
    await expect(page.getByRole("heading", { level: 1, name: "4. Position memory" })).toBeVisible();
  }
  expect(errors).toEqual([]);
});

// No side: chapter 4 draws none for a round. Every board faces White, and
// nothing names Black, however many times the round starts again.
test("4.3.1: the board faces White in every round, and no side is drawn", async ({ page }) => {
  await start(page, "4.3.1", { opening: "italian-game", level: "L3" }, "L3");
  for (let i = 0; i < 8; i++) {
    expect(await placeOf(page, "a1")).toEqual({ col: 1, row: 1 });
    expect(await placeOf(page, "h8")).toEqual({ col: 8, row: 8 });
    await expect(page.locator(".sx-bn")).toHaveCount(0);
    await page.getByRole("button", { name: "Restart" }).click();
    await expect(page.locator(".board")).toBeVisible();
  }
  await page.getByRole("button", { name: /^Settings/ }).click();
  await expect(page.getByRole("region", { name: "Settings" })).not.toContainText("I sit as");
});
