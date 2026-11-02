// 6.3.1's examples: six real Lichess games of January 2013, each move the
// card gives, and the line its wrong example plays where the game goes
// another way. The core's tests play them; the dev server replays one
// behind the bot's door, at /?replay=<game>, for the browser's tests.
//
// Source: code/blueprint/docs/blind-play.md, 6.3.1's examples;
// blind-play-lookups/lichess-games-2013-01-blind-play.md.

import { fromFen, type Position, startingPosition } from "../../../positions/index.ts";
import type { Side } from "../../../shape/index.ts";
import { door, replayBot } from "./bot.ts";

export type ExampleGame = {
  level: string;
  game: string;
  me: Side;
  start: Position;
  right: string[]; // every move of the right line, both sides', from the start
  wrong: string[]; // the wrong example's line, where it goes another way
};

const line = (moves: string) => moves.replace(/\d+\.(\.\.)?/g, " ").trim().split(/\s+/);

const L5 = "e4 c5 f4 d6 c4 Nf6 d3 Nc6 Nf3 g6 Be2 Bh6 O-O Nh5 g3 Bg7 Nc3 Bd4+ Nxd4 Nxd4 Nd5 O-O Bxh5 gxh5 Qxh5 Kh8 f5 e6 Bg5 Qe8 Bf6+ Kg8";

export const EXAMPLE_GAMES: ExampleGame[] = [
  {
    level: "L1",
    game: "bee1mrsw",
    me: "white",
    start: fromFen("8/8/1P1R4/6p1/2P4p/1K3k2/7r/8 w - - 0 46"),
    right: line("46. b7 g4 47. b8=Q Kg3 48. Rd3+ Kg2 49. Qb7+ Kf1 50. Qf7+ Rf2 51. Qe6 g3 52. Rd1+ Kg2 53. Qe4+ Rf3+ 54. Kb4 h3 55. Qe2+ Rf2 56. Qe4+ Kh2 57. Qh1#"),
    wrong: [],
  },
  {
    level: "L2",
    game: "hamanitw",
    me: "white",
    start: fromFen("8/2R5/1KP5/3k2pp/8/6P1/5r2/8 w - - 0 48"),
    right: line(
      "48. Rd7+ Ke6 49. Rd3 Rb2+ 50. Kc7 h4 51. Rc3 h3 52. Kd8 h2 53. c7 Rd2+ 54. Ke8 h1=Q 55. c8=Q+ Ke5 56. Re3+ Kd4 57. Qc3+ Kd5 58. Qxd2+ Kc6 59. Rc3+ Kb5 60. Qb2+ Ka4 61. Ra3#",
    ),
    wrong: [],
  },
  {
    level: "L3",
    game: "0i9idrki",
    me: "white",
    start: startingPosition(),
    right: line(
      "1. e4 e5 2. Nf3 Nc6 3. Bb5 d6 4. c3 a6 5. Ba4 b5 6. Bb3 Bb7 7. O-O b4 8. d4 bxc3 9. bxc3 exd4 10. cxd4 Qf6 11. Re1 h6 12. Bb2 Qg6 13. Ba4 Be7 14. e5 dxe5 15. Nxe5 Qd6 16. Qe2 Nf6 17. Bxc6+ Bxc6 18. Nxc6 Qxc6 19. Qxe7#",
    ),
    wrong: [],
  },
  {
    level: "L4",
    game: "3okbf6cj",
    me: "black",
    start: startingPosition(),
    right: line(
      "1. e4 c5 2. Nc3 Nf6 3. Bc4 e6 4. Nf3 b6 5. d3 Bb7 6. Bg5 Be7 7. O-O O-O 8. Ne5 Nxe4 9. Bxe7 Qxe7 10. dxe4 Nc6 11. Nxc6 Bxc6 12. Bb3 Rad8 13. Qe2 d5 14. exd5 Bb7 15. dxe6 Qg5 16. exf7+ Rxf7 17. Bxf7+ Kf8 18. Bb3 Qxg2#",
    ),
    wrong: [],
  },
  {
    level: "L5",
    game: "xxys63o9",
    me: "white",
    start: startingPosition(),
    right: [...line(L5), "Qg5#"],
    wrong: [...line(L5), ...line("17. Qh6 Nxf5 18. exf5 exd5 19. Qg7#")],
  },
  {
    level: "L6",
    game: "5cu748v4",
    me: "black",
    start: startingPosition(),
    right: line(
      "1. e4 e5 2. d3 Nc6 3. Nf3 Nf6 4. a3 d5 5. exd5 Nxd5 6. Be2 Be6 7. O-O Be7 8. h3 O-O 9. Nc3 Nf6 10. Be3 Qd7 11. Qe1 Nd4 12. Bd1 Nxf3+ 13. Bxf3 c6 14. Rd1 Bd6 15. d4 e4 16. Bxe4 Bxh3 17. gxh3 Qxh3 18. Bg2 Qh2#",
    ),
    wrong: [],
  },
];

// Puts one example game's replay behind the bot's door: the bot then plays
// the game's other player's moves. false for a game no example holds.
export function useReplay(game: string): boolean {
  const ex = EXAMPLE_GAMES.find((g) => g.game === game);
  if (!ex) return false;
  door.bot = replayBot([ex.right, ex.wrong].filter((sans) => sans.length).map((sans) => ({ start: ex.start, sans })));
  return true;
}
