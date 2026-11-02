import { describe, expect, it } from "vitest";
import { arrowsOf } from "../../../notation/index.ts";
import { piecesOf, startingPosition } from "../../../positions/index.ts";
import { seeded } from "../../../random/index.ts";
import type { Answer, Ask, Did, Done, Show, Square, Step } from "../../../shape/index.ts";
import { builtChallenges } from "../../index.ts";
import { OPENINGS, type Opening } from "./definitions.ts";
import { correction, stagesOf } from "./lesson.ts";

const press: Did = { did: "press" };
const move = (from: string, to: string): Did => ({ did: "answer", answer: { kind: "move", from: from as Square, to: to as Square } });
const opening = (name: string) => OPENINGS.find((o) => o.name === name)!;
const itemOf = (o: Opening) => {
  const c = builtChallenges().get(o.challenge)!;
  return c.makeRound(c.levels.find((l) => l.id === "L1")!, seeded(`${o.id} L1`), { side: "white", back: [] })[0]!;
};
const labels = (o: Opening) => o.moves.map((m, i) => (m.side === "white" ? `${Math.floor(i / 2) + 1}. ${m.san}` : `${Math.floor(i / 2) + 1}... ${m.san}`));

// What I do on each stage, to play the lesson right.
const rightDid = (o: Opening, s: { kind: string; i: number }): Did => (s.kind === "practice" || s.kind === "rebuild" ? move(o.moves[s.i]!.from, o.moves[s.i]!.to) : press);

// The lesson played right, every step in order, the Told last.
function play(o: Opening) {
  const item = itemOf(o);
  const steps: Step[] = [item.first()];
  for (const s of stagesOf(o.moves.length)) steps.push(item.next(rightDid(o, s)));
  return { item, steps };
}

describe("L1, the lesson, of every opening", () => {
  it("is 4 stages a move: shown, played, told right, then played again from the start", () => {
    for (const o of OPENINGS) {
      const n = o.moves.length;
      expect(stagesOf(n).map((s) => s.kind), o.name).toEqual([...Array(n).fill(["demo", "practice", "right"]).flat(), ...Array(n).fill("rebuild")]);
      // The first step, one per stage, the last of them the Told.
      expect(play(o).steps, o.name).toHaveLength(4 * n + 1);
    }
  });

  // Look 3: a move shown with its departure and destination lit, an arrow between them, its piece sliding.
  it("shows each move on its own: its departure and destination lit, an arrow from one to the other, its piece sliding, its lines", () => {
    for (const o of OPENINGS) {
      const { steps } = play(o);
      for (const [i, m] of o.moves.entries()) {
        const demo = steps[3 * i] as Show;
        expect(demo, `${o.name} ${labels(o)[i]}`).toEqual({
          step: "show",
          name: o.name,
          board: { seat: "white", names: true, pieces: piecesOf(o.positions[i + 1]!), lit: [m.from, m.to], arrows: arrowsOf(m), slide: true },
          move: labels(o)[i],
          lines: [`${m.side === "white" ? "White" : "Black"}'s ${m.kind} goes from ${m.from} to ${m.to}.`, ...(o.teach[i] ? [o.teach[i]!] : [])],
          lesson: { line: labels(o), at: i, strip: true },
          button: "Your turn",
          time: "move",
        });
        expect(demo.board!.arrows, o.name).toEqual([{ from: m.from, to: m.to }]);
      }
    }
  });

  it("writes only the brief's words: a move's departure and destination, and its teaching line when it has one", () => {
    for (const o of OPENINGS) {
      for (const [i, s] of play(o).steps.slice(0, 3 * o.moves.length).entries()) {
        if (i % 3 !== 0) continue;
        const lines = (s as Show).lines!;
        expect(lines[0], o.name).toMatch(/^(White|Black)'s (king|queen|rook|bishop|knight|pawn) goes from [a-h][1-8] to [a-h][1-8]\.$/);
        expect(lines.slice(1), `${o.name} ${i / 3}`).toEqual(o.teach[i / 3] ? [o.teach[i / 3]] : []);
      }
    }
  });

  it("asks me to play the move from the position before it, with no arrow, no hint and no Confirm", () => {
    for (const o of OPENINGS) {
      const { steps } = play(o);
      for (const [i, m] of o.moves.entries()) {
        const ask = steps[3 * i + 1] as Ask;
        expect(ask, `${o.name} ${labels(o)[i]}`).toEqual({
          step: "ask",
          question: `Play ${labels(o)[i]}.`,
          board: { seat: "white", names: true, pieces: piecesOf(o.positions[i]!), lit: [] },
          notes: [],
          input: { how: "play-move" },
          seconds: null,
          reopened: false,
          lesson: { line: labels(o), at: i, guide: arrowsOf(m), strip: true },
        });
      }
    }
  });

  it("tells a right move, the board holding the result until I go on: Next, and at the last, Start the reconstruction", () => {
    for (const o of OPENINGS) {
      const { steps } = play(o);
      const n = o.moves.length;
      for (const i of o.moves.keys()) {
        expect(steps[3 * i + 2], `${o.name} ${labels(o)[i]}`).toEqual({
          step: "show",
          name: o.name,
          board: { seat: "white", names: true, pieces: piecesOf(o.positions[i + 1]!), lit: [] },
          lines: [`Yes. ${labels(o)[i]}.`],
          lesson: { line: labels(o), at: i, strip: true },
          button: i < n - 1 ? "Next" : "Start the reconstruction",
          time: "move",
          moves: 0,
        });
      }
    }
  });

  // Look 10: from the starting position, the moves in front of me, the move shown again on request.
  it("then asks the reconstruction from the starting position, each move in turn, the list in front of me", () => {
    for (const o of OPENINGS) {
      const { steps } = play(o);
      const n = o.moves.length;
      for (const [i, m] of o.moves.entries()) {
        const ask = steps[3 * n + i] as Ask;
        expect(ask.step, `${o.name} ${i}`).toBe("ask");
        expect(ask.question, `${o.name} ${i}`).toBe(`Play ${labels(o)[i]}.`);
        expect(ask.board!.pieces, `${o.name} ${i}`).toEqual(piecesOf(o.positions[i]!));
        expect(ask.board!.arrows, `${o.name} ${i}`).toBeUndefined();
        expect(ask.input).toEqual({ how: "play-move" });
        expect(ask.lesson, `${o.name} ${i}`).toMatchObject({ line: labels(o), at: i, guide: arrowsOf(m) });
        expect(ask.lesson!.strip, `${o.name} ${i}`).toBeFalsy();
        // Watch this move: the move shown again, with its lines.
        expect(ask.lesson!.watch, `${o.name} ${i}`).toMatchObject({ move: labels(o)[i], board: { arrows: arrowsOf(m), slide: true, pieces: piecesOf(o.positions[i + 1]!) } });
        expect(ask.lesson!.watch!.lines).toEqual([`${m.side === "white" ? "White" : "Black"}'s ${m.kind} goes from ${m.from} to ${m.to}.`, ...(o.teach[i] ? [o.teach[i]!] : [])]);
        // The last move's right answer ends the round: no Ask follows.
        expect(ask.lesson!.said, `${o.name} ${i}`).toEqual(i === 0 ? undefined : { ok: true, text: `Yes. ${labels(o)[i - 1]}.` });
      }
      expect(steps[3 * n]!.step, o.name).toBe("ask");
      expect(piecesOf(o.positions[0]!)).toEqual(piecesOf(startingPosition()));
    }
  });

  it("ends right when the reconstruction is right, naming the opening, its moves and its anchor, with no come-back", () => {
    for (const o of OPENINGS) {
      const { item, steps } = play(o);
      expect(steps.at(-1), o.name).toEqual({
        step: "told",
        verdict: "right",
        line: `Right: the ${o.name}, ${o.line}. Anchor: ${o.anchor}.`,
        again: { board: { seat: "white", names: true, pieces: piecesOf(o.final), lit: [] } },
        score: { right: true, mistakes: [], counts: {} },
      });
      expect(item.next(press), o.name).toEqual({ step: "done", back: null } satisfies Done);
    }
  });

  // Look 8: a wrong move told in the exact words, with the arrow at once; the same question stays open.
  it("corrects a wrong move in the exact words, with the right move's arrow at once, and the same question stays open", () => {
    const o = opening("Italian Game");
    const item = itemOf(o);
    item.first();
    item.next(press); // 1. e4 shown
    const wrongs: [Did, string][] = [
      [move("e2", "e3"), "Right piece. It goes to e4, not e3."],
      [move("e2", "h5"), "Right piece. It goes to e4, not h5."],
      [move("d2", "d4"), "Not that piece. Move the pawn on e2 to e4."],
      [move("g1", "f3"), "Not that piece. Move the pawn on e2 to e4."],
      [move("e7", "e5"), "Not that piece. Move the pawn on e2 to e4."],
    ];
    for (const [did, said] of wrongs) {
      const again = item.next(did) as Ask;
      expect(again, said).toMatchObject({
        step: "ask",
        question: "Play 1. e4.",
        reopened: true,
        input: { how: "play-move" },
        board: { arrows: [{ from: "e2", to: "e4" }], pieces: piecesOf(o.positions[0]!) },
        lesson: { at: 0, strip: true, said: { ok: false, text: said } },
      });
      expect(again.note, said).toBeUndefined();
    }
    // I try again: the right move goes on, and the lesson ends right whatever was corrected.
    expect(item.next(move("e2", "e4"))).toMatchObject({ step: "show", lines: ["Yes. 1. e4."] });
    let step: Step = item.next(press);
    for (const s of stagesOf(o.moves.length).slice(3)) step = item.next(rightDid(o, s));
    expect(step).toMatchObject({ step: "told", verdict: "right", score: { right: true, mistakes: ["Another square", "Another square", "The wrong piece", "The wrong piece", "The wrong piece"] } });
  });

  it("corrects the reconstruction the same way, the move list still in front of me", () => {
    const o = opening("Sicilian Defense");
    const item = itemOf(o);
    let step: Step = item.first();
    for (const s of stagesOf(o.moves.length)) {
      if (s.kind === "rebuild" && s.i === 5) {
        const again = item.next(move("c5", "c4")) as Ask;
        expect(again).toMatchObject({
          reopened: true,
          question: "Play 3... cxd4.",
          board: { arrows: [{ from: "c5", to: "d4" }] },
          lesson: { line: labels(o), at: 5, said: { ok: false, text: "Right piece. It goes to d4, not c4." } },
        });
      }
      step = item.next(rightDid(o, s));
    }
    expect(step).toMatchObject({ step: "told", verdict: "right", score: { right: true, mistakes: ["Another square"] } });
  });

  // Look 7: the strip and Replay watch a move again, from any move but the reconstruction's.
  it("watches any move again, from the strip or Replay, and goes on from there", () => {
    const o = opening("Italian Game");
    const item = itemOf(o);
    item.first();
    item.next(press);
    item.next(move("e2", "e4"));
    item.next(press); // 1... e5 shown
    // Replay, in a move to play: that move shown again.
    expect(item.next({ did: "jump", to: 1 })).toMatchObject({ step: "show", move: "1... e5", button: "Your turn", lesson: { at: 1, strip: true } });
    // The strip: any move, back or on.
    expect(item.next({ did: "jump", to: 0 })).toMatchObject({ step: "show", move: "1. e4", button: "Your turn" });
    expect(item.next({ did: "jump", to: 4 })).toMatchObject({ step: "show", move: "3. Bc4", button: "Your turn" });
    // The lesson goes on from the move watched: its play, then the next.
    expect(item.next(press)).toMatchObject({ step: "ask", question: "Play 3. Bc4.", board: { pieces: piecesOf(o.positions[4]!) } });
    expect(() => item.next({ did: "jump", to: 9 })).toThrow();
    expect(() => item.next({ did: "jump", to: -1 })).toThrow();
    // The reconstruction has no strip: a jump there is refused.
    const rebuilding = itemOf(o);
    rebuilding.first();
    for (const s of stagesOf(o.moves.length).slice(0, 3 * o.moves.length)) rebuilding.next(rightDid(o, s));
    expect(() => rebuilding.next({ did: "jump", to: 0 })).toThrow();
  });

  it("teaches the Sicilian Defense's capture: the white d-pawn disappears, then the black c-pawn also", () => {
    const o = opening("Sicilian Defense");
    const { steps } = play(o);
    const capture = steps[3 * 5] as Show; // 3... cxd4
    const recapture = steps[3 * 6] as Show; // 4. Nxd4
    expect(capture.move).toBe("3... cxd4");
    expect(capture.lines).toEqual(["Black's pawn goes from c5 to d4.", "Black captures White's d-pawn. The white d-pawn disappears."]);
    expect(capture.board!.pieces.some((p) => p.side === "white" && p.kind === "pawn" && p.square === "d4")).toBe(false);
    expect(capture.board!.pieces.filter((p) => p.side === "white" && p.kind === "pawn")).toHaveLength(7);
    expect(capture.board!.arrows).toEqual([{ from: "c5", to: "d4" }]);
    expect(recapture.move).toBe("4. Nxd4");
    expect(recapture.lines).toEqual(["White's knight goes from f3 to d4.", "White's f3 knight recaptures on d4. The black c-pawn also disappears."]);
    expect(recapture.board!.pieces.filter((p) => p.side === "black" && p.kind === "pawn")).toHaveLength(7);
  });

  it("takes only a press on a Show and a move on an Ask", () => {
    const o = opening("Italian Game");
    const item = itemOf(o);
    item.first();
    expect(() => item.next(move("e2", "e4"))).toThrow();
    item.next(press);
    expect(() => item.next(press)).toThrow();
    const answers: Answer[] = [{ kind: "position", pieces: [] }, { kind: "text", text: "e4" }];
    for (const answer of answers) expect(() => item.next({ did: "answer", answer })).toThrow();
  });

  it("measures a wrong move by the departure and destination alone", () => {
    const o = opening("Italian Game");
    expect(correction(o, 2, "g1", "h3")).toEqual({ text: "Right piece. It goes to f3, not h3.", kind: "Another square" });
    expect(correction(o, 2, "b1", "c3")).toEqual({ text: "Not that piece. Move the knight on g1 to f3.", kind: "The wrong piece" });
    // The capture: Black's pawn goes from c5 to d4.
    const s = opening("Sicilian Defense");
    expect(correction(s, 5, "c5", "c4")).toEqual({ text: "Right piece. It goes to d4, not c4.", kind: "Another square" });
  });
});
