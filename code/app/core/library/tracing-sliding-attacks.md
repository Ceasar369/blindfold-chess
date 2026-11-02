# Tracing a sliding piece's attacks

Trace a rook, bishop or queen one direction at a time.

From its square, follow one line to the first occupied square.

An enemy piece there is attacked. A piece of its own side blocks the line.

Stop there. Nothing behind that square is attacked.

A rook has four directions, a bishop four, a queen eight.

Example: a white bishop on c4 attacks Black's pawn on f7, never the king behind it on g8.

Gradually see these lines without tracing each one.

Proven: FIDE Laws of Chess, Articles 3.1.2 to 3.5. Tracing one direction at a time is my preferred approach.
