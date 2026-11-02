// Block 14, the challenge shape: the one shape every challenge's code takes, so
// the runner plays any challenge. The core holds it, and the frontend reads it.
// It draws, stores and times nothing.
//
// Source: code/blueprint/building-blocks.md, block 14.
//
// A challenge makes a round's items. An item hands the runner one step at a
// time: Show, Ask, Told, then Done. The runner hands back what I did.
//
// > Stand-in. Moves and questions read aloud. Every challenge works in
// > silence. Every step's words are plain text, so a voice could read them
// > later without a new shape.

// ---------------------------------------------------------------------------
// Squares and pieces

export type File = "a" | "b" | "c" | "d" | "e" | "f" | "g" | "h";
export type Rank = "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8";
export type Square = `${File}${Rank}`;

export type Side = "white" | "black";
export type Kind = "king" | "queen" | "rook" | "bishop" | "knight" | "pawn";
export type Piece = { side: Side; kind: Kind };
export type Placed = Piece & { square: Square };

// What stands on a square: one of the 13 answers. null is Empty.
export type Stands = Piece | null;

// ---------------------------------------------------------------------------
// What the Board is handed

// seat: the side I play. The board faces White whichever side seat names, a1
// at my bottom left.
// names: the letters a to h and the numbers 1 to 8 along the edge.
// cells: a board that marks my answer square by square, 4.2.1's after each
// answer. A square with no cell is unmarked. A "missing" cell's piece is
// the right piece I left out, drawn ghosted on its square.
// arrows: an arrow over the board for each, from the square a piece leaves to
// the square it lands on, so that the two never look alike. 3.2.1 L1 to L4
// draw one for my move, two for castling; an opening lesson's moves too. A
// view with none, or with this field left out, draws as before.
// slide: the piece each arrow ends on slides in from where the arrow starts,
// as a lesson shows a move. A view that does not say it draws still.
export type BoardView = {
  seat: Side;
  names: boolean;
  pieces: Placed[];
  lit: Square[];
  cells?: Cell[];
  arrows?: Arrow[];
  slide?: boolean;
};

// One arrow: it starts on `from`, and its head points at `to`. It carries no
// label, and no word of what the move does.
export type Arrow = { from: Square; to: Square };

// How my answer stands on one square: "right", my piece is the right piece
// there; "wrong", my piece stands there but another piece belongs there;
// "extra", my piece stands where nothing belongs; "missing", a piece belongs
// there and I put none.
export type CellState = "right" | "wrong" | "extra" | "missing";
export type Cell = { square: Square; state: CellState };

// ---------------------------------------------------------------------------
// How I answer, and what an answer is

// One choice: its words on screen, and the value it carries. Two choices
// never share a value. A choice is judged by its value, never its words.
// stands: a choice that carries a piece, or Empty (null), is drawn as a piece
// card, its words kept as the card's name for a screen reader. 4.1.1's thirteen
// carry one. A choice that carries none is drawn as its words.
export type Choice = { words: string; value: string; stands?: Stands };

// The input an Ask takes.
// - click-one: one square. 1.1.1.
// - click-many: several squares, then Confirm; or the None button, when named.
//   reveal: the Ask shows no board; a Reveal board button shows this one to
//   click. 1.3.1 L3, and every level with no board of 2.1.1, 2.2.1, 2.3.1,
//   2.3.2 and 3.1.1.
// - click-route: squares in order, then Confirm, with Undo last. 2.1.2.
//   reveal: as click-many's. 2.1.2 L5.
// - choose: one of its choices.
// - keypad: a file a to h, then a rank 1 to 8, make a square, with no board.
//   many: "one", the square is the answer, two clicks: 1.1.2. "set", squares
//   add up, one tapped again comes off, then Confirm; "route", squares in
//   order, then Confirm: the trials page only. Undo last, and the None button
//   when named.
// - compose-move: a move built key by key, as it is written: K Q R B N, the
//   files, the ranks, x, =, + and #, both castlings. Its text is the answer.
//   hints: a button per hint, and its cost; resign: a Resign button, asked
//   twice. 6.3.1.
// - compose-position: the twelve pieces, each then a file and a rank, with no
//   board; a piece tapped in the list comes off. The trials page only.
// - place: the twelve pieces placed on the board shown; a placed piece
//   clicked again comes off. 4.2.1. reveal: as click-many's. 4.2.1 L6.
// - move: pieces moved and taken off the board shown, then Confirm; Reset
//   puts it back. Castling is the king and the rook moved by hand. 4.3, 5.2.1.
//   promotes: a pawn moved onto its last rank asks which piece it becomes,
//   Queen, Rook, Bishop or Knight, and becomes it. 5.2.1.
// - play-move: one move played on the board shown: a piece picked, then its
//   square. The move is the answer, with no Confirm. 4.3 L1, the lesson.
// Every input offers every value it could take, so none hints at the answer.
export type Input =
  | { how: "click-one" }
  | { how: "click-many"; none: string | null; reveal?: BoardView }
  | { how: "click-route"; reveal?: BoardView }
  | { how: "choose"; choices: Choice[] }
  | { how: "keypad"; many: "one" | "set" | "route"; none: string | null }
  | { how: "compose-move"; hints?: { hint: HintKind; cost: number }[]; resign?: boolean }
  | { how: "compose-position" }
  | { how: "place"; reveal?: BoardView }
  | { how: "move"; promotes?: boolean }
  | { how: "play-move" };

// 6.3.1's hints: what stands on a square, the last moves, the board.
export type HintKind = "square" | "last" | "board";

// Every input hands back one of these. A click on f3 and f, then 3, on the
// keypad reach the judge as the same square.
// - text: a move as written, built key by key.
// - hint, resign: 6.3.1's buttons.
// - move: one move played on the board, from its square to its square.
export type Answer =
  | { kind: "move"; from: Square; to: Square }
  | { kind: "squares"; squares: Square[] } // in the order given
  | { kind: "none" }
  | { kind: "choice"; value: string }
  | { kind: "stands"; stands: Stands }
  | { kind: "position"; pieces: Placed[] }
  | { kind: "text"; text: string }
  | { kind: "hint"; hint: "square"; square: Square }
  | { kind: "hint"; hint: "last" | "board" }
  | { kind: "resign" };

// What I did, as the runner hands it to the item.
// - press: a Show's button (Hide, Next, Continue, or a lesson's), or Continue on a Told.
// - answer: on an Ask.
// - timeout: an Ask's time limit ran out, or a Show ended on its own.
// - jump: a lesson's strip, or Replay: watch that move, the first being 0.
export type Did = { did: "press" } | { did: "answer"; answer: Answer } | { did: "timeout" } | { did: "jump"; to: number };

// ---------------------------------------------------------------------------
// Live facts the screen is handed

// A game's or an endgame's live count, on every step it gives (6.2.1, 6.3.1),
// so the header reads no text for it.
// - played: my moves played so far. A move refused, a move left unclear and a
//   hint are none. A step that asks my next move shows move played + 1.
// - allowed: the most moves the card allows to the goal, or null where it sets
//   none: a game.
// - illegal: my moves refused as illegal.
// - hints: my hint points left, of the level's budget; null where the level
//   gives no hint.
export type Tally = {
  played: number;
  allowed: number | null;
  illegal: number;
  hints: { left: number; of: number } | null;
};

// The king asked about, standing in check (2.3.2 L3 and L4, where a board shows): the
// square it stands on, and the pieces giving check, in square order.
export type Check = { king: Square; from: Placed[] };

// ---------------------------------------------------------------------------
// The four steps

// An opening's lesson (4.3 L1): what its screen draws besides the board.
// - line: the opening's moves, each as written with its number, "1. e4",
//   "1... e5", in order: the strip of moves, and the list kept in front of me.
// - at: the move on screen, the first being 0. The moves before it are ticked.
// - said: the line under the board, "Yes. 1. e4." or a correction in the exact
//   words. ok false is a correction: it counts by its kind and never fails the round.
// - guide: the arrows of the move asked, which Guide and Show the arrow draw.
// - watch: the move shown again, for Watch this move.
// - strip: the strip's moves are buttons, each to watch that move.
export type Lesson = {
  line: string[];
  at: number;
  said?: { ok: boolean; text: string };
  guide?: Arrow[];
  watch?: Show;
  strip?: boolean;
};

// What I look at until I press its button. It may end on its own after its
// seconds: 6.3.1's board hint, 5. Its time is counted as look time, or as
// time per move when it shows one move alone.
export type Show = {
  step: "show";
  board?: BoardView;
  words?: string; // a position or a list of moves, in words
  name?: string; // an opening's name
  move?: string; // one move alone, "2... d6"
  lines?: string[]; // other lines: where the position comes from
  question?: string; // the question this look is for: "Rebuild this position."
  lesson?: Lesson; // an opening's lesson: its strip and the lesson's own buttons
  button: "Hide" | "Next" | "Continue" | "Your turn" | "Start the reconstruction";
  seconds?: number;
  time: "look" | "move";
  // A list of moves shown whole, its time "move": the time counts once per
  // move, split evenly. 5.2.1 L1's 6 half-moves read in 30 seconds: 5 each.
  moves?: number;
  tally?: Tally; // a game's or an endgame's count
};

// The question. The board shown with it, or null for none. reopened: the same
// question stays open after an answer not counted or a move refused, with its
// note, and its clock runs on.
export type Ask = {
  step: "ask";
  question: string;
  board: BoardView | null;
  words?: string; // a position in words, on screen with the question
  notes: string[]; // "White's last move: f2 to f4.", "It becomes a queen."
  input: Input;
  seconds: number | null; // its time limit, or none
  note?: string; // "Not counted. The question stays open.", "Two of your rooks reach d1: say which."
  reopened: boolean;
  // "move": the answer is my own move, its time counted as time per move:
  // 6.2.1's and 6.3.1's. One question may ask several moves, Ask after Ask,
  // before its Told: its answer time runs from the first.
  time?: "move";
  tally?: Tally; // a game's or an endgame's count
  check?: Check; // a king question whose king stands in check, where a board shows: 2.3.2 L3 and L4
  lesson?: Lesson; // an opening's lesson: the move to play, and what its buttons show
};

// What one answer adds to the score: right or not, its mistake kinds, in the
// card's words, several when one answer shows several, and any count of its
// own, such as pieces right.
export type Score = {
  right: boolean;
  mistakes: string[];
  counts: Record<string, number>;
};

// What shows again with the told line. board: the position as it reached me,
// or 4.2.1's board of my own answer with its cells marked. notes: lines said after it, such as
// each slip of a game: "15. Bxe5 was not legal: ...". replay: a game shown
// again on a board, move by move.
export type Again = { board?: BoardView; words?: string; moves?: string; notes?: string[]; replay?: Replay };

// A game or an endgame shown again move by move: its first position, then each move's
// board, its words, "17. Qh6", and what is said at that move, each slip.
export type Replay = { move: string; board: BoardView; notes: string[] }[];

export type Told = {
  step: "told";
  verdict: "right" | "wrong" | "slow";
  line: string; // as the card's "After each answer" gives it
  again?: Again;
  score: Score;
  tally?: Tally; // a game's or an endgame's count, as it ended
  // The value of the right choice, where the input is a pick of choices: 4.1.1's
  // piece cards ring it after a wrong pick.
  rightChoice?: string;
};

// The item is over. back: its own facts, when it comes back, or null.
export type Done = { step: "done"; back: Facts | null };

export type Step = Show | Ask | Told | Done;

// ---------------------------------------------------------------------------
// Items

// What comes back: the item's own facts, enough to make it again. A square, a
// position, a puzzle's id, a line's move kind and half-move. Never a seed
// alone: a seed may give another question once a library changes.
export type Json = string | number | boolean | null | Json[] | { [key: string]: Json };
export type Facts = Json;

// One question, or several on one position, line or game. It gives its first
// step, then takes what I did and gives the next. questions: how many of its
// Told steps score, so a round can count the questions it holds.
// unasked: what the item adds to the round's counts when the minutes run out
// before it is told, besides its miss: 4.2.1's pieces, "its pieces count as
// left out".
export interface Item {
  readonly challenge: string; // "1.1.1"
  readonly level: string; // "L2"
  readonly questions: number;
  readonly unasked?: Readonly<Record<string, number>>;
  first(): Step;
  next(did: Did): Step;
}

// ---------------------------------------------------------------------------
// Challenges

// A random source started from a seed. Random draws, block 12, makes one.
export interface Random {
  float(): number; // in [0, 1)
  int(n: number): number; // 0 to n - 1
  pick<T>(items: readonly T[]): T;
  shuffle<T>(items: readonly T[]): T[];
}

// One column of a card's level table, word for word: "Names on the edge", "Yes".
export type Dial = { name: string; value: string };

// One row of a card's level table.
// seat: the side the level has me play. A side; "round", one side drawn for the
// round; "item", each item seats me itself, as 6.1.1's side to move; or null,
// no side drawn: a level with no board, and chapter 4, where the side changes
// nothing.
export type Level = {
  id: string; // "L2"
  path: string; // its words in the chapter's path: "Find the square, no names."
  questions: number; // per round
  minutes: number | null; // per round; null: it runs to its end
  seconds: number | null; // per question; null: none
  seat: Side | "round" | "item" | null;
  passMark: string; // the card's pass mark stand-in, word for word
  dials: Dial[];
};

// The round's facts.
// - side: the side the round seats me on, drawn once by Rounds where the
//   level's seat is "round", or the level's own side.
// - count: how many questions a mixed round wants; otherwise the level's.
// - back: what comes back, this challenge's facts, each to take a place
//   among the new questions.
// - packs: the files the challenge's `packs` names, read: a .json file as
//   its JSON, any other as its bytes.
export type RoundFacts = { side: Side; count?: number; back: Facts[]; packs?: Packs };

// Real-play packs and 6.2.1's tables, by their path under code/app/core/packs/:
// "lines.json", "endgames/queen.bin". Rounds fetches each one a challenge
// names when it first plays, and hands them in with the round's facts.
export type Packs = Readonly<Record<string, unknown>>;

export type RoundMaker = (level: Level, random: Random, facts: RoundFacts) => Item[];

export type Challenge = {
  built: true;
  id: string; // "1.1.1"
  name: string;
  trains: string;
  levels: Level[];
  makeRound: RoundMaker;
  packs?: readonly string[]; // the packs its rounds read, handed in as RoundFacts.packs
  // Which of facts.back its round maker asks in a round of this level: a
  // come-back loses one of its two rounds only in a round that asks it. A
  // challenge that leaves none out, and gives no `asks`, asks every one.
  asks?: (level: Level, facts: RoundFacts) => Facts[];
  // The side its round really seats me on, where a come-back decides it: 3.1.1
  // and 3.2.1 keep a question's side. The screen names this side, so it must
  // be right. A challenge that gives none keeps the side Rounds drew.
  seats?: (level: Level, facts: RoundFacts) => Side;
  // Its card's "It needs" line, word for word: "2.1.1 L3. From L5, 2.1.1
  // L4." The chapters page shows it inside the opened challenge,
  // above its levels; it locks nothing (building-blocks.md, block 15).
  needs?: string;
};

// A challenge listed on its chapter, its code not yet built.
export type Planned = { built: false; id: string; name: string; trains: string };

// ---------------------------------------------------------------------------
// Chapters

export type Section = {
  id: string; // "1.1"
  name: string;
  trains: string;
  challenges: (Challenge | Planned)[];
};

// One part of a mixed round: a challenge, its level, and how many questions.
// A level by side: where the round seats me as White, or as Black. A challenge
// may take several parts, one per level.
export type MixedPart = {
  challenge: string;
  level: string | { white: string; black: string };
  count: number;
};

// One step of a chapter's path: one challenge's level, or a mixed round.
// A mixed round's order: "random", or "turns", each part in turn.
// oneSide: one side, drawn at random, holds for the whole round. Otherwise
// each part keeps its own level's side.
export type PathStep =
  | { kind: "level"; challenge: string; level: string; words: string }
  | {
      kind: "mixed";
      words: string;
      parts: MixedPart[];
      order: "random" | "turns";
      oneSide: boolean;
      questions: number;
      minutes: number;
      passMark: string;
    };

export type Chapter = {
  n: number;
  name: string;
  trains: string;
  // Its page's "What it needs first", word for word, one line per item. The
  // chapters page shows it in its closed "About this chapter" block; it locks
  // nothing.
  needs?: string[];
  // Its page's "What I can do at the end", word for word, one line per
  // ability. The chapters page shows it in the same block, above what it
  // needs first.
  abilities?: string[];
  sections: Section[];
  path: PathStep[];
};

// > Stand-in. The one wording of a refusal: an answer not counted, such as a
// > move's text naming no move, and in a game a move refused as not legal. The
// > prototype's UNREAD (building-blocks.md, block 18). The pages say only that
// > the question stays open. A game has no question: its words say "move".
export const NOT_COUNTED = "Not counted. The question stays open.";
export const NOT_COUNTED_MOVE = "Not counted. The move stays open.";
