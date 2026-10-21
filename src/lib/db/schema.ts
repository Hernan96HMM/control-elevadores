import { sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

// Timestamps en ISO 8601 UTC (texto). Las fechas "de calendario" (fecha del control)
// se guardan como YYYY-MM-DD en hora de Argentina.
const creadoEn = () =>
  text("creado_en")
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`);

export const equipos = sqliteTable("equipos", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  codigo: text("codigo").notNull().unique(),
  nombre: text("nombre").notNull(),
  descripcion: text("descripcion"),
  activo: integer("activo", { mode: "boolean" }).notNull().default(true),
  creadoEn: creadoEn(),
});

export const operarios = sqliteTable("operarios", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  nombre: text("nombre").notNull().unique(),
  legajo: text("legajo"),
  habilitado: integer("habilitado", { mode: "boolean" }).notNull().default(true),
  pinHash: text("pin_hash"),
  creadoEn: creadoEn(),
});

export const itemsChecklist = sqliteTable("items_checklist", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  orden: integer("orden").notNull(),
  texto: text("texto").notNull(),
  critico: integer("critico", { mode: "boolean" }).notNull().default(false),
  activo: integer("activo", { mode: "boolean" }).notNull().default(true),
});

export const usuarios = sqliteTable("usuarios", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  usuario: text("usuario").notNull().unique(),
  nombre: text("nombre").notNull(),
  passwordHash: text("password_hash").notNull(),
  rol: text("rol", { enum: ["mantenimiento", "admin"] }).notNull(),
  activo: integer("activo", { mode: "boolean" }).notNull().default(true),
  creadoEn: creadoEn(),
});

export const controles = sqliteTable(
  "controles",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    equipoId: integer("equipo_id")
      .notNull()
      .references(() => equipos.id),
    operarioId: integer("operario_id")
      .notNull()
      .references(() => operarios.id),
    fecha: text("fecha").notNull(), // YYYY-MM-DD (America/Argentina/Buenos_Aires)
    horas: real("horas").notNull(), // horómetro
    resultado: text("resultado", { enum: ["ok", "observaciones", "fuera_servicio"] }).notNull(),
    firmadoEn: text("firmado_en").notNull(), // firma = confirmación del operario
    observaciones: text("observaciones"),
    clientId: text("client_id"), // idempotencia de la cola de reintento
    creadoEn: creadoEn(),
  },
  (t) => [
    uniqueIndex("controles_equipo_fecha_uq").on(t.equipoId, t.fecha),
    uniqueIndex("controles_client_id_uq").on(t.clientId),
  ],
);

export const controlItems = sqliteTable(
  "control_items",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    controlId: integer("control_id")
      .notNull()
      .references(() => controles.id, { onDelete: "cascade" }),
    itemId: integer("item_id")
      .notNull()
      .references(() => itemsChecklist.id),
    // Copia del ítem al momento del control: editar el ABM no altera el histórico.
    orden: integer("orden").notNull(),
    texto: text("texto").notNull(),
    critico: integer("critico", { mode: "boolean" }).notNull(),
    ok: integer("ok", { mode: "boolean" }).notNull(),
    observacion: text("observacion"),
    foto: text("foto"), // nombre de archivo en UPLOADS_DIR
  },
  (t) => [index("control_items_control_idx").on(t.controlId)],
);

export const ESTADOS_FALLA = ["abierta", "en_reparacion", "resuelta", "conformidad"] as const;
export type EstadoFalla = (typeof ESTADOS_FALLA)[number];

export const fallas = sqliteTable(
  "fallas",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    equipoId: integer("equipo_id")
      .notNull()
      .references(() => equipos.id),
    itemId: integer("item_id")
      .notNull()
      .references(() => itemsChecklist.id),
    controlId: integer("control_id")
      .notNull()
      .references(() => controles.id),
    itemTexto: text("item_texto").notNull(),
    critica: integer("critica", { mode: "boolean" }).notNull(),
    estado: text("estado", { enum: ESTADOS_FALLA }).notNull().default("abierta"),
    descripcion: text("descripcion"),
    // Sección "A completar por el Servicio de Mantenimiento" del F-068
    fechaRecepcion: text("fecha_recepcion").notNull(),
    fechaReparacion: text("fecha_reparacion"),
    responsableReparacion: text("responsable_reparacion"),
    conformidadOperarioId: integer("conformidad_operario_id").references(() => operarios.id),
    conformidadEn: text("conformidad_en"),
    ocurrencias: integer("ocurrencias").notNull().default(1),
    creadoEn: creadoEn(),
  },
  (t) => [index("fallas_equipo_estado_idx").on(t.equipoId, t.estado)],
);

export const fallaEventos = sqliteTable(
  "falla_eventos",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    fallaId: integer("falla_id")
      .notNull()
      .references(() => fallas.id, { onDelete: "cascade" }),
    tipo: text("tipo", { enum: ["estado", "comentario", "ocurrencia"] }).notNull(),
    estadoDesde: text("estado_desde"),
    estadoHasta: text("estado_hasta"),
    comentario: text("comentario"),
    foto: text("foto"),
    autor: text("autor").notNull(), // "usuario:<login>" u "operario:<nombre>"
    creadoEn: creadoEn(),
  },
  (t) => [index("falla_eventos_falla_idx").on(t.fallaId)],
);

export const config = sqliteTable("config", {
  clave: text("clave").primaryKey(),
  valor: text("valor").notNull(),
});

export const auditoria = sqliteTable(
  "auditoria",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    actor: text("actor").notNull(),
    accion: text("accion").notNull(),
    entidad: text("entidad"),
    entidadId: text("entidad_id"),
    detalle: text("detalle"),
    ip: text("ip"),
    creadoEn: creadoEn(),
  },
  (t) => [index("auditoria_creado_idx").on(t.creadoEn)],
);
