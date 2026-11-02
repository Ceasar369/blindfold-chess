import { describe, expect, it } from "vitest";
import { type Did, type Item, NOT_COUNTED, NOT_COUNTED_MOVE, type Step } from "./index.ts";

// A smallest item: a board to look at, one question, its verdict, then done.
function lookThenAsk(): Item {
  let at = 0;
  const steps: Step[] = [
    { step: "show", board: { seat: "white", names: false, pieces: [{ side: "white", kind: "knight", square: "e4" }], lit: [] }, button: "Hide", time: "look" },
    { step: "ask", question: "Find e4.", board: { seat: "white", names: false, pieces: [], lit: [] }, notes: [], input: { how: "click-one" }, seconds: null, reopened: false },
    { step: "told", verdict: "right", line: "Right: e4.", score: { right: true, mistakes: [], counts: {} } },
    { step: "done", back: null },
  ];
  return {
    challenge: "test",
    level: "L1",
    questions: 1,
    first: () => steps[0]!,
    next(did: Did) {
      const now = steps[at]!;
      if (now.step === "show" && did.did !== "press" && did.did !== "timeout") throw new Error("A Show takes a press.");
      if (now.step === "ask" && did.did !== "answer") throw new Error("An Ask takes an answer.");
      at++;
      return steps[at]!;
    },
  };
}

describe("the challenge shape", () => {
  it("walks one item through Show, Ask, Told and Done", () => {
    const item = lookThenAsk();
    const walked = [item.first()];
    walked.push(item.next({ did: "press" }));
    walked.push(item.next({ did: "answer", answer: { kind: "squares", squares: ["e4"] } }));
    walked.push(item.next({ did: "press" }));
    expect(walked.map((s) => s.step)).toEqual(["show", "ask", "told", "done"]);
  });

  // One wording of a refusal: a game has no question, so it says "move".
  it("words every refusal alike", () => {
    expect(NOT_COUNTED).toBe("Not counted. The question stays open.");
    expect(NOT_COUNTED_MOVE).toBe(NOT_COUNTED.replace("question", "move"));
  });
});
