// Block 7, Typed answers: no answer is typed now. Every input is a click, by
// the answer inputs' rule, mouse first. What stays: the file and rank words
// Notation still reads in a move's text, and the words "not counted".
//
// Source: code/blueprint/building-blocks.md, blocks 6, 7 and 17.

import type { File, Rank } from "../shape/index.ts";

export const NOT_COUNTED = "not counted";
export type NotCounted = typeof NOT_COUNTED;

// A file by its letter, its spoken name, or its word in the FIDE or NATO alphabet.
export const FILE_WORDS: Record<string, File> = {
  a: "a", ay: "a", anna: "a", alpha: "a", alfa: "a",
  b: "b", bee: "b", be: "b", bella: "b", bravo: "b",
  c: "c", see: "c", sea: "c", cesar: "c", charlie: "c",
  d: "d", dee: "d", david: "d", delta: "d",
  e: "e", ee: "e", eva: "e", echo: "e",
  f: "f", eff: "f", felix: "f", foxtrot: "f",
  g: "g", gee: "g", gustav: "g", golf: "g",
  h: "h", aitch: "h", hector: "h", hotel: "h",
};

// A rank by its digit, its word, or a sound-alike: won, to, too, for, ate.
export const RANK_WORDS: Record<string, Rank> = {
  "1": "1", one: "1", won: "1",
  "2": "2", two: "2", to: "2", too: "2",
  "3": "3", three: "3",
  "4": "4", four: "4", for: "4",
  "5": "5", five: "5",
  "6": "6", six: "6",
  "7": "7", seven: "7",
  "8": "8", eight: "8", ate: "8",
};
