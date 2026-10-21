import "server-only";
import { and, asc, eq, inArray, like } from "drizzle-orm";
import { getDb, schema } from "../db";
import { diasDelMes, fechaAR } from "../time";

const { controles, controlItems, itemsChecklist, operarios, equipos, fallas } = schema;

const prefijoMes = (anio: number, mes: number) => `${anio}-${String(mes).padStart(2, "0")}-`;

/** Grilla ítems × días 1–31 del F-068 para un equipo y un mes. */
export function planillaMensual(equipoId: number, anio: number, mes: number) {
  const db = getDb();
  const equipo = db.select().from(equipos).where(eq(equipos.id, equipoId)).get();
  if (!equipo) return null;
  const pref = prefijoMes(anio, mes);

  const cs = db
    .select({
      id: controles.id,
      fecha: controles.fecha,
      horas: controles.horas,
      firmadoEn: controles.firmadoEn,
      resultado: controles.resultado,
      observaciones: controles.observaciones,
      operario: operarios.nombre,
    })
    .from(controles)
    .innerJoin(operarios, eq(operarios.id, controles.operarioId))
    .where(and(eq(controles.equipoId, equipoId), like(controles.fecha, `${pref}%`)))
    .orderBy(asc(controles.fecha))
    .all();

  const its = cs.length
    ? db.select().from(controlItems).where(inArray(controlItems.controlId, cs.map((c) => c.id))).all()
    : [];

  // Filas: ítems activos hoy + ítems que aparecen en el mes aunque luego se hayan desactivado.
  const filas = new Map<number, { itemId: number; orden: number; texto: string; critico: boolean }>();
  for (const i of db.select().from(itemsChecklist).where(eq(itemsChecklist.activo, true)).all()) {
    filas.set(i.id, { itemId: i.id, orden: i.orden, texto: i.texto, critico: i.critico });
  }
  for (const i of its) {
    if (!filas.has(i.itemId)) filas.set(i.itemId, { itemId: i.itemId, orden: i.orden, texto: i.texto, critico: i.critico });
  }

  const diaDe = new Map(cs.map((c) => [c.id, Number(c.fecha.slice(8, 10))]));
  const celdas: Record<string, boolean> = {};
  const observaciones: { dia: number; item: string; critico: boolean; observacion: string | null }[] = [];
  for (const i of its) {
    const dia = diaDe.get(i.controlId)!;
    celdas[`${i.itemId}-${dia}`] = i.ok;
    if (!i.ok) observaciones.push({ dia, item: i.texto, critico: i.critico, observacion: i.observacion });
  }
  for (const c of cs) {
    if (c.observaciones) observaciones.push({ dia: Number(c.fecha.slice(8, 10)), item: "General", critico: false, observacion: c.observaciones });
  }
  observaciones.sort((a, b) => a.dia - b.dia);

  const fallasMes = db
    .select({
      id: fallas.id,
      item: fallas.itemTexto,
      critica: fallas.critica,
      estado: fallas.estado,
      fechaRecepcion: fallas.fechaRecepcion,
      fechaReparacion: fallas.fechaReparacion,
      responsable: fallas.responsableReparacion,
      conformidadEn: fallas.conformidadEn,
      conformidadDe: operarios.nombre,
    })
    .from(fallas)
    .innerJoin(controles, eq(controles.id, fallas.controlId))
    .leftJoin(operarios, eq(operarios.id, fallas.conformidadOperarioId))
    .where(and(eq(fallas.equipoId, equipoId), like(controles.fecha, `${pref}%`)))
    .orderBy(asc(fallas.id))
    .all();

  return {
    equipo: { id: equipo.id, codigo: equipo.codigo, nombre: equipo.nombre },
    anio,
    mes,
    dias: diasDelMes(anio, mes),
    filas: [...filas.values()].sort((a, b) => a.orden - b.orden),
    celdas,
    controles: cs.map((c) => ({ ...c, dia: Number(c.fecha.slice(8, 10)) })),
    conductores: [...new Set(cs.map((c) => c.operario))],
    observaciones,
    fallas: fallasMes,
  };
}

export type Planilla = NonNullable<ReturnType<typeof planillaMensual>>;

/** Cumplimiento: qué equipos tuvieron control cada día del mes (hasta hoy). */
export function cumplimientoMensual(anio: number, mes: number) {
  const db = getDb();
  const pref = prefijoMes(anio, mes);
  const hoy = fechaAR();
  const eqs = db.select().from(equipos).where(eq(equipos.activo, true)).orderBy(asc(equipos.nombre)).all();
  const cs = db
    .select({ equipoId: controles.equipoId, fecha: controles.fecha, resultado: controles.resultado })
    .from(controles)
    .where(like(controles.fecha, `${pref}%`))
    .all();
  const total = diasDelMes(anio, mes);
  const dias = Array.from({ length: total }, (_, i) => {
    const fecha = `${pref}${String(i + 1).padStart(2, "0")}`;
    const dow = new Date(`${fecha}T12:00:00Z`).getUTCDay();
    return { dia: i + 1, fecha, finDeSemana: dow === 0 || dow === 6, futuro: fecha > hoy };
  });
  return {
    dias,
    equipos: eqs.map((e) => {
      const porFecha = new Map(cs.filter((c) => c.equipoId === e.id).map((c) => [c.fecha, c.resultado]));
      const faltantes = dias.filter((d) => !d.futuro && !d.finDeSemana && !porFecha.has(d.fecha)).map((d) => d.dia);
      return { id: e.id, nombre: e.nombre, codigo: e.codigo, porFecha: Object.fromEntries(porFecha), faltantes };
    }),
  };
}
