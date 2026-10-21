import "server-only";
import { and, asc, eq, inArray } from "drizzle-orm";
import { getDb, schema } from "../db";
import { estadoEquipo, fallaPendiente, type EstadoEquipo } from "../estado";
import { fechaAR } from "../time";

const { equipos, controles, fallas, operarios, itemsChecklist, controlItems } = schema;

export type TarjetaEquipo = {
  id: number;
  codigo: string;
  nombre: string;
  estado: EstadoEquipo;
  controlHoy: { id: number; operario: string; firmadoEn: string; horas: number; resultado: string } | null;
  fallasPendientes: number;
  criticasPendientes: number;
};

/** Estado actual de todos los equipos activos (tarjetas del dashboard). */
export function tarjetasEquipos(): TarjetaEquipo[] {
  const db = getDb();
  const hoy = fechaAR();
  const eqs = db.select().from(equipos).where(eq(equipos.activo, true)).orderBy(asc(equipos.nombre)).all();
  if (eqs.length === 0) return [];
  const ids = eqs.map((e) => e.id);
  const fs = db
    .select({ equipoId: fallas.equipoId, critica: fallas.critica, estado: fallas.estado })
    .from(fallas)
    .where(and(inArray(fallas.equipoId, ids), inArray(fallas.estado, ["abierta", "en_reparacion"])))
    .all();
  const cs = db
    .select({
      id: controles.id,
      equipoId: controles.equipoId,
      operario: operarios.nombre,
      firmadoEn: controles.firmadoEn,
      horas: controles.horas,
      resultado: controles.resultado,
    })
    .from(controles)
    .innerJoin(operarios, eq(operarios.id, controles.operarioId))
    .where(and(inArray(controles.equipoId, ids), eq(controles.fecha, hoy)))
    .all();

  return eqs.map((e) => {
    const f = fs.filter((x) => x.equipoId === e.id);
    const c = cs.find((x) => x.equipoId === e.id) ?? null;
    return {
      id: e.id,
      codigo: e.codigo,
      nombre: e.nombre,
      estado: estadoEquipo({ fallas: f, controlHoy: Boolean(c) }),
      controlHoy: c ? { id: c.id, operario: c.operario, firmadoEn: c.firmadoEn, horas: c.horas, resultado: c.resultado } : null,
      fallasPendientes: f.length,
      criticasPendientes: f.filter((x) => x.critica).length,
    };
  });
}

export function equipoPorCodigo(codigo: string) {
  return getDb().select().from(equipos).where(eq(equipos.codigo, codigo)).get() ?? null;
}

/** Todo lo que necesita la pantalla del operario al escanear el QR. */
export function datosPantallaOperario(codigo: string) {
  const db = getDb();
  const equipo = equipoPorCodigo(codigo);
  if (!equipo || !equipo.activo) return null;
  const hoy = fechaAR();

  const fallasEquipo = db
    .select({
      id: fallas.id,
      itemTexto: fallas.itemTexto,
      critica: fallas.critica,
      estado: fallas.estado,
      descripcion: fallas.descripcion,
      fechaRecepcion: fallas.fechaRecepcion,
      fechaReparacion: fallas.fechaReparacion,
      responsableReparacion: fallas.responsableReparacion,
    })
    .from(fallas)
    .where(and(eq(fallas.equipoId, equipo.id), inArray(fallas.estado, ["abierta", "en_reparacion", "resuelta"])))
    .orderBy(asc(fallas.id))
    .all();

  const control = db
    .select({
      id: controles.id,
      operario: operarios.nombre,
      horas: controles.horas,
      firmadoEn: controles.firmadoEn,
      resultado: controles.resultado,
      observaciones: controles.observaciones,
    })
    .from(controles)
    .innerJoin(operarios, eq(operarios.id, controles.operarioId))
    .where(and(eq(controles.equipoId, equipo.id), eq(controles.fecha, hoy)))
    .get();

  const itemsControl = control
    ? db
        .select({
          texto: controlItems.texto,
          critico: controlItems.critico,
          ok: controlItems.ok,
          observacion: controlItems.observacion,
        })
        .from(controlItems)
        .where(eq(controlItems.controlId, control.id))
        .orderBy(asc(controlItems.orden))
        .all()
    : [];

  const items = db
    .select({ id: itemsChecklist.id, texto: itemsChecklist.texto, critico: itemsChecklist.critico })
    .from(itemsChecklist)
    .where(eq(itemsChecklist.activo, true))
    .orderBy(asc(itemsChecklist.orden))
    .all();

  const ops = db
    .select({ id: operarios.id, nombre: operarios.nombre, pinHash: operarios.pinHash })
    .from(operarios)
    .where(eq(operarios.habilitado, true))
    .orderBy(asc(operarios.nombre))
    .all()
    .map((o) => ({ id: o.id, nombre: o.nombre, requierePin: Boolean(o.pinHash) }));

  return {
    equipo: { codigo: equipo.codigo, nombre: equipo.nombre },
    fecha: hoy,
    estado: estadoEquipo({
      fallas: fallasEquipo.filter((f) => fallaPendiente(f.estado)),
      controlHoy: Boolean(control),
    }),
    fallas: fallasEquipo,
    control: control ? { ...control, items: itemsControl } : null,
    items,
    operarios: ops,
  };
}

export type DatosPantallaOperario = NonNullable<ReturnType<typeof datosPantallaOperario>>;
