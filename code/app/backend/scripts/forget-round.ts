// Takes one round out of the record, as if it was never sent: a test round, after a walk.
// It reads the server's settings, so it forgets from the record that server keeps.
//
//   PORT=3100 node scripts/forget-round.ts <round id>

import { forgetRound } from "../src/record.ts";
import { store } from "../src/settings.ts";

const id = process.argv[2];
if (id === undefined) {
  console.error("Name the round's id.");
  process.exit(1);
}
console.log((await forgetRound(store, id)) ? `Forgot round ${id}.` : `No round ${id} in the record.`);
