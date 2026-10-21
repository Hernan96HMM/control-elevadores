import "server-only";
import path from "node:path";
import fs from "node:fs";
import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

type DB = BetterSQLite3Database<typeof schema>;

const g = globalThis as unknown as { __db?: DB; __sqlite?: Database.Database; __ckpt?: NodeJS.Timeout };

export function dbPath(): string {
  const p = process.env.DB_PATH || path.resolve(process.cwd(), "data", "control-autoelevadores.db");
  if (!path.isAbsolute(p)) throw new Error(`DB_PATH debe ser absoluta (recibido: ${p})`);
  return p;
}

/** Conexión única por proceso (lazy: `next build` nunca abre la base). */
export function getDb(): DB {
  if (g.__db) return g.__db;
  const file = dbPath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const sqlite = new Database(file);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("synchronous = NORMAL");
  sqlite.pragma("busy_timeout = 5000");
  sqlite.pragma("foreign_keys = ON");
  g.__sqlite = sqlite;
  g.__db = drizzle(sqlite, { schema });
  // Checkpoint periódico: evita que el -wal crezca sin límite con lectores SSE abiertos.
  if (!g.__ckpt) {
    g.__ckpt = setInterval(() => {
      try {
        g.__sqlite?.pragma("wal_checkpoint(TRUNCATE)");
      } catch (e) {
        console.error("[db] checkpoint falló", e);
      }
    }, 5 * 60_000);
    g.__ckpt.unref();
  }
  return g.__db;
}

export { schema };
