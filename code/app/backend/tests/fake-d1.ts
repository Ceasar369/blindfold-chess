import { DatabaseSync } from "node:sqlite";
import type { D1 } from "../src/d1-store.ts";

/**
 * A fake of Cloudflare D1, on a real SQLite database in memory. D1 is SQLite,
 * so every statement the record sends runs as it would online.
 */
export function fakeD1(): D1 {
  const db = new DatabaseSync(":memory:");
  return {
    prepare(sql) {
      const statement = db.prepare(sql);
      return {
        bind(...values) {
          const args = values as Array<string | number>;
          return {
            async first<T>() {
              return (statement.get(...args) ?? null) as T | null;
            },
            async run() {
              return { meta: { changes: Number(statement.run(...args).changes) } };
            },
          };
        },
      };
    },
  };
}
