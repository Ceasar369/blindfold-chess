// The dev server alone, at /?replay=<game>: one of 6.3.1's example games
// replayed behind its bot's door, so the bot plays the game's other player's
// moves. No built site holds it. It reads the core by path, past
// src/core.ts, so the site's own door to the core holds nothing of it.

import { useReplay } from "@core/chapters/6-blind-play/6.3.1/examples.ts";

export function replay(game: string) {
  if (!useReplay(game)) throw new Error(`No example game ${game} to replay.`);
}
