import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv, type Plugin } from "vite";

// The published build alone wears a favicon, my home-screen icon, so its tab
// stands apart from every copy running on my Mac. The dev server keeps none.
const NO_ICON = '<link rel="icon" href="data:," />';
let iconBase = "/";
const favicon: Plugin = {
  name: "published-favicon",
  apply: "build",
  configResolved(config) { iconBase = config.base; },
  transformIndexHtml(html) {
    if (!html.includes(NO_ICON)) throw new Error(`index.html no longer holds ${NO_ICON}`);
    return html.replace(NO_ICON, `<link rel="icon" type="image/png" href="${iconBase}apple-touch-icon.png" />`);
  },
};

// The core sits beside this folder. The site reads its files by path, as
// @core/..., so the dev server is allowed to serve them.
const CORE = fileURLToPath(new URL("../core/src", import.meta.url));
// The packs, fetched as the site's own files: src/rounds/packs.ts.
const PACKS = fileURLToPath(new URL("../core/packs", import.meta.url));
// The library's rule files, read as text: src/library/library.ts.
const LIBRARY = fileURLToPath(new URL("../core/library", import.meta.url));

// The launcher sets PORT and API_URL. A frontend-only dev server uses 4710.
// API_URL is the backend /api is sent to. Without one, /api answers nothing,
// and each round waits in the browser.
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const port = Number(env.PORT ?? 4710);
  if (command === "serve" && !Number.isInteger(port)) throw new Error("PORT is not set.");
  const proxy = env.API_URL ? { "/api": { target: env.API_URL, changeOrigin: true } } : undefined;
  return {
    base: env.BASE_PATH ?? "/",
    plugins: [react(), favicon],
    resolve: { alias: { "@core": CORE } },
    server: { port, strictPort: true, proxy, fs: { allow: [".", CORE, PACKS, LIBRARY] }, allowedHosts: [".ts.net"] },
    preview: { port, strictPort: true, proxy },
    test: { include: ["src/**/*.test.ts"] },
  };
});
