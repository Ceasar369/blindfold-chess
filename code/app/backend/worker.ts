// The progress record online. Cloudflare runs this file for every /api address: wrangler.jsonc.
// The site's own files never reach it. On my Mac, server.ts runs instead.
//
// RECORD             the D1 database the record sits in.

import { d1Store, type D1 } from "./src/d1-store.ts";
import { createHandler } from "./src/handle.ts";

type Env = { RECORD: D1 };

let handle: ((request: Request) => Promise<Response>) | undefined;

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    handle ??= createHandler({ store: d1Store(env.RECORD) });
    return handle(request);
  },
};
