import { checkRound, isRoundId } from "./contract.ts";
import { keepRound, readRecord, readRound } from "./record.ts";
import type { Store } from "./store.ts";

export const MAX_BODY = 1_000_000;

function json(status: number, body: unknown): Response {
  return Response.json(body, { status, headers: { "cache-control": "no-store" } });
}

/** The backend's one door: a web Request in, a Response out. `store` null refuses all but health. */
export function createHandler(config: { store: Store | null }) {
  return async function handle(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "");

    if (request.method === "GET" && path === "/api/health") return json(200, { ok: true });

    if (config.store === null) return json(503, { error: "The record is not set up on this server." });
    const store = config.store;

    if (request.method === "POST" && path === "/api/rounds") {
      const text = await request.text();
      if (text.length > MAX_BODY) return json(413, { error: "A round is at most 1 MB." });
      let body: unknown;
      try {
        body = JSON.parse(text);
      } catch {
        return json(400, { error: "A round is a JSON object." });
      }
      const round = checkRound(body);
      if (typeof round === "string") return json(400, { error: round });
      const kept = await keepRound(store, round);
      return json(kept === "new" ? 201 : 200, { kept });
    }

    if (request.method === "GET" && path === "/api/record") {
      const chapter = url.searchParams.get("chapter");
      if (chapter !== null && !/^[1-6]$/.test(chapter)) return json(400, { error: "chapter: 1 to 6." });
      return json(200, await readRecord(store, chapter === null ? undefined : Number(chapter)));
    }

    const one = /^\/api\/rounds\/([^/]+)$/.exec(path);
    if (request.method === "GET" && one !== null) {
      const id = decodeURIComponent(one[1]);
      if (!isRoundId(id)) return json(400, { error: "No such round id." });
      const round = await readRound(store, id);
      return round === null ? json(404, { error: "No round with that id." }) : json(200, round);
    }

    return json(404, { error: "No such address." });
  };
}
