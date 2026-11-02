// Downloads Lichess's free files once, into scripts/.downloads/, which git
// ignores. A file already there is kept. All three are CC0.
//
// Source: code/blueprint/building-blocks.md, block 13 and "What it is built with".
//
// Run: node --experimental-strip-types scripts/download.ts

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, renameSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const DOWNLOADS = join(dirname(fileURLToPath(import.meta.url)), ".downloads");

export const FILES = {
  games: { name: "lichess_db_standard_rated_2013-01.pgn.zst", url: "https://database.lichess.org/standard/lichess_db_standard_rated_2013-01.pgn.zst" },
  puzzles: { name: "lichess_db_puzzle.csv.zst", url: "https://database.lichess.org/lichess_db_puzzle.csv.zst" },
  ...Object.fromEntries(
    ["a", "b", "c", "d", "e"].map((v) => [`openings-${v}`, { name: `${v}.tsv`, url: `https://raw.githubusercontent.com/lichess-org/chess-openings/master/${v}.tsv` }]),
  ),
} as Record<string, { name: string; url: string }>;

function download(name: string, url: string): void {
  const path = join(DOWNLOADS, name);
  if (existsSync(path)) {
    console.log(`kept ${name}, ${statSync(path).size} bytes`);
    return;
  }
  const part = `${path}.part`;
  const run = spawnSync("curl", ["-fsSL", "--retry", "3", "-o", part, url], { stdio: "inherit" });
  if (run.status !== 0) throw new Error(`curl failed for ${url}`);
  renameSync(part, path);
  console.log(`downloaded ${name}, ${statSync(path).size} bytes`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  mkdirSync(DOWNLOADS, { recursive: true });
  for (const { name, url } of Object.values(FILES)) download(name, url);
}
