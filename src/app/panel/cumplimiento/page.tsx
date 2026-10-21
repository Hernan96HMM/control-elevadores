import Link from "next/link";
import { cumplimientoMensual } from "@/lib/servicios/planilla";
import { MESES, fechaAR } from "@/lib/time";
import { Encabezado } from "../ui";

export const dynamic = "force-dynamic";

const CELDA: Record<string, string> = {
  ok: "bg-verde text-white",
  observaciones: "bg-amarillo",
  fuera_servicio: "bg-rojo text-white",
};

export default function PaginaCumplimiento({ searchParams }: { searchParams: { mes?: string } }) {
  const mesSel = /^\d{4}-\d{2}$/.test(searchParams.mes ?? "") ? searchParams.mes! : fechaAR().slice(0, 7);
  const [anio, mes] = mesSel.split("-").map(Number);
  const c = cumplimientoMensual(anio, mes);
  const totalFaltantes = c.equipos.reduce((n, e) => n + e.faltantes.length, 0);

  return (
    <div>
      <Encabezado titulo="Cumplimiento del control diario">
        <form className="flex items-end gap-2">
          <input type="month" name="mes" defaultValue={mesSel} className="campo w-auto" aria-label="Mes" />
          <button className="btn-primario">Ver</button>
        </form>
      </Encabezado>
      <div className="space-y-4 px-8 py-6">
        <p className="text-lg">
          {MESES[mes - 1]} {anio}:{" "}
          <b className={totalFaltantes ? "text-rojo" : "text-verde"}>
            {totalFaltantes === 0 ? "todos los días hábiles con control" : `${totalFaltantes} día(s) hábil(es) sin control`}
          </b>{" "}
          <span className="text-sm text-asfalto-500">(se cuentan lunes a viernes hasta hoy)</span>
        </p>
        <div className="overflow-x-auto rounded-lg bg-white p-4">
          <table className="border-collapse text-xs">
            <thead>
              <tr>
                <th className="px-2 text-left">Equipo</th>
                {c.dias.map((d) => (
                  <th key={d.dia} className={`w-7 text-center ${d.finDeSemana ? "text-asfalto-300" : ""}`}>
                    {d.dia}
                  </th>
                ))}
                <th className="px-2 text-left">Sin control</th>
              </tr>
            </thead>
            <tbody>
              {c.equipos.map((e) => (
                <tr key={e.id}>
                  <td className="whitespace-nowrap px-2 py-1 font-semibold">
                    <Link href={`/panel/planilla?equipo=${e.id}&mes=${mesSel}`} className="hover:underline">
                      {e.nombre}
                    </Link>
                  </td>
                  {c.dias.map((d) => {
                    const r = e.porFecha[d.fecha];
                    const falta = !r && !d.futuro && !d.finDeSemana;
                    return (
                      <td key={d.dia} className="p-0.5">
                        <span
                          title={r ? `Controlado (${r})` : falta ? "Sin control" : ""}
                          className={`block h-6 w-6 rounded-sm text-center leading-6 ${
                            r ? CELDA[r] : falta ? "border-2 border-rojo text-rojo" : d.futuro ? "" : "bg-hormigon"
                          }`}
                        >
                          {r ? "✓" : falta ? "!" : ""}
                        </span>
                      </td>
                    );
                  })}
                  <td className={`px-2 font-semibold ${e.faltantes.length ? "text-rojo" : "text-verde"}`}>{e.faltantes.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-sm text-asfalto-500">
          Verde: en orden · Amarillo: con observaciones · Rojo: fuera de servicio · Borde rojo: día hábil sin control.
        </p>
      </div>
    </div>
  );
}
