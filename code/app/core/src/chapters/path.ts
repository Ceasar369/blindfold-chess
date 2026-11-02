// A path step from its line on a chapter's page, word for word:
// "1.1.1 L1 — Find the square, names on the edge."

import type { PathStep } from "../shape/index.ts";

export function levelStep(line: string): PathStep {
  const m = line.match(/^(\d\.\d\.\d) (L\d) — (.+)$/);
  if (!m) throw new Error(`Not a path line: ${line}`);
  return { kind: "level", challenge: m[1]!, level: m[2]!, words: m[3]! };
}
