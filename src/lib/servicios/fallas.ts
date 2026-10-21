import "server-only";
import { and, asc, desc, eq, inArray, type SQL } from "drizzle-orm";
import { getDb, schema } from "../db";
import type { EstadoFalla } from "../db/schema";
import { transicionValida } from "../estado";
import { ahoraISO, fechaAR } from "../time";
import { publicar } from "../events";
import { auditar } from "../audit";
import { verificarOperario } from "./operarios";

const { fallas, fallaEventos, equipos, controles, controlItems, operarios } = schema;

export function contarFallasAbiertas(): { total: number; criticas: number } {
  const rows = getDb()
    .select({ critica: fallas.critica })
    .from(fallas)
    .where(inArray(fallas.estado, ["abierta", "en_reparacion"]))
    .all();
  return { total: rows.length, criticas: rows.filter((r) => r.critica).length };
}

export function listarFallas(filtro: { estados?: EstadoFalla[]; equipoId?: number }) {
  const conds: SQL[] = [];
  if (filtro.estados?.length) conds.push(inArray(fallas.estado, filtro.estados));
  if (filtro.equipoId) conds.push(eq(fallas.equipoId, filtro.equipoId));
  return getDb()
    .select({
      id: fallas.id,
      equipo: equipos.nombre,
      equipoCodigo: equipos.codigo,
      item: fallas.itemTexto,
      critica: fallas.critica,
      estado: fallas.estado,
      descripcion: fallas.descripcion,
      fechaRecepcion: fallas.fechaRecepcion,
      fechaReparacion: fallas.fechaReparacion,
      responsable: fallas.responsableReparacion,
      conformidadEn: fallas.conformidadEn,
      ocurrencias: fallas.ocurrencias,
      operario: operarios.nombre,
    })
    .from(fallas)
    .innerJoin(equipos, eq(equipos.id, fallas.equipoId))
    .innerJoin(controles, eq(controles.id, fallas.controlId))
    .innerJoin(operarios, eq(operarios.id, controles.operarioId))
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(fallas.critica), desc(fallas.id))
    .all();
}

export function detalleFalla(id: number) {
  const db = getDb();
  const f = db
    .select({
      falla: fallas,
      equipo: equipos.nombre,
      equipoCodigo: equipos.codigo,
      operario: operarios.nombre,
      horas: controles.horas,
      fechaControl: controles.fecha,
    })
    .from(fallas)
    .innerJoin(equipos, eq(equipos.id, fallas.equipoId))
    .innerJoin(controles, eq(controles.id, fallas.controlId))
    .innerJoin(operarios, eq(operarios.id, controles.operarioId))
    .where(eq(fallas.id, id))
    .get();
  if (!f) return null;
  const fotoOriginal = db
    .select({ foto: controlItems.foto })
    .from(controlItems)
    .where(and(eq(controlItems.controlId, f.falla.controlId), eq(controlItems.itemId, f.falla.itemId)))
    .get()?.foto;
  const conformidadDe = f.falla.conformidadOperarioId
    ? db.select({ nombre: operarios.nombre }).from(operarios).where(eq(operarios.id, f.falla.conformidadOperarioId)).get()
        ?.nombre
    : null;
  const eventos = db
    .select()
    .from(fallaEventos)
    .where(eq(fallaEventos.fallaId, id))
    .orderBy(asc(fallaEventos.id))
    .all();
  return { ...f, fotoOriginal: fotoOriginal ?? null, conformidadDe: conformidadDe ?? null, eventos };
}

type Actor = { usuario: string; nombre: string };

export function actualizarFalla(
  id: number,
  cambios: {
    estado?: EstadoFalla;
    responsable?: string | null;
    fechaReparacion?: string | null;
    comentario?: string | null;
    foto?: string | null;
  },
  actor: Actor,
  ip: string,
): { ok: true } | { ok: false; error: string } {
  const db = getDb();
  const f = db
    .select({ falla: fallas, equipo: equipos.nombre })
    .from(fallas)
    .innerJoin(equipos, eq(equipos.id, fallas.equipoId))
    .where(eq(fallas.id, id))
    .get();
  if (!f) return { ok: false, error: "Falla inexistente" };
  const actual = f.falla;
  const autor = `usuario:${actor.usuario}`;
  const cambiaEstado = cambios.estado && cambios.estado !== actual.estado;
  if (cambiaEstado && !transicionValida(actual.estado, cambios.estado!, "mantenimiento")) {
    return { ok: false, error: `No se puede pasar de "${actual.estado}" a "${cambios.estado}"` };
  }

  const set: Partial<typeof fallas.$inferInsert> = {};
  if (cambios.responsable !== undefined) set.responsableReparacion = cambios.responsable || null;
  if (cambios.fechaReparacion !== undefined) set.fechaReparacion = cambios.fechaReparacion || null;
  if (cambiaEstado) {
    set.estado = cambios.estado;
    if (cambios.estado === "resuelta") {
      // Si no se cargaron, se completan con hoy y con quien la resuelve.
      set.fechaReparacion = set.fechaReparacion || actual.fechaReparacion || fechaAR();
      set.responsableReparacion = set.responsableReparacion || actual.responsableReparacion || actor.nombre;
    }
  }

  db.transaction((tx) => {
    if (Object.keys(set).length) tx.update(fallas).set(set).where(eq(fallas.id, id)).run();
    if (cambiaEstado) {
      tx.insert(fallaEventos)
        .values({
          fallaId: id,
          tipo: "estado",
          estadoDesde: actual.estado,
          estadoHasta: cambios.estado!,
          comentario: cambios.comentario || null,
          foto: cambios.foto || null,
          autor,
        })
        .run();
    } else if (cambios.comentario || cambios.foto) {
      tx.insert(fallaEventos)
        .values({ fallaId: id, tipo: "comentario", comentario: cambios.comentario || null, foto: cambios.foto || null, autor })
        .run();
    }
  });

  auditar({ actor: autor, accion: cambiaEstado ? "falla.estado" : "falla.editada", entidad: "falla", entidadId: id, detalle: cambios.foto ? { ...cambios, foto: "(adjunta)" } : cambios, ip });
  publicar({
    tipo: "falla",
    fallaId: id,
    equipo: f.equipo,
    estado: (set.estado as string) ?? actual.estado,
    item: actual.itemTexto,
    critica: actual.critica,
    autor: actor.nombre,
  });
  return { ok: true };
}

/** Conformidad del autoelevadorista (F-068): el operario confirma que la reparación está bien. */
export async function darConformidad(
  fallaId: number,
  operarioId: number,
  pin: string | null | undefined,
  ip: string,
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const op = await verificarOperario(operarioId, pin);
  if (!op.ok) return { ok: false, status: 403, error: op.error };
  const db = getDb();
  const f = db
    .select({ falla: fallas, equipo: equipos.nombre })
    .from(fallas)
    .innerJoin(equipos, eq(equipos.id, fallas.equipoId))
    .where(eq(fallas.id, fallaId))
    .get();
  if (!f) return { ok: false, status: 404, error: "Falla inexistente" };
  if (!transicionValida(f.falla.estado, "conformidad", "operario")) {
    return { ok: false, status: 409, error: "La falla todavía no fue marcada como resuelta por Mantenimiento" };
  }
  const ahora = ahoraISO();
  const autor = `operario:${op.operario.nombre}`;
  db.transaction((tx) => {
    tx.update(fallas)
      .set({ estado: "conformidad", conformidadOperarioId: op.operario.id, conformidadEn: ahora })
      .where(eq(fallas.id, fallaId))
      .run();
    tx.insert(fallaEventos)
      .values({ fallaId, tipo: "estado", estadoDesde: "resuelta", estadoHasta: "conformidad", autor })
      .run();
  });
  auditar({ actor: autor, accion: "falla.conformidad", entidad: "falla", entidadId: fallaId, ip });
  publicar({
    tipo: "falla",
    fallaId,
    equipo: f.equipo,
    estado: "conformidad",
    item: f.falla.itemTexto,
    critica: f.falla.critica,
    autor: op.operario.nombre,
  });
  return { ok: true };
}
