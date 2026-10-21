// Aplica las migraciones de ./drizzle con el migrator de drizzle-orm (no drizzle-kit).
// No interactivo e idempotente: las ya aplicadas se registran en __drizzle_migrations.
const path = require("node:path");
const { drizzle } = require("drizzle-orm/better-sqlite3");
const { migrate } = require("drizzle-orm/better-sqlite3/migrator");
const { open, fixOwnership } = require("./_db");

const { db, file } = open();
try {
  migrate(drizzle(db), { migrationsFolder: path.resolve(__dirname, "..", "drizzle") });
  db.pragma("wal_checkpoint(TRUNCATE)");
  console.log(`[migrate] OK — ${file}`);
} catch (err) {
  console.error("[migrate] ERROR:", err);
  process.exitCode = 1;
} finally {
  db.close();
  fixOwnership(file);
}
