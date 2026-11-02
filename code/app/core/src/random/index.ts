// Block 12, Random draws: a random source started from a seed, so one seed
// always gives one round. It picks, shuffles, and picks a square never on the
// last one's file or rank. It never knows a challenge's rules: each challenge
// hands them in.
//
// Source: code/blueprint/building-blocks.md, block 12.
//
// sfc32 and xmur3 are copied from bryc's PRNGs.md, public domain, MIT
// fallback: https://github.com/bryc/code/blob/master/jshash/PRNGs.md

import type { Random, Square } from "../shape/index.ts";
import { fileOf, rankOf, SQUARES } from "../squares/index.ts";

// xmur3: a string hash giving a new 32-bit value on each call.
function xmur3(str: string): () => number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}

// sfc32: a number from 0 up to, not including, 1.
function sfc32(a: number, b: number, c: number, d: number): () => number {
  return () => {
    a |= 0; b |= 0; c |= 0; d |= 0;
    const t = (((a + b) | 0) + d) | 0;
    d = (d + 1) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };
}

// A random source from a seed. One seed always gives the same draws.
export function seeded(seed: string): Random {
  const h = xmur3(seed);
  const float = sfc32(h(), h(), h(), h());
  const int = (n: number) => {
    if (!Number.isInteger(n) || n < 1) throw new Error(`Cannot draw from ${n} things.`);
    return Math.floor(float() * n);
  };
  return {
    float,
    int,
    pick<T>(items: readonly T[]): T {
      if (items.length === 0) throw new Error("Cannot pick from nothing.");
      return items[int(items.length)]!;
    },
    shuffle<T>(items: readonly T[]): T[] {
      const out = [...items];
      for (let i = out.length - 1; i > 0; i--) {
        const j = int(i + 1);
        [out[i], out[j]] = [out[j]!, out[i]!];
      }
      return out;
    },
  };
}

// True when two squares share no file and no rank.
export function apart(a: Square, b: Square): boolean {
  return fileOf(a) !== fileOf(b) && rankOf(a) !== rankOf(b);
}

// A square at random among `from`, never on the file or the rank of any square
// in `away`: the last one asked, and the next, when that one is already set.
export function squareAwayFrom(random: Random, away: readonly (Square | null)[], from: readonly Square[] = SQUARES): Square {
  const near = away.filter((s): s is Square => s !== null);
  const choices = from.filter((s) => near.every((n) => apart(s, n)));
  return random.pick(choices);
}

// A round of squares: `count` of them, never one on the file or the rank of the
// one before. Squares coming back take places among them, at random, apart
// from each other where the round has room. Each new square is drawn away from
// its neighbours, and, when `different`, from every square the round already
// holds, those coming back included.
export function roundOfSquares(random: Random, count: number, back: readonly Square[] = [], from: readonly Square[] = SQUARES, different = false): Square[] {
  const kept = back.slice(0, count);
  const slots: (Square | null)[] = Array.from({ length: count }, () => null);
  const room = 2 * kept.length - 1 <= count;
  const free = random.shuffle(Array.from({ length: count }, (_, i) => i));
  for (const square of kept) {
    const apartAt = free.findIndex((i) => room && slots[i - 1] == null && slots[i + 1] == null);
    const at = apartAt < 0 ? 0 : apartAt;
    slots[free[at]!] = square;
    free.splice(at, 1);
  }
  for (let i = 0; i < count; i++) {
    if (slots[i] !== null) continue;
    const left = different ? from.filter((s) => !slots.includes(s)) : from;
    slots[i] = squareAwayFrom(random, [slots[i - 1] ?? null, slots[i + 1] ?? null], left);
  }
  return slots as Square[];
}
