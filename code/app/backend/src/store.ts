import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

/** Where the record's files sit: a folder on my Mac, or a D1 database online. */
export type Store = {
  /** The file and its version, or null when it does not exist. */
  read(key: string): Promise<{ text: string; etag: string } | null>;
  /** Writes a new file. False when one already sits there: it is never overwritten. */
  create(key: string, text: string): Promise<boolean>;
  /** Overwrites a file only if it is still at `etag`; null means it must not exist yet. False when it moved on. */
  replace(key: string, text: string, etag: string | null): Promise<boolean>;
  remove(key: string): Promise<void>;
};

/** A folder of files, for my Mac. Sync calls, so one server never interleaves two writes. */
export function fileStore(folder: string): Store {
  const path = (key: string) => join(folder, key);
  const readNow = (key: string) => {
    try {
      const text = readFileSync(path(key), "utf8");
      return { text, etag: createHash("sha256").update(text).digest("hex") };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
  };
  return {
    async read(key) {
      return readNow(key);
    },
    async create(key, text) {
      mkdirSync(dirname(path(key)), { recursive: true });
      try {
        writeFileSync(path(key), text, { flag: "wx" });
        return true;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "EEXIST") return false;
        throw error;
      }
    },
    async replace(key, text, etag) {
      if ((readNow(key)?.etag ?? null) !== etag) return false;
      mkdirSync(dirname(path(key)), { recursive: true });
      writeFileSync(path(key), text);
      return true;
    },
    async remove(key) {
      rmSync(path(key), { force: true });
    },
  };
}
