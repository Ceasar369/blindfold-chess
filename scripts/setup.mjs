import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
for (const name of ["core", "backend", "frontend"]) {
  const result = spawnSync(npm, ["ci", "--no-audit", "--no-fund", "--prefix", `code/app/${name}`], {
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
