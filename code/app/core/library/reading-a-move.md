# Reading a move

A move names where a piece lands, rarely where it leaves.

Read it from that square, as when finding attackers.

Nd5: which of that side's knights reaches d5? That one moved.

White's e4: the pawn on e3, or on e2 when e3 is empty.

Skip a piece that cannot legally move there, such as one pinned to its king.

Then change every square it touches: where it left, where it landed, any piece taken.

Castling moves a king and a rook. Taking in passing also empties the taken pawn's square.

Gradually see the moving piece at once.

Proven: FIDE Laws of Chess, Appendix C.8: a move names the piece and its square of arrival; Article 3.9.2: no piece can be moved that exposes its own king to check. Reading from that square is my preferred approach.
