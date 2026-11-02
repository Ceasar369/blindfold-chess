// 6.3.1's bot, behind its own door: a position and a strength go in, one
// legal move comes out. Any later bot fits the same door.
//
// Source: code/blueprint/building-blocks.md, "The bot"; blind-play.md,
// "The opponent".
//
// > Stand-in. The bot is js-chess-engine 2.4.6 (MIT), as the book picks it.
// > The weaker bot plays its level 2, the even bot its level 3, with a little
// > randomness, so its openings vary. Unproven: how strong either plays, and
// > that either plays like a person near 1000.
// > The randomness is 10, the engine's "very subtle variety": over 30 games
// > its first move was e4, d4, Nf3 or Nc3. At 30, it opened g4, h4 and a4,
// > as no person near 1000 does.

import { ai } from "js-chess-engine";
import { type Position, toFen } from "../../../positions/index.ts";
import { legalMoves, type Move, playLine } from "../../../rules/index.ts";
import type { Square } from "../../../shape/index.ts";

export type Strength = "weaker" | "even";

export type Bot = (pos: Position, strength: Strength) => Move;

export const LEVEL: Record<Strength, number> = { weaker: 2, even: 3 };
const RANDOMNESS = 10;

// js-chess-engine names a move as { "E2": "E4" }, and makes every pawn
// reaching the last rank a queen.
export const engineBot: Bot = (pos, strength) => {
  const legal = legalMoves(pos);
  const { move } = ai(toFen(pos), { level: LEVEL[strength], play: false, randomness: RANDOMNESS });
  const [from, to] = (Object.entries(move)[0] ?? []).map((s) => String(s).toLowerCase() as Square);
  const found = legal.find((m) => m.from === from && m.to === to && (m.promotion === null || m.promotion === "queen"));
  return found ?? legal[0]!;
};

// The door the card plays through: the engine bot, until another bot is put
// behind it.
export const door: { bot: Bot } = { bot: engineBot };

// A position's key for replaying: its pieces, whose move, castling, and the
// square a pawn may be taken in passing on.
const key = (pos: Position) => toFen(pos).split(" ").slice(0, 4).join(" ");

// A bot that replays games: in each position one of the games reached, it
// plays that game's next move. Its moves are a game's other player's.
export function replayBot(games: readonly { start: Position; sans: readonly string[] }[]): Bot {
  const next = new Map<string, string>();
  for (const g of games) {
    const { positions } = playLine(g.start, g.sans);
    [g.start, ...positions].forEach((pos, i) => {
      if (i < g.sans.length) next.set(key(pos), g.sans[i]!);
    });
  }
  return (pos) => {
    const san = next.get(key(pos));
    if (!san) throw new Error(`No game replayed reaches ${toFen(pos)}.`);
    return playLine(pos, [san]).moves[0]!;
  };
}
