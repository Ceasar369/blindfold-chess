// Makes 6.2.1's three endgame tables, once, into code/app/core/packs/endgames/:
// queen.bin, rook.bin and pawn.bin, 262,144 bytes each.
//
// From code/app/core: node --experimental-strip-types src/chapters/6-blind-play/6.2.1/make-tables.ts

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { counts, type Endgame, solve } from "./solver.ts";

const out = join(import.meta.dirname, "..", "..", "..", "..", "packs", "endgames");
mkdirSync(out, { recursive: true });
for (const kind of ["queen", "rook", "pawn"] as Endgame[]) {
  const table = solve(kind);
  writeFileSync(join(out, `${kind}.bin`), table);
  const c = counts(table);
  console.log(`${kind}.bin: ${table.length} bytes, ${c.positions} positions, ${c.won} won.`);
}
