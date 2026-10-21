import "server-only";
import { getDb, schema } from "./db";

export function auditar(a: {
  actor: string;
  accion: string;
  entidad?: string;
  entidadId?: string | number;
  detalle?: unknown;
  ip?: string;
}): void {
  try {
    getDb()
      .insert(schema.auditoria)
      .values({
        actor: a.actor,
        accion: a.accion,
        entidad: a.entidad ?? null,
        entidadId: a.entidadId != null ? String(a.entidadId) : null,
        detalle: a.detalle == null ? null : typeof a.detalle === "string" ? a.detalle : JSON.stringify(a.detalle),
        ip: a.ip ?? null,
      })
      .run();
  } catch (e) {
    console.error("[audit] error", e);
  }
}
