// Chapter 3's set-up positions, shared by its two cards: 3.2.1's moves come
// "as in 3.1.1 at the same level". Each question is one position and one
// legal move of the side to move, of the kind its level asks.
//
// Source: code/blueprint/docs/notation.md, 3.1.1's and 3.2.1's "Where its
// questions come from".
//
// The rules every position keeps: both kings and the level's count of other
// pieces, of both sides. No piece of the moving kind is pinned. The kings
// never stand side by side. Only the side to move may stand in check. No pawn
// stands on the first or the eighth rank. A castling king and its rook stand
// on their first squares, with nothing between. "Another piece of the moving
// kind" is the moving side's own.

import { besidesKings, fromFen, fromPieces, kingSquare, other, type Position, sideWord, toFen } from "../../positions/index.ts";
import { attackersOf, reachOnEmpty } from "../../reach/index.ts";
import { legalMoves, legalProblem, type Move, moveBetween } from "../../rules/index.ts";
import type { Facts, Kind, Piece, Placed, Random, Side, Square } from "../../shape/index.ts";
import { between, isSquare, SQUARES, step } from "../../squares/index.ts";

// What a question asks: one kind of move.
export type Want =
  | { kind: "move"; piece: Kind } // a move without a capture
  | { kind: "capture"; piece: Kind }
  | { kind: "castling"; wing: "king" | "queen" }
  | { kind: "promotion"; capture: boolean; to: Kind }
  | { kind: "en passant" }
  | { kind: "apart"; by: "file" | "rank"; piece: Kind }; // two pieces told apart

// twin: another of the moving side's pieces of the moving kind stands on the
// board. sign: what the move's written form ends on, when the level judges
// signs; undefined, anything. A plan with a sign is built from the opponent's
// king outward (signedSeed), so the check or the mate is real.
export type Plan = { want: Want; twin: boolean; sign?: "none" | "+" | "#" };

// One question: the position, the move, and the move just played before a
// pawn taken in passing.
export type Question = { pos: Position; move: Move; last: { from: Square; to: Square } | null };

const PIECES: readonly Kind[] = ["queen", "rook", "bishop", "knight"];
const FILL: readonly Kind[] = ["pawn", "pawn", "pawn", "knight", "bishop", "rook", "queen"];

const firstRank = (side: Side) => (side === "white" ? "1" : "8");
const pawnRanks = (s: Square) => s[1] !== "1" && s[1] !== "8";

// The disambiguation a written move carries: "Nbd2" the file b, "R1a3" the rank 1.
export function apartBy(san: string): { file: string | null; rank: string | null } {
  const m = san.match(/^[KQRBN]([a-h])?([1-8])?x?[a-h][1-8]/);
  return { file: m?.[1] ?? null, rank: m?.[2] ?? null };
}

// Whether a piece is pinned: taking it off would leave its own king attacked
// by one more piece.
export function pinned(pos: Position, square: Square): boolean {
  const piece = pos.board[square];
  if (!piece) return false;
  const king = kingSquare(pos, piece.side);
  if (!king || king === square) return false;
  const without = { ...pos.board };
  delete without[square];
  return attackersOf(without, king, other(piece.side)).length > attackersOf(pos.board, king, other(piece.side)).length;
}

function fits(plan: Plan, m: Move): boolean {
  const w = plan.want;
  const sign = m.san.endsWith("#") ? "#" : m.san.endsWith("+") ? "+" : "none";
  if (plan.sign && plan.sign !== sign) return false;
  switch (w.kind) {
    case "move":
      return m.kind === w.piece && !m.captured && !m.castle && !m.promotion;
    case "capture":
      return m.kind === w.piece && !!m.captured && !m.enPassant && !m.promotion;
    case "castling":
      return m.castle === w.wing;
    case "promotion":
      return m.promotion === w.to && !!m.captured === w.capture;
    case "en passant":
      return m.enPassant;
    case "apart": {
      const by = apartBy(m.san);
      return m.kind === w.piece && !m.captured && (w.by === "file" ? !!by.file && !by.rank : !!by.rank && !by.file);
    }
  }
}

type Draft = { placed: Placed[]; keepEmpty: Set<Square>; castling?: Side; wing?: "king" | "queen"; enPassant?: Square; last?: { from: Square; to: Square } };

// The pieces a plan needs where it needs them, before the rest are drawn.
function seed(random: Random, mover: Side, plan: Plan, besides: number): Draft | null {
  if (plan.sign === "+" || plan.sign === "#") return signedSeed(random, mover, plan, besides);
  const them = other(mover);
  const placed: Placed[] = [];
  const keepEmpty = new Set<Square>();
  const free = (s: Square | null): s is Square => !!s && !placed.some((p) => p.square === s) && !keepEmpty.has(s);
  const put = (side: Side, kind: Kind, square: Square) => placed.push({ side, kind, square });
  const fwd = mover === "white" ? 1 : -1;
  const w = plan.want;
  const kingHome = `e${firstRank(mover)}` as Square;

  if (w.kind === "castling") {
    const rank = firstRank(mover);
    const rook = `${w.wing === "king" ? "h" : "a"}${rank}` as Square;
    put(mover, "king", kingHome);
    put(mover, "rook", rook);
    for (const s of between(kingHome, rook)!) keepEmpty.add(s);
    return { placed, keepEmpty, castling: mover, wing: w.wing };
  }

  if (w.kind === "en passant") {
    const rank = mover === "white" ? "5" : "4";
    const files = "bcdefg";
    const f = files[random.int(files.length)]!;
    const g = String.fromCharCode(f.charCodeAt(0) + random.pick([-1, 1]));
    const from = `${f}${rank}` as Square;
    const passed = `${g}${mover === "white" ? "6" : "3"}` as Square;
    const origin = `${g}${mover === "white" ? "7" : "2"}` as Square;
    const landed = `${g}${rank}` as Square;
    put(mover, "pawn", from);
    put(them, "pawn", landed);
    keepEmpty.add(passed).add(origin);
    return { placed, keepEmpty, enPassant: passed, last: { from: origin, to: landed } };
  }

  if (w.kind === "promotion") {
    const rank = mover === "white" ? "7" : "2";
    const s = random.pick(SQUARES.filter((x) => x[1] === rank));
    put(mover, "pawn", s);
    const ahead = step(s, 0, fwd)!;
    if (w.capture) {
      const target = random.pick([step(s, -1, fwd), step(s, 1, fwd)].filter((x): x is Square => !!x));
      put(them, random.pick(PIECES), target);
    } else keepEmpty.add(ahead);
    return { placed, keepEmpty };
  }

  if (w.kind === "apart") {
    const piece: Piece = { side: mover, kind: w.piece };
    const to = random.pick(SQUARES);
    const from = reachOnEmpty(piece, to);
    const pairs = from.flatMap((a) => from.filter((b) => b > a && (w.by === "file" ? a[0] !== b[0] : a[0] === b[0])).map((b) => [a, b] as const));
    if (!pairs.length) return null;
    const [a, b] = random.pick(pairs);
    put(mover, w.piece, a);
    put(mover, w.piece, b);
    keepEmpty.add(to);
    return { placed, keepEmpty };
  }

  // A move or a capture by one piece.
  if (w.piece !== "king") {
    const where = SQUARES.filter((x) => (w.piece === "pawn" ? x[1] !== "1" && x[1] !== "8" && x[1] !== (mover === "white" ? "7" : "2") : true));
    const s = random.pick(where);
    put(mover, w.piece, s);
    if (w.kind === "capture") {
      const reach = w.piece === "pawn"
        ? [step(s, -1, fwd), step(s, 1, fwd)].filter((x): x is Square => !!x)
        : reachOnEmpty({ side: mover, kind: w.piece }, s);
      const target = random.pick(reach.filter(free));
      if (!target) return null;
      const kinds = pawnRanks(target) ? [...PIECES, "pawn" as Kind] : PIECES;
      put(them, random.pick(kinds), target);
    }
  } else if (w.kind === "capture") {
    return null;
  }
  return { placed, keepEmpty };
}

// ---------------------------------------------------------------------------
// A move that gives check or mate, built from the opponent's king outward: the
// checking piece's landing square attacks the king, and the piece comes from a
// square it could reach it from. Chess decides the rest: makeQuestion keeps a
// position only when a legal move of the planned kind ends on the planned sign.

const onEdge = (s: Square) => s[0] === "a" || s[0] === "h" || s[1] === "1" || s[1] === "8";
const EDGES = SQUARES.filter(onEdge);
const CORNERS: readonly Square[] = ["a1", "a8", "h1", "h8"];

function around(s: Square): Square[] {
  return [-1, 0, 1].flatMap((df) => [-1, 0, 1].map((dr) => (df || dr ? step(s, df, dr) : null))).filter((x): x is Square => x !== null);
}

// Where a piece standing on a square attacks, on an empty board: a pawn, the
// two squares diagonally ahead.
function attackedFrom(side: Side, kind: Kind, from: Square): Square[] {
  if (kind !== "pawn") return reachOnEmpty({ side, kind }, from);
  const f = side === "white" ? 1 : -1;
  return [step(from, -1, f), step(from, 1, f)].filter((s): s is Square => s !== null);
}

// Where a piece may have come from to land on a square: a pawn's push comes
// from behind, its capture from the file beside.
function cameFrom(side: Side, kind: Kind, to: Square, capture: boolean): Square[] {
  if (kind !== "pawn") return reachOnEmpty({ side, kind }, to);
  const f = side === "white" ? 1 : -1;
  const start = side === "white" ? "2" : "7";
  const behind = capture ? [step(to, -1, -f), step(to, 1, -f)] : [step(to, 0, -f), step(to, 0, -2 * f)];
  return behind.filter((s): s is Square => s !== null && pawnRanks(s) && (capture || s === step(to, 0, -f) || s[1] === start));
}

function signedSeed(random: Random, mover: Side, plan: Plan, besides: number): Draft | null {
  const mate = plan.sign === "#";
  const w = plan.want;
  const them = other(mover);
  const fwd = mover === "white" ? 1 : -1;
  const placed: Placed[] = [];
  const keepEmpty = new Set<Square>();
  const free = (s: Square | null): s is Square => !!s && !placed.some((p) => p.square === s) && !keepEmpty.has(s);
  const put = (side: Side, kind: Kind, square: Square) => placed.push({ side, kind, square });
  const theirs = (s: Square): Kind => random.pick(pawnRanks(s) ? FILL : PIECES);

  // Castling and a pawn taken in passing keep their own set-up. Neither mates.
  if (w.kind === "castling" || w.kind === "en passant") {
    if (mate) return null;
    const draft = seed(random, mover, { ...plan, sign: undefined }, besides);
    if (!draft) return null;
    const lands = w.kind === "castling" ? (`${w.wing === "king" ? "f" : "d"}${firstRank(mover)}` as Square) : draft.enPassant!;
    const spots = attackedFrom(mover, w.kind === "castling" ? "rook" : "pawn", lands).filter((s) => !draft.placed.some((p) => p.square === s) && !draft.keepEmpty.has(s));
    if (!spots.length) return null;
    draft.placed.push({ side: them, kind: "king", square: random.pick(spots) });
    return draft;
  }

  let king: Square;
  let landing: Square;
  if (w.kind === "promotion") {
    const from = random.pick(SQUARES.filter((x) => x[1] === (mover === "white" ? "7" : "2")));
    put(mover, "pawn", from);
    if (w.capture) {
      landing = random.pick([step(from, -1, fwd), step(from, 1, fwd)].filter((x): x is Square => !!x));
      put(them, random.pick(PIECES), landing);
    } else {
      landing = step(from, 0, fwd)!;
      keepEmpty.add(landing);
    }
    const spots = attackedFrom(mover, w.to, landing).filter(free);
    const edge = spots.filter(onEdge);
    if (!spots.length) return null;
    king = random.pick(mate && edge.length ? edge : spots);
  } else {
    // A move, a capture, or two pieces told apart: the king first, then a
    // landing square that attacks it, then where the piece came from. A mate
    // wants the king on an edge, often a corner.
    const kind = w.piece;
    const capture = w.kind === "capture";
    const found = (() => {
      for (let i = 0; i < 40; i++) {
        const k = mate ? (random.float() < 0.35 ? random.pick(CORNERS) : random.pick(EDGES)) : random.pick(SQUARES);
        // A pawn attacks the squares ahead of it, so it checks from beside, behind.
        const checking = kind === "pawn" ? [step(k, -1, -fwd), step(k, 1, -fwd)].filter((x): x is Square => x !== null && pawnRanks(x)) : attackedFrom(mover, kind, k);
        for (const c of random.shuffle(checking)) {
          const from = cameFrom(mover, kind, c, capture).filter((o) => o !== k && (kind === "pawn" || !checking.includes(o)));
          if (w.kind !== "apart") {
            if (from.length) return { k, c, from: [random.pick(from)] };
            continue;
          }
          // Two that both reach the square, neither in the other's way.
          const clear = (a: Square, b: Square) => !(between(a, c) ?? []).includes(b);
          const pairs = from.flatMap((a) => from.filter((b) => b > a && (w.by === "file" ? a[0] !== b[0] : a[0] === b[0]) && clear(a, b) && clear(b, a)).map((b) => [a, b] as const));
          if (pairs.length) return { k, c, from: [...random.pick(pairs)] };
        }
      }
      return null;
    })();
    if (!found) return null;
    king = found.k;
    landing = found.c;
    for (const o of found.from) put(mover, kind, o);
    if (capture) put(them, random.pick(pawnRanks(landing) ? [...PIECES, "pawn" as Kind] : PIECES), landing);
    else keepEmpty.add(landing);
  }
  put(them, "king", king);

  // A sliding check's line stays open. A mate walls the king in, mostly with
  // its own pieces, and my king may stand beside the landing square, never
  // beside the king.
  const line = between(landing, king) ?? [];
  for (const s of line) keepEmpty.add(s);
  if (mate) {
    const room = besides - (plan.twin && w.kind !== "apart" ? 1 : 0);
    for (const n of random.shuffle(around(king))) {
      if (placed.filter((p) => p.kind !== "king").length >= room) break;
      if (free(n) && random.float() < 0.9) put(them, theirs(n), n);
    }
    if (random.float() < 0.45) {
      const guard = around(landing).filter((s) => free(s) && s !== king && !around(king).includes(s));
      if (guard.length) put(mover, "king", random.pick(guard));
    }
  }
  return { placed, keepEmpty };
}

// The rest of the pieces, drawn: the moving side never gains another piece of
// the moving kind, besides the twin.
function fill(random: Random, mover: Side, plan: Plan, draft: Draft, besides: number): Placed[] | null {
  const placed = [...draft.placed];
  const taken = () => new Set(placed.map((p) => p.square));
  const moving = movingKind(plan.want);
  const pickSquare = (kind: Kind) => {
    const t = taken();
    const options = SQUARES.filter((s) => !t.has(s) && !draft.keepEmpty.has(s) && (kind !== "pawn" || pawnRanks(s)));
    return options.length ? random.pick(options) : null;
  };
  for (const side of [mover, other(mover)]) {
    if (!placed.some((p) => p.side === side && p.kind === "king")) {
      const s = pickSquare("king");
      if (!s) return null;
      placed.push({ side, kind: "king", square: s });
    }
  }
  if (plan.twin && plan.want.kind !== "apart") {
    const s = pickSquare(moving);
    if (!s) return null;
    placed.push({ side: mover, kind: moving, square: s });
  }
  const count = (side: Side) => placed.filter((p) => p.side === side && p.kind !== "king").length;
  while (count("white") + count("black") < besides) {
    const a = count(mover);
    const b = count(other(mover));
    const side = a < b ? mover : b < a ? other(mover) : random.pick([mover, other(mover)]);
    const kinds = FILL.filter((k) => side !== mover || k !== moving);
    const kind = random.pick(kinds);
    const s = pickSquare(kind);
    if (!s) return null;
    placed.push({ side, kind, square: s });
  }
  return count("white") + count("black") === besides ? placed : null;
}

function movingKind(w: Want): Kind {
  switch (w.kind) {
    case "move":
    case "capture":
    case "apart":
      return w.piece;
    case "castling":
      return "king";
    case "promotion":
    case "en passant":
      return "pawn";
  }
}

// One question to a plan: a legal position with `besides` pieces besides the
// kings, the mover to move, and one of its legal moves of the planned kind.
export function makeQuestion(random: Random, mover: Side, besides: number, plan: Plan, tries = 4000): Question {
  const moving = movingKind(plan.want);
  for (let i = 0; i < tries; i++) {
    const draft = seed(random, mover, plan, besides);
    if (!draft) continue;
    const placed = fill(random, mover, plan, draft, besides);
    if (!placed) continue;
    let pos = fromPieces(placed, mover);
    if (draft.castling && draft.wing) {
      const rights = { king: draft.wing === "king", queen: draft.wing === "queen" };
      pos = { ...pos, castling: { ...pos.castling, [draft.castling]: rights } };
    }
    if (draft.enPassant) pos = { ...pos, enPassant: draft.enPassant };
    if (legalProblem(pos) !== null || besidesKings(pos) !== besides) continue;
    const mine = placed.filter((p) => p.side === mover && p.kind === moving);
    if (mine.some((p) => pinned(pos, p.square))) continue;
    if (plan.twin && plan.want.kind !== "castling" && mine.length < 2) continue;
    const moves = legalMoves(pos).filter((m) => fits(plan, m));
    // Where no two are told apart, the twin cannot go there: the written move
    // names no file or rank but a pawn capture's own file.
    const candidates = plan.want.kind === "apart" ? moves : moves.filter((m) => m.kind === "pawn" || (!apartBy(m.san).file && !apartBy(m.san).rank));
    if (!candidates.length) continue;
    return { pos, move: random.pick(candidates), last: draft.last ?? null };
  }
  throw new Error(`No position met the plan ${JSON.stringify(plan)} in ${tries} tries.`);
}

// ---------------------------------------------------------------------------
// A question's own facts, to come back as itself: the same position, the same move.

export function questionFacts(q: Question): Facts {
  return {
    fen: toFen(q.pos),
    from: q.move.from,
    to: q.move.to,
    promotion: q.move.promotion,
    last: q.last ? `${q.last.from} ${q.last.to}` : null,
  };
}

// The question back from its facts, or null when they name no legal move.
export function questionOf(facts: Facts): Question | null {
  if (!facts || typeof facts !== "object" || Array.isArray(facts)) return null;
  const { fen, from, to, promotion, last } = facts;
  if (typeof fen !== "string" || typeof from !== "string" || typeof to !== "string" || !isSquare(from) || !isSquare(to)) return null;
  let pos: Position;
  try {
    pos = fromFen(fen);
  } catch {
    return null;
  }
  if (legalProblem(pos) !== null) return null;
  const promo = typeof promotion === "string" ? (promotion as Kind) : null;
  const move = moveBetween(pos, from, to, promo);
  if (!move) return null;
  const parts = typeof last === "string" ? last.split(" ") : [];
  const lastMove = parts.length === 2 && isSquare(parts[0]!) && isSquare(parts[1]!) ? { from: parts[0] as Square, to: parts[1] as Square } : null;
  return { pos, move, last: lastMove };
}

// "White's last move: f2 to f4."
export function lastLine(q: Question): string | null {
  return q.last ? `${sideWord(other(q.move.side))}'s last move: ${q.last.from} to ${q.last.to}.` : null;
}

// ---------------------------------------------------------------------------
// Each level's mix of moves, as 3.1.1's card sets it. 3.2.1's levels take the
// same mix at the same level.

function shuffleKinds(random: Random, kinds: Kind[], n: number): Kind[] {
  return Array.from({ length: n }, (_, i) => kinds[i] ?? random.pick(kinds));
}

// > Stand-in. The pages leave open: at L2, the 5 moves without a capture are 2
// > pawn moves and 3 of other pieces, each piece drawn; the 3 captures not by
// > pawns are by a knight, bishop, rook or queen, drawn. A promotion's new
// > piece: a queen 6 times in 10, else a knight, rook or bishop. Which wing
// > castles at L4 and L5, and whether its promotion takes: drawn.
function promoteTo(random: Random): Kind {
  return random.float() < 0.6 ? "queen" : random.pick(["knight", "rook", "bishop"] as const);
}

export function levelWants(random: Random, level: string): Want[] {
  const pieces = (n: number, kinds: Kind[]) => shuffleKinds(random, random.shuffle(kinds), n);
  const moves = (n: number, kinds: Kind[]) => pieces(n, kinds).map((piece): Want => ({ kind: "move", piece }));
  const captures = (n: number, kinds: Kind[]) => pieces(n, kinds).map((piece): Want => ({ kind: "capture", piece }));
  switch (level) {
    case "L1":
      // 3 pawn moves, and 7 moves of the other pieces, each kind at least once.
      return [...moves(3, ["pawn"]), ...moves(5, ["knight", "bishop", "rook", "queen", "king"]), ...moves(2, ["knight", "bishop", "rook", "queen"])];
    case "L2":
      // 5 captures, 2 of them by pawns, and 5 moves as at L1.
      return [...captures(2, ["pawn"]), ...captures(3, [...PIECES]), ...moves(2, ["pawn"]), ...moves(3, ["knight", "bishop", "rook", "queen", "king"])];
    case "L3":
      // 2 castlings, one on each side; 2 promotions, one a capture; 2 pawns
      // taken in passing; 2 captures; 2 moves without a capture.
      return [
        { kind: "castling", wing: "king" },
        { kind: "castling", wing: "queen" },
        { kind: "promotion", capture: false, to: promoteTo(random) },
        { kind: "promotion", capture: true, to: promoteTo(random) },
        { kind: "en passant" },
        { kind: "en passant" },
        ...captures(1, ["pawn"]),
        ...captures(1, [...PIECES]),
        ...moves(1, ["pawn"]),
        ...moves(1, [...PIECES, "king"]),
      ];
    case "L4":
    case "L5":
      // 4 moves telling two pieces apart, 3 by the file and 1 by the rank;
      // 1 castling; 1 promotion; 1 pawn taken in passing; 2 captures; 1 move
      // without a capture.
      return [
        ...(["file", "file", "file", "rank"] as const).map((by): Want => ({ kind: "apart", by, piece: random.pick(["knight", "rook"] as const) })),
        { kind: "castling", wing: random.pick(["king", "queen"] as const) },
        { kind: "promotion", capture: random.float() < 0.5, to: promoteTo(random) },
        { kind: "en passant" },
        ...captures(2, ["pawn", ...PIECES]),
        ...moves(1, ["pawn", ...PIECES]),
      ];
    default:
      throw new Error(`Chapter 3 has no set-up mix for ${level}.`);
  }
}

// The kinds of move that can mate here: castling and a pawn taken in passing
// can only give check.
const canMate = (p: Plan) => ["move", "capture", "promotion", "apart"].includes(p.want.kind);

// A level's plans: its wants, 7 in 10 with a twin, and the signs it judges.
// signs: 3 of the 10 moves give check, and 1 of those 3 mates. Any 3 of the 10
// carry them, so a move's kind or piece says nothing of its sign. The mate is
// one of the 3 that can mate.
export function levelPlans(random: Random, level: string, signs: boolean): Plan[] {
  const wants = levelWants(random, level);
  const plans: Plan[] = wants.map((want) => ({ want, twin: want.kind === "apart" }));
  if (signs) {
    let checking: Plan[];
    do checking = random.shuffle(plans).slice(0, 3);
    while (!checking.some(canMate));
    const mating = random.pick(checking.filter(canMate));
    for (const p of plans) p.sign = p === mating ? "#" : checking.includes(p) ? "+" : "none";
  }
  // In 7 of every 10, another piece of the moving kind stands: never beside
  // a king that moves, nor beside a mate's piece.
  const open = random.shuffle(plans.filter((p) => !p.twin && p.sign !== "#" && movingKind(p.want) !== "king"));
  let twins = plans.filter((p) => p.twin).length;
  for (const p of open) {
    if (twins >= 7) break;
    p.twin = true;
    twins++;
  }
  return random.shuffle(plans);
}
