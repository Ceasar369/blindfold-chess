import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const frontend = join(root, "code/app/frontend");
const backend = join(root, "code/app/backend");
const appPort = process.env.APP_PORT ?? "4710";
const recordPort = process.env.RECORD_PORT ?? "4711";
for (const port of [appPort, recordPort]) {
  if (!/^\d+$/.test(port) || Number(port) < 1024 || Number(port) > 65535) {
    throw new Error("APP_PORT and RECORD_PORT must be ports from 1024 to 65535.");
  }
}
if (Number(appPort) === Number(recordPort)) throw new Error("Use different app and record ports.");
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const built = spawnSync(npm, ["run", "build"], {
  cwd: frontend,
  stdio: "inherit",
  shell: process.platform === "win32",
});
if (built.error) throw built.error;
if (built.status !== 0) process.exit(built.status ?? 1);

const children = [];
let stopping = false;
function stop(code) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill();
  process.exitCode = code;
}
function run(args, cwd, env) {
  const child = spawn(process.execPath, args, { cwd, env: { ...process.env, ...env }, stdio: "inherit" });
  children.push(child);
  child.on("error", (error) => { console.error(error.message); stop(1); });
  child.on("exit", (code) => { if (!stopping) stop(code ?? 1); });
}
run(["server.ts"], backend, {
  PORT: recordPort,
  DATA_DIR: process.env.DATA_DIR ?? join(root, ".data", "records"),
});
run(["node_modules/vite/bin/vite.js", "preview", "--host", "127.0.0.1"], frontend, {
  PORT: appPort,
  API_URL: `http://127.0.0.1:${recordPort}`,
});
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => stop(0));
console.log(`Open http://127.0.0.1:${appPort}. Press Ctrl+C to stop both servers.`);
