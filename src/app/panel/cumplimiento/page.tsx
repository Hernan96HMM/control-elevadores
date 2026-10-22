import Link from "next/link";
import { cumplimientoMensual } from "@/lib/servicios/planilla";
import { MESES, fechaAR } from "@/lib/time";
import Button from "@/components/Button";
import Icono from "@/components/Icono";
import { Contenido, Encabezado } from "../ui";

export const dynamic = "force-dynamic";

// Cada celda lleva símbolo además de color (accesible y legible en B/N).
const CELDA: Record<string, { cls: string; txt: string; titulo: string }> = {
  ok: { cls: "bg-ok text-white", txt: "✓", titulo: "En orden" },
  observaciones: { cls: "bg-obs-bg text-obs border border-obs-acento", txt: "!", titulo: "Con observaciones" },
  fuera_servicio: { cls: "bg-fs text-white", txt: "✗", titulo: "Fuera de servicio" },
};

export default function PaginaCumplimiento({ searchParams }: { searchParams: { mes?: string } }) {
  const mesSel = /^\d{4}-\d{2}$/.test(searchParams.mes ?? "") ? searchParams.mes! : fechaAR().slice(0, 7);
  const [anio, mes] = mesSel.split("-").map(Number);
  const c = cumplimientoMensual(anio, mes);
  const totalFaltantes = c.equipos.reduce((n, e) => n + e.faltantes.length, 0);

  return (
    <div>
      <Encabezado titulo="Cumplimiento del control diario" descripcion="Días hábiles (lunes a viernes) sin control, hasta hoy.">
        <form className="flex items-end gap-2">
          <input type="month" name="mes" defaultValue={mesSel} className="campo w-auto" aria-label="Mes" />
          <Button>Ver</Button>
        </form>
      </Encabezado>
      <Contenido>
        <p
          className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-lg font-semibold ${
            totalFaltantes ? "border-fs bg-fs-bg text-fs" : "border-ok bg-ok-bg text-ok"
          }`}
        >
          <Icono nombre={totalFaltantes ? "alerta" : "okCirculo"} className="h-6 w-6" />
          {MESES[mes - 1]} {anio}:{" "}
          {totalFaltantes === 0 ? "todos los días hábiles con control" : `${totalFaltantes} día(s) hábil(es) sin control`}
        </p>
        <div className="overflow-x-auto rounded-lg border border-linea bg-superficie p-4 shadow-tarjeta">
          <table className="border-collapse text-xs">
            <thead>
              <tr className="text-sica-navy">
                <th className="sticky left-0 bg-superficie px-2 text-left">Equipo</th>
                {c.dias.map((d) => (
                  <th key={d.dia} className={`w-7 text-center tabular-nums ${d.finDeSemana ? "text-tinta-3" : ""}`}>
                    {d.dia}
                  </th>
                ))}
                <th className="px-2 text-left">Sin control</th>
              </tr>
            </thead>
            <tbody>
              {c.equipos.map((e) => (
                <tr key={e.id}>
                  <td className="sticky left-0 whitespace-nowrap bg-superficie px-2 py-1 font-semibold">
                    <Link href={`/panel/planilla?equipo=${e.id}&mes=${mesSel}`} className="text-sica-navy hover:underline">
                      {e.nombre}
                    </Link>
                  </td>
                  {c.dias.map((d) => {
                    const r = e.porFecha[d.fecha];
                    const falta = !r && !d.futuro && !d.finDeSemana;
                    const est = r ? CELDA[r] : null;
                    return (
                      <td key={d.dia} className="p-0.5">
                        <span
                          title={est ? est.titulo : falta ? "Sin control" : ""}
                          className={`block h-6 w-6 rounded text-center font-bold leading-6 ${
                            est ? est.cls : falta ? "border-2 border-fs text-fs" : d.futuro ? "" : "bg-sin-bg"
                          }`}
                        >
                          {est ? est.txt : falta ? "–" : ""}
                        </span>
                      </td>
                    );
                  })}
                  <td className={`px-2 font-bold tabular-nums ${e.faltantes.length ? "text-fs" : "text-ok"}`}>{e.faltantes.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ul className="flex flex-wrap gap-4 text-sm text-tinta-2">
          {Object.values(CELDA).map((x) => (
            <li key={x.titulo} className="flex items-center gap-1.5">
              <span className={`inline-block h-5 w-5 rounded text-center text-xs font-bold leading-5 ${x.cls}`}>{x.txt}</span>
              {x.titulo}
            </li>
          ))}
          <li className="flex items-center gap-1.5">
            <span className="inline-block h-5 w-5 rounded border-2 border-fs text-center text-xs font-bold leading-4 text-fs">–</span>
            Día hábil sin control
          </li>
        </ul>
      </Contenido>
    </div>
  );
}
