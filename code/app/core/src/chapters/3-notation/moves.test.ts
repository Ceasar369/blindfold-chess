import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { toFen } from "../../positions/index.ts";
import { seeded } from "../../random/index.ts";
import { levelPlans, makeQuestion } from "./moves.ts";

describe("Chapter 3's set-up positions", () => {
  // 3.1.1 judges no sign: its plans carry none, and its questions are drawn as
  // they were before 3.2.1 spread its checks and mates. Each hash covers 6
  // seeded rounds of a level: every plan, then every question's position and
  // move. A change to the draw without a sign changes a hash.
  it("draws 3.1.1's questions as before: signs off", { timeout: 60_000 }, () => {
    const hashes: Record<string, string> = {};
    for (const level of ["L1", "L2", "L3", "L4", "L5"]) {
      const hash = createHash("sha256");
      for (let s = 0; s < 6; s++) {
        const random = seeded(`golden ${level} ${s}`);
        const plans = levelPlans(random, level, false);
        expect(plans.every((p) => p.sign === undefined)).toBe(true);
        hash.update(JSON.stringify(plans));
        for (const plan of plans) {
          const q = makeQuestion(random, s % 2 ? "black" : "white", level === "L1" || level === "L2" ? 4 : 6, plan);
          hash.update(`${toFen(q.pos)}|${q.move.san}|${q.move.from}${q.move.to}|${JSON.stringify(q.last)}`);
        }
      }
      hashes[level] = hash.digest("hex").slice(0, 16);
    }
    expect(hashes).toEqual({
      L1: "402b7feb8f7bf11c",
      L2: "9ca2a5f141418b8a",
      L3: "af9491ec1e2e1ab5",
      L4: "5766cdeb0328ac57",
      L5: "dbe7ece10763e055",
    });
  });
});
