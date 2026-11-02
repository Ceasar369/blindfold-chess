// Chapter 3, Notation: every level of 3.1.1 and 3.2.1, and the mixed round.
// Each level plays a whole round: right answers, then the card's wrong
// example, each told line word for word.
// Cards: code/blueprint/docs/notation.md, 3.1.1 and 3.2.1.
//
// Each example is set to come back, so the round asks it among its own. The
// test reads every other question off the screen, works its answer out with
// the core's own chess, and answers it right.

import { expect, test, type Page } from "@playwright/test";
import { questionFacts, type Question } from "../../core/src/chapters/3-notation/moves.ts";
import { judgeWritten } from "../../core/src/chapters/3-notation/3.2.1/index.ts";
import { shapesOf } from "../src/board/arrows.ts";
import { arrowsOf, changes, findMove } from "../../core/src/notation/index.ts";
import { fromPieces, fromWords, type Position, startingPosition, toFen } from "../../core/src/positions/index.ts";
import { moveBetween, type Move } from "../../core/src/rules/index.ts";
import type { Kind, Placed, Side, Square } from "../../core/src/shape/index.ts";
import { checkLayout, checkTree, comingBack, composeMove, consoleErrors, fakeRecord, next, nowAt, openChapter, openLevel, playMixedRound, question as questionTile, reveal } from "./helpers.ts";

// A whole round at a phone's width may take its full minutes.
test.describe.configure({ timeout: 300_000 });

// A piece's picture is named by its file: bN.svg is Black's knight.
const KIND: Record<string, Kind> = { K: "king", Q: "queen", R: "rook", B: "bishop", N: "knight", P: "pawn" };

// The pieces on the board drawn, read off its squares.
async function boardPieces(page: Page): Promise<Placed[]> {
  const raw = await page.locator(".board button.sq").evaluateAll((els) =>
    els.flatMap((el) => {
      const pc = el.querySelector(".pc");
      return pc ? [{ square: el.getAttribute("aria-label")!, white: pc.classList.contains("white"), letter: pc.getAttribute("src")!.at(-5)! }] : [];
    }),
  );
  return raw.map((r) => ({ square: r.square as Square, side: r.white ? "white" : "black", kind: KIND[r.letter]! }));
}

async function litSquares(page: Page): Promise<Square[]> {
  return (await page.locator(".board button.sq.lit").evaluateAll((els) => els.map((el) => el.getAttribute("aria-label")!))) as Square[];
}

const notes = (page: Page) => page.locator(".pbody .note-line").allTextContents();
const words = async (page: Page) => (await page.locator(".pbody p.words").first().textContent())!;

// A position as a reader holds it: castling where a king and its rook stand
// home, and a pawn taken in passing after the last move named.
function held(pos: Position, notesShown: string[]): Position {
  const at = (s: string, side: Side, kind: Kind) => pos.board[s as Square]?.side === side && pos.board[s as Square]?.kind === kind;
  const rights = (side: Side, rank: string) => ({
    king: at(`e${rank}`, side, "king") && at(`h${rank}`, side, "rook"),
    queen: at(`e${rank}`, side, "king") && at(`a${rank}`, side, "rook"),
  });
  const last = notesShown.map((n) => n.match(/last move: ([a-h])([27]) to [a-h][45]\./)).find((m) => m);
  return {
    ...pos,
    castling: { white: rights("white", "1"), black: rights("black", "8") },
    enPassant: last ? (`${last[1]}${last[2] === "2" ? "3" : "6"}` as Square) : null,
  };
}

// Where a square sits on screen: its column from the left, its row from the bottom.
async function placeOf(page: Page, sq: string) {
  const board = (await page.locator(".board").boundingBox())!;
  const box = (await page.getByRole("button", { name: sq, exact: true }).boundingBox())!;
  const side = board.width / 8;
  return { col: Math.round((box.x - board.x) / side) + 1, row: 8 - Math.round((box.y - board.y) / side) };
}

// The board always faces White: a1 at the bottom left, whichever side I play.
async function expectFacingWhite(page: Page) {
  expect(await placeOf(page, "a1")).toEqual({ col: 1, row: 1 });
  expect(await placeOf(page, "h8")).toEqual({ col: 8, row: 8 });
}

// The side the screen names: Black has its banner, White none.
async function sideNamed(page: Page): Promise<Side> {
  const banner = page.locator(".sx-bn");
  if (await banner.count()) {
    await expect(banner).toContainText("You play Black");
    await expect(banner).not.toContainText(/board|flip/i);
    return "black";
  }
  return "white";
}

// Each square on the board, revealed first where none shows, then Confirm.
async function clickSquares(page: Page, squares: Square[]) {
  await reveal(page);
  for (const s of squares) await page.getByRole("button", { name: s, exact: true }).click();
  await page.getByRole("button", { name: "Confirm" }).click();
}

const revealButton = (page: Page) => page.getByRole("button", { name: "Reveal board" });

// My move, built key by key on the move composer, then Confirm.
async function writeMove(page: Page, move: string) {
  await composeMove(page, move);
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
}

// Which input the question offers: the keypad, the move composer, and never a text box.
const keypad = (page: Page) => page.getByRole("group", { name: "Files" });
const composer = (page: Page) => page.getByRole("group", { name: "Pieces, capture and signs" });
const textBox = (page: Page) => page.getByRole("textbox");

const told = (page: Page) => page.locator(".told");

function question(text: string, from: Square, to: Square, extra: Partial<Position> = {}, last: Question["last"] = null): Question {
  const pos = { ...fromWords(text), ...extra };
  return { pos, move: moveBetween(pos, from, to)!, last };
}
const samePieces = (a: Placed[], b: Placed[]) => JSON.stringify([...a].sort((x, y) => x.square.localeCompare(y.square))) === JSON.stringify([...b].sort((x, y) => x.square.localeCompare(y.square)));
const piecesIn = (pos: Position) => (Object.entries(pos.board) as [Square, { side: Side; kind: Kind }][]).map(([square, p]) => ({ square, side: p.side, kind: p.kind }));

// ---------------------------------------------------------------------------
// One question of each card, answered right, or with the card's wrong example

type Example = { q: Question; wrong: Square[] | string; told: string; seat?: Side };

// 3.1.1, L1 to L5: the move my opponent plays, its squares clicked on the
// board, or, with no board, read from the words and clicked once revealed.
async function readOne(page: Page, blind: boolean, ex: Example | null, seen: { example: boolean }) {
  const text = (await page.locator("h2.q").textContent())!;
  const m = text.match(/^(White|Black) plays (\S+)\. Which squares does it change\?$/)!;
  expect(m, text).not.toBeNull();
  const mover: Side = m[1] === "White" ? "white" : "black";
  const shown = await notes(page);
  const pieces = blind ? piecesIn(fromWords(await words(page))) : await boardPieces(page);
  const answer = (squares: Square[]) => clickSquares(page, squares);
  const isExample = !!ex && !seen.example && text === `${m[1]} plays ${ex.q.move.san}. Which squares does it change?` && samePieces(pieces, piecesIn(ex.q.pos));
  if (isExample) {
    seen.example = true;
    if (ex.seat) {
      await expectFacingWhite(page);
      expect(await sideNamed(page)).toBe(ex.seat);
    }
    await answer(ex.wrong as Square[]);
    await expect(told(page)).toHaveText(ex.told);
    await expect(told(page)).toHaveClass(/wrong/);
    return;
  }
  const pos = held(fromPieces(pieces, mover), shown);
  const found = findMove(pos, m[2]!);
  if (!("found" in found)) throw new Error(`No move ${m[2]} in ${toFen(pos)}`);
  await answer(changes(found.found));
  await expect(told(page)).toHaveText(/^Right: /);
}

const arrowsOn = (page: Page) => page.locator(".board svg.arrows");

// My move's arrows, drawn over the board as look 3 of the opening-lesson winner
// draws them: one for each piece that moves, from where it leaves to where it
// lands, in the measures of src/board/arrows.ts, labelled with nothing. Each
// one's tail lies on its departure square, and its tip on its destination:
// castling's two share a rank, so each is drawn a little to its own right.
async function expectArrows(page: Page, move: Move) {
  const want = arrowsOf(move);
  await expect(arrowsOn(page)).toHaveCount(1);
  await expect(arrowsOn(page).locator("g")).toHaveCount(want.length);
  await expect(arrowsOn(page).locator("text, title, tspan")).toHaveCount(0);
  const drawn = await arrowsOn(page).locator("g").evaluateAll((gs) =>
    gs.map((g) => ({
      line: ["x1", "y1", "x2", "y2"].map((a) => Number(g.querySelector("line")!.getAttribute(a))),
      head: g.querySelector("polygon")!.getAttribute("points")!.split(" ").map((p) => p.split(",").map(Number)),
    })),
  );
  const box = (await arrowsOn(page).boundingBox())!;
  const pixel = ([x, y]: number[]) => ({ x: box.x + (x! / 8) * box.width, y: box.y + (y! / 8) * box.height });
  const over = async (square: Square, p: { x: number; y: number }) => {
    const b = (await page.locator(".board").getByRole("button", { name: square, exact: true }).boundingBox())!;
    return p.x >= b.x && p.x <= b.x + b.width && p.y >= b.y && p.y <= b.y + b.height;
  };
  const shapes = shapesOf(want);
  expect(shapes).toHaveLength(want.length);
  for (const [i, { arrow: a, shape }] of shapes.entries()) {
    const got = drawn[i]!;
    [...shape.tail, ...shape.base].forEach((x, k) => expect(got.line[k]!).toBeCloseTo(x, 6));
    [shape.tip, ...shape.wings].forEach((p, k) => p.forEach((x, j) => expect(got.head[k]![j]!).toBeCloseTo(x, 6)));
    expect(await over(a.from, pixel(shape.tail)), `${a.from} to ${a.to}: the tail on ${a.from}`).toBe(true);
    expect(await over(a.to, pixel(shape.tip)), `${a.from} to ${a.to}: the tip on ${a.to}`).toBe(true);
  }
}

// 3.2.1: my move, shown lit on the board or in words, picked from four or
// built on the move composer.
async function writeOne(page: Page, how: "choose" | "board" | "words", ex: Example | null, seen: { example: boolean }) {
  await expect(page.locator("h2.q")).toHaveText("Write your move in notation.");
  const shown = await notes(page);
  let pieces: Placed[];
  let from: Square;
  let to: Square;
  if (how === "words") {
    pieces = piecesIn(fromWords(await words(page)));
    const goes = shown.map((n) => n.match(/^Your \w+ goes from ([a-h][1-8]) to ([a-h][1-8])\.$/)).find((x) => x)!;
    [from, to] = [goes[1] as Square, goes[2] as Square];
  } else {
    pieces = await boardPieces(page);
    const lit = await litSquares(page);
    expect(lit).toHaveLength(2);
    // The board faces White whichever side I play, and the screen names my side. My piece leaves.
    await expectFacingWhite(page);
    const seat = await sideNamed(page);
    const mine = lit.find((s) => pieces.some((p) => p.square === s && p.side === seat))!;
    [from, to] = [mine, lit.find((s) => s !== mine)!];
  }
  const promo = shown.map((n) => n.match(/^It becomes a (\w+)\.$/)).find((x) => x);
  const side = pieces.find((p) => p.square === from)!.side;
  const move = moveBetween(held(fromPieces(pieces, side), shown), from, to, (promo?.[1] as Kind) ?? null);
  if (!move) throw new Error(`No move ${from}-${to}`);
  // With a board, my move's arrows over it, and the two squares still lit; with none, no board and no arrow.
  if (how === "words") {
    await expect(page.locator(".board")).toHaveCount(0);
    await expect(arrowsOn(page)).toHaveCount(0);
  } else await expectArrows(page, move);
  const isExample = !!ex && !seen.example && move.san === ex.q.move.san && samePieces(pieces, piecesIn(ex.q.pos));
  let answer = isExample ? (ex.wrong as string) : how === "choose" ? move.san.replace(/[+#]$/, "") : move.san;
  if (isExample && ex.seat) expect(await sideNamed(page)).toBe(ex.seat);
  if (isExample && how === "choose") {
    // L1 offers other wrong choices each time it asks: the first one shown is picked, and told as the judge tells it.
    const right = move.san.replace(/[+#]$/, "");
    answer = (await page.locator(".choices").getByRole("button").allTextContents()).find((c) => c !== right)!;
    const judged = judgeWritten(ex.q.pos, ex.q.move, answer, false);
    if (judged === "not counted") throw new Error(`${answer} names no move`);
    ex.told = judged.line;
    (ex as Example & { kind: string[] }).kind = judged.mistakes;
  }
  if (how === "choose") await page.locator(".choices").getByRole("button", { name: answer, exact: true }).click();
  else await writeMove(page, answer);
  if (isExample) {
    seen.example = true;
    await expect(told(page)).toHaveText(ex.told);
    await expect(told(page)).toHaveClass(/wrong/);
  } else await expect(told(page)).toHaveText(`Right: ${move.san}.`);
  // The arrows stay while I answer, and after.
  if (how !== "words") await expectArrows(page, move);
}

// ---------------------------------------------------------------------------
// The card's examples

const C = { white: { king: false, queen: false }, black: { king: false, queen: true } };
const READ: Record<string, Example> = {
  L1: {
    q: question("White: king g1, rook e1, pawn g2. Black: king g8, knights b8 and f6. Black to move.", "f6", "d5"),
    wrong: ["b8", "d5"],
    told: "No: Nd5 is the knight on f6: f6 and d5. The knight on b8 cannot reach d5.",
    seat: "white",
  },
  L2: {
    q: question("White: king g1, knight c3, pawns d4 and e4. Black: king g8, knight f6, pawns c5 and d5.", "e4", "d5"),
    wrong: ["e4", "e5"],
    told: "No: exd5 is the pawn on the e-file taking on d5: e4 and d5. e5 is the file beside d5.",
    seat: "black",
  },
  L3: {
    q: question("White: king g1, queen b3, pawns f2 and g2. Black: king e8, rooks a8 and h8, pawn f7. Black to move.", "e8", "c8", { castling: C }),
    wrong: ["e8", "c8"],
    told: "No: O-O-O moves Black's king from e8 to c8, and the rook from a8 to d8. You left out a8 and d8.",
    seat: "white",
  },
  L4: {
    q: question("White: king g1, knights b1 and f3, pawn e4. Black: king g8, rook e8, knight c6, pawn d6.", "b1", "d2"),
    wrong: ["f3", "d2"],
    told: "No: Nbd2 is the knight on the b-file: b1 and d2. The knight on f3 reaches d2 too, so the move names its file.",
    seat: "black",
  },
  L5: {
    q: question("White: king g1, rook d1, pawns f4 and g2. Black: king g8, rook d8, pawns e4 and h7. Black to move.", "e4", "f3", { enPassant: "f3" }, { from: "f2", to: "f4" }),
    wrong: ["e4", "f3"],
    told: "No: exf3 takes White's pawn on f4 in passing: e4, f3 and f4. You left out f4.",
  },
};
const READ_KIND: Record<string, string> = {
  L1: "A piece that cannot go there",
  L2: "The file beside",
  L3: "A square left out",
  L4: "The other of two that can",
  L5: "A square left out",
};

const WRITE: Record<string, Example & { kind: string | string[] }> = {
  L1: {
    q: question("White: king e1, knights c3 and g1. Black: king e8, knight b8, pawn d7.", "g1", "f3"),
    // L1's choices change each time: the wrong one picked, its told line and its mistakes are set when it is.
    wrong: "",
    told: "",
    kind: [] as string[],
    seat: "white",
  },
  L2: {
    q: question("White: king g1, knight f3, pawn c4. Black: king g8, pawns b5 and d5. Black to move.", "d5", "c4"),
    wrong: "bxc4",
    told: "No: it is dxc4. Your pawn on d5 takes, and a pawn's capture names the file it leaves. bxc4 is the pawn on b5.",
    kind: "The other piece named",
    seat: "black",
  },
  L3: {
    q: (() => {
      const pos = fromWords("White: king g1, bishop f1, pawns g2 and h2. Black: king g8, rook e8, pawns b2 and h7. Black to move.");
      return { pos, move: moveBetween(pos, "b2", "b1", "queen")!, last: null };
    })(),
    wrong: "b1",
    told: "No: it is b1=Q. A promotion names the piece the pawn becomes.",
    kind: "A promotion without its piece",
    seat: "black",
  },
  L4: {
    q: question("White: king g1, rooks a1 and a5, pawns f2 and g2. Black: king g8, pawns f7 and h7.", "a1", "a3"),
    wrong: "Ra3",
    told: "No: it is R1a3. Your rook on a5 reaches a3 too. Both stand on the a-file, so the rank tells them apart: 1.",
    kind: "What tells two apart, left out",
    seat: "white",
  },
  L5: {
    q: question("White: king g1, queen d1, bishop c4, knight f3. Black: king g8, rook e8, pawns f7 and h7.", "c4", "f7"),
    wrong: "Bxf7",
    told: "No: it is Bxf7+. On f7, your bishop attacks Black's king on g8: that is check.",
    kind: "A check left unmarked",
  },
};

// Other sessions save the core while a round plays: the dev server would then
// reload the page mid-round. Its reload socket answers nothing here.
async function noReload(page: Page) {
  await page.routeWebSocket(/.*/, () => {});
}

async function start(page: Page, challenge: string, facts: unknown, level: string) {
  await noReload(page);
  const errors = consoleErrors(page);
  const back = [{ challenge, facts }];
  const sent = await fakeRecord(page, { comebacks: back.map((b) => ({ ...b, rounds: 2 })) });
  await comingBack(page, back);
  await openChapter(page, 3, "Notation");
  await checkLayout(page);
  await openLevel(page, challenge, level);
  return { errors, sent };
}

async function scoreShows(page: Page, sent: unknown[], right: number, total: number, kind: string | string[] | null, passMark: string) {
  await expect(page.getByRole("heading", { level: 1, name: "Score" })).toBeVisible();
  await expect(page.locator(".bigscore")).toHaveAttribute("aria-label", `${right} right answers of ${total}`);
  if (kind) await expect(page.locator(".kinds li")).toHaveText([kind].flat().map((k) => `${k}1`));
  await expect(page.locator(".pass p")).toHaveText(passMark);
  await expect.poll(() => sent.length, { message: "rounds the record kept" }).toBe(1);
  await expect(page.locator(".sendline")).toHaveText("Sent to your progress record.");
  await checkLayout(page);
}

// ---------------------------------------------------------------------------

for (const id of ["L1", "L2", "L3", "L4", "L5"]) {
  test(`3.1.1 ${id}: right answers, then "${READ[id]!.told}"`, async ({ page }) => {
    const ex = READ[id]!;
    const { errors, sent } = await start(page, "3.1.1", questionFacts(ex.q), id);
    const seen = { example: false };
    for (let i = 0; i < 10; i++) {
      await expect(questionTile(page, i + 1, 10)).toBeVisible();
      if (i === 0) {
        await expect(page.locator(".board")).toHaveCount(id === "L5" ? 0 : 1);
        // No board: a Reveal board button, never the keypad or a text box.
        await expect(revealButton(page)).toHaveCount(id === "L5" ? 1 : 0);
        await expect(keypad(page)).toHaveCount(0);
        await expect(textBox(page)).toHaveCount(0);
        await checkLayout(page);
      }
      await readOne(page, id === "L5", ex, seen);
      if (i === 0) await checkLayout(page);
      await next(page);
    }
    expect(seen.example, "the example came back").toBe(true);
    await scoreShows(page, sent, 9, 10, READ_KIND[id]!, "Pass mark for 3.1.1 L1 to L6: the right answers in one round. My practice sets it.");
    expect(errors).toEqual([]);
  });
}

test(`3.1.1 L6: right sequences, then the Najdorf's 3... cxd4 read from an old position`, async ({ page }) => {
  const najdorf = {
    start: toFen(startingPosition()),
    before: ["e4", "c5", "Nf3", "d6", "d4"],
    sans: ["cxd4", "Nxd4", "Nf6", "Nc3"],
    from: "From the Sicilian Defense, Najdorf Variation, after White's third move.",
  };
  const { errors, sent } = await start(page, "3.1.1", najdorf, "L6");
  let sawExample = false;
  for (let i = 0; i < 3; i++) {
    await expect(questionTile(page, i + 1, 3)).toBeVisible();
    const line = (await page.locator("h2.q").textContent())!;
    const example = line === "3... cxd4 4. Nxd4 Nf6 5. Nc3. Which squares does each move change?" && !sawExample;
    let last: Move | null = null;
    for (let k = 0; k < 4; k++) {
      const shown = await notes(page);
      expect(shown.at(-1)).toMatch(new RegExp(`^Move ${k + 1} of 4: `));
      const tag = shown.at(-1)!.match(/^Move \d of 4: (\d+)(\.\.\.|\.) (\S+)\.$/)!;
      let pos = held(fromWords(await words(page)), shown);
      pos = { ...pos, turn: tag[2] === "..." ? "black" : "white" };
      if (last && last.kind === "pawn" && Math.abs(Number(last.to[1]) - Number(last.from[1])) === 2) {
        pos = { ...pos, enPassant: `${last.to[0]}${(Number(last.to[1]) + Number(last.from[1])) / 2}` as Square };
      }
      const found = findMove(pos, tag[3]!);
      if (!("found" in found)) throw new Error(`No move ${tag[3]} in ${toFen(pos)}`);
      last = found.found;
      // Each move starts with no board, behind Reveal board.
      await expect(page.locator(".board")).toHaveCount(0);
      await expect(revealButton(page)).toHaveCount(1);
      if (i === 0 && k === 0) {
        await expect(keypad(page)).toHaveCount(0);
        await expect(textBox(page)).toHaveCount(0);
        await checkLayout(page);
      }
      await clickSquares(page, example && k === 0 ? ["c7", "d4"] : changes(found.found));
      if (k < 3) await expect(page.locator(".pbody .note-line").last()).toHaveText(new RegExp(`^Move ${k + 2} of 4: `));
    }
    if (example) {
      sawExample = true;
      await expect(told(page)).toHaveText(
        "No: 3... cxd4 is Black's pawn on c5 taking on d4: c5 and d4. That pawn left c7 at move 1. The other three moves were right.",
      );
    } else await expect(told(page)).toHaveText("Right: all 4 moves.");
    await next(page);
  }
  expect(sawExample, "the Najdorf came back").toBe(true);
  await scoreShows(page, sent, 2, 3, "A move read from an old position", "Pass mark for 3.1.1 L1 to L6: the right answers in one round. My practice sets it.");
  await expect(page.locator(".stats")).toContainText("Moves right11");
  await expect(page.locator(".stats")).toContainText("Moves asked12");
  expect(errors).toEqual([]);
});

// A whole round of 3.2.1 at one level: right answers, and the example's wrong one.
async function writeRound(page: Page, id: string, ex: Example & { kind: string | string[] }) {
  const { errors, sent } = await start(page, "3.2.1", questionFacts(ex.q), id);
  const seen = { example: false };
  for (let i = 0; i < 10; i++) {
    await expect(questionTile(page, i + 1, 10)).toBeVisible();
    if (i === 0) {
      // From L2, the move composer, never a text box.
      await expect(composer(page)).toHaveCount(id === "L1" ? 0 : 1);
      await expect(textBox(page)).toHaveCount(0);
      await checkLayout(page);
    }
    await writeOne(page, id === "L1" ? "choose" : id === "L5" ? "words" : "board", ex, seen);
    if (i === 0) await checkLayout(page);
    await next(page);
  }
  expect(seen.example, "the example came back").toBe(true);
  await scoreShows(page, sent, 9, 10, ex.kind, "Pass mark for 3.2.1 L1 to L5: the right answers in one round. My practice sets it.");
  expect(errors).toEqual([]);
}

for (const id of ["L1", "L2", "L3", "L4", "L5"]) {
  test(`3.2.1 ${id}: right answers, then ${WRITE[id]!.told ? `"${WRITE[id]!.told}"` : "a wrong choice, told by the judge"}`, async ({ page }) => {
    await writeRound(page, id, WRITE[id]!);
  });
}

// A capture written without its x is a wrong answer told on its own, never "not counted".
test("3.2.1 L4: a capture without its x is told, not skipped", async ({ page }) => {
  await writeRound(page, "L4", {
    q: question("White: king g1, queen d1, bishop c4, knight f3. Black: king g8, rook e8, pawns f7 and h7.", "c4", "f7"),
    wrong: "Bf7+",
    told: "No: it is Bxf7+. Your bishop captures on f7, so an x goes before the square.",
    kind: "A capture without its x",
    seat: "white",
  });
});

test("chapter 3's screen: one tree of both cards built and their levels, the whole path playable", async ({ page }) => {
  await noReload(page);
  const errors = consoleErrors(page);
  await fakeRecord(page);
  await openChapter(page, 3, "Notation");
  await checkTree(page, 3);
  // The whole path playable: a button for each of its 12 steps, 11 levels and the mixed round.
  await expect(page.locator(".lvbtn")).toHaveCount(12);
  await expect(page.locator(".lvbtn:disabled")).toHaveCount(0);
  await expect(page.locator(".tag", { hasText: "Coming" })).toHaveCount(0);
  await checkLayout(page);
  expect(errors).toEqual([]);
});

test("chapter 3's mixed round: 3.1.1 L5 and 3.2.1 L5 in turns, from the path", async ({ page }) => {
  await noReload(page);
  const errors = consoleErrors(page);
  const sent = await fakeRecord(page);
  await openChapter(page, 3, "Notation");
  await playMixedRound(page);
  const none = { example: false };
  for (let i = 0; i < 10; i++) {
    await expect(questionTile(page, i + 1, 10)).toBeVisible();
    // Turns: my opponent's move comes in, then mine goes out.
    const reading = i % 2 === 0;
    await expect(nowAt(page)).toHaveText(reading ? "3.1.1 L5" : "3.2.1 L5");
    if (reading) await readOne(page, true, null, none);
    else await writeOne(page, "words", null, none);
    if (i < 2) await checkLayout(page);
    await next(page);
  }
  await scoreShows(page, sent, 10, 10, null, "Pass mark for the mixed round: the right answers in one round, and in each challenge's five. My practice sets it.");
  await expect(page.locator(".kinds li")).toHaveText(["3.1.1 L55 of 5", "3.2.1 L55 of 5"]);
  expect(errors).toEqual([]);
});
