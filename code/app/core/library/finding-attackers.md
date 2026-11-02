# Finding a square's attackers

Start from the square, not from each piece.

Check one kind of attacker at a time.

Knights: the squares a knight's jump away.

Pawns: the two squares diagonally behind, from that side's view. A pawn straight behind never attacks.

Kings: the eight squares next to it.

Rooks, bishops, queens: follow each line out to its first piece. Does that piece move along that line?

The same checks find a piece's defenders: pieces of its own side that reach its square.

Example: White's knight on f3, pawn on d4 and bishop on b2. f3 and d4 attack e5. b2 stands behind d4.

Begin with these checks. Gradually spot attackers without them.

This is my preferred approach. Unverified: no reference teaches or tests it.
