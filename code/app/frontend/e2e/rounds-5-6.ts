// What chapters 5 and 6's browser tests share: rounds seeded as a test sets
// them, and packs served as a test gives them, so a round asks a card's
// example. Read by chapter-5.spec.ts and chapter-6.spec.ts.

import type { Page } from "@playwright/test";
import { seeded } from "../../core/src/random/index.ts";
import type { Side } from "../../core/src/shape/index.ts";

// The dev server reloads its pages each time any session saves a file it
// serves, and a page reloaded mid-round lands back on Home. A test's page
// keeps the code it loaded: its live-reload socket is answered here, and
// never hears from the server.
export async function noReload(page: Page) {
  await page.routeWebSocket(/./, () => {});
}

// Each round the site makes takes the next of these ids as its id and its
// seed (src/shell/App.tsx). Once they run out, ids are random again.
export async function seedRounds(page: Page, ids: string[]) {
  await page.addInitScript((ids) => {
    const queue = [...ids];
    const own = crypto.randomUUID.bind(crypto);
    crypto.randomUUID = () => (queue.shift() ?? own()) as ReturnType<Crypto["randomUUID"]>;
  }, ids);
}

// The side a round so seeded draws, as Rounds draws it first.
export function sideOf(seed: string): Side {
  return seeded(seed).pick<Side>(["white", "black"]);
}

// The first seed, "<name>-0", "<name>-1" and on, that `holds` takes.
export function seedWhere(name: string, holds: (seed: string) => boolean, tries = 200_000): string {
  for (let i = 0; i < tries; i++) {
    const seed = `${name}-${i}`;
    if (holds(seed)) return seed;
  }
  throw new Error(`No seed for ${name} in ${tries} tries.`);
}

// A pack the site fetches, by its path under code/app/core/packs/, served as
// the test gives it: JSON, or bytes.
export async function servePack(page: Page, name: string, data: unknown) {
  await page.route(`**/core/packs/${name}`, (route) =>
    data instanceof Uint8Array ? route.fulfill({ status: 200, body: Buffer.from(data) }) : route.fulfill({ status: 200, json: data }),
  );
}
