// One opening's challenge, 4.3.1 to 4.3.9: its three levels, its round maker
// and the come-backs it asks. The nine share this code and differ in their
// definition alone (definitions.ts).
//
// Source: code/blueprint/docs/position-memory.md, 4.3.
//
// One checkpoint exercise a round, at every level. L1 is self-paced. L2 and L3
// have no deadline and no countdown: accuracy comes before speed. Every level
// is one question a round, so a result is kept under questions 1, and no result
// of the old 4.3.1, of 6 questions, shows under the new levels.
// > Stand-in. Pass marks for L2 and L3: my practice sets them. L1 has none.

import type { Challenge, Facts, Level } from "../../../shape/index.ts";
import { type Opening, OPENINGS } from "./definitions.ts";
import { teachOpening } from "./lesson.ts";
import { rebuildOpening } from "./rebuild.ts";

// The cards' level table, row by row: the same for every opening.
const TABLE = [
  { id: "L1", label: "learn the opening", first: "The name, then each move on the board", how: "Play each move, then rebuild it" },
  { id: "L2", label: "remember the position", first: "The name, and the position on a board, until I hide it", how: "Move the pieces" },
  { id: "L3", label: "recall by name", first: "The name only", how: "Move the pieces" },
] as const;

export function levelsOf(o: Opening): Level[] {
  return TABLE.map((row) => ({
    id: row.id,
    path: `${o.name}, ${row.label}.`,
    questions: 1,
    minutes: null,
    seconds: null,
    seat: null,
    passMark:
      row.id === "L1"
        ? `Pass mark for ${o.challenge} L1: none. The level ends when the guided reconstruction is right.`
        : `Pass mark for ${o.challenge} L2 and L3: the right answer in one round, and my look time at L2. My practice sets it.`,
    dials: [
      { name: "What I see first", value: row.first },
      { name: "How I answer", value: row.how },
    ],
  }));
}

// What a miss at L2 or L3 keeps: its opening and its level. A come-back stored
// by the old 4.3.1, with the opening's name and no level, is none of these.
function isHere(facts: Facts, o: Opening, level: Level): boolean {
  if (!facts || typeof facts !== "object" || Array.isArray(facts)) return false;
  return facts.opening === o.id && facts.level === level.id;
}

export function openingChallenge(o: Opening, all: readonly Opening[] = OPENINGS): Challenge {
  const levels = levelsOf(o);
  return {
    built: true,
    id: o.challenge,
    name: o.name,
    trains: `Knowing the ${o.name} position by heart, as the starting position and what moved.`,
    needs: "4.1.1 L1 and 4.2.1 L1.",
    levels,
    // The come-backs a round asks: this opening's, missed at its own level. L1 feeds none.
    asks(level, facts) {
      return level.id === "L1" ? [] : facts.back.filter((f) => isHere(f, o, level));
    },
    makeRound(level) {
      return [level.id === "L1" ? teachOpening(level, o) : rebuildOpening(level, o, all, level.id === "L2")];
    },
  };
}
