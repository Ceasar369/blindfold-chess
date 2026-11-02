// The real-play packs and 6.2.1's tables reach the site as its own files,
// fetched when a challenge first plays, then kept for the visit. A .json file
// is read as its JSON, any other as its bytes. Rounds hands them to the
// challenge's round maker.
//
// Source: code/blueprint/building-blocks.md, "The app's folders": "The packs
// reach the site as its own files, fetched when a challenge opens."

import type { Packs } from "../core.ts";

// Every file under code/app/core/packs/, by its path there: "lines.json".
const URLS: Record<string, string> = Object.fromEntries(
  Object.entries(
    import.meta.glob<string>("../../../core/packs/**/*.{json,bin}", { query: "?url", import: "default", eager: true }),
  ).map(([path, url]) => [path.slice(path.indexOf("/packs/") + "/packs/".length), url]),
);

const loaded = new Map<string, Promise<unknown>>();

function fetchPack(name: string): Promise<unknown> {
  const url = URLS[name];
  if (!url) return Promise.reject(new Error(`No pack ${name}.`));
  return fetch(url).then((res) => {
    if (!res.ok) throw new Error(`The pack ${name} answered ${res.status}.`);
    return name.endsWith(".json") ? res.json() : res.arrayBuffer();
  });
}

export async function loadPacks(names: readonly string[]): Promise<Packs> {
  const out: Record<string, unknown> = {};
  for (const name of names) {
    if (!loaded.has(name)) {
      const p = fetchPack(name);
      // A failed fetch is tried again next time.
      p.catch(() => loaded.delete(name));
      loaded.set(name, p);
    }
  }
  await Promise.all(names.map(async (name) => (out[name] = await loaded.get(name))));
  return out;
}
