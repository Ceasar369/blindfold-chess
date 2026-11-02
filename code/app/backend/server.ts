// The progress record's server on my Mac, `npm run dev`. Online, worker.ts runs instead.
// Its settings: src/settings.ts.

import { createServer } from "node:http";
import { createHandler, MAX_BODY } from "./src/handle.ts";
import { port, store } from "./src/settings.ts";

const handle = createHandler({ store });

createServer(async (req, res) => {
  try {
    const chunks: Buffer[] = [];
    let size = 0;
    for await (const chunk of req) {
      size += chunk.length;
      if (size > MAX_BODY) {
        res.writeHead(413, { "content-type": "application/json" }).end('{"error":"A round is at most 1 MB."}');
        return;
      }
      chunks.push(chunk);
    }
    const headers = new Headers();
    for (const [name, value] of Object.entries(req.headers)) {
      if (typeof value === "string") headers.set(name, value);
      else if (Array.isArray(value)) value.forEach((v) => headers.append(name, v));
    }
    const hasBody = req.method !== "GET" && req.method !== "HEAD";
    const request = new Request(new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`), {
      method: req.method,
      headers,
      body: hasBody ? Buffer.concat(chunks) : undefined,
    });
    const response = await handle(request);
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    console.error(error);
    if (!res.headersSent) res.writeHead(500, { "content-type": "application/json" });
    res.end('{"error":"The server failed. The round waits in the browser, and goes again."}');
  }
}).listen(port, "127.0.0.1", () => {
  console.log(`The progress record listens on http://127.0.0.1:${port}`);
});
