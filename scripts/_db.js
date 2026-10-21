// Helpers compartidos por migrate.js y seed.js (Node plano, sin transpilar).
const fs = require("node:fs");
const path = require("node:path");
const Database = require("better-sqlite3");

function dbPath() {
  const p = process.env.DB_PATH || path.resolve(__dirname, "..", "data", "control-autoelevadores.db");
  if (!path.isAbsolute(p)) {
    throw new Error(`DB_PATH debe ser una ruta absoluta (recibido: ${p})`);
  }
  return p;
}

function open() {
  const file = dbPath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new Database(file);
  db.pragma("journal_mode = WAL");
  db.pragma("busy_timeout = 5000");
  db.pragma("foreign_keys = ON");
  return { db, file };
}

// Si el script corre como root (`docker exec` sin -u), los archivos nuevos quedarían
// de root y la app (usuario nextjs) no podría escribir. Los devolvemos a su dueño.
function fixOwnership(file) {
  if (typeof process.getuid !== "function" || process.getuid() !== 0) return;
  const uid = Number(process.env.APP_UID || 1001);
  const gid = Number(process.env.APP_GID || 1001);
  const dir = path.dirname(file);
  for (const f of [dir, file, `${file}-wal`, `${file}-shm`]) {
    try {
      fs.chownSync(f, uid, gid);
    } catch {
      /* puede no existir (-wal/-shm) */
    }
  }
}

module.exports = { open, fixOwnership };
