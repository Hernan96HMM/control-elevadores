// Seed idempotente: se puede correr N veces sin duplicar ni pisar ediciones del admin.
//  - 21 ítems del F-068 Rev.2 (solo si la tabla está vacía)
//  - 6 equipos placeholder "Autoelevador 1..6" (solo si no hay equipos)
//  - admin inicial desde ADMIN_USER / ADMIN_PASSWORD (solo si ese usuario no existe)
const bcrypt = require("bcryptjs");
const { open, fixOwnership } = require("./_db");

const ITEMS = [
  ["Luces delanteras", false],
  ["Luces traseras", false],
  ["Alarma y luces de retroceso", false],
  ["Indicadores de tablero: temperatura y combustible", false],
  ["Espejos retrovisores", false],
  ["Bocina", false],
  ["Freno a pedal", true],
  ["Freno de mano", true],
  ["Estado de cubiertas", false],
  ["Cinturones de seguridad", true],
  ["Estado del asiento", false],
  ["Matafuego", true],
  ["Pérdidas de fluidos", false],
  ["Dirección hidráulica / Transmisión", false],
  ["Funcionamiento de uñas (movimientos)", false],
  ["Estado y seguros de las uñas", true],
  ["Estado de brazos y horquillas", false],
  ["Funcionamiento del motor", false],
  ["Lubricación", false],
  ["Planilla de operarios habilitados", false],
  ["Limpieza general", false],
];

const { db, file } = open();
try {
  const tx = db.transaction(() => {
    const nItems = db.prepare("SELECT COUNT(*) AS n FROM items_checklist").get().n;
    if (nItems === 0) {
      const ins = db.prepare("INSERT INTO items_checklist (orden, texto, critico, activo) VALUES (?, ?, ?, 1)");
      ITEMS.forEach(([texto, critico], i) => ins.run(i + 1, texto, critico ? 1 : 0));
      console.log(`[seed] ${ITEMS.length} ítems del checklist cargados`);
    } else {
      console.log(`[seed] ítems ya existentes (${nItems}), sin cambios`);
    }

    const nEquipos = db.prepare("SELECT COUNT(*) AS n FROM equipos").get().n;
    if (nEquipos === 0) {
      const ins = db.prepare("INSERT INTO equipos (codigo, nombre, activo) VALUES (?, ?, 1)");
      for (let i = 1; i <= 6; i++) ins.run(`AE-0${i}`, `Autoelevador ${i}`);
      console.log("[seed] 6 equipos placeholder cargados (AE-01..AE-06)");
    } else {
      console.log(`[seed] equipos ya existentes (${nEquipos}), sin cambios`);
    }

    const user = (process.env.ADMIN_USER || "").trim();
    const pass = process.env.ADMIN_PASSWORD || "";
    if (!user || !pass) {
      console.warn("[seed] ADMIN_USER/ADMIN_PASSWORD no definidos: no se crea el admin inicial");
    } else if (db.prepare("SELECT id FROM usuarios WHERE usuario = ?").get(user)) {
      console.log(`[seed] usuario admin "${user}" ya existe, sin cambios`);
    } else {
      if (pass.length < 8) throw new Error("ADMIN_PASSWORD debe tener al menos 8 caracteres");
      db.prepare(
        "INSERT INTO usuarios (usuario, nombre, password_hash, rol, activo) VALUES (?, ?, ?, 'admin', 1)",
      ).run(user, "Administrador", bcrypt.hashSync(pass, 10));
      console.log(`[seed] usuario admin "${user}" creado`);
    }
  });
  tx();
  db.pragma("wal_checkpoint(TRUNCATE)");
} catch (err) {
  console.error("[seed] ERROR:", err.message || err);
  process.exitCode = 1;
} finally {
  db.close();
  fixOwnership(file);
}
