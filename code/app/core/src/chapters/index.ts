// The six chapters, in order. Each chapter fills its own folder: its
// chapter.ts lists its sections, its challenges and its path.
//
// Source: code/blueprint/building-blocks.md, "The app's folders".

import type { Challenge, Chapter } from "../shape/index.ts";
import { chapter as chapter1 } from "./1-board-coordinates/chapter.ts";
import { chapter as chapter2 } from "./2-piece-movement/chapter.ts";
import { chapter as chapter3 } from "./3-notation/chapter.ts";
import { chapter as chapter4 } from "./4-position-memory/chapter.ts";
import { chapter as chapter5 } from "./5-updating-a-position/chapter.ts";
import { chapter as chapter6 } from "./6-blind-play/chapter.ts";

export const CHAPTERS: Chapter[] = [chapter1, chapter2, chapter3, chapter4, chapter5, chapter6];

// Every challenge built so far, by id.
export function builtChallenges(): Map<string, Challenge> {
  const out = new Map<string, Challenge>();
  for (const ch of CHAPTERS) for (const s of ch.sections) for (const c of s.challenges) if (c.built) out.set(c.id, c);
  return out;
}
