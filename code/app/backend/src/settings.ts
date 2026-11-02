// The portable launcher sets PORT and DATA_DIR. A direct backend launch keeps
// the original per-port record location for existing installations.

import { homedir } from "node:os";
import { join } from "node:path";
import { fileStore, type Store } from "./store.ts";

export const port = Number(process.env.PORT ?? 3100);

export const store: Store = fileStore(process.env.DATA_DIR ?? join(homedir(), ".blindfold-chess", "records", String(port % 10000)));
