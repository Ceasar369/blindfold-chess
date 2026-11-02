// Makes the four real-play packs, once, on my Mac, from Lichess's free files
// in scripts/.downloads/ (scripts/download.ts fetches them). Writes packs/.
// Every pick is drawn from a seed, so the same files give the same packs.
//
// Source: code/blueprint/building-blocks.md, block 13. The filters follow the
// references' lookups: position-memory-lookups/lichess-games-2013-01-positions.md,
// updating-a-position-lookups/lichess-games-2013-01-sequences.md,
// blind-play-lookups/lichess-games-2013-01-blind-play.md and
// blind-play-lookups/lichess-puzzles-first-slice.md.
//
// Run: node --experimental-strip-types scripts/make-packs.ts

import { spawn } from "node:child_process";
import { readFileSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import { Chess } from "chess.js";
import {
  CAP, type AfterOpening, type EvenPosition, type FirstLine, type LinesPack, type MemoryPosition, type MidLine,
  type NamedLine, type Opening, type OpeningsPack, type PositionsPack, type Puzzle, type PuzzleKind, type PuzzlesPack,
} from "../src/packs/index.ts";
import { seeded } from "../src/random/index.ts";
import type { Random } from "../src/shape/index.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const DOWNLOADS = join(HERE, ".downloads");
const PACKS = join(HERE, "..", "packs");

// Up to CAP items, each one kept with an even chance: reservoir sampling.
class Sample<T> {
  items: T[] = [];
  seen = 0;
  random: Random;
  cap: number;
  constructor(random: Random, cap = CAP) {
    this.random = random;
    this.cap = cap;
  }
  offer(item: T): void {
    this.seen++;
    if (this.items.length < this.cap) this.items.push(item);
    else {
      const j = this.random.int(this.seen);
      if (j < this.cap) this.items[j] = item;
    }
  }
}

function lines(file: string): AsyncIterable<string> {
  const unzip = spawn("zstd", ["-dc", join(DOWNLOADS, file)], { stdio: ["ignore", "pipe", "inherit"] });
  return createInterface({ input: unzip.stdout, crlfDelay: Infinity });
}

const besidesOf = (fen: string) => fen.split(" ")[0]!.replace(/[^a-zA-Z]/g, "").length - 2;

// A move that takes a piece. chess.js's isCapture() leaves out a pawn taken
// in passing; its captured piece never does.
const takes = (m: { captured?: string }) => m.captured !== undefined;
const placementAndTurn = (fen: string) => fen.split(" ").slice(0, 2).join(" ");

// ---------------------------------------------------------------------------
// The openings: the Lichess list, and the 13 that 5.2.1 L3 starts from

const THIRTEEN: [string, string][] = [
  ["English Opening", "1. c4"],
  ["Queen's Gambit", "1. d4 d5 2. c4"],
  ["Queen's Gambit Declined", "1. d4 d5 2. c4 e6"],
  ["French Defense: Advance Variation", "1. e4 e6 2. d4 d5 3. e5"],
  ["Scotch Game", "1. e4 e5 2. Nf3 Nc6 3. d4"],
  ["Italian Game", "1. e4 e5 2. Nf3 Nc6 3. Bc4"],
  ["Ruy Lopez", "1. e4 e5 2. Nf3 Nc6 3. Bb5"],
  ["Four Knights Game", "1. e4 e5 2. Nf3 Nc6 3. Nc3 Nf6"],
  ["London System", "1. d4 Nf6 2. Nf3 g6 3. Bf4"],
  ["King's Indian Defense", "1. d4 Nf6 2. c4 g6 3. Nc3"],
  ["Caro-Kann Defense: Classical Variation", "1. e4 c6 2. d4 d5 3. Nd2 dxe4 4. Nxe4 Bf5"],
  ["Sicilian Defense: Najdorf Variation", "1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6"],
  ["Sicilian Defense: Dragon Variation", "1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 g6"],
];

const sansOf = (pgn: string) => pgn.split(/\s+/).filter((t) => t && !/^\d+\.+$/.test(t));

// A line's moves in chess.js's own written form, and the position after; null when not legal.
function replay(sans: string[]): { sans: string[]; fen: string; captures: boolean } | null {
  const chess = new Chess();
  let captures = false;
  try {
    for (const s of sans) captures = takes(chess.move(s)) || captures;
  } catch {
    return null;
  }
  return { sans: chess.history(), fen: chess.fen(), captures };
}

function makeOpenings(random: Random): { pack: OpeningsPack; notes: string[] } {
  const notes: string[] = [];
  const all: NamedLine[] = [];
  for (const v of ["a", "b", "c", "d", "e"]) {
    for (const row of readFileSync(join(DOWNLOADS, `${v}.tsv`), "utf8").split("\n").slice(1)) {
      const [eco, name, pgn] = row.split("\t");
      if (!eco || !name || !pgn) continue;
      const r = replay(sansOf(pgn));
      if (!r) notes.push(`opening list: ${name} does not replay`);
      else all.push({ eco, name, sans: r.sans });
    }
  }
  const list = new Sample<NamedLine>(random);
  for (const l of all) if (l.sans.length >= 4) list.offer(l);
  const thirteen: Opening[] = THIRTEEN.map(([name, pgn]) => {
    const r = replay(sansOf(pgn))!;
    const listed = all.find((l) => l.name === name && l.sans.join(" ") === r.sans.join(" "));
    if (!listed) notes.push(`The 13: ${name}, ${pgn}, is not a line of the Lichess list`);
    return { eco: listed?.eco ?? "", name, sans: r.sans, captures: r.captures, fen: r.fen };
  });
  notes.push(`opening list: ${all.length} lines replayed, ${list.seen} of 4 half-moves or more, ${list.items.length} kept`);
  return { pack: { list: list.items, thirteen }, notes };
}

// ---------------------------------------------------------------------------
// The games of January 2013

type Game = { headers: Record<string, string>; movetext: string };

async function* games(): AsyncGenerator<Game> {
  let headers: Record<string, string> = {};
  let movetext = "";
  for await (const line of lines("lichess_db_standard_rated_2013-01.pgn.zst")) {
    const tag = line.match(/^\[(\w+) "(.*)"\]$/);
    if (tag) {
      if (movetext) {
        yield { headers, movetext };
        headers = {};
        movetext = "";
      }
      headers[tag[1]!] = tag[2]!;
    } else if (line.trim()) movetext += ` ${line}`;
  }
  if (movetext) yield { headers, movetext };
}

// Players rated 1000 to 1500, 5 minutes or more each, ended normally.
function kept(h: Record<string, string>): boolean {
  const w = Number(h.WhiteElo);
  const b = Number(h.BlackElo);
  const base = Number((h.TimeControl ?? "-").split("+")[0]);
  return w >= 1000 && w <= 1500 && b >= 1000 && b <= 1500 && h.Termination === "Normal" && base >= 300;
}

function gameSans(movetext: string): string[] {
  return movetext
    .replace(/\{[^}]*\}/g, " ")
    .replace(/\$\d+/g, " ")
    .split(/\s+/)
    .filter((t) => t && !/^\d+\.+$/.test(t) && !/^(1-0|0-1|1\/2-1\/2|\*)$/.test(t))
    .map((t) => t.replace(/^\d+\.+/, ""));
}

// Each side's pieces besides the king, a bishop and a knight counted alike.
function even(fen: string): boolean {
  const board = fen.split(" ")[0]!;
  const count = (letters: string) => [...board].filter((c) => letters.includes(c)).length;
  return count("Q") === count("q") && count("R") === count("r") && count("BN") === count("bn") && count("P") === count("p");
}

async function makeFromGames(random: Random, openings: Opening[]): Promise<{ positions: PositionsPack; lines: LinesPack; notes: string[] }> {
  const memory = { 4: new Sample<MemoryPosition>(random), 7: new Sample<MemoryPosition>(random), 10: new Sample<MemoryPosition>(random) };
  const evenPositions = new Sample<EvenPosition>(random);
  const first = new Sample<FirstLine>(random);
  const mid = new Sample<MidLine>(random);
  const after = new Map(openings.map((o) => [o.name, new Sample<AfterOpening>(random)]));
  const targets = openings.map((o) => ({ name: o.name, key: placementAndTurn(o.fen) }));
  let all = 0;
  let filtered = 0;
  let unreadable = 0;
  for await (const { headers, movetext } of games()) {
    all++;
    if (!kept(headers)) continue;
    filtered++;
    const facts = { game: (headers.Site ?? "").split("/").pop() ?? "", white: Number(headers.WhiteElo), black: Number(headers.BlackElo) };
    const chess = new Chess();
    const sans = gameSans(movetext);
    const fens: string[] = [chess.fen()];
    const besides: number[] = [30];
    const moved: ("white" | "black")[] = [];
    try {
      for (const s of sans) {
        const m = chess.move(s);
        moved.push(m.color === "w" ? "white" : "black");
        fens.push(chess.fen());
        besides.push(besides[besides.length - 1]! - (takes(m) ? 1 : 0));
      }
    } catch {
      unreadable++;
      continue;
    }
    const history = chess.history();
    const plies = history.length;
    // A position right after the move that first leaves the count.
    for (const n of [4, 7, 10] as const) {
      const ply = besides.indexOf(n);
      if (ply > 0) {
        const fen = fens[ply]!;
        const side = moved[ply - 1]!;
        memory[n].offer({ ...facts, fen, besides: n, moveNumber: Number(fen.split(" ")[5]) - (side === "black" ? 1 : 0), moved: side });
      }
    }
    const six = besides.indexOf(6);
    if (six > 0) {
      const fen = fens[six]!;
      const [, , castling, ep] = fen.split(" ");
      const there = new Chess(fen);
      const canTake = there.moves({ verbose: true }).some(takes);
      if (even(fen) && castling === "-" && ep === "-" && !canTake) {
        const side = moved[six - 1]!;
        evenPositions.offer({ ...facts, fen, moveNumber: Number(fen.split(" ")[5]) - (side === "black" ? 1 : 0), moved: side });
      }
    }
    if (plies > 20) first.offer({ ...facts, sans: history.slice(0, 20), plies });
    // An opening's position and side to move, within the first 16 half-moves.
    for (let ply = 1; ply <= Math.min(16, plies); ply++) {
      const key = placementAndTurn(fens[ply]!);
      for (const t of targets) {
        if (t.key === key && plies >= ply + 7) after.get(t.name)!.offer({ ...facts, opening: t.name, reachedAt: ply, sans: history.slice(ply, ply + 6) });
      }
    }
    // 4 half-moves from a Black move after White's move 3 to 15.
    const starts: number[] = [];
    for (let m = 3; m <= 15; m++) {
      const before = 2 * m - 1; // half-moves played before Black's move m
      if (plies >= before + 4 && besides[before]! >= 16 && besides[before]! <= 30) starts.push(before);
    }
    if (starts.length) {
      const at = random.pick(starts);
      mid.offer({ ...facts, fen: fens[at]!, sans: history.slice(at, at + 4) });
    }
  }
  const notes = [
    `games: ${all} in the file, ${filtered} kept by the filter, ${unreadable} of them not replayed`,
    `positions: ${[4, 7, 10].map((n) => `${memory[n as 4].seen} reach ${n}`).join(", ")}; ${evenPositions.seen} even positions of 6`,
    `lines: ${first.seen} games go past 20 half-moves; ${mid.seen} hold a Black move after White's 3rd to 15th`,
    `after an opening: ${[...after].map(([name, s]) => `${name} ${s.seen}`).join(", ")}`,
  ];
  return {
    positions: { memory: [...memory[4].items, ...memory[7].items, ...memory[10].items], even: evenPositions.items },
    lines: { first: first.items, afterOpening: [...after.values()].flatMap((s) => s.items), mid: mid.items },
    notes,
  };
}

// ---------------------------------------------------------------------------
// The puzzles rated under 1000

function kindOf(themes: string[], moves: number): PuzzleKind | null {
  if (themes.includes("mateIn1") && moves === 2) return "mate in one";
  if (themes.includes("mateIn2") && moves === 4) return "mate in two";
  if (themes.includes("fork") && moves === 4) return "fork";
  return null;
}

// Replays a puzzle: every move legal, a mate ending a mate, and the position I
// see, after my opponent's move, allowing no castling and no pawn taken in passing.
function sound(p: Puzzle): boolean {
  try {
    const chess = new Chess(p.fen);
    p.moves.forEach((uci, i) => {
      chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
      if (i === 0) {
        const [, , castling, ep] = chess.fen().split(" ");
        if (castling !== "-" || ep !== "-") throw new Error("castling or in passing");
      }
    });
    return p.kind === "fork" || chess.isCheckmate();
  } catch {
    return false;
  }
}

async function makePuzzles(random: Random): Promise<{ pack: PuzzlesPack; notes: string[] }> {
  const buckets = new Map<string, Sample<Puzzle>>();
  let all = 0;
  let easy = 0;
  for await (const line of lines("lichess_db_puzzle.csv.zst")) {
    if (line.startsWith("PuzzleId")) continue;
    all++;
    const [id, fen, moves, rating, , , , themes] = line.split(",");
    if (!id || !fen || !moves || Number(rating) >= 1000) continue;
    easy++;
    const [, , castling, ep] = fen.split(" ");
    if (castling !== "-" || ep !== "-") continue;
    const uci = moves.split(" ");
    const kind = kindOf((themes ?? "").split(" "), uci.length);
    if (!kind) continue;
    const besides = besidesOf(fen);
    const key = `${kind}|${besides <= 7 ? "7 or fewer" : "more than 7"}`;
    if (!buckets.has(key)) buckets.set(key, new Sample<Puzzle>(random));
    buckets.get(key)!.offer({ id, rating: Number(rating), kind, fen, moves: uci, besides });
  }
  const notes = [`puzzles: ${all} in the file, ${easy} rated under 1000`];
  const kept: Puzzle[] = [];
  for (const [key, s] of [...buckets].sort()) {
    const good = s.items.filter(sound);
    notes.push(`${key}: ${s.seen} pass the filter, ${s.items.length} drawn, ${good.length} replayed sound`);
    kept.push(...good);
  }
  return { pack: { puzzles: kept }, notes };
}

// ---------------------------------------------------------------------------

function write(name: string, pack: unknown): string {
  const path = join(PACKS, `${name}.json`);
  writeFileSync(path, JSON.stringify(pack));
  return `${name}.json: ${statSync(path).size} bytes`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  mkdirSync(PACKS, { recursive: true });
  const random = seeded("blindfold-chess packs, 2013-01");
  const openings = makeOpenings(random);
  const fromGames = await makeFromGames(random, openings.pack.thirteen);
  const puzzles = await makePuzzles(random);
  const sizes = [
    write("positions", fromGames.positions),
    write("lines", fromGames.lines),
    write("openings", openings.pack),
    write("puzzles", puzzles.pack),
  ];
  for (const note of [...openings.notes, ...fromGames.notes, ...puzzles.notes, ...sizes]) console.log(note);
}
