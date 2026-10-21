import "server-only";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { getDb, schema } from "../db";
import { resultadoControl } from "../estado";
import { fechaAR, ahoraISO } from "../time";
import { validarCoberturaItems, type ControlInput } from "../validation";
import { guardarImagen } from "../uploads";
import { verificarOperario } from "./operarios";
import { publicar } from "../events";
import { auditar } from "../audit";
import { enviarAlertaCritica } from "../mail";

const { equipos, controles, controlItems, itemsChecklist, fallas, fallaEventos } = schema;

export type ResultadoRegistro =
  | { ok: true; controlId: number; resultado: "ok" | "observaciones" | "fuera_servicio"; duplicado?: boolean }
  | { ok: false; status: number; error: string; yaExiste?: boolean };

export async function registrarControl(input: ControlInput, ip: string): Promise<ResultadoRegistro> {
  const db = getDb();

  // Reintento de la cola offline: mismo clientId → misma respuesta, sin duplicar.
  const previo = db.select().from(controles).where(eq(controles.clientId, input.clientId)).get();
  if (previo) return { ok: true, controlId: previo.id, resultado: previo.resultado, duplicado: true };

  const equipo = db.select().from(equipos).where(eq(equipos.codigo, input.equipoCodigo)).get();
  if (!equipo || !equipo.activo) return { ok: false, status: 404, error: "Equipo inexistente o inactivo" };

  const op = await verificarOperario(input.operarioId, input.pin);
  if (!op.ok) return { ok: false, status: 403, error: op.error };

  const hoy = fechaAR();
  const existente = db
    .select({ id: controles.id })
    .from(controles)
    .where(and(eq(controles.equipoId, equipo.id), eq(controles.fecha, hoy)))
    .get();
  if (existente) return { ok: false, status: 409, error: "Este equipo ya tiene el control de hoy", yaExiste: true };

  const activos = db
    .select()
    .from(itemsChecklist)
    .where(eq(itemsChecklist.activo, true))
    .orderBy(asc(itemsChecklist.orden))
    .all();
  const cobertura = validarCoberturaItems(
    activos.map((i) => i.id),
    input.items.map((i) => i.itemId),
  );
  if (cobertura) return { ok: false, status: 400, error: cobertura };

  // Fotos: se validan por magic bytes y se guardan antes de la transacción.
  const fotos = new Map<number, string>();
  for (const it of input.items) {
    if (!it.ok && it.foto) {
      const r = guardarImagen(it.foto);
      if ("error" in r) return { ok: false, status: 400, error: `Foto de "${activos.find((a) => a.id === it.itemId)?.texto}": ${r.error}` };
      fotos.set(it.itemId, r.nombre);
    }
  }

  const porId = new Map(activos.map((a) => [a.id, a]));
  const detalle = input.items.map((it) => {
    const item = porId.get(it.itemId)!;
    return { item, ok: it.ok, observacion: it.ok ? null : it.observacion?.trim() || null, foto: fotos.get(it.itemId) ?? null };
  });
  const resultado = resultadoControl(detalle.map((d) => ({ ok: d.ok, critico: d.item.critico })));
  const ahora = ahoraISO();
  const autor = `operario:${op.operario.nombre}`;

  let controlId: number;
  const nuevasFallas: { id: number; texto: string; critica: boolean }[] = [];
  try {
    controlId = db.transaction((tx) => {
      const c = tx
        .insert(controles)
        .values({
          equipoId: equipo.id,
          operarioId: op.operario.id,
          fecha: hoy,
          horas: input.horas,
          resultado,
          firmadoEn: ahora,
          observaciones: input.observaciones?.trim() || null,
          clientId: input.clientId,
        })
        .returning({ id: controles.id })
        .get();

      for (const d of detalle) {
        tx.insert(controlItems)
          .values({
            controlId: c.id,
            itemId: d.item.id,
            orden: d.item.orden,
            texto: d.item.texto,
            critico: d.item.critico,
            ok: d.ok,
            observacion: d.observacion,
            foto: d.foto,
          })
          .run();
        if (d.ok) continue;

        // Si el ítem ya tiene una falla sin resolver en este equipo, se suma la ocurrencia.
        const abierta = tx
          .select()
          .from(fallas)
          .where(
            and(
              eq(fallas.equipoId, equipo.id),
              eq(fallas.itemId, d.item.id),
              inArray(fallas.estado, ["abierta", "en_reparacion"]),
            ),
          )
          .get();
        if (abierta) {
          tx.update(fallas)
            .set({ ocurrencias: abierta.ocurrencias + 1 })
            .where(eq(fallas.id, abierta.id))
            .run();
          tx.insert(fallaEventos)
            .values({ fallaId: abierta.id, tipo: "ocurrencia", comentario: d.observacion, foto: d.foto, autor })
            .run();
        } else {
          const f = tx
            .insert(fallas)
            .values({
              equipoId: equipo.id,
              itemId: d.item.id,
              controlId: c.id,
              itemTexto: d.item.texto,
              critica: d.item.critico,
              estado: "abierta",
              descripcion: d.observacion,
              fechaRecepcion: ahora, // recepción automática al entrar la falla
            })
            .returning({ id: fallas.id })
            .get();
          tx.insert(fallaEventos)
            .values({ fallaId: f.id, tipo: "estado", estadoHasta: "abierta", comentario: d.observacion, foto: d.foto, autor })
            .run();
          nuevasFallas.push({ id: f.id, texto: d.item.texto, critica: d.item.critico });
        }
      }
      return c.id;
    });
  } catch (e) {
    // Carrera: otro operario cerró el control del día un instante antes (índice único equipo+fecha).
    if (e instanceof Error && /UNIQUE/i.test(e.message)) {
      return { ok: false, status: 409, error: "Este equipo ya tiene el control de hoy", yaExiste: true };
    }
    throw e;
  }

  const criticas = detalle.filter((d) => !d.ok && d.item.critico);
  auditar({
    actor: autor,
    accion: "control.registrado",
    entidad: "control",
    entidadId: controlId,
    detalle: { equipo: equipo.codigo, resultado, horas: input.horas, fallas: detalle.filter((d) => !d.ok).map((d) => d.item.texto) },
    ip,
  });
  publicar({
    tipo: "control",
    controlId,
    equipo: equipo.nombre,
    operario: op.operario.nombre,
    hora: ahora,
    resultado,
    fallasNuevas: nuevasFallas.length,
    criticas: criticas.length,
  });
  if (criticas.length > 0) {
    void enviarAlertaCritica({
      equipo: equipo.nombre,
      operario: op.operario.nombre,
      horas: input.horas,
      items: criticas.map((c) => c.item.texto),
    });
  }
  return { ok: true, controlId, resultado };
}

/** Últimos controles (feed del dashboard al cargar). */
export function ultimosControles(limite = 30) {
  const db = getDb();
  return db
    .select({
      id: controles.id,
      fecha: controles.fecha,
      firmadoEn: controles.firmadoEn,
      resultado: controles.resultado,
      equipo: equipos.nombre,
      operario: schema.operarios.nombre,
    })
    .from(controles)
    .innerJoin(equipos, eq(equipos.id, controles.equipoId))
    .innerJoin(schema.operarios, eq(schema.operarios.id, controles.operarioId))
    .orderBy(desc(controles.id))
    .limit(limite)
    .all();
}
