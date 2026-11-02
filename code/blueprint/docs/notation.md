# Chapter 3 — Notation

A move's written form, read and written: the squares a few letters change, and the letters a move of mine needs.

A level is one step of a challenge's difficulty: it sets each dial, such as the kinds of move asked or whether a board shows, to an exact value.

A round is one sitting at one level: a fixed number of questions, ending on my score, or sooner when its minutes run out.

## What I can do at the end

- I name every square a move in notation changes, from a position given in words: castling, promotion and a pawn taken in passing included. Every move my opponent makes in a blindfold game reaches me this way.
- I follow a real game's numbered moves, such as 3... cxd4 4. Nxd4 Nf6 5. Nc3, from its position in words, telling White's moves from Black's. Every game record and every line of moves I am given reads this way.
- I write any move of mine in notation, from a position given in words: its letter, a capture's file, castling, promotion, which of two pieces goes, and its check or mate sign. Every move I make in a blindfold game leaves me this way.

Unproven: that these drills make my blindfold play better. No study of notation training was found (my references, `drafts-and-science/what-it-means.md`). One player's first blindfold game held two illegal moves and several notation mistakes (`drafts-and-science/drafts/chesscom-blog-lpindar-my-first-real-blindfold-game.md`).

## What it needs first

These levels of chapters 1 and 2:

- 1.1.1 L2 — finding a square on a board with no names.
- 1.1.2 L2 — naming a square on the keypad, file then rank. Every move composer answer here holds squares.
- 2.1.1 L2 — a knight's squares. The position tells which knight a move names.
- 2.2.1 L2 — where a rook's, bishop's or queen's line stops. The same, for those pieces.
- 2.3.2 L1 — where a pawn may move. e4 can come from e2 or from e3.
- 2.3.1 L3 — who attacks a king's square. Writing + asks whether my move gives check.
- 2.3.2 L3 — where a checked king may go. Writing # asks whether it can go anywhere.
- 2.1.1 L4, 2.2.1 L4, 2.3.1 L5 and 2.3.2 L5 — the same four, with no board, before this chapter's no-board levels.

Each card names the levels it needs. No level needs chapter 2 finished.

## The sections

**3.1 — Reading moves.** From a move's notation to the squares it changes: one move, then a numbered sequence. 3.1.1 Read the move.

**3.2 — Writing moves.** From a move to its notation. 3.2.1 Write the move.

Reading and writing are two ways round, and each earns its own challenge. Reading answers in squares, writing in notation. Their mistakes differ: reading moves the wrong piece, writing leaves out what tells two pieces apart. A game asks both, every move: my opponent's move comes in, mine goes out.

**Notation, as this page uses it.** A move is shown in the PGN standard's form, the one Lichess's game files use (`notation-lookups/pgn-standard-san.md`, `content-and-progress/content/lichess-standard-games-database.md`). A move I write may also take FIDE's forms (`notation-lookups/fide-laws-of-chess-notation.md`), but for the x: a capture I write always carries it, where FIDE lets it go. Each rule, on a real case:

- **A move.** The piece's letter, then the square it lands on. K king, Q queen, R rook, B bishop, N knight. Nf3: a knight lands on f3. A pawn takes no letter: e4 (FIDE C.8, PGN 8.2.3.2).
- **Where it comes from.** The notation never says where a piece leaves from, unless two can go there. The position tells. White's knights on g1 and b1, and Nf3: only the one on g1 reaches f3 (my handoff, `02-learning-principles.md`: the origin may need the position).
- **A capture.** x before the square: Bxc6, the bishop takes what stands on c6. A pawn's capture names the file it leaves: exd5, the pawn on the e-file takes on d5 (FIDE C.9). FIDE makes the x optional, so Bc6 and ed5 are legal there. Here they are not: a capture is written as a capture.
- **Check and mate.** + after a move that gives check: Bxf7+. # after a move that mates: Re8#. Both positions sit in 3.2.1 (PGN 8.2.3.5).
- **Castling.** O-O, on the king's side. White's king goes from e1 to g1, and the rook from h1 to f1. O-O-O, on the queen's side: the king from e1 to c1, the rook from a1 to d1. Black's king and rooks do the same on the eighth rank: e8 to g8 with h8 to f8, or e8 to c8 with a8 to d8 (FIDE 3.8.2, C.13).
- **Promotion.** e8=Q. A pawn reaching the last rank becomes a queen, rook, bishop or knight of its colour, the player's choice, in the same move (FIDE 3.7.3.3). exd8=N: the pawn on the e-file takes on d8, and becomes a knight.
- **A pawn taken in passing.** In French, "en passant". Black's pawn goes from d7 to d5, past the square d6 that White's pawn on e5 attacks. On the very next move only, White's pawn may take it as if it had gone to d6: exd6. White's pawn lands on d6, and Black's pawn leaves d5 (FIDE 3.7.3.1 and 3.7.3.2). The PGN form adds nothing to it. FIDE allows "e.p." after it.
- **Two pieces told apart.** Disambiguation: when two of my pieces of one kind can reach one square, the move says which one goes. My knights on b1 and f3 both reach d2: Nbd2 names the one on the b-file. When they share a file, the rank: my rooks on a1 and a5, to a3, give R1a3 (FIDE C.10, PGN 8.2.3.4).
- **A pinned piece.** A pinned piece is held in place: moving it would expose its own king. It never needs telling apart. White: king e1, knights c3 and g1. Black: king g8, bishop b4. The knight on c3 is pinned, so a knight to e2 is Ne2 (PGN 8.2.3.4).
- **Move numbers.** 1. e4 c5 2. Nf3 d6: each number holds White's move, then Black's. A Black move with no White move before it takes three dots: 3... cxd4 is Black's third move (PGN 8.2.2). A half-move is one side's move: 1. e4 c5 holds two.

What this page leaves out:

- When castling is allowed: the king and that rook never moved, nothing between them, the king not in check, and no square it crosses or lands on attacked (FIDE 3.8.2). It is a rule of movement, not of notation, and a position never shows whether a king has moved. Every castling here is legal as given. No challenge here trains when castling is allowed, and no later page may assume it.
- The long form, Ng1f3, which FIDE also accepts (C.8). A challenge here never asks for it.
- The marks ! and ?.

**The side I sit on.** Each round gives me a side, White or Black, at random, and I keep it for the whole round, as in a game. 3.1.1 asks my opponent's moves, 3.2.1 my own. Where a board shows, it faces White, with a1 at my bottom left, whichever side I play. A move's notation is the same from either side. 3.1.1 L6 reads both sides' moves, as a game's record does.

**Moves read aloud.** Whether the app reads a move aloud waits for me: each card carries a stand-in at its question. Every level plays in silence. Masters recalled games heard as well as games seen: strong players only, and read second-hand (`drafts-and-science/science/campitelli-gobet-2005-minds-eye-blindfold.md`).

**From my outline's five draft sections** (my handoff, `03-curriculum-outline.md`):

- Piece labels and square notation — merged into both challenges' first levels. A square's name is chapter 1's 1.1.2. A piece's letter is one fact, met in every move from 3.1.1 L1.
- Ordinary SAN moves and pawn moves — kept, as both challenges' first level. SAN, Standard Algebraic Notation, is the notation this page uses.
- Captures and exchanges — merged: captures join both challenges at L2. An exchange, a capture and its recapture, comes in 3.1.1 L6's sequences, as real games play it.
- Castling, check, mate, promotions, and disambiguation — split across levels: castling, promotion and a pawn taken in passing at L3, telling two pieces apart at L4. Check and mate signs show in every move read, and are written from 3.2.1 L4.
- Interpreting spoken/written sequences in context — merged into 3.1.1 L6. A sequence differs from one move only in how many moves it holds. Spoken moves wait for me.

No graded notation course was found, and no drill for castling, promotion, disambiguation or check (`existing-courses-and-drills/by-chapter.md`). The levels here have nothing to copy.

## The challenges

### 3.1.1 — Read the move

**It trains.** Turning a move's notation into the squares it changes.

**It needs.** 1.1.1 L2, 2.1.1 L2, 2.2.1 L2 and 2.3.2 L1. From L5, 2.1.1 L4 and 2.2.1 L4.

**What I see.** At L1 to L4, a board with no names on its edge, and its pieces. Nothing is lit. The board faces White, and the round sets my side, White or Black. At L5 and L6, no board until I reveal an empty one: the position in words, which stays on screen, White's pieces first, each side's king first. At L6, the words are renewed after each move I answer. Before a pawn taken in passing, the move just played is named: "White's last move: f2 to f4."

**The question.** "Black plays Nd5. Which squares does it change?" At L6, a numbered sequence: "3... cxd4 4. Nxd4 Nf6 5. Nc3. Which squares does each move change?" A square changes when a piece leaves it, lands on it, or is taken from it.

> **Stand-in.** Whether the move is also read aloud. I answer it later, with session 10. Every level plays in silence.

**How I answer.** At L1 to L4, I click each square it changes, then confirm. At L5, I press "Reveal board", click each square on the empty board, then confirm. A square clicked again comes off. At L6, I answer each move in turn the same way: I confirm one move, the words show the position after it, and the next starts with no board again.

**What counts as right.** Exactly the squares the move changes: none missing, none extra. Their order never counts.

- A move or a capture changes 2: the square it leaves and the square it lands on. Nd5 from f6: f6 and d5.
- Castling changes 4: the king's two and the rook's two. Black's O-O-O: e8, c8, a8 and d8.
- A pawn taken in passing changes 3. Black's exf3 from e4: e4, f3, and f4, where White's pawn stood.
- A promotion changes 2. e8=Q from e7: e7 and e8.

At L6, a sequence is right when each of its moves is. No part credit: one square missed is a piece in the wrong place on the board in my head.

**Where its questions come from.** At L1 to L5, positions set up for the drill, never from real play: each kind of move comes as often as its level sets, and the position stays short enough to read in words. Each holds both kings and the level's count of other pieces, of both sides. The move is legal, and is my opponent's.

- L1: 10 moves without a capture: 3 pawn moves, and 7 moves of the other pieces, each kind at least once.
- L2: 5 captures, 2 of them by pawns, and 5 moves as at L1.
- L3: 2 castlings, one on each side; 2 promotions, one a capture; 2 pawns taken in passing; 2 captures; 2 moves without a capture.
- L4 and L5: 4 moves telling two pieces apart, 3 by the file and 1 by the rank; 1 castling; 1 promotion; 1 pawn taken in passing; 2 captures; 1 move without a capture.

In 7 of every 10 questions, another piece of the moving kind stands on the board. Where no two are told apart, it cannot go there, so only the position tells which one moves: e4 may come from e2 or from e3. Where two are told apart, it can, and the letter tells. No piece of the moving kind is pinned. The kings never stand side by side. Only the side to move may stand in check. No pawn stands on the first or the eighth rank. A castling king and its rook stand on their first squares, with nothing between.

At L6, sequences from real play: named openings' lines, from the Lichess opening list, and games from Lichess's game database, between players rated 1000 to 1500 (`content-and-progress/content/lichess-chess-openings.md`, `content-and-progress/content/lichess-standard-games-database.md`). Each sequence holds 4 half-moves, numbered as the game numbers them. 1 of each round's 3 starts at move 1. 2 start with a Black move, after White's move 3 to 15, with 16 to 30 pieces besides the kings.

Questions I missed take places among them.

**Levels.**

| Level | What I see | Where the position comes from | Moves asked | Moves per question | Pieces besides the kings | How I answer | Questions per round | Minutes per round |
|---|---|---|---|---|---|---|---|---|
| L1 | A board, every piece | Set up | Moves without a capture | 1 | 4 | Click | 10 | 3 |
| L2 | A board, every piece | Set up | Captures too | 1 | 6 | Click | 10 | 3 |
| L3 | A board, every piece | Set up | Castling, promotion and a pawn taken in passing too | 1 | 6 | Click | 10 | 3 |
| L4 | A board, every piece | Set up | Two pieces told apart too | 1 | 6 | Click | 10 | 3 |
| L5 | No board until I reveal it, the position in words | Set up | As at L4 | 1 | 6 | Click | 10 | 5 |
| L6 | No board until I reveal it, the position in words, renewed after each move | Real play | Any, as the game played them | 4 half-moves, numbered | 16 to 30 | Click | 3 | 5 |

One kind of move joins at each level, so a miss points at one rule. L6 moves two dials, real play and a sequence: its kinds of move, its piece count and its renewed words follow from them. Ten questions, as in chapter 2's position challenges: each asks me to read a whole position. No clock: castling changes four squares, a knight's move two. L6 holds 3 sequences, 12 moves to read, since a position of up to 30 pieces in words takes time. A sequence stops at 4 half-moves: the words hold the position for me, so a longer one only adds reading. Other trainers ask the same reading: a move in notation, played on the board (`github-trainers/pages/mattjliu--notation-trainer.md`, `existing-courses-and-drills/chessnotate.md`), or its square clicked (`existing-courses-and-drills/chesscom-vision-trainer.md`).

**Scoring.** One round counts my right answers out of 10, my average time per answer, and my mistakes by kind. At L6, it counts my right sequences out of 3, and my right moves out of 12. A question left when the minutes run out is a miss.

> **Stand-in.** Pass mark for 3.1.1 L1 to L6: the right answers in one round. My practice sets it.

**After each answer.** Each wrong answer says why: explanations helped more than "wrong" alone, in computer lessons at school and college (`drafts-and-science/science/van-der-kleij-2015-feedback-computer-meta-analysis.md`).

- Right: "Right: f6 and d5. The knight leaves f6 and lands on d5."
- Wrong, the knight that cannot go there: "No: Nd5 is the knight on f6: f6 and d5. The knight on b8 cannot reach d5."
- Wrong, the rook left out: "No: O-O-O moves Black's king from e8 to c8, and the rook from a8 to d8. You left out a8 and d8."
- Wrong, in a sequence: "No: 3... cxd4 is Black's pawn on c5 taking on d4: c5 and d4. That pawn left c7 at move 1. The other three moves were right."

**Mistakes it names.** One answer can show several. A wrong square takes the first kind it fits.

- A square left out: a8 and d8, for Black's O-O-O at L3. A forgotten piece, one of my handoff's five kinds (`02-learning-principles.md`).
- Chapter 1's five, against a square I left out. With f6 left out, for Nd5 at L1: e6, the file beside. f5, the rank beside. c3, the board turned: c3 sits in f6's place when I sit at the other side. c6, the files reversed. f3, the ranks reversed.
- A piece that cannot go there: b8, for Nd5 at L1. The knight on b8 never reaches d5. A move read wrongly, one of my handoff's five.
- The other of two that can: f3, for Nbd2 at L4. The b names the knight on b1. A move read wrongly.
- A piece of another kind: c3, White's knight, for exd5 at L2. A small letter names a pawn's file. A piece's letter is a capital. A wrong piece, one of my handoff's five.
- The other side's castling: g8, for Black's O-O-O at L3. O-O-O castles toward a8.
- A move read from an old position: c7, for 3... cxd4 at L6. The pawn left c7 at move 1. A sequence lost, one of my handoff's five.
- Another square: any other wrong one.

**What comes back.** A question I miss comes back once in each of my next two rounds holding this challenge: the same position, the same move. At L6, the same sequence.

**Examples.**

- **L1.** I sit as White. White: king g1, rook e1, pawn g2. Black: king g8, knights b8 and f6. "Black plays Nd5. Which squares does it change?" Right: I click f6 and d5, then confirm. Wrong: I click b8 and d5, and I am told "No: Nd5 is the knight on f6: f6 and d5. The knight on b8 cannot reach d5."
- **L2.** I sit as Black. White: king g1, knight c3, pawns d4 and e4. Black: king g8, knight f6, pawns c5 and d5. "White plays exd5. Which squares does it change?" Right: I click e4 and d5. Wrong: I click e4 and e5, and I am told "No: exd5 is the pawn on the e-file taking on d5: e4 and d5. e5 is the file beside d5."
- **L3.** I sit as White. White: king g1, queen b3, pawns f2 and g2. Black: king e8, rooks a8 and h8, pawn f7. "Black plays O-O-O. Which squares does it change?" Right: I click e8, c8, a8 and d8. Wrong: I click e8 and c8, and I am told "No: O-O-O moves Black's king from e8 to c8, and the rook from a8 to d8. You left out a8 and d8."
- **L4.** I sit as Black. White: king g1, knights b1 and f3, pawn e4. Black: king g8, rook e8, knight c6, pawn d6. "White plays Nbd2. Which squares does it change?" Right: I click b1 and d2. Wrong: I click f3 and d2, and I am told "No: Nbd2 is the knight on the b-file: b1 and d2. The knight on f3 reaches d2 too, so the move names its file."
- **L5.** I play White. No board. "White: king g1, rook d1, pawns f4 and g2. Black: king g8, rook d8, pawns e4 and h7." "White's last move: f2 to f4." "Black plays exf3. Which squares does it change?" Right: I press Reveal board, click e4, f3 and f4, then confirm. Wrong: I click e4 and f3, then confirm, and I am told "No: exf3 takes White's pawn on f4 in passing: e4, f3 and f4. You left out f4."
- **L6.** No board. From the Sicilian Defense, Najdorf Variation, after White's third move: "White: king e1, queen d1, rooks a1 and h1, bishops c1 and f1, knights b1 and f3, pawns a2, b2, c2, d4, e4, f2, g2 and h2. Black: king e8, queen d8, rooks a8 and h8, bishops c8 and f8, knights b8 and g8, pawns a7, b7, c5, d6, e7, f7, g7 and h7." "3... cxd4 4. Nxd4 Nf6 5. Nc3. Which squares does each move change?" Right: I press Reveal board, click c5 and d4, then confirm. Then f3 and d4, g8 and f6, and b1 and c3 the same way, the words renewed after each. Wrong: I click c7 and d4 for 3... cxd4, the other three right, and I am told "No: 3... cxd4 is Black's pawn on c5 taking on d4: c5 and d4. That pawn left c7 at move 1. The other three moves were right."

### 3.2.1 — Write the move

**It trains.** Writing a move of mine in notation.

**It needs.** 3.1.1 L1 and 1.1.2 L2. From L2, 3.1.1 L2. From L3, 3.1.1 L3. From L4, 3.1.1 L4, 2.3.1 L3 and 2.3.2 L3. From L5, 3.1.1 L5, 2.3.1 L5 and 2.3.2 L5.

**What I see.** At L1 to L4, a board with no names on its edge, its pieces, and two squares lit: the square my piece leaves and the square it lands on. In castling, they are the king's. An arrow runs from the one to the other, its head at the landing, so that the two never look alike, and the squares stay lit. In castling there are two arrows, the king's and the rook's. A promotion's arrow is the pawn's, and a pawn taken in passing has the capturing pawn's, none from the pawn taken. An arrow carries no label: it never shows a capture, a check or a mate. The board faces White, and the round sets my side, White or Black. A promotion names its piece: "It becomes a queen." Before a pawn taken in passing, the move just played is named: "Black's last move: d7 to d5." At L5, no board and so no arrow: the position in words, which stays on screen, and my move in words: "Your bishop goes from c4 to f7."

**The question.** "Write your move in notation."

> **Stand-in.** Whether the question is also read aloud. I answer it later, with session 10. Every level plays in silence.

**How I answer.** At L1, I pick one of four: the right one, and three wrong ones. A wrong one fails by its letter (Kf3, for Nf3; in a pawn's question Pe4, for e4, now and then), by its square (Ne3, the file beside; Ng1, the square it leaves; Nd5, a square the knight does not go to) or by both. The wrong ones change from question to question, so nothing among the four singles out the right one: no kind of mistake, letter, square or place in the list is always there. None carries an x or a sign, since L1 judges none. From L2, I build it on the move composer, key by key, as it is written. Its keys: K, Q, R, B, N, x, + and #; the files a to h; the ranks 1 to 8; O-O, O-O-O and =. Delete takes back the last key. Then I press Confirm. Every key is always on, so the keys hint at nothing.

**What counts as right.** The move, written by the rules under "The sections", in any of these forms:

- **The piece.** Its capital letter: K, Q, R, B, N.
- **A small b.** It is always the b-file: with my pawn on b2, "bxc3" is the pawn's capture. The composer shows B and b as two keys, so "bd3" is never the bishop's Bd3, and "B3" never the pawn's b3.
- **A pawn.** No letter.
- **A capture.** x before the square, always: "Bxc6", never "Bc6". A pawn's capture also names the file it leaves: "exd5", never "ed5" or "d5". The x said in words counts as the x: "bishop takes c6", "bishop captures c6". My rule is stricter than FIDE's, which makes the x optional (C.9). An answer that leaves the x out is wrong, and told so; it is never "not counted". Chapter 6 reads a move's shorthand on purpose, and keeps doing so.
- **Castling.** O-O or O-O-O.
- **Promotion.** The square, then the new piece: "e8=Q", or "e8Q" (FIDE's form, C.11).
- **A pawn taken in passing.** The capture it is: "exd6".
- **Two pieces told apart.** The file, when the file tells them apart. The rank, when they share a file. When they differ in both, the rank counts too: FIDE prefers the file, and allows the rank (C.10).
- **Check and mate.** Until L3, a sign is not judged: "Bb5" and "Bb5+" both count. From L4, + follows a check, # follows a mate, and no sign follows any other move. "++" counts as # too. FIDE makes the signs optional (C.13). They are asked here because writing one asks whether my move gives check, and a blindfold game hides the board that would show it.

Only the short form counts. A file, rank or square of departure beyond what tells two pieces apart is a miss: "Ngf3" and "Ng1f3", for Nf3. FIDE accepts the long form (C.8), but it skips what this challenge asks: whether a second piece can go there.

No part credit. An answer naming no move, such as "N", is not counted, and the question stays open. An answer naming another move, such as "Kf3" for my knight's move to f3, is a chess mistake, and counts as wrong.

**Where its questions come from.** Positions set up for the drill, as in 3.1.1, at each level's count of pieces and of each kind of move. The move is legal, and is mine. In 7 of every 10 questions, another of my pieces of the moving kind stands on the board. Up to L3, it cannot go there. A pawn's capture is the exception, at every level: another of my pawns may take on the same square, since a pawn's capture always names its file, and the file says which pawn takes. At L4 and L5, it can in the 4 questions telling two apart, and cannot in the other 3. At L4 and L5, 3 of each round's 10 moves give check, and 1 of those 3 gives mate. Any 3 of the 10 may be the ones: a move of any kind may give check, as chess allows, and a capture need not, nor a plain move mate. Castling and a pawn taken in passing may give check, and never mate here. The mate is a plain move, a capture, a promotion or a move telling two pieces apart, by any piece, on any rank, with the king mated on an edge square. Every check and mate is real: the position is legal, and the move is legal.

Questions I missed take places among them.

**Levels.**

| Level | What I see | Moves asked | Pieces besides the kings | Signs judged | How I answer | Questions per round | Minutes per round |
|---|---|---|---|---|---|---|---|
| L1 | A board, every piece, my move's squares lit, an arrow between them | Moves without a capture | 4 | No | Pick one of four | 10 | 2 |
| L2 | A board, every piece, my move's squares lit, an arrow between them | Captures too | 4 | No | Move composer | 10 | 3 |
| L3 | A board, every piece, my move's squares lit, an arrow between them | Castling, promotion and a pawn taken in passing too | 6 | No | Move composer | 10 | 3 |
| L4 | A board, every piece, my move's squares lit, an arrow between them | Two pieces told apart too | 6 | Yes | Move composer | 10 | 4 |
| L5 | No board, the position and my move in words | As at L4 | 6 | Yes | Move composer | 10 | 5 |

Each level's moves come as in 3.1.1 at the same level. Only L1 offers choices: writing an answer helped memory more than choosing one, in lab studies mostly on words (`drafts-and-science/science/rowland-2014-testing-effect-meta-analysis.md`). Its wrong choices follow another trainer's quiz: four choices, each a common mistake, each explained (`github-trainers/pages/checkmate-works--blindfold-chess.md`). Unlike that quiz's, they change every time: a choice drawn the same way each question would give the right one away. Signs join at L4, once the rest is sure, with a minute more to look for check. No clock: a move is written once it is seen whole.

**Scoring.** One round counts my right answers out of 10, my average time per answer, and my mistakes by kind. From L4, a missing or wrong sign makes the answer wrong. A question left when the minutes run out is a miss.

> **Stand-in.** Pass mark for 3.2.1 L1 to L5: the right answers in one round. My practice sets it.

**After each answer.**

- Right: "Right: Nf3."
- Wrong, the wrong letter: "No: it is Nf3. N is the knight. K is the king."
- Wrong, the other pawn named: "No: it is dxc4. Your pawn on d5 takes, and a pawn's capture names the file it leaves. bxc4 is the pawn on b5."
- Wrong, a pawn taken in passing. White: king g1, rook f1, pawns e5 and g2. Black: king g8, rook c8, pawns d5 and h7. Black's last move: d7 to d5. My pawn goes from e5 to d6, and I build exd5, then Confirm: "No: it is exd6. A pawn taken in passing is written where your pawn lands, d6. d5 is the rank beside."
- Wrong, a square that is no near miss and not the one it leaves: "No: it is Rb2. Your rook lands on b2."
- Wrong, the capture's x left out: "No: it is Bxf7+. Your bishop captures on f7, so an x goes before the square."
- Wrong, the sign left out: "No: it is Bxf7+. On f7, your bishop attacks Black's king on g8: that is check."

**Mistakes it names.** One answer can show several. A wrong square takes the first kind it fits.

- Chapter 1's five, on the square it lands on. With Nf3 right, at L1: Ne3 or Ng3, the file beside. Nf2 or Nf4, the rank beside. Nc6, the board turned. Nc3, the files reversed. Nf6, the ranks reversed.
- The wrong piece's letter: Kf3, for Nf3 at L1. A wrong piece, one of my handoff's five kinds (`02-learning-principles.md`).
- A letter on a pawn: Pe4, for e4 at L1, where a pawn's question now and then offers it. A pawn takes no letter.
- The square it leaves: Ng1, for Nf3 at L1. A move names where it lands.
- The other piece named: bxc4, for dxc4 at L2. Nfd2, for Nbd2, with my knights on b1 and f3.
- A pawn's capture without its file: xc4 or c4, for dxc4 at L2.
- A capture without its x: dc4, for dxc4 at L2. Bf7+, for Bxf7+ at L4. The piece, the square and the file are right; the x is missing. It shows when the square is right.
- A capture where nothing is taken: Nxf3, for Nf3 at L1. f3 is empty.
- The other side's castling: O-O, for O-O-O. White: king e1, rooks a1 and h1, pawns f2 and g2. Black: king g8, bishop g7, pawn f7. My king goes from e1 to c1.
- Castling written as a king move: Kc1, for O-O-O, in the same position.
- A promotion without its piece: b1, for b1=Q at L3.
- The wrong new piece: b1=N, for b1=Q at L3. The screen names the piece.
- What tells two apart, left out: Ra3 or Raa3, for R1a3 at L4. Both rooks stand on the a-file, so only the rank tells them apart.
- More than tells them apart: Ngf3 or Ng1f3, for Nf3 at L1, where no second knight reaches f3. Nb1d2, for Nbd2, where the file is enough.
- A check left unmarked: Bxf7, for Bxf7+ at L5.
- A sign where there is none: R1a3+, for R1a3 at L4. No king stands on the rook's lines.
- A mate written as check: Re8+, for Re8#. White: king g1, rook e1. Black: king g8, pawns f7, g7 and h7. Black's king has no square, and nothing can take or block the rook.
- Another move: any other wrong one, such as Nd5 for Nf3, or a promotion where there is none.

**What comes back.** A question I miss comes back once in each of my next two rounds holding this challenge: the same position, the same move.

**Examples.**

- **L1.** I sit as White. White: king e1, knights c3 and g1. Black: king e8, knight b8, pawn d7. g1 and f3 lit, with an arrow from g1 to f3. "Write your move in notation." The choices might be: Nf3, Kf3, Ng1, Bd5. Right: Nf3. Wrong: I pick Kf3, and I am told "No: it is Nf3. N is the knight. K is the king." The next round may ask the same move with Nf3, Nh4, Qf3, Nc2.
- **L2.** I sit as Black. White: king g1, knight f3, pawn c4. Black: king g8, pawns b5 and d5. d5 and c4 lit, with an arrow from d5 to c4, down the board. "Write your move in notation." Right: I build dxc4 on the move composer, then Confirm. Wrong: I build bxc4, then Confirm, and I am told "No: it is dxc4. Your pawn on d5 takes, and a pawn's capture names the file it leaves. bxc4 is the pawn on b5."
- **L3.** I sit as Black. White: king g1, bishop f1, pawns g2 and h2. Black: king g8, rook e8, pawns b2 and h7. b2 and b1 lit, with an arrow from b2 to b1. "It becomes a queen." "Write your move in notation." Right: I build b1=Q on the move composer, then Confirm. Wrong: I build b1, then Confirm, and I am told "No: it is b1=Q. A promotion names the piece the pawn becomes."
- **L4.** I sit as White. White: king g1, rooks a1 and a5, pawns f2 and g2. Black: king g8, pawns f7 and h7. a1 and a3 lit, with an arrow from a1 to a3. "Write your move in notation." Right: I build R1a3 on the move composer, then Confirm. Wrong: I build Ra3, then Confirm, and I am told "No: it is R1a3. Your rook on a5 reaches a3 too. Both stand on the a-file, so the rank tells them apart: 1."
- **L5.** I play White. No board. "White: king g1, queen d1, bishop c4, knight f3. Black: king g8, rook e8, pawns f7 and h7." "Your bishop goes from c4 to f7. Write your move in notation." Right: I build Bxf7+ on the move composer, then Confirm. Wrong: I build Bxf7, then Confirm, and I am told "No: it is Bxf7+. On f7, your bishop attacks Black's king on g8: that is check."

## The path

Each step is one level, in this order.

1. 3.1.1 L1 — Read the move, without captures.
2. 3.2.1 L1 — Write the move, from four choices.
3. 3.1.1 L2 — Read the move, captures too.
4. 3.2.1 L2 — Write the move, on the move composer, captures too.
5. 3.1.1 L3 — Read the move, castling, promotion and in passing too.
6. 3.2.1 L3 — Write the move, castling, promotion and in passing too.
7. 3.1.1 L4 — Read the move, two pieces told apart.
8. 3.2.1 L4 — Write the move, two pieces told apart, signs judged.
9. 3.1.1 L5 — Read the move, no board.
10. 3.2.1 L5 — Write the move, no board.
11. 3.1.1 L6 — Read a numbered sequence, no board.
12. The mixed round.

Each kind of move is read before it is written: recognise, then recall (my handoff, `02-learning-principles.md`).

**Step 12, the mixed round.** 10 questions, taking turns: 3.1.1 L5 reads my opponent's move, then 3.2.1 L5 writes mine, 5 of each. One side holds for the whole round, picked at random.

Each question is asked, timed and judged as at its own level. The round counts my right answers out of 10, and the right answers in each challenge's five. It runs 5 minutes at most.

It takes turns as a game does: my opponent's move comes in, then mine goes out. Mixing helped when the things mixed look alike, and lost to practising one at a time for words (`drafts-and-science/science/brunmair-richter-2019-interleaving-meta-analysis.md`). Notation is letters and squares, near words: unproven which way it goes here. The round is kept for a game's rhythm, not for a gain from mixing. 3.1.1 L6 stays out: a sequence is a record read, not a turn in a game.

> **Stand-in.** Pass mark for the mixed round: the right answers in one round, and in each challenge's five. My practice sets it.

Reaching it ends the chapter.

## Where it comes from

Every path sits under `/Users/ceasarhaddad/PERSO-PROJECTS/blindfold-chess-references/`.

My handoff, in `blindfold-chess-handoff/`:

- `02-learning-principles.md` — skill 3, its vocabulary, and the origin that may need the position; recognise before recall; revisit errors; the five mistake kinds.
- `03-curriculum-outline.md` — the five draft sections.
- `06-interaction-and-audio.md` — silent play.

My references:

- `notation-lookups/fide-laws-of-chess-notation.md` — the official notation: letters, captures, telling two pieces apart, promotion, castling, and the optional signs.
- `notation-lookups/pgn-standard-san.md` — the form chess sites write, move numbers, and pinned pieces never told apart.
- `piece-movement-lookups/fide-laws-of-chess-moves.md` — castling, a pawn taken in passing and promotion, as rules of movement.
- `existing-courses-and-drills/by-chapter.md` — the drills other trainers run for this chapter, and no graded notation course.
- `existing-courses-and-drills/chesscom-vision-trainer.md` — a move such as Qd3 shown, its square clicked.
- `existing-courses-and-drills/chessnotate.md` — a move read then played, and a move shown then written.
- `github-trainers/by-chapter.md` — the drills other trainers' code holds for this chapter.
- `github-trainers/pages/mattjliu--notation-trainer.md` — a move in notation, made on the board.
- `github-trainers/pages/checkmate-works--blindfold-chess.md` — four choices, each a common notation mistake, each explained.
- `content-and-progress/content/lichess-chess-openings.md` — named openings' lines, such as the Najdorf.
- `content-and-progress/content/lichess-standard-games-database.md` — real games, for 3.1.1 L6.
- `drafts-and-science/by-chapter.md` — what drafts and studies offer this chapter.
- `drafts-and-science/what-it-means.md` — no study of notation training.
- `drafts-and-science/drafts/chesscom-blog-lpindar-my-first-real-blindfold-game.md` — notation mistakes in a first blindfold game.
- `drafts-and-science/science/campitelli-gobet-2005-minds-eye-blindfold.md` — moves heard and seen, alike for masters.
- `drafts-and-science/science/rowland-2014-testing-effect-meta-analysis.md` — writing an answer beat choosing one.
- `drafts-and-science/science/brunmair-richter-2019-interleaving-meta-analysis.md` — mixing helps when the things mixed look alike, and lost for word lists.
- `drafts-and-science/science/van-der-kleij-2015-feedback-computer-meta-analysis.md` — explanations after a miss beat "wrong" alone.
