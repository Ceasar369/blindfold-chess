# Building blocks

The book every session that builds Blindfold Chess reads first.

It names the app's building blocks, what each challenge takes from them, the order to build them in, the app's folders and ports, and what the app is built with.

It rests on the six chapter pages in `code/blueprint/docs/`, on my handoff, and on team 20's research. Every reference path below sits under `/Users/ceasarhaddad/PERSO-PROJECTS/blindfold-chess-references/`, unless it starts with `code/` or `knowledge/`.

## Words this book uses

The chapter pages' own words hold: chapter, section, challenge, level, round, question, dial, pass mark. A level is one step of a challenge's difficulty, setting each dial to an exact value. A round is one sitting at one level: a fixed number of questions, ending on my score. An id such as 1.1.1 is chapter 1, section 1, challenge 1. 1.1.1 L2 is its second level.

This book adds these:

- **A block.** One piece of the app that two or more challenges share. The board drawn on screen is one. A need only one challenge has is no block: it stays inside that challenge's own code. My handoff: "No speculative plugin system" (`blindfold-chess-handoff/05-architecture-principles.md`, Agreed).
- **A challenge's own code.** What only its card needs: its level table, its question maker, its judge, its mistake names, its told lines.
- **An item.** Everything one question needs on screen, from the first thing shown to the last told line. Most items hold one question. Some hold several: 4.1.1 shows one position, then asks five questions about it.
- **The core.** The chess, and every challenge's own code. It draws nothing, stores nothing, and runs in tests with no screen.
- **The frontend.** The website: rounds, screens, inputs, and the board drawn.
- **The backend.** The small server that keeps my one progress record.
- **A part.** One folder of `code/` that one session builds: a server, or a place where nothing runs (`knowledge/0010-playbook/0013-thinking/the-parts.md`).
- **A library.** Code someone else wrote, that the app takes in whole. chess.js, React and Vite are libraries. "What it is built with" says what each one does here.
- **A stand-in.** A marked pick where a ruling is missing. The work goes on around it.
- **Unproven.** A claim nothing has run yet.

## Where the app runs

My ruling: the app is deployed online, on Cloudflare's free plan, and runs on its own. I train on my computer or on my phone. Nothing is installed on either device. One progress record is shared by both.

The look I locked in, `code/app/frontend/src/board/Board.tsx` and `code/app/frontend/src/shell/styles.css`, must work and look good on my phone too.

A site anyone can load sends its code to anyone. Code under the GPL or AGPL would then force the whole app's source open (`reuse-digest/licenses.md`, "Read this first"). So every piece of code the app uses, in the browser and on the server, carries a license that forces nothing: MIT, BSD, Apache, ISC, or public domain. Where no such code meets a need, this book takes its own pick, marked as a stand-in.

## The four separations

My handoff's four Agreed separations (`blindfold-chess-handoff/05-architecture-principles.md`). Every block keeps to them.

1. **Board state apart from board drawing.** The Positions block holds where pieces stand. The Board block only draws what it is handed.
2. **Movement apart from legal moves.** The Reach block answers on any arrangement, with kings or none. The Rules block answers only on a legal position.
3. **A challenge apart from its questions.** A challenge's levels are data, copied from its card. Its round maker makes new questions each time.
4. **The way I answer apart from how it is scored.** Every input hands back the same kind of answer. A click on f3, and f then 3 on the keypad, reach the judge as the same square.

## The twenty-seven challenges, and what each needs

One line per card: what it shows, how I answer, how it is judged, where its questions come from, and what comes back. Then the blocks it uses, and what stays in its own code.

Every challenge also uses the challenge shape, Squares, Random draws, Rounds, the runner, the answer inputs, the progress record and the shell, so its line leaves them out.

**1.1.1 Find the square.** An empty board, the edge names at L1. One click. Right: the square named; too slow past 2 seconds at L3. Any square at random, never on the last one's file or rank, none twice in a round. A missed square comes back. Blocks: Near misses, Board.

**1.1.2 Name the square.** An empty board, one square lit. One of four at L1, the keypad from L2. Right: the lit square; too slow past 5 seconds at L3. Squares as 1.1.1, though one may come twice. Blocks: Near misses, Board. Its own: the four choices, a 2×2 block holding the lit square.

**1.2.1 Name the colour.** No board. Light or Dark. Right: the square's colour; too slow past 2 seconds at L2. Squares as 1.1.1, though one may come twice. Blocks: none beyond those. Its own: the sum line, "f is file 6, and 6 + 5 = 11 is odd".

**1.3.1 Name the squares between.** Two squares lit on an empty board at L1, nothing lit at L2, no board at L3 until Reveal board shows an empty one. Click several, then confirm, or "No diagonal". Right: exactly the squares between, as a set. Pairs 2 to 7 steps apart on a diagonal, or, 6 of every 20, a pair on no diagonal: moved a file off one, moved a rank off one, or two squares on one file or rank. A missed pair comes back. Blocks: Set grader, Board. Its own: the three kinds of pair on no diagonal, the line that says why by counting, and its four mistake kinds.

**2.1.1 Name the knight's squares.** A knight on an empty board at L1 and L2, an empty board at L3, no board at L4 and L5 until Reveal board shows an empty one. Click several. Right: every square it reaches, as a set; too slow past 15 seconds at L5. A knight on the centre 16 at L1, then on any square. The knight's square comes back. Blocks: Positions, Reach, Set grader, Near misses, Board.

**2.1.2 Find the knight's route.** My knight and its target at L1 and L2, with my two pawns too at L3, an empty board at L4, no board at L5 until Reveal board shows an empty one. Click each landing in order. Right: any shortest route, in order, landing on none of my pawns. Two squares a set number of knight moves apart, with two pawns in every question at L3 and in 4 of 8 at L4 and L5. The pair comes back, with its own pawns. Blocks: Positions, Reach, Near misses, Board. Its own: the shortest-route finder around pawns, the two pawns that each block a route the other leaves open, and the colour count line, "b1 is light and d4 dark, so the count is odd".

**2.2.1 Name what it attacks.** A set-up position, the piece lit, at L1 and L2; an empty board with only the piece's square lit at L3; no board at L4 until Reveal board shows an empty one. The position in words stays on screen at L3 and L4. Click pieces at L1 and L2, squares from L3, or None. Right: the enemy pieces its lines reach first, as a set. Set-up positions made to the card's rules. The same position and question come back. Blocks: Positions, Reach, Set grader, Near misses, Board. Its own: its set-up rules, and "a piece behind another".

**2.3.1 Name who attacks a square.** A set-up position, the square lit, at L1 to L3; an empty board with only the square lit at L4; no board at L5 until Reveal board shows an empty one. The position in words stays on screen at L4 and L5. Click pieces at L1 to L3, squares from L4, or None. Right: every piece of one side attacking the square, as a set. Set-up positions with 0 to 3 attackers and a decoy. The same position and question come back. Blocks: as 2.2.1. Its own: its set-up rules, "a pawn straight behind", "a blocked piece".

**2.3.2 Name where it may move.** A set-up position, the pawn or king lit, at L1 to L3; an empty board with only the piece's square lit at L4; no board at L5 until Reveal board shows an empty one. The position in words stays on screen at L4 and L5. Click squares, or None. Right: where it may legally move, as a set. Set-up positions, a king in check in 3 of 5 from L3, a pawn shielding its king one time in three from L3. The same position and question come back. Blocks: Positions, Reach, Rules, Set grader, Near misses, Board. Its own: its twelve mistake kinds.

**3.1.1 Read the move.** A board facing White at L1 to L4; the position in words at L5; words renewed after each move at L6; at L5 and L6, no board until Reveal board shows an empty one; the last move named before a pawn taken in passing. Click squares, move by move at L6. Right: the squares the move changes, as a set; at L6, each move. Set-up positions with a set mix of moves per round at L1 to L5; real lines of 4 half-moves at L6. The same position and move come back; at L6, the same line. Blocks: Positions, Rules, Notation, Reach, Set grader, Near misses, Thread finder, Real-play packs, Board. Its own: each level's mix of moves.

**3.2.1 Write the move.** A board, my move's two squares lit and an arrow from the one my piece leaves to the one it lands on (castling draws two, the king's and the rook's), at L1 to L4; the position and my move in words at L5, with no board and no arrow. One of four at L1, the move composer from L2. Right: the move's written form, a capture written with its x, its signs judged from L4, the short form only. Set-up positions, as 3.1.1. The same position and move come back. Blocks: Positions, Rules, Notation, Near misses, Board. Its own: the written-form judge, and its four choices.

**4.1.1 Name what stands there.** At L1 nothing to look at; from L2 a real position, on a board at L2 to L4 or in words at L5, until I hide it. Then each square lit on an empty board at L1 to L3, or only named at L4 and L5. One of 13 at every level, drawn as piece cards. Right: the side and the kind, or Empty. The starting position at L1; real positions after, five questions each. The position comes back mirrored. Blocks: Positions, Near misses, Real-play packs, Board. Its own: the five squares asked of a position.

**4.2.1 Rebuild the position.** A real position on a board at L1 to L3 and L6, or in words at L4 and L5, until I hide it; then an empty board, at L6 only once Reveal board shows it. Place pieces. Right: the whole position; each piece right also counts. After each answer, one board: my reconstruction, each cell marked right, wrong, extra or missing, a missing piece ghosted on its square. Real positions by piece count. A missed position comes back mirrored, at the level it was missed at. Blocks: Positions, Position grader, Near misses, Real-play packs, Board.

**4.3.1 to 4.3.9, the nine openings.** One challenge each, with the same three levels: the Italian Game, Ruy Lopez, Scotch Game, Queen's Gambit, London System, Sicilian Defense, French Defense, Caro-Kann Defense and Slav Defense. L1: the name, then each move of the line on its own, then played by me, then the whole line again from the starting position; it ends when that is right. L2: the name and its position, until I hide it. L3: the name only. Then a board in the starting position. Move pieces, and take pieces off. Right at L2 and L3: the whole position. One fixed position per opening, which its line makes. A miss at L2 or L3 comes back as itself, in the same opening at the same level. Blocks: Positions, Rules, Notation, Thread finder, Position grader, Near misses, Board. Its own: the nine definitions, the lesson, and the judge that tells a piece left at home by the move left out.

**5.1.1 Name what stands there now.** Each move alone, until I ask for the next; at each checkpoint, the square lit on an empty board at L1, or only named from L2. One of 13 at every level: the piece picker. Right: what stands after the last move. Real games' first 8, 12 or 20 half-moves. Another real line comes back, holding a move of the kind I lost. Blocks: Positions, Rules, Notation, Thread finder, Near misses, Real-play packs, Board. Its own: the checkpoints, and which squares they ask.

**5.2.1 Rebuild after the moves.** The whole list until I hide it at L1; each move alone from L2; an opening's name first at L3. Then a board in the starting position. Move pieces, and take pieces off. Right: the whole position; each changed square right also counts. Real games' first 6, 12 or 20 half-moves, or the 6 after an opening. Another real line comes back, as 5.1.1. Blocks: Positions, Rules, Notation, Thread finder, Position grader, Near misses, Real-play packs, Board. Its own: the earliest move where I lost the thread.

**6.1.1 Find the winning move.** A board after my opponent's move, its two squares lit, at L1 to L3; the position in words on screen at L4; in words until I hide them, then the move alone, at L5. One of four moves at L1, the move composer from L2. Right: the puzzle's move, or any mate where it mates; both moves in a two-move puzzle. Lichess puzzles rated under 1000. The puzzle comes back mirrored. Blocks: Positions, Rules, Notation, Reach, Near misses, Thread finder, Why a move is illegal, Real-play packs, Board. Its own: the four move choices, and my opponent's reply in a two-move puzzle.

**6.2.1 Play out the endgame.** A board renewed after each move at L1; words renewed at L2 and L4; words until I hide them, then each king move alone, at L3, L5 and L6. Moves on the move composer, one by one; the lone king replies. Right: the goal within twice the fewest moves; a stalemate or a piece left to the king ends it; an illegal move is refused, counted, and asked again. Set-up endgames, by their fewest moves. The endgame comes back mirrored. Blocks: Positions, Rules, Notation, Reach, Why a move is illegal, Board. Its own: the endgame tables, the lone king's defence, and the goal checks.

**6.3.1 Play the game.** Words renewed after each move at L1; words until I hide them, then each bot move alone, at L2; nothing, from the starting position, at L3 to L6. A move on the move composer, a hint's button, or Resign. Every legal move plays; an illegal or unclear move is refused and counted; the game ends as FIDE ends it. Real even positions of 6 pieces besides the kings at L1 and L2; the starting position after. At L1 and L2, the first position of a game I lose, or play with an illegal move, comes back mirrored. Blocks: Positions, Rules, Notation, Reach, Thread finder, Why a move is illegal, Real-play packs, Board. Its own: the bot, the hints and their points, resigning, and the game shown again with its slips.

**The three mixed rounds.** Chapter 1's step 12: 23 questions, 4 of 1.1.1, 4 of 1.1.2, 7 of 1.2.1 and 8 of 1.3.1, spread over each challenge's levels. A challenge's levels are parts of its own, drawn apart, and its come-backs go to its parts in turn. Chapter 2's step 25: 12 questions, 3 each of 2.1.1 L5, 2.2.1 L4, 2.3.1 L5 and 2.3.2 L5. Chapter 3's step 12: 10 questions taking turns, 3.1.1 L5 then 3.2.1 L5, one side for the round. Each question is asked, timed and judged as at its own level, and each challenge's share is counted. Rounds makes them from the challenges' own round makers.

### Two cards, one answer, two ways

The same answer is judged differently by different cards. Each way belongs to the cards named.

- **A list of squares.** A set, where order never counts: 2.1.1, 2.2.1, 2.3.1, 2.3.2, 3.1.1. A route, where order counts and any shortest route is right: 2.1.2.
- **A written move.** Its written form, a capture written with its x, signs judged from L4, the short form only, a needless "Ngf3" a miss: 3.2.1. Which move it names, signs passed over, a move that could be two of mine refused and asked again: 6.1.1, 6.2.1, 6.3.1.
- **A move that is no move.** Wrong, ending the puzzle: 6.1.1. Refused, counted, and asked again: 6.2.1, 6.3.1.
- **A rebuilt position.** Each piece right, out of every piece: 4.2.1. Each square right, out of the squares that differ from the starting position: 5.2.1. Whole or not, nothing else: 4.3.1 to 4.3.9.
- **A wrong "what stands".** Chapter 1's five come first: 4.1.1. "An old square", what stood there before a move, comes first: 5.1.1.
- **A mate.** The puzzle's own move, or any move that mates where the puzzle's mates: 6.1.1 alone, both ways inside one card.

### Needs only one challenge has

Each stays in its challenge's own code, never a block.

- 1.2.1: the colour sum line.
- 1.3.1: the three kinds of pair on no diagonal, and the line that says why by counting.
- 2.1.2: the shortest knight route around pawns, the two pawns that each block a route the other leaves open, and the colour count line.
- 3.2.1: the written-form judge: a capture's x, signs from L4, the short form only.
- 4.1.1: three squares holding a piece, at least one a pawn, and two empty squares next to a piece.
- 5.1.1: the checkpoints.
- 6.1.1: the four move choices; my opponent's reply in a two-move puzzle.
- 6.2.1: the endgame tables, the lone king that defends perfectly, and its goal checks.
- 6.3.1: the bot, the hints and their budget, resigning, and the game shown again.

### Needs no library meets

Each is a block, or a challenge's own code, that we write. `reuse-digest/gaps.md` names them:

- B1, a grader naming wrong, missing and added pieces: the Position grader.
- B2, a permissive "what this piece attacks" with blockers: Reach.
- B4, a board that keeps a set of picked squares, and B5, a board a keyboard can reach: the Board and the answer inputs.
- B6, one layer turning clicks and choices into one answer: the answer inputs.
- B7, a runner and a grader for set answers: the runner, Rounds and the Set grader.
- B9, questions rebuilt from a seed: Random draws.
- B10 and A11, the "update a position" drill and the lost-sequence mistake: the Thread finder, and 5.1.1 and 5.2.1's own code.
- E2, lines of moves graded by length: Real-play packs.
- E3, endgames graded by difficulty: 6.2.1's own endgame tables.

## The blocks

Twenty blocks: fourteen in the core, five in the frontend, one in the backend. Each says what it does, every challenge using it, what goes in and what comes out, and what it never does.

### The core

#### 1. Squares

**Does.** The board's map, in names and numbers. A square's file, rank and colour. The squares between two squares on one file, rank or diagonal, or that they share none. A square mirrored a to h, as chapter 4 mirrors.

**Used by.** All twenty-seven: 1.1.1, 1.1.2, 1.2.1, 1.3.1, 2.1.1, 2.1.2, 2.2.1, 2.3.1, 2.3.2, 3.1.1, 3.2.1, 4.1.1, 4.2.1, 4.3.1 to 4.3.9, 5.1.1, 5.2.1, 6.1.1, 6.2.1, 6.3.1.

**In, out.** "f5" gives file f, rank 5, and light: f is file 6, and 6 + 5 = 11 is odd. c4 and f7 give d5 and e6. c4 and e7 give none.

**Never.** Knows a piece.

#### 2. Near misses

**Does.** Chapter 1's five near misses, in the pages' order: the file beside, the rank beside, the board turned, the files reversed, the ranks reversed. Given the right square and a wrong one, it names the first of the five that fits, or none. Given a square, it lists its near misses, for the choices of 3.2.1 L1.

**Used by.** 1.1.1, 1.1.2, 2.1.1, 2.1.2, 2.2.1, 2.3.1, 2.3.2, 3.1.1, 3.2.1, 4.1.1, 4.2.1, 4.3.1 to 4.3.9, 5.1.1, 5.2.1, 6.1.1.

**In, out.** f6, with e6 given: the file beside. With c3: the board turned. With c6: the files reversed. With f3: the ranks reversed (`code/blueprint/docs/board-coordinates.md`, 1.1.1).

**Never.** Decides which square was right, or pairs a wrong square with a missing one. The graders pair them.

#### 3. Positions

**Does.** Holds which piece stands on which square, and whose move it is, apart from any drawing. Makes the starting position. Writes a position in the pages' words: White first, each side's king first, then queen, rooks, bishops, knights and pawns, each kind's squares from the a-file on. Mirrors a position a to h. Counts the pieces besides the kings. Puts, takes off and moves a piece, as a hand does on a board. Names what stands on a square, as one of the 13 answers: White's or Black's king, queen, rook, bishop, knight or pawn, or Empty. It can also carry what only a legal game needs, castling rights and the square a pawn may be taken in passing on, for Rules to read.

**Used by.** 2.1.1 and 2.1.2 (a knight and pawns), 2.2.1, 2.3.1, 2.3.2, 3.1.1, 3.2.1, 4.1.1, 4.2.1, 4.3.1 to 4.3.9, 5.1.1, 5.2.1, 6.1.1, 6.2.1, 6.3.1.

**In, out.** A king on g1, a queen on e2 and pawns on e4 and f2 give "White: king g1, queen e2, pawns e4 and f2." Mirrored, a king on g1 goes to b1.

**Never.** Checks that a position is legal. Draws.

#### 4. Reach

**Does.** Where pieces go, on any arrangement, legal or not, with kings or none. The squares a piece reaches on an empty board. The squares it attacks, each line stopping at its first piece. Every piece of one side that attacks a square. The pieces standing between two squares on a line. "Attack" is the pages' word: a square where a piece could take an enemy piece (`code/blueprint/docs/piece-movement.md`, "Reach, attack, may move to").

**Used by.** 2.1.1, 2.1.2, 2.2.1, 2.3.1, 2.3.2, 3.1.1 (a piece that cannot go there), 6.1.1, 6.2.1 and 6.3.1 (through Why a move is illegal), and the set-up makers of Random draws.

**In, out.** A knight alone on e4 reaches c3, c5, d2, d6, f2, f6, g3 and g5. White's bishop on c4, with Black's pawn on f7 and king on g8, attacks f7 and not g8.

**Never.** Knows whose move it is, check, a pin, castling, or a pawn taken in passing. Calls a move legal.

#### 5. Rules

**Does.** The laws of chess, on a legal position with both kings. Lists the legal moves. Plays a move. Tells check, checkmate and stalemate. Tells a dead position, king against king among them. Tells a position's third appearance and 50 moves with no capture or pawn move, which draw at once in 6.3.1. Handles castling, a pawn taken in passing, and promotion. Lists the moves that mate at once.

**Used by.** 2.3.2, 3.1.1, 3.2.1, 5.1.1, 5.2.1, 6.1.1, 6.2.1, 6.3.1.

**In, out.** A legal position and a move give the new position, or "not legal". The position after 33. Rd8+ Ne8, with White to move, lists 34. Rxe8 among the moves that mate.

**Never.** Loads a position without both kings, or with a pawn on the first or eighth rank: the library under it crashes on one (`chess-rules-and-bots/pages/jhlywa--chess.js.md`, issue #577). Reads a move's text: Notation does.

#### 6. Notation

**Does.** A move's written forms. Writes a move as the pages show it, in the PGN standard's form: x, +, #, =, the letter that tells two of my pieces apart, and the move number, "3... cxd4". Names the squares a move changes: 2, or 4 for castling, or 3 for a pawn taken in passing. Names a move's kind: a move, a capture, castling, a pawn taken in passing, or a promotion. Names the arrows that show a move: one from where each piece that moves leaves to where it lands, so two for castling, the king's then the rook's, and none from a piece taken. Reads a move's text, as the move composer builds it. It still reads the spoken forms too, though no control sends them now: words, "takes", "check", "castles kingside", zeros for O's. A small b is always the b-file, and B always the bishop. Finds which legal move a move's text names, its signs passed over: one move; none; a move two of my pieces could make, "Two of your rooks reach d1: say which"; or a promotion without its piece.

**Used by.** 3.1.1, 3.2.1, 4.3.1 to 4.3.9, 5.1.1, 5.2.1, 6.1.1, 6.2.1, 6.3.1.

**In, out.** "bishop takes f7 check", in 3.2.1 L5's position, gives Bxf7+. Black's O-O-O changes e8, c8, a8 and d8.

**Never.** Judges 3.2.1's written form: that judge is 3.2.1's own. Decides whether a move is legal: Rules does.

#### 7. Typed answers

**Does.** No answer is typed now: every input is a click, by block 17's rule, mouse first. What stays is the words Notation still reads in a move's text: each file's spoken and alphabet names, each rank's words and sound-alikes, and the words "not counted". `code/app/core/src/typed-answers/index.ts`.

**Used by.** Notation alone.

**Never.** Reads an answer, or says right or wrong.

#### 8. Set grader

**Does.** Compares the set of squares I gave with the right set, order never counting. Names the squares I left out and the squares I added. Pairs each added square with a left-out one it is a near miss of, for Near misses to name.

**Used by.** 1.3.1, 2.1.1, 2.2.1, 2.3.1, 2.3.2, 3.1.1.

**In, out.** A knight on e4, with g4 given and g3 left out: wrong, g3 left out, g4 added, g4 paired with g3, the rank beside.

**Never.** Names a challenge's own mistake kinds: "a piece behind another" is 2.2.1's. Grades a route, where order counts: that is 2.1.2's own.

#### 9. Position grader

**Does.** Compares a position I built with the right one, square by square: right, left out, added, the wrong piece, the wrong side. Pairs a piece placed where it does not stand with a left-out piece of its kind and side. Finds two pieces swapped. Counts pieces right, as 4.2.1 does, and squares right among those that differ from the starting position, as 5.2.1 does. 4.2.1 also reads each square's verdict to mark its board after an answer.

**Used by.** 4.2.1, 4.3.1 to 4.3.9, 5.2.1.

**In, out.** 4.2.1 L1's position, with Black's rook on a1 for b1: "5 of 6", the rook paired with b1, the file beside. 4.2.1 L3's, with Black's rook and bishop swapped: "10 of 12", swapped.

**Never.** Names where I lost the thread: the Thread finder does.

#### 10. Thread finder

**Does.** Follows every piece through a run of moves from its first position, piece by piece. Says what stood on a square after any move, the last move that took a given piece off a square, and where a piece went and which move took it.

**Used by.** 3.1.1 (L6: a move read from an old position), 5.1.1, 5.2.1, 6.1.1 (L5: a move from before my opponent's), 6.3.1 (a piece not there).

**In, out.** In 1. e4 e5 2. Nf3 d6 3. d4 Nc6 4. dxe5 dxe5, "White's pawn" for e5 gives 4... dxe5 (`code/blueprint/docs/updating-a-position.md`).

**Never.** Decides a mistake's kind alone. Each challenge orders its own kinds.

#### 11. Why a move is illegal

**Does.** Names what made a move illegal, the first that fits: no such piece there, with the Thread finder's move when one took it; its line blocked, naming the piece between; my king left in check, or stepped next to the other king; castling not allowed, naming why; another reason.

**Used by.** 6.1.1 (a move that is no move), 6.2.1, 6.3.1.

**In, out.** "15. Bxe5 was not legal: your pawn on d4 stands between b2 and e5." "8... Kb5 would stand next to White's king on a5." (`code/blueprint/docs/blind-play.md`)

**Never.** Refuses the move: the challenge does. Its reason never shows before the endgame or game ends, where the page says so: the reason would show me the board.

#### 12. Random draws

**Does.** A random source started from a seed, so one seed always gives one round. Picks one at random, shuffles, and picks a square never on the last one's file or rank. Makes a set-up position to a challenge's rules: both kings, never side by side, the side not to move never in check, no pawn on the first or eighth rank, plus the challenge's own rules, drawn again until every rule holds.

**Used by.** All twenty-seven but the nine openings of 4.3, which draw nothing: each asks its one fixed position. Set-up positions: 2.1.2 (its pawn questions), 2.2.1, 2.3.1, 2.3.2, 3.1.1 (L1 to L5), 3.2.1, 6.2.1. The rest pick squares, or pick from Real-play packs.

**In, out.** A seed and a challenge's rules give a square, a pick, or a position.

**Never.** Knows a challenge's rules itself: each challenge hands them in.

#### 13. Real-play packs

**Does.** Small files of real chess, made once on my Mac from Lichess's free files, and served with the app. Four packs:

- **Positions.** From Lichess games of January 2013 between players rated 1000 to 1500, of 5 minutes or more each, that ended normally: the position right after the move that first leaves 4, 7 or 10 pieces besides the kings, for 4.1.1 and 4.2.1. And positions of 6 besides the kings, even sides, nothing to take at once, no castling, for 6.3.1 L1 and L2.
- **Lines.** From the same games: the first 6, 8, 12 and 20 half-moves, for 5.1.1 and 5.2.1. The 6 after one of the openings pack's 13, for 5.2.1 L3. 4 half-moves from move 1, or from a Black move after White's move 3 to 15, for 3.1.1 L6.
- **Openings.** The Lichess opening list's named lines, for 3.1.1 L6. 13 openings, for 5.2.1 L3. The nine openings of 4.3 read none of it: their lines are in their own code.
- **Puzzles.** Lichess puzzles rated under 1000: mates in one, mates in two, and two-move forks, none allowing castling or a pawn taken in passing, for 6.1.1.

Each item keeps what the feedback names: the game's players' ratings, its move number, a puzzle's id and rating.

**Used by.** 3.1.1, 4.1.1, 4.2.1, 5.1.1, 5.2.1, 6.1.1, 6.3.1.

**In, out.** A level's filter gives the items a round picks from.

**Never.** Reaches Lichess while I play.

> **Stand-in.** How many items each pack keeps: every item its filter keeps, up to 2,000 per kind and size. A cap keeps the files small for my phone. Unproven: each pack's size.

#### 14. The challenge shape

**Does.** The one shape every challenge's code takes, so the runner plays any challenge. The core holds it, and the frontend reads it.

- **A challenge.** Its id, name and what it trains. Its levels, one per row of its card's level table: the level's id ("L2"), its words in the chapter's path, its questions per round, minutes per round, seconds per question or none, its pass mark stand-in word for word, and its own dials. Its round maker: given a level, a random source and the round's facts, it makes the round's items. The round's facts: the side the round seats me on, how many questions a mixed round wants, and what comes back.
- **An item.** One question, or several on one position, line or game. It hands the runner one step at a time. It gives its first step, then takes what I did and gives the next. What I did is a press of a step's button, an answer, time running out, or, in an opening's lesson, a jump to watch one of its moves again, from its strip of moves or Replay.
- **A step.** One of four:
  - **Show.** What I look at until I press its button: a board, words, a name, or one move alone. Its button is Hide, Next or Continue, or, in an opening's lesson, Your turn, Next or Start the reconstruction. One may end on its own after a set time: 6.3.1's board hint, 5 seconds. Its time is counted: look time, or time per move. Each look I end shows the same note and a clock line naming what its time counts.
  - **Ask.** The question's words. What shows with it: a board or none, a position in words, and notes such as "White's last move: f2 to f4." or "It becomes a queen." The input it takes, with its choices and its None button's words. Its time limit. A note may ride on it: "Not counted. The question stays open."
  - **A lesson.** A Show or an Ask of an opening's lesson (4.3 L1) carries one: the opening's moves as written, the move on screen, the line a move is told on, the arrows that give the move away, the move shown again for Watch this move, and whether the moves show as a strip of buttons. A correction in it counts by its kind, and never fails the round. `Lesson`, in `code/app/core/src/shape/index.ts`.
  - **Told.** The verdict: right, wrong, or too slow. The line, as the card's "After each answer" gives it. What shows again: the board, the words, the moves. 4.2.1's board is my own answer, each cell marked. For a pick of choices, the value of the right one, which 4.1.1's piece cards ring after a wrong pick. What it adds to the score: right or not, its mistake kinds, several when one answer shows several, and any count of its own.
  - **Done.** The item is over.
- **A live count.** A game's or an endgame's Show, Ask and Told carry one, so the screen reads no text for it: my moves played, the most moves allowed (an endgame sets it, a game sets none), my illegal moves, and my hint points left of the level's budget (none where the level gives no hint). 6.2.1 and 6.3.1 set it. `Tally`, in `code/app/core/src/shape/index.ts`.
- **A check.** The Ask of a king question whose king stands in check, where a board shows, carries the king's square and the pieces giving check, in square order. 2.3.2 L3 and L4 set it, L4 on its empty board. 2.3.2 L5 shows no board and sets none. `Check`, in the same file.
- **An answer.** One of: squares, in the order given; None; one choice; what stands on a square; a whole position; a move's text, from the move composer, which the item reads with Notation before judging; one move played on the board, from its square to its square; or one of 6.3.1's buttons, a hint or Resign. A choice carries a value, not its words: "Black's rook" picked among the 13 is the value "black-rook". A choice may also carry the piece it names, or Empty: that choice is drawn as a piece card.
- **A board view.** What the Board is handed: my seat, the edge names or none, the pieces, the lit squares, and, on 4.2.1's answer board, how my answer stands on each square: right, wrong, extra or missing, the right piece of a missing square drawn ghosted there. Every board faces White, whichever side I play. `Cell`, in the same file. Its arrows, if any: each from the square a piece leaves to the square it lands on, with no label. 3.2.1 L1 to L4 hand one for my move, two for castling; an opening lesson's moves do. A view may also say that its pieces slide: the piece each arrow ends on comes in from where the arrow starts, as a lesson shows a move. `Arrow`, in the same file.
- **What comes back.** The item's own facts, enough to make it again: a square, a position, a puzzle's id, a line's move kind and half-move. Never a seed alone: a seed may give another question once a library changes (`reuse-digest/gaps.md`, B12, unproven).
- **A chapter.** Its sections, its challenges, and its path: each step one challenge's level, or a mixed round naming each challenge, level and count, their order, and whether one side holds for the round.

**Used by.** All twenty-seven.

**Never.** Draws, stores or times anything.

> **Stand-in.** Moves and questions read aloud. My ruling: every challenge works in silence. Every step's words are plain text, so a voice could read them later without a new shape.

> **Stand-in.** 2.3.1 sets no check. Its question asks which pieces attack a king's square, so a note naming the checking piece would give the answer, and a note saying only "in check" would rule out the answer None. `code/app/core/src/chapters/2-piece-movement/2.3.1/index.ts`.

### The frontend

#### 15. Rounds

**Does.** Plays a chapter's path. Makes a round from one step of the path: one challenge's level, or a mixed round. Draws the round's side once, where the page seats me for the round. Mixes in what comes back. Ends a round when its minutes run out, each question left a miss. Fills the score sheet: right answers out of the total, average time per answer, average look time, average time per move, mistakes by kind, each challenge's share in a mixed round, and the counts a challenge adds, such as pieces right, illegal moves, hint points, a game's result, a clean game. Keeps the come-back rule: an item I miss comes back once in each of my next two rounds holding its challenge. Keeps where I stand on each chapter's path. It moves forward only: playing a step later than where I stand moves it there, steps skipped or not; playing an earlier step, or the same one, moves nothing. A level on the chapters page is one step of the path and plays as it. `code/app/frontend/src/rounds/rounds.ts`.

**Used by.** All twenty-seven, and the mixed rounds of chapters 1, 2 and 3.

**In, out.** A path step, a seed and my come-back list give a round's items. A round's answers give its score sheet, my new come-back list, and my place on the path.

**Never.** Draws, times or stores. The runner times and hands the times in; the progress record stores.

It draws nothing, and is tested with no screen. It lives in the frontend, beside the runner that plays it.

My ruling: Next plays the challenge's next level; after its last, the next challenge's first. No level is locked: a card's "It needs" shows inside its challenge on the chapters page, above the levels, and stops nothing. `code/app/frontend/src/rounds/rounds.ts`.

#### 16. The board

**Does.** Draws one board view: the edge names or none, the pieces, the lit squares, and what an input marks on it, such as picked squares, a route's numbers, or a piece picked up. On 4.2.1's answer board it also marks each square of my answer: an opaque square colour, right, wrong, extra or missing, the piece drawn above it, a missing square's right piece ghosted. On a lesson's move, the piece each arrow ends on slides in from where the arrow starts, over its neighbours, and not at all for a viewer who asks for less motion. A move that missed tints its square red for a moment. It faces White, a1 at the bottom left, whichever side I play. Each square is a button, named by its square for a screen reader and for a keyboard, never in visible text unless the edge names show. It is drawn that way in `code/app/frontend/src/board/Board.tsx`.

**Arrows.** A board view may carry `arrows`, one for each piece that moves in the move it shows: from the square the piece leaves to the square it lands on, its head at the landing. They are drawn over the pieces and the lit squares, which stay as they are, and never take a click. An arrow carries no label and no word of what the move does: a capture, a check or a mate is never marked on it. A view with none, or with the field left out, draws as before. The look is the opening-lesson winner's, g1 v1, look 3, "Highlights and arrow" (its file was deleted once the lesson was built; git keeps it): amber (`#f0a020`, 0.92 opaque), a round-capped line 0.18 of a square wide that starts 0.3 of a square from the departure's centre, and a head 0.5 long and 0.6 wide whose tip stops 0.3 short of the destination's centre. Its measures are in `code/app/frontend/src/board/arrows.ts`, its colours in `styles.css`. Castling is two arrows, the king's then the rook's; they run along one rank in opposite directions, so where two arrows share a line each is drawn 0.1 of a square to its own right, as the board looks, and each shows its direction. A promotion shows the pawn's movement; a pawn taken in passing shows the capturing pawn's, and none comes from a piece taken. Notation gives them: `arrowsOf(move)`. 3.2.1 L1 to L4 hand one for my move, and L5, with no board, none. The opening lessons of 4.3 L1 hand theirs the same way: each move shown, and the right move after a miss.

**Used by.** Every challenge with a board: 1.1.1, 1.1.2, 1.3.1, 2.1.1, 2.1.2, 2.2.1, 2.3.1, 2.3.2, 3.1.1, 3.2.1, 4.1.1, 4.2.1, 4.3.1 to 4.3.9, 5.1.1, 5.2.1, 6.1.1, 6.2.1, and 6.3.1 (the board hint, and the game shown again). 1.2.1 alone shows no board.

**In, out.** A board view gives a drawn board, and the square clicked.

**Never.** Holds the true position, or decides what a click means.

#### 17. The answer inputs

**Mouse first.** Every builder keeps to it.

- Training interactions put mouse and touch controls first.
- Typing and dictation are never required.
- Answer controls ask no needless effort.
- A challenge measures chess knowledge, not input speed.
- A control never reveals what is otherwise hidden. Each offers every value it could take, so none hints at the answer: never only the legal moves, never only the squares that fit.

**Does.** Every way I answer, each handing back an answer:

- **Click one square.** 1.1.1.
- **Click several, then Confirm, or a None button.** 1.3.1, 2.1.1, 2.2.1, 2.3.1, 2.3.2, 3.1.1. An Ask with no board may bring one behind a Reveal board button, which shows it empty to click: 1.3.1 L3, and every level with no board of 2.1.1, 2.2.1, 2.3.1, 2.3.2 and 3.1.1.
- **Click in order, then Confirm, with Undo last.** 2.1.2. Its L5 reveals its board the same way.
- **Pick one choice.** 1.1.2, 1.2.1, 3.2.1, 6.1.1. The thirteen of 4.1.1 and 5.1.1 carry the piece they name, or Empty, and are drawn as piece cards: White's six over Black's six, Empty one tall tile at their right end, the same at every width, all on screen with no scroll; on a phone they sit in the question's bar, under the question. White's are on the board's light tone, Black's on its dark; each card named by its words for a screen reader. After my pick, the card keeps its tile and gains a ring and a badge, a check if right, a cross if wrong; after a wrong pick the right card is ringed too, and the others dim. `code/app/frontend/src/inputs/Choose.tsx`.
- **The square keypad.** With no board, a file a to h, then a rank 1 to 8, make a square. One square is the answer at once: two clicks. Several squares add up, one tapped again comes off, then Confirm; a route adds up in order, then Confirm. Undo last, and a None button where the Ask names one. `code/app/frontend/src/inputs/Keypad.tsx`. 1.1.2; several squares and a route, the trials page only.
- **The move composer.** A move built key by key, as it is written: K, Q, R, B, N, x, + and #; the files; the ranks; both castlings, = and Delete. Each new question starts it empty, a move refused too. Its button reads Confirm. 6.3.1 adds a row: a button per hint, with its cost, then Resign, which asks once more. The square hint takes its square from the keypad's two rows. `code/app/frontend/src/inputs/ComposeMove.tsx`. 3.2.1, 6.1.1, 6.2.1, 6.3.1.
- **The position composer.** With no board, a piece from the palette of twelve, which stays picked, then a file and a rank, place it. Each side's pieces show as a list; one tapped comes off. Confirm. `code/app/frontend/src/inputs/ComposePosition.tsx`. The trials page only.
- **Place pieces.** A palette of the twelve pieces; a placed piece clicked again comes off. 4.2.1. Its L6 reveals its board the same way.
- **Move pieces from the starting position.** Pick a piece, then its square; Take off; Reset. Castling is the king and the rook moved by hand. 4.3 L2 and L3, 5.2.1.
- **Play one move.** On the board shown, pick a piece, then its square: the move is the answer at once, with no Confirm. Any piece may be picked, and another piece of the same side picks instead. A move that is not the lesson's stays on the board for 0.8 seconds with its square tinted red, then the piece goes back; the question reopens with the right move's arrow and the correction, in amber. Beside the board: Replay, Guide, and a main button that only waits, with Try again and Show the move after a miss; in the reconstruction, the moves written out with the one asked marked, Watch this move, which shows the move again with its words, and Show the arrow. `code/app/frontend/src/inputs/PlayMove.tsx`, its strip, list and line in `lesson.tsx`. 4.3 L1.

On a phone, the keypad's and the composers' answer so far, and its send button, sit in the bar under the question; their keys sit in the panel under the header. From the winner no-typing g1 v1.

**Used by.** All twenty-seven.

**Never.** Judges: the core does. Reads the composer's move: Notation does.

#### 18. The runner

**Does.** Plays one round on screen, each item's steps in turn. Shows a step until its button, and counts its time. Ends a step on its own after its seconds. Asks, with a countdown when the level times a question, and sends "out of time" when it runs out. Keeps a question open, with its note, when an answer is not counted. Shows the told line, and what shows again: on a phone the verdict, with Continue after a miss, rides in a sheet fixed to the screen's foot over the keys, which stay drawn, dimmed and locked, and a refused move rides in a thin sheet in the same place that lets a tap through; at 1440 both stay in the panel. Hands its results back when the round ends: the shell shows the score. It also draws the step screen: Leave, Restart and Next level, the round's tiles, the level's conditions behind Settings, Black told by a banner strip, and a king in check named. An opening's lesson draws its own screen on a Show: the strip of moves, the move's words and its buttons (`LessonShow.tsx`). `code/app/frontend/src/runner/`.

**Used by.** All twenty-seven, and the mixed rounds.

**In, out.** A round's items give, at its end, every answer with its times, for Rounds and the progress record.

**Never.** Judges, makes questions, or stores.

> **Stand-in.** The one wording of a refusal: an answer not counted, such as a move's text naming no move, "N" alone, and in a game a move refused as not legal: "Not counted. The question stays open." A game has no question, so there it says "Not counted. The move stays open." `NOT_COUNTED` and `NOT_COUNTED_MOVE`, in `code/app/core/src/shape/index.ts`. The pages say only that the question stays open.

> **Stand-in.** The Restart button is white, not the same gray as the others. Red already means wrong here. `Header.tsx`.

> **Stand-in.** The step screen's smaller picks, among them the level's note built from its conditions, Next level off where no step follows or the step is not built, "no clock" where a round has none, the look's words, and Settings shut by Escape or a tap outside, are marked where they apply, in `header.ts`, `Header.tsx` and `parts.tsx`.

#### 19. The shell

**Does.** The screens around the rounds, in the look I locked in, and the menu:

- **Home.** The step I played last, to play again or go on.
- **A chapter's page.** Its sections, challenges and levels as one tree, each level with my last round and my best: score, average and time. A level plays its step.
- **The score screen,** with each pass mark stand-in.
- **The library.** The Library menu entry opens one page with every training rule on it, in groups, each rule's lines with its evidence last. Under 1100 wide, one rule per screen; from 1100 wide, an index, a column of rules and one board that follows the scroll. The rules are the files in `code/app/core/library/`.
- **The menu.** The left menu at 1440, a top bar on my phone.

The screens and their look sit in `code/app/frontend/src/shell/`.

**Used by.** All twenty-seven.

**Never.** Plays a question.

> **Stand-in.** The room the shut menu frees: a page other than a round keeps its widths and re-centres in it. Whether the page grows into it is mine to judge. `styles.css`, in the shell's folder.

> **Stand-in.** During a round the top bar is hidden below 1100 wide, the width the menu already switches at, and not at 390 alone. `styles.css`.

> **Stand-in.** The menu stays shut or open while the app is open, and does not survive a reload. On my phone, choosing a menu link shuts the list again. At 1440 it stays as it is. `App.tsx`.

> **Stand-in.** Home's smaller picks, among them what the card offers before any round, that a step counts once its round starts, and that each device keeps its own last step, are marked where they apply, in `App.tsx`, `screens.tsx` and `record.ts`.

> **Stand-in.** The chapters page's smaller picks are marked where they apply, in `screens.tsx`.
### The backend

#### 20. The progress record

**Does.** Keeps my one progress record, on a server, shared by my computer and my phone: every answer, every round's score, my come-back list, and where I stand on each chapter's path. The frontend reads it when a chapter opens, and sends each round when it ends. A round that fails to send waits in the browser, and goes again.

**Used by.** All twenty-seven.

**In, out.** A finished round goes in. My come-back list, my place on each path, and my past scores come out.

**Never.** Judges or makes questions. Holds anything but my own record. Asks for a phrase or a sign-in: any device reads and writes it.

## The order to build them in

**First, one challenge played whole: 1.1.1 Find the square, all its levels.** It is the smallest card that still asks every part of the loop: a board, a click, a countdown, a mistake named, a square that comes back, a score, and a record kept.

It needs, from the core: the challenge shape, Squares, Near misses and Random draws. From the frontend: the Board, Click one square, the runner with its countdown, Rounds and the shell. From the backend: the progress record. And 1.1.1's own card.

The core and the frontend are built side by side. The challenge shape is written first, so both build against the same shape.

**Then the rest of the core, in this order.** Typed answers. Set grader. Positions. Reach. Rules. Notation. Position grader. Thread finder. Why a move is illegal. The set-up maker of Random draws, once Reach and Rules exist. Real-play packs.

**Then the rest of the frontend, in this order.** Pick one choice. The square keypad. The move composer. The position composer. Click several. Click in order. Place pieces. Move pieces from the starting position.

**Then the challenges, chapter by chapter,** each card in its chapter's path order: chapters 1 and 2, then 3 and 4, then 5 and 6. Each chapter's mixed round comes with its last card.

## The app's folders

The app is one layer, in `code/app/`, as `knowledge/0010-playbook/0019-targeted/the-map/the-repository.md` asks: one folder per layer, named for it. Inside, one folder per part (`knowledge/0010-playbook/0013-thinking/the-parts.md`).

- `code/app/core/` — the core: a part where nothing runs. Its own `package.json`.
  - `src/shape/` — the challenge shape. Written first.
  - `src/squares/`, `src/near-misses/`, `src/positions/`, `src/reach/`, `src/rules/`, `src/notation/`, `src/typed-answers/`, `src/set-grader/`, `src/position-grader/`, `src/thread/`, `src/why-illegal/`, `src/random/`, `src/packs/` — one folder per core block.
  - `src/chapters/1-board-coordinates/` to `src/chapters/6-blind-play/` — one folder per chapter: its path, its mixed round, and one folder per challenge, such as `src/chapters/1-board-coordinates/1.1.1/`. A session building one chapter writes in that chapter's folder alone.
  - `src/chapters/index.ts` — lists the six chapters. Written once, with all six; each chapter fills its own folder after.
  - `scripts/` — the scripts that make the packs. `packs/` — the packs they make. The raw Lichess files they read stay out of the repository, in `scripts/.downloads/`, which git ignores.
  - `library/` — my training library: one text file per rule, beside the packs. The site reads them by path and ships them inside itself, so the Library menu entry always has them.
- `code/app/frontend/` — the website: part 32. Its own `package.json`. `src/rounds/`, `src/board/`, `src/inputs/`, `src/runner/`, `src/shell/`, `src/library/`. It reads the core's files by path. The packs reach the site as its own files, fetched when a challenge opens.
- `code/app/backend/` — the progress record's server: part 31. Its own `package.json`.
- `code/app/backend/wrangler.jsonc` — the app online, on Cloudflare. `npm run deploy` there publishes it.

Each part keeps its own list of libraries, `package.json`, and its own lockfile, the file pinning their exact versions. Two sessions building two parts never meet at one.

Unproven: that the frontend's build reads the core's files from outside its own folder. Its build tool may need the core's folder named as allowed (`server.fs.allow`). Nothing has run it.

## The app's ports

By `knowledge/0010-playbook/0019-targeted/the-map/running-locally.md`: four digits, the folder's digit, then the role, then the session's two digits.

> **Stand-in.** The app's folder digit is `3`, from a vault folder `0030-app`. Neither exists in the vault yet. `1` is the behaviour layer and `2` is `code/blueprint/`.

- **The backend:** role `1`. Session 05 runs it on `3105`. Band 00 runs it on `3100`.
- **The frontend:** role `2`. Session 05 runs it on `3205`. Band 00 runs it on `3200`. It sends `/api` to its own band's backend, the address coming from the environment.
- **The core:** no port. Its tests run under `taskpolicy -b` (`knowledge/0010-playbook/0015-coding/the-coding-axioms.md`, axiom 5).

On my Mac, the backend keeps the record in a local file, one per band, so a session's tests never touch my real record.

## What it is built with

Each pick, its license, its size, what it costs us, and the page it rests on. Every license below forces nothing on the app: MIT, BSD, Apache, ISC, public domain, or CC0 for data.

| Block | Pick | License | Size | What it costs us | Page |
|---|---|---|---|---|---|
| The frontend's screens | React 19.3, TypeScript, Vite 8.3, from create-vite's `react-ts` template. No router: screens are state, as in the winner | MIT | not stated | The look I locked in is React already, and `code/prototypes/` runs react 19.3.0 and vite 8.3.0 today. Needs Node 20.19 or later: this Mac runs 22.22.2 | `architecture-and-templates/pages/vitejs--create-vite-templates.md` |
| Rules, and Notation's writing | chess.js 1.4.0 | BSD-2-Clause | 11.7 KB gzipped, no dependencies | Keep its notice. Its reading of a move's text is too loose: it accepts a needless "Nge7", and strips + and # before judging. So Notation reads a move's text itself, and matches them to chess.js's own written moves. It crashes on a pawn on an edge rank (#577), so none is ever loaded. It does not check that the side not to move is out of check (#558), so the set-up maker checks | `chess-rules-and-bots/pages/jhlywa--chess.js.md` |
| Reach | Our own. chessops's own is 152 lines | ours | — | chessops's `attacks` is GPL-3: read as a design, never copied. Tests compare Reach with chess.js's `attackers` on legal positions | `chess-rules-and-bots/pages/niklasf--chessops.md`, `reuse-digest/gaps.md` B2 |
| The board | Our own: the winner's grid of 64 buttons | ours | — | react-chessboard (MIT, 394 KB unpacked, needs dnd-kit) is passed over. Its pieces would change the look I locked in, and its gaps are ours anyway: no kept set of picked squares, no keyboard or screen reader found | `board-and-looks/renderers/react-chessboard.md`, `reuse-digest/open-questions.md` question 4 |
| Pieces | cburnett, by Colin M.L. Burnett, as Lichess ships it | BSD-3-Clause, one of four licences its author offers | 12 SVG files, 8 KB in all | Keep its notice: `code/app/frontend/public/pieces/cburnett/LICENSE.txt`. Unproven on a real phone | `board-and-looks/pieces-and-themes/piece-set-cburnett.md`, `piece-set-cburnett-commons-check.md` |
| Random draws | sfc32, and the string hash beside it, copied in | public domain, MIT fallback | about 15 lines | The page warns mulberry32 skips about a third of values. pure-rand (MIT) is passed over: a dependency for 15 lines | `architecture-and-templates/pages/bryc--prngs-mulberry32-sfc32.md` |
| What comes back | No scheduler | — | — | The pages fix the rule: back once in each of my next two rounds. ts-fsrs's page says an app builds that queue itself anyway | `architecture-and-templates/pages/open-spaced-repetition--ts-fsrs.md` |
| The progress record | Cloudflare D1. On my Mac, a folder of files | a service, not code | — | Cloudflare's terms | `hosting-lookups/free-hosts-compared.md` |
| The backend's server | A plain handler, no framework | — | — | — | — |
| Where it runs | Cloudflare's free plan: one Worker for the site's files and `/api` | a service, not code | — | Cloudflare's terms | `hosting-lookups/free-hosts-compared.md` |
| A round waiting to send | The browser's own storage, no library | — | — | None | `architecture-and-templates/pages/browser-storage-limits-localstorage-indexeddb.md` |
| Tests, never shipped | Vitest 5.0.5, fast-check 4.10.2, Playwright 1.64.1 | MIT, MIT, Apache-2.0 | — | fast-check knows no chess: its position makers are ours | `architecture-and-templates/pages/vitest-dev--vitest.md`, `dubzzz--fast-check.md`, `microsoft--playwright.md` |
| Real-play packs | Lichess games of 2013-01, the Lichess opening list, the Lichess puzzle file | CC0 | 17.8 MB, about 395 KB, and 307 MB compressed | One download and filter on my Mac. `zstd` opens the files: it sits at `/opt/homebrew/bin/zstd` | `content-and-progress/content/lichess-standard-games-database.md`, `lichess-chess-openings.md`, `lichess-puzzle-database.md` |
| The pack scripts | TypeScript on Node 22, chess.js to replay each game | as above | — | python-chess (GPL-3) is passed over: one language | `chess-rules-and-bots/pages/niklasf--python-chess.md` |
| 6.2.1's endgame tables | Our own small solver: every king and queen, king and rook, and king and pawn against a king, made once into files the site serves | ours | unproven | It must match the counts in `blind-play-lookups/basic-endgames.md`: 144,508 queen positions, 175,168 rook, and 124,954 won of 163,328 pawn. The Lichess tablebase is passed over: its answers carry no license, and every move would wait on it | `content-and-progress/content/lichess-tablebase-api.md` |
| 6.3.1's bot | js-chess-engine 2.4.6, run in the browser | MIT | 408 KB unpacked, no dependencies | A stand-in: below | `chess-rules-and-bots/pages/josefjadrny--js-chess-engine.md` |

Passed over by license, in the browser and on the server alike: Kokopu (LGPL-3), chessops and chessground (GPL-3), Stockfish and Fairy-Stockfish (GPL-3), Maia's code (GPL-3 and AGPL-3).

Not needed now that nothing is installed: vite-plugin-pwa, and the browser database libraries idb and Dexie.

### The bot

> **Stand-in.** 6.3.1's bot is js-chess-engine, at its five levels, behind the bot's own door: a position and a strength go in, one legal move comes out. Any later bot fits the same door.

**Why.** It is the only bot found whose license forces nothing and that has a strength dial: five levels, run in the browser, a move at once (`chess-rules-and-bots/pages/josefjadrny--js-chess-engine.md`).

**Wrong if.** It plays nothing like a person near 1000. Its page claims no strength. A weakened engine plays "weak engine", not "weak human" (`chess-rules-and-bots/pages/official-stockfish--Stockfish.md`).

**Instead.** Every other option, and what it forces:

- Lozza: MIT. 0.66 MB. No strength control found; its page says skip (`chess-rules-and-bots/pages/other-small-engines.md`).
- Our own bot on chess.js: ours. Its strength is as unproven as js-chess-engine's.
- Maia-2: code MIT, its weights' license unproven. About 280 MB a model: too heavy for my phone. Plays like people, from 1100 (`chess-rules-and-bots/pages/CSSLab--maia2-and-maia3.md`).
- Maia 1100: code GPL-3, weights unproven. Built to play like people, its lowest band 1100. On a site anyone loads, the GPL forces the app's source open (`chess-rules-and-bots/pages/CSSLab--maia-chess.md`).
- Maia-3: AGPL-3. Forces the source open on any website. Smallest model 21 MB.
- Stockfish in the browser: GPL-3. 1.85 MB. Weakest setting about 1320, above 1000. Forces the source open (`chess-rules-and-bots/pages/stockfish-in-the-browser.md`).
- Fairy-Stockfish: GPL-3. 1.64 MB. A dial down to 500, unproven like a person. Forces the source open (`chess-rules-and-bots/pages/fairy-stockfish--Fairy-Stockfish.md`).

The page's own stand-in holds for its strengths: the weaker bot about 200 points below my rating, the even one near 1000. Which js-chess-engine level plays each is unproven.

## What stays open

Each is marked as a stand-in at the line it changes. In one place:

- The pack caps: "The core", block 13.
- Moves read aloud: block 14.
- How I move on while pass marks are stand-ins, and no level locked: block 15.
- The words when an answer is not counted: block 18.
- The Restart button's colour: block 18.
- Home's smaller picks, the room the shut menu frees, and the width below which the top bar hides in a round: block 19.
- Where the progress record sits, and its shape: block 20.
- The app's folder digit and its vault folder: "The app's ports".
- The bot: "The bot".

The pages' own stand-ins hold as they are: every pass mark, the bots' strengths, and playing people.

Unproven, until something runs it:

- chess.js's behaviour: its loose reading, its crash on an edge-rank pawn, its missing check. All read from its source, never run.
- The frontend's build reading the core's files from outside its folder.
- Every pack's size, and the endgame files' sizes.
- The look, the pieces and the keys on a real phone.
- How strong js-chess-engine's levels play.

## Where it comes from

The chapter pages: `code/blueprint/docs/board-coordinates.md`, `piece-movement.md`, `notation.md`, `position-memory.md`, `updating-a-position.md`, `blind-play.md`.

The look: `code/app/frontend/src/board/Board.tsx` and `code/app/frontend/src/shell/styles.css`; the controls, the winner no-typing g1 v1; stage A's report, `.claude/state/sessions/40/reports/A1/report.md`.

The vault: `knowledge/0010-playbook/0013-thinking/the-parts.md`; `knowledge/0010-playbook/0019-targeted/the-map/the-repository.md` and `running-locally.md`; `knowledge/0010-playbook/0015-coding/the-coding-axioms.md`.

My handoff, in `blindfold-chess-handoff/`: `05-architecture-principles.md` — the four separations, the modular monolith, no plugin system. `06-interaction-and-audio.md` — silent play, slips apart from chess mistakes. `07-delivery-and-integrations.md` — out of the first version: extensions, speech recognition, ElevenLabs, ChatGPT Voice. `08-decisions-and-open-questions.md` — reuse what chess already solves, keep chess apart from screens and scores.

Team 20's digest, in `reuse-digest/`: `reuse-digest-MOC.md`, `by-chapter.md`, `licenses.md`, `open-questions.md`, `gaps.md`; and `architecture-and-templates/pages/stack-shapes.md`.

The pages each pick rests on, named in its row above, and `blind-play-lookups/basic-endgames.md` for 6.2.1's counts.
