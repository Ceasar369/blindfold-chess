// 4.3.1 Italian Game: its three levels. The nine openings of 4.3 share their
// code, ../openings/, and differ in their definition alone.
//
// Source: code/blueprint/docs/position-memory.md, 4.3.1.

import { openingChallenge } from "../openings/challenge.ts";
import { openingByChallenge } from "../openings/definitions.ts";

export const challenge = openingChallenge(openingByChallenge("4.3.1"));
