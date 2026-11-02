import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const result = spawnSync(npm, ["run", "build"], {
  cwd: root,
  env: { ...process.env, VITE_RECORD_MODE: "local", BASE_PATH: process.env.BASE_PATH ?? "/blindfold-chess/" },
  stdio: "inherit",
  shell: process.platform === "win32",
});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
