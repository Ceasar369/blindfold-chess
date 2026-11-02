// Chapter 2's cards on screen, every level from the chapter's path: right
// answers, then each level's wrong example from its card, each told line word
// for word. Then the mixed round, every answer right.
// Cards: code/blueprint/docs/piece-movement.md.
//
// Each example is set to come back, so the round asks it among its own. The
// right answers are worked out from what the screen shows, with the core's
// own chess: code/app/core/src/.

import { expect, test, type Page } from "@playwright/test";
import { inOrder as attackedOrder } from "../../core/src/chapters/2-piece-movement/2.2.1/index.ts";
import { movesTo } from "../../core/src/chapters/2-piece-movement/2.1.2/index.ts";
import { inOrder as attackerOrder } from "../../core/src/chapters/2-piece-movement/2.3.1/index.ts";
import { mayMoveTo } from "../../core/src/chapters/2-piece-movement/2.3.2/index.ts";
import { fromPieces, fromWords, type Position, toFen } from "../../core/src/positions/index.ts";
import { attackedPieces, attackersOf, reachOnEmpty } from "../../core/src/reach/index.ts";
import type { Kind, Placed, Side, Square } from "../../core/src/shape/index.ts";
import { checkLayout, checkTree, comingBack, consoleErrors, fakeRecord, fold, next, nowAt, openChapter, openLevel, playMixedRound, question, reveal } from "./helpers.ts";

const and = (xs: string[]) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);
const side = (word: string): Side => (word === "White" ? "white" : "black");

const sq = (page: Page, name: string) => page.locator(".board").getByRole("button", { name, exact: true });
const keypad = (page: Page) => page.getByRole("group", { name: "Files" });

// Each square on the board, revealed first where none shows, then Confirm.
async function clickAll(page: Page, squares: string[]) {
  await reveal(page);
  for (const s of squares) await sq(page, s).click();
  await page.getByRole("button", { name: "Confirm" }).click();
}

// A list of squares on the board; or none.
async function give(page: Page, squares: string[]) {
  if (!squares.length) await page.getByRole("button", { name: "None", exact: true }).click();
  else await clickAll(page, squares);
}

// A piece's picture is named by its file: bN.svg is Black's knight.
const KIND: Record<string, Kind> = { K: "king", Q: "queen", R: "rook", B: "bishop", N: "knight", P: "pawn" };

// The position a question shows: on the board, or in words.
async function position(page: Page): Promise<Position | null> {
  const words = page.locator(".panel p.words");
  if (await words.count()) return fromWords((await words.first().textContent())!);
  if (!(await page.locator(".board").count())) return null;
  const raw = await page.locator(".board .sq").evaluateAll((els) =>
    els.flatMap((e) => {
      const pc = e.querySelector(".pc");
      return pc ? [{ square: e.getAttribute("aria-label")!, white: pc.classList.contains("white"), letter: pc.getAttribute("src")!.at(-5)! }] : [];
    }),
  );
  return fromPieces(raw.map((r): Placed => ({ square: r.square as Square, side: r.white ? "white" : "black", kind: KIND[r.letter]! })));
}

const placement = (pos: Position | null) => (pos ? toFen(pos).split(" ")[0] : null);

// Answers any chapter 2 question right, as its card counts right, and gives its told line.
async function answerRight(page: Page): Promise<string> {
  const q = (await page.locator("h2.q").textContent())!;
  let m = q.match(/^Which squares can a knight on ([a-h][1-8]) reach\?$/);
  if (m) {
    const reach = reachOnEmpty({ side: "white", kind: "knight" }, m[1] as Square);
    await give(page, reach);
    return `Right: ${and(reach)}.`;
  }
  m = q.match(/^Take your knight from ([a-h][1-8]) to ([a-h][1-8]) in the fewest moves\.(?: Your pawns stand on ([a-h][1-8]) and ([a-h][1-8])\.)?$/);
  if (m) {
    const [from, to] = [m[1] as Square, m[2] as Square];
    const dist = movesTo(to, m[3] ? [m[3] as Square, m[4] as Square] : []);
    const route: Square[] = [];
    for (let at = from; at !== to; ) {
      at = reachOnEmpty({ side: "white", kind: "knight" }, at).find((j) => dist.get(j) === dist.get(at)! - 1)!;
      route.push(at);
    }
    await clickAll(page, route);
    return `Right: ${route.join(", ")}, in ${route.length} moves.`;
  }
  const pos = (await position(page))!;
  m = q.match(/^Which of (?:White|Black)'s pieces does (White|Black)'s (?:rook|bishop|queen) on ([a-h][1-8]) attack\?$/);
  if (m) {
    const hit = attackedOrder(attackedPieces(pos.board, m[2] as Square).map((p) => p.square), side(m[1]!));
    await give(page, hit);
    return hit.length ? `Right: ${and(hit)}.` : "Right: none.";
  }
  m = q.match(/^Which of (White|Black)'s pieces attack ([a-h][1-8])\?$/);
  if (m) {
    const t = m[2] as Square;
    const by = attackerOrder(attackersOf(pos.board, t, side(m[1]!)));
    await give(page, by);
    const check = pos.board[t]?.kind === "king" && by.length ? " That is check." : "";
    return by.length ? `Right: ${and(by.map((s) => `the ${pos.board[s]!.kind} on ${s}`))}.${check}` : "Right: none.";
  }
  m = q.match(/^Which squares may (?:White|Black)'s (?:pawn|king) on ([a-h][1-8]) move to\?$/);
  if (m) {
    const may = mayMoveTo(pos, m[1] as Square);
    await give(page, may);
    return may.length ? `Right: ${and(may)}.` : "Right: none.";
  }
  throw new Error(`No chapter 2 question: ${q}`);
}

type Facts = Record<string, string | string[]>;

type Wrong = {
  facts: Facts;
  ask: string;
  at?: string; // the position, as the page writes it, when the card sets one
  wrong: ((page: Page) => Promise<void>) | null; // null: no answer in time
  told: string;
  kinds: string[];
};

type Example = {
  card: string;
  level: string;
  step: number; // its index on chapter 2's path
  questions: number;
  shows: { pieces: number; lit: number; words?: true } | "words" | "no board";
  timed?: boolean;
  examples: Wrong[];
  pass: string;
};

const fen = (words: string, turn?: Side) => toFen(turn ? { ...fromWords(words), turn } : fromWords(words));
const pass = (card: string, levels: string, time = false) =>
  `Pass mark for ${card} ${levels}: the right answers in one round${time ? ", and my average time per answer" : ""}. My practice sets it.`;

const knight = (level: string, step: number, square: string, shows: Example["shows"], wrong: Wrong["wrong"], told: string, kind: string): Example => ({
  card: "2.1.1",
  level,
  step,
  questions: 10,
  shows,
  timed: level === "L5",
  examples: [{ facts: { square }, ask: `Which squares can a knight on ${square} reach?`, wrong, told, kinds: [kind] }],
  pass: pass("2.1.1", "L1 to L5", true),
});

const route = (level: string, step: number, facts: Facts, ask: string, shows: Example["shows"], wrong: Wrong["wrong"], told: string, kind: string): Example => ({
  card: "2.1.2",
  level,
  step,
  questions: 8,
  shows,
  examples: [{ facts, ask, wrong, told, kinds: [kind] }],
  pass: pass("2.1.2", "L1 to L5"),
});

const set = (card: string, level: string, step: number, shows: Example["shows"], examples: Wrong[], levels: string): Example => ({
  card,
  level,
  step,
  questions: 10,
  shows,
  examples,
  pass: pass(card, levels),
});

const at = (words: string, square: string, more: Facts = {}, turn?: Side) => ({ facts: { fen: fen(words, turn), square, ...more }, at: fen(words) });

// The card's positions.
const P221 = [
  "White: king g1, bishop c4. Black: king g8, rook c8, knight a6, pawn f7.",
  "White: king g1, queen d2, bishop a8, knight d4, pawn c5. Black: king g8, rook d8, pawn f7.",
  "White: king g1, queen e2, pawns e4 and f2. Black: king g8, rook e8, bishop b5, knight h5.",
];
const P231 = [
  "White: king g1, knight f3, pawns d4 and e4. Black: king g8, knight c6.",
  "White: king g1, knight d4. Black: king g8, queen d8, bishop b6, knight f5, pawns c5 and d5.",
  "White: king c1, rook g3, bishop b3, knight e7. Black: king g8, rook a8, pawns f7 and g6. Black to move.",
  "White: king g1, queen c2, rook h1, bishop d3, knight g5, pawn h2. Black: king g8, pawn h7.",
];
const P232 = [
  "White: king e1, bishop e3, pawn d2. Black: king e8, knight c3, pawn d4.",
  "White: king g1, pawns f2 and g2. Black: king g8, rook h8, bishop c5.",
  "White: king e1, rook e4, bishop g4. Black: king e8, knight b8, pawn f7.",
  "White: king g1, pawns f2, g2 and h2. Black: king g8, rook e1.",
  "White: king g1, bishop f5, knight e6. Black: king g8, rook d8, pawn f7.",
  "White: king e1, knight b1, pawn d2. Black: king h8, bishop a5, pawn h7.",
];

const clicks = (...squares: string[]) => (page: Page) => clickAll(page, squares);

// Each level's examples, from its card.
const EXAMPLES: Example[] = [
  knight("L1", 0, "d5", { pieces: 1, lit: 0 }, clicks("b4", "b6", "c3", "c7", "e3", "e7", "f4", "f5"),
    "No: a knight on d5 reaches b4, b6, c3, c7, e3, e7, f4 and f6. f5 is the rank beside f6.", "The rank beside"),
  knight("L2", 1, "h7", { pieces: 1, lit: 0 }, clicks("f6", "f8", "g5", "h5"),
    "No: a knight on h7 reaches f6, f8 and g5. h5 is light, like h7: a knight always lands on the other colour.", "A square of the knight's own colour"),
  knight("L3", 4, "b1", { pieces: 0, lit: 0 }, clicks("a3", "c3"), "No: a knight on b1 reaches a3, c3 and d2. You left out d2.", "A square left out"),
  knight("L4", 10, "g2", "no board", clicks("e1", "e3", "f4", "h4", "g3"),
    "No: a knight on g2 reaches e1, e3, f4 and h4. g3 is no knight's square: it sits next to g2.", "Another square"),
  knight("L5", 18, "c6", "no board", null, "Too slow. A knight on c6 reaches a5, a7, b4, b8, d4, d8, e5 and e7.", "Too slow"),
  route("L1", 5, { from: "g1", to: "e5" }, "Take your knight from g1 to e5 in the fewest moves.", { pieces: 1, lit: 1 }, clicks("h3", "f4", "e5"),
    "No: f4 to e5 is no knight move. The only route: g1, f3, e5.", "A jump that is no knight move"),
  route("L2", 9, { from: "b1", to: "d4" }, "Take your knight from b1 to d4 in the fewest moves.", { pieces: 1, lit: 1 }, clicks("d2", "f3", "e5", "c6", "d4"),
    "No: b1 to d4 takes 3 moves, and yours took 5. One route: b1, d2, f3, d4. b1 is light and d4 dark, so the count is odd.", "A longer route"),
  route("L3", 15, { from: "b1", to: "e5", pawns: ["a3", "f3"] }, "Take your knight from b1 to e5 in the fewest moves. Your pawns stand on a3 and f3.",
    { pieces: 3, lit: 1 }, clicks("a3", "c4", "e5"), "No: a3 holds your pawn. The only route: b1, d2, c4, e5.", "A landing on my pawn"),
  route("L4", 20, { from: "c1", to: "g6" }, "Take your knight from c1 to g6 in the fewest moves.", { pieces: 0, lit: 0 }, clicks("d3", "f5", "g6"),
    "No: d3 to f5 is no knight move. e5, the file beside, was. One route: c1, d3, e5, g6.", "The file beside"),
  route("L5", 23, { from: "b1", to: "g5" }, "Take your knight from b1 to g5 in the fewest moves.", "no board", clicks("c3", "e4", "f6"),
    "No: your route ends on f6, not g5. One route: b1, c3, e4, g5.", "A route ending elsewhere"),
  set("2.2.1", "L1", 2, { pieces: 6, lit: 1 }, [{
    ...at(P221[0]!, "c4"), ask: "Which of Black's pieces does White's bishop on c4 attack?", wrong: clicks("f7", "a6", "g8"),
    told: "No: White's bishop on c4 attacks f7 and a6. g8 stands behind Black's pawn on f7.", kinds: ["A piece behind another"],
  }], "L1 to L4"),
  set("2.2.1", "L2", 6, { pieces: 8, lit: 1 }, [{
    ...at(P221[1]!, "d8"), ask: "Which of White's pieces does Black's rook on d8 attack?", wrong: clicks("d4", "d2"),
    told: "No: Black's rook on d8 attacks d4 and a8. d2 stands behind White's knight on d4. You left out a8.", kinds: ["A piece left out", "A piece behind another"],
  }], "L1 to L4"),
  set("2.2.1", "L3", 13, { pieces: 0, lit: 1, words: true }, [{
    ...at(P221[2]!, "e2"), ask: "Which of Black's pieces does White's queen on e2 attack?", wrong: clicks("b5", "h5", "e8"),
    told: "No: White's queen on e2 attacks b5 and h5. e8 stands behind White's own pawn on e4.", kinds: ["A piece behind another"],
  }], "L1 to L4"),
  set("2.2.1", "L4", 19, "words", [{
    ...at(P221[2]!, "e2"), ask: "Which of Black's pieces does White's queen on e2 attack?", wrong: clicks("b5", "h5", "e8"),
    told: "No: White's queen on e2 attacks b5 and h5. e8 stands behind White's own pawn on e4.", kinds: ["A piece behind another"],
  }], "L1 to L4"),
  set("2.3.1", "L1", 7, { pieces: 6, lit: 1 }, [{
    ...at(P231[0]!, "e5", { side: "white" }), ask: "Which of White's pieces attack e5?", wrong: clicks("f3", "d4", "e4"),
    told: "No: White's knight on f3 and pawn on d4 attack e5. A pawn on e4 attacks d5 and f5, never the square ahead.", kinds: ["A pawn straight behind"],
  }], "L1 to L5"),
  set("2.3.1", "L2", 11, { pieces: 8, lit: 1 }, [{
    ...at(P231[1]!, "d4", { side: "black" }), ask: "Which of Black's pieces attack d4?", wrong: clicks("c5", "f5", "b6"),
    told: "No: Black's pawn on c5 and knight on f5 attack d4. The bishop on b6 is blocked by Black's own pawn on c5.", kinds: ["A blocked piece"],
  }], "L1 to L5"),
  set("2.3.1", "L3", 12, { pieces: 8, lit: 1 }, [{
    ...at(P231[2]!, "g8", { side: "white" }), ask: "Which of White's pieces attack g8?", wrong: clicks("e7", "g3"),
    told: "No: only White's knight on e7 attacks g8. That is check. The rook on g3 is blocked by Black's pawn on g6.", kinds: ["A blocked piece"],
  }], "L1 to L5"),
  set("2.3.1", "L4", 14, { pieces: 0, lit: 1, words: true }, [{
    ...at(P231[3]!, "h7", { side: "white" }), ask: "Which of White's pieces attack h7?", wrong: clicks("d3", "g5", "c2"),
    told: "No: White's bishop on d3 and knight on g5 attack h7. The queen on c2 stands behind White's own bishop on d3.", kinds: ["A blocked piece"],
  }], "L1 to L5"),
  set("2.3.1", "L5", 21, "words", [{
    ...at(P231[3]!, "h7", { side: "white" }), ask: "Which of White's pieces attack h7?", wrong: clicks("d3", "g5", "c2"),
    told: "No: White's bishop on d3 and knight on g5 attack h7. The queen on c2 stands behind White's own bishop on d3.", kinds: ["A blocked piece"],
  }], "L1 to L5"),
  set("2.3.2", "L1", 3, { pieces: 6, lit: 1 }, [{
    ...at(P232[0]!, "d2", {}, "white"), ask: "Which squares may White's pawn on d2 move to?", wrong: clicks("d3", "d4"),
    told: "No: White's pawn on d2 may move to c3 and d3. d4 holds Black's pawn: a pawn never takes straight ahead. You left out c3.",
    kinds: ["A square left out", "A pawn straight onto a piece"],
  }], "L1 to L5"),
  set("2.3.2", "L2", 8, { pieces: 6, lit: 1 }, [{
    ...at(P232[1]!, "g1", {}, "white"), ask: "Which squares may White's king on g1 move to?", wrong: clicks("f1", "h2"),
    told: "No: White's king on g1 may move to f1 only. h2 is attacked by Black's rook on h8.", kinds: ["An attacked square"],
  }], "L1 to L5"),
  set("2.3.2", "L3", 16, { pieces: 6, lit: 1 }, [
    {
      ...at(P232[2]!, "e8", {}, "black"), ask: "Which squares may Black's king on e8 move to?", wrong: clicks("d8", "f8", "d7"),
      told: "No: Black's king on e8 may move to d8 and f8. d7 is attacked by White's bishop on g4.", kinds: ["An attacked square"],
    },
    {
      ...at(P232[5]!, "d2", {}, "white"), ask: "Which squares may White's pawn on d2 move to?", wrong: clicks("d3"),
      told: "No: White's pawn on d2 may move nowhere. d3 leaves White's king on e1 open to Black's bishop on a5, along the diagonal.",
      kinds: ["A pawn leaving its king open"],
    },
  ], "L1 to L5"),
  set("2.3.2", "L4", 17, { pieces: 0, lit: 1, words: true }, [{
    ...at(P232[3]!, "g1", {}, "white"), ask: "Which squares may White's king on g1 move to?", wrong: clicks("h1"),
    told: "No: White's king on g1 may move nowhere. Once it stands on h1, Black's rook on e1 attacks it along the first rank.",
    kinds: ["A square behind the king on a checking line"],
  }], "L1 to L5"),
  set("2.3.2", "L5", 22, "words", [
    {
      ...at(P232[3]!, "g1", {}, "white"), ask: "Which squares may White's king on g1 move to?", wrong: clicks("h1"),
      told: "No: White's king on g1 may move nowhere. Once it stands on h1, Black's rook on e1 attacks it along the first rank.",
      kinds: ["A square behind the king on a checking line"],
    },
    {
      ...at(P232[4]!, "f7", {}, "black"), ask: "Which squares may Black's pawn on f7 move to?", wrong: clicks("f6", "g6"),
      told: "No: Black's pawn on f7 may move to e6 and f6. g6 is empty: a pawn moves diagonally only to take. You left out e6.",
      kinds: ["A square left out", "A pawn diagonally onto an empty square"],
    },
  ], "L1 to L5"),
];

// What each level shows: the board's pieces and lit squares, words, or
// nothing. With no board, a Reveal board button, and never the keypad.
async function checkShows(page: Page, ex: Example) {
  if (ex.shows === "no board" || ex.shows === "words") {
    await expect(page.locator(".board")).toHaveCount(0);
    await expect(page.locator(".panel p.words")).toHaveCount(ex.shows === "words" ? 1 : 0);
    await expect(page.getByRole("button", { name: "Reveal board" })).toHaveCount(1);
    await expect(keypad(page)).toHaveCount(0);
  } else {
    await expect(keypad(page)).toHaveCount(0);
    await expect(page.locator(".board .pc")).toHaveCount(ex.shows.pieces);
    await expect(page.locator(".board .sq.lit")).toHaveCount(ex.shows.lit);
    await expect(page.locator(".nm")).toHaveCount(0);
    await expect(page.locator(".panel p.words")).toHaveCount(ex.shows.words ? 1 : 0);
  }
  await expect(page.locator(".timer")).toHaveCount(ex.timed ? 1 : 0);
}

for (const ex of EXAMPLES) {
  test(`${ex.card} ${ex.level}: right answers, then ${ex.examples.map((e) => `"${e.told}"`).join(" and ")}`, async ({ page }) => {
    // Ten questions of up to eight clicks: in WebKit, about 1.2 seconds a click, past 2 minutes.
    test.slow();
    const errors = consoleErrors(page);
    const back = ex.examples.map((e) => ({ challenge: ex.card, facts: e.facts }));
    const sent = await fakeRecord(page, { comebacks: back.map((b) => ({ ...b, rounds: 2 })) });
    await comingBack(page, back);
    await openChapter(page, 2, "Piece movement");
    await checkLayout(page);
    await openLevel(page, ex.card, ex.level);

    const left = [...ex.examples];
    for (let asked = 0; asked < ex.questions; asked++) {
      await expect(question(page, asked + 1, ex.questions)).toBeVisible();
      const q = (await page.locator("h2.q").textContent())!;
      if (asked === 0) {
        await checkShows(page, ex);
        const qb = (await page.locator("h2.q").boundingBox())!;
        expect(qb.y, "the question starts above the fold").toBeLessThan(fold(page));
        await checkLayout(page);
      }
      const here = placement(await position(page));
      const i = left.findIndex((e) => e.ask === q && (!e.at || e.at.split(" ")[0] === here));
      if (i >= 0) {
        const e = left.splice(i, 1)[0]!;
        if (e.wrong) await e.wrong(page);
        await expect(page.locator(".told")).toHaveText(e.told, { timeout: 20_000 });
        await expect(page.locator(".told")).toHaveClass(/wrong/);
      } else {
        const line = await answerRight(page);
        await expect(page.locator(".told")).toHaveText(line);
      }
      if (asked === 0) await checkLayout(page);
      await next(page);
    }
    expect(left.map((e) => e.ask), "every example came back").toEqual([]);

    const wrongs = ex.examples.length;
    await expect(page.getByRole("heading", { level: 1, name: "Score" })).toBeVisible();
    await expect(page.locator(".bigscore")).toHaveAttribute("aria-label", `${ex.questions - wrongs} right answers of ${ex.questions}`);
    const kinds = new Map<string, number>();
    for (const e of ex.examples) for (const k of e.kinds) kinds.set(k, (kinds.get(k) ?? 0) + 1);
    const shown = await page.locator(".kinds li").allTextContents();
    expect([...shown].sort()).toEqual([...kinds].map(([k, n]) => `${k}${n}`).sort());
    await expect(page.locator(".pass p")).toHaveText(ex.pass);
    await expect.poll(() => sent.length, { message: "rounds the record kept" }).toBe(1);
    await expect(page.locator(".sendline")).toHaveText("Sent to your progress record.");
    await checkLayout(page);
    // A level played from the chapter's tree plays as its step: from step 1, I stand on it.
    expect(sent[0]).toMatchObject({ chapter: 2, step: ex.step, place: ex.step });
    expect(sent[0]!.answers).toHaveLength(ex.questions);
    expect(sent[0]!.comebacks).toHaveLength(wrongs);
    expect(sent[0]!.comebacks).toEqual(expect.arrayContaining(back.map((b) => ({ ...b, rounds: 2 }))));
    expect(errors).toEqual([]);
  });
}

test("chapter 2's screen: one tree of its sections, challenges and levels", async ({ page }) => {
  const errors = consoleErrors(page);
  await fakeRecord(page);
  await openChapter(page, 2, "Piece movement");
  await checkTree(page, 2);
  await checkLayout(page);
  expect(errors).toEqual([]);
});

test("chapter 2's mixed round: 12 questions, 3 of each challenge, every answer right", async ({ page }) => {
  const errors = consoleErrors(page);
  const sent = await fakeRecord(page);
  await openChapter(page, 2, "Piece movement");
  await playMixedRound(page);
  const seen: Record<string, number> = {};
  for (let asked = 0; asked < 12; asked++) {
    await expect(question(page, asked + 1, 12)).toBeVisible();
    const lvl = (await nowAt(page).textContent())!;
    seen[lvl] = (seen[lvl] ?? 0) + 1;
    if (asked < 2) await checkLayout(page);
    const line = await answerRight(page);
    await expect(page.locator(".told")).toHaveText(line);
    await next(page);
  }
  expect(seen).toEqual({ "2.1.1 L5": 3, "2.2.1 L4": 3, "2.3.1 L5": 3, "2.3.2 L5": 3 });
  await expect(page.locator(".bigscore")).toHaveAttribute("aria-label", "12 right answers of 12");
  await expect(page.getByRole("heading", { name: "Each challenge" })).toBeVisible();
  await expect(page.locator(".pass p")).toHaveText(
    "Pass mark for the mixed round: the right answers in one round, and in each challenge's three. My practice sets it.",
  );
  await expect.poll(() => sent.length).toBe(1);
  expect(sent[0]).toMatchObject({ chapter: 2, step: 24 });
  await checkLayout(page);
  expect(errors).toEqual([]);
});
