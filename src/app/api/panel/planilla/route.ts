import { z } from "zod";
import { planillaMensual } from "@/lib/servicios/planilla";
import { usuarioApi } from "@/lib/sesion";
import { MESES, fmtFecha, fmtFechaHora } from "@/lib/time";
import { ETIQUETA_FALLA } from "@/lib/estado";

export const dynamic = "force-dynamic";

const q = z.object({
  equipo: z.coerce.number().int().positive(),
  anio: z.coerce.number().int().min(2000).max(2100),
  mes: z.coerce.number().int().min(1).max(12),
});

const celda = (v: string | number | null | undefined) => {
  const s = v == null ? "" : String(v);
  return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

// Exportación CSV de la planilla mensual F-068 (separador ";" + BOM para Excel en es-AR).
export async function GET(req: Request) {
  if (!(await usuarioApi())) return Response.json({ error: "No autenticado" }, { status: 401 });
  const p = q.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!p.success) return Response.json({ error: "Parámetros inválidos" }, { status: 400 });
  const pl = planillaMensual(p.data.equipo, p.data.anio, p.data.mes);
  if (!pl) return Response.json({ error: "Equipo inexistente" }, { status: 404 });

  const dias = Array.from({ length: pl.dias }, (_, i) => i + 1);
  const ctrlDia = new Map(pl.controles.map((c) => [c.dia, c]));
  const L: (string | number | null)[][] = [];
  L.push(["CHECK LIST DE AUTOELEVADORES"]);
  L.push(["EQUIPO:", pl.equipo.nombre, "CÓDIGO:", pl.equipo.codigo, "MES:", `${MESES[pl.mes - 1]} ${pl.anio}`]);
  L.push(["CONDUCTOR(ES):", pl.conductores.join(", ")]);
  L.push([]);
  L.push(["CONTROL", ...dias]);
  L.push(["Conductor", ...dias.map((d) => ctrlDia.get(d)?.operario ?? "")]);
  L.push(["Horas", ...dias.map((d) => ctrlDia.get(d)?.horas ?? "")]);
  for (const f of pl.filas) {
    L.push([
      f.texto + (f.critico ? " *" : ""),
      ...dias.map((d) => {
        const v = pl.celdas[`${f.itemId}-${d}`];
        return v === undefined ? "" : v ? "✓" : "X";
      }),
    ]);
  }
  L.push([]);
  L.push(["Observaciones:"]);
  for (const o of pl.observaciones) L.push([`Día ${o.dia}`, o.item + (o.critico ? " *" : ""), o.observacion ?? ""]);
  L.push([]);
  L.push(["A COMPLETAR POR EL SERVICIO DE MANTENIMIENTO DE AUTOELEVADORES"]);
  L.push(["ÍTEM", "ESTADO", "FECHA DE RECEPCIÓN", "FECHA DE REPARACIÓN", "RESPONSABLE DE LA REPARACIÓN", "CONFORMIDAD DEL AUTOELEVADORISTA"]);
  for (const f of pl.fallas) {
    L.push([
      f.item + (f.critica ? " *" : ""),
      ETIQUETA_FALLA[f.estado],
      fmtFechaHora(f.fechaRecepcion),
      f.fechaReparacion ? fmtFecha(f.fechaReparacion) : "",
      f.responsable ?? "",
      f.conformidadEn ? `${f.conformidadDe ?? ""} ${fmtFechaHora(f.conformidadEn)}` : "",
    ]);
  }
  L.push([]);
  L.push(["F-068 Rev.2"]);

  const csv = "﻿" + L.map((r) => r.map(celda).join(";")).join("\r\n");
  const nombre = `F-068_${pl.equipo.codigo}_${pl.anio}-${String(pl.mes).padStart(2, "0")}.csv`;
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nombre}"`,
      "Cache-Control": "no-store",
    },
  });
}
