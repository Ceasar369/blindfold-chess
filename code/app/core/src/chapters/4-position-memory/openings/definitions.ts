// The nine openings of 4.3, one definition each: what is taught about an
// opening, apart from how a rebuild of it is judged (judge.ts).
//
// Source: code/blueprint/docs/position-memory.md, 4.3.
//
// A definition holds a stable id, its challenge's id, its name, its exact move
// list from the standard starting position, its teaching lines, its anchor and
// its fixed checkpoint id. The checkpoint's position is never written by hand:
// the rules play the move list, and every level of the opening uses that one
// position.
//
// > Stand-in. Whether the name is also read aloud. I answer it later, with
// > session 10. Every level plays in silence.

import { numberedLine } from "../../../notation/index.ts";
import { type Position, startingPosition } from "../../../positions/index.ts";
import { type Move, playLine } from "../../../rules/index.ts";
import { follow, type Thread } from "../../../thread/index.ts";

export type OpeningDef = {
  id: string; // "italian-game"
  challenge: string; // "4.3.1"
  name: string; // "Italian Game"
  sans: readonly string[]; // 1. e4 e5 2. Nf3 Nc6 3. Bc4, one entry per half-move
  // One entry per half-move: the teaching line that speaks of it, or null.
  // Each of the brief's sentences stands on the half-moves it names, once:
  // a pair of moves it names both of, a group of four on the first.
  teach: readonly (string | null)[];
  anchor: string; // what to hold: "White's bishop on c4"
  checkpoint: string; // the one position every level of the opening is about
};

const KNIGHTS = "Both sides develop knights.";

export const DEFINITIONS: readonly OpeningDef[] = [
  {
    id: "italian-game",
    challenge: "4.3.1",
    name: "Italian Game",
    sans: ["e4", "e5", "Nf3", "Nc6", "Bc4"],
    teach: ["White occupies the centre with e4.", null, KNIGHTS, KNIGHTS, "White's bishop reaches c4 and attacks f7."],
    anchor: "White's bishop on c4",
    checkpoint: "italian-game-3-bc4",
  },
  {
    id: "ruy-lopez",
    challenge: "4.3.2",
    name: "Ruy Lopez",
    sans: ["e4", "e5", "Nf3", "Nc6", "Bb5"],
    teach: [
      "The first four half-moves match the Italian Game.",
      null,
      null,
      null,
      "White's bishop reaches b5 instead of c4. It pressures Black's knight defending e5.",
    ],
    anchor: "White's bishop on b5",
    checkpoint: "ruy-lopez-3-bb5",
  },
  {
    id: "scotch-game",
    challenge: "4.3.3",
    name: "Scotch Game",
    sans: ["e4", "e5", "Nf3", "Nc6", "d4"],
    teach: [
      null,
      null,
      "Both knights develop as in the Italian.",
      "Both knights develop as in the Italian.",
      "White advances the d-pawn instead of developing the bishop. The pawn on d4 challenges Black's e5 pawn.",
    ],
    anchor: "White's pawn on d4",
    checkpoint: "scotch-game-3-d4",
  },
  {
    id: "queens-gambit",
    challenge: "4.3.4",
    name: "Queen's Gambit",
    sans: ["d4", "d5", "c4"],
    teach: [
      "Both sides occupy the centre with d-pawns.",
      "Both sides occupy the centre with d-pawns.",
      "White advances the c-pawn to c4. That pawn challenges Black's pawn on d5.",
    ],
    anchor: "White's pawns on d4 and c4",
    checkpoint: "queens-gambit-2-c4",
  },
  {
    id: "london-system",
    challenge: "4.3.5",
    name: "London System",
    sans: ["d4", "d5", "Nf3", "Nf6", "Bf4"],
    teach: [
      "Both sides advance their d-pawns.",
      "Both sides advance their d-pawns.",
      "Both kingside knights develop.",
      "Both kingside knights develop.",
      "White develops its c1 bishop to f4.",
    ],
    anchor: "White's bishop on f4",
    checkpoint: "london-system-3-bf4",
  },
  {
    id: "sicilian-defense",
    challenge: "4.3.6",
    name: "Sicilian Defense",
    sans: ["e4", "c5", "Nf3", "d6", "d4", "cxd4", "Nxd4"],
    teach: [
      null,
      "Black answers asymmetrically with ...c5.",
      null,
      null,
      "White challenges the centre with d4.",
      "Black captures White's d-pawn. The white d-pawn disappears.",
      "White's f3 knight recaptures on d4. The black c-pawn also disappears.",
    ],
    anchor: "White's knight on d4",
    checkpoint: "sicilian-defense-4-nxd4",
  },
  {
    id: "french-defense",
    challenge: "4.3.7",
    name: "French Defense",
    sans: ["e4", "e6", "d4", "d5"],
    teach: [
      "White builds a centre with e4 and d4.",
      "Black prepares ...d5 with ...e6.",
      "White builds a centre with e4 and d4.",
      "The central pawn structure defines this checkpoint.",
    ],
    anchor: "Black's pawn on e6",
    checkpoint: "french-defense-2-d5",
  },
  {
    id: "caro-kann-defense",
    challenge: "4.3.8",
    name: "Caro-Kann Defense",
    sans: ["e4", "c6", "d4", "d5"],
    teach: [
      "White establishes e4 and d4.",
      "Black prepares ...d5 using ...c6.",
      "White establishes e4 and d4.",
      "The c6 pawn supports Black's d5 pawn.",
    ],
    anchor: "Black's pawns on c6 and d5",
    checkpoint: "caro-kann-defense-2-d5",
  },
  {
    id: "slav-defense",
    challenge: "4.3.9",
    name: "Slav Defense",
    sans: ["d4", "d5", "c4", "c6"],
    teach: [
      null,
      null,
      "White plays the Queen's Gambit structure.",
      "Black answers with ...c6. Black's c6 pawn reinforces the d5 pawn.",
    ],
    anchor: "Black's pawns on c6 and d5",
    checkpoint: "slav-defense-2-c6",
  },
];

// A definition with what the rules make of its move list.
export type Opening = OpeningDef & {
  moves: Move[]; // the half-moves, played from the standard starting position
  positions: Position[]; // positions[k]: after k half-moves; positions[0] is the standard starting position
  thread: Thread; // every piece followed through the moves
  line: string; // "1. e4 e5 2. Nf3 Nc6 3. Bc4"
  final: Position; // the checkpoint's position
};

function made(def: OpeningDef): Opening {
  const start = startingPosition();
  const { moves, positions } = playLine(start, def.sans);
  if (def.teach.length !== def.sans.length) throw new Error(`${def.id} has ${def.teach.length} teaching entries for ${def.sans.length} half-moves.`);
  return { ...def, moves, positions: [start, ...positions], thread: follow(start, moves), line: numberedLine(start, moves), final: positions.at(-1)! };
}

export const OPENINGS: readonly Opening[] = DEFINITIONS.map(made);

export function openingByChallenge(challenge: string): Opening {
  const found = OPENINGS.find((o) => o.challenge === challenge);
  if (!found) throw new Error(`No opening for ${challenge}.`);
  return found;
}
