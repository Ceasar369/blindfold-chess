import type { Store } from "./store.ts";

/** The few D1 calls the record makes, as Cloudflare's D1 binding answers them. Tests hand in a fake. */
export type D1 = {
  prepare(sql: string): {
    bind(...values: unknown[]): {
      first<T>(): Promise<T | null>;
      run(): Promise<{ meta: { changes: number } }>;
    };
  };
};

const TABLE = "CREATE TABLE IF NOT EXISTS files (key TEXT PRIMARY KEY, text TEXT NOT NULL, version INTEGER NOT NULL)";

/** A Cloudflare D1 database, one row per file. A file's etag is its version, raised by every write. */
export function d1Store(db: D1): Store {
  let table: Promise<unknown> | undefined;
  const ready = () => (table ??= db.prepare(TABLE).bind().run());
  const changed = async (sql: string, ...values: unknown[]) => {
    await ready();
    return (await db.prepare(sql).bind(...values).run()).meta.changes === 1;
  };
  const create: Store["create"] = (key, text) =>
    changed("INSERT INTO files (key, text, version) VALUES (?, ?, 1) ON CONFLICT (key) DO NOTHING", key, text);
  return {
    async read(key) {
      await ready();
      const row = await db.prepare("SELECT text, version FROM files WHERE key = ?").bind(key).first<{ text: string; version: number }>();
      return row === null ? null : { text: row.text, etag: String(row.version) };
    },
    create,
    async replace(key, text, etag) {
      if (etag === null) return create(key, text);
      return changed("UPDATE files SET text = ?, version = version + 1 WHERE key = ? AND version = ?", text, key, Number(etag));
    },
    async remove(key) {
      await changed("DELETE FROM files WHERE key = ?", key);
    },
  };
}
