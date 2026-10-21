import { asc } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { planillaMensual } from "@/lib/servicios/planilla";
import { ETIQUETA_FALLA } from "@/lib/estado";
import { MESES, fechaAR, fmtFecha, fmtFechaHora } from "@/lib/time";
import { Encabezado } from "../ui";
import BotonImprimir from "./BotonImprimir";

export const dynamic = "force-dynamic";

const ACLARACION =
  "Aclaración: en el caso que se encuentre incorrecto marcar con una cruz y colocar en el recuadro de observaciones. Los ítems señalados con asterisco (*) requieren su reparación y/o reemplazo antes de la operación del equipo. Respecto a los demás ítems se deberá programar la reparación con Mantenimiento. En el caso que se encuentre correcto marcar con un tilde.";
const AVISO =
  "Ante la falta de elementos de seguridad, EL EQUIPO NO PODRÁ SER UTILIZADO; en caso de hacerlo será responsabilidad directa del conductor.";

export default function PaginaPlanilla({ searchParams }: { searchParams: { equipo?: string; mes?: string } }) {
  const equipos = getDb().select().from(schema.equipos).orderBy(asc(schema.equipos.nombre)).all();
  const mesSel = /^\d{4}-\d{2}$/.test(searchParams.mes ?? "") ? searchParams.mes! : fechaAR().slice(0, 7);
  const [anio, mes] = mesSel.split("-").map(Number);
  const equipoId = Number(searchParams.equipo) || equipos[0]?.id;
  const pl = equipoId ? planillaMensual(equipoId, anio, mes) : null;
  const dias = pl ? Array.from({ length: pl.dias }, (_, i) => i + 1) : [];
  const porDia = new Map(pl?.controles.map((c) => [c.dia, c]) ?? []);

  return (
    <div>
      <Encabezado titulo="Planilla mensual">
        <form className="flex flex-wrap items-end gap-2">
          <select name="equipo" defaultValue={equipoId} className="campo w-auto" aria-label="Equipo">
            {equipos.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nombre}
              </option>
            ))}
          </select>
          <input type="month" name="mes" defaultValue={mesSel} className="campo w-auto" aria-label="Mes" />
          <button className="btn-primario">Ver</button>
        </form>
        {pl && (
          <>
            <a className="btn-secundario" href={`/api/panel/planilla?equipo=${pl.equipo.id}&anio=${anio}&mes=${mes}`}>
              Exportar CSV
            </a>
            <BotonImprimir />
          </>
        )}
      </Encabezado>

      {!pl ? (
        <p className="p-8 text-asfalto-500">No hay equipos cargados.</p>
      ) : (
        <article className="hoja-f068 m-8 bg-white p-6 print:m-0 print:p-0">
          <style>{`@media print { @page { size: A4 landscape; margin: 8mm; } }`}</style>
          <header className="mb-3 border-2 border-asfalto">
            <h2 className="border-b-2 border-asfalto py-1 text-center font-cartel text-2xl font-bold">
              CHECK LIST DE AUTOELEVADORES
            </h2>
            <div className="grid grid-cols-4 divide-x-2 divide-asfalto text-sm">
              <p className="px-2 py-1">
                <b>CONDUCTOR:</b> {pl.conductores.join(", ") || "—"}
              </p>
              <p className="px-2 py-1">
                <b>EQUIPO:</b> {pl.equipo.nombre} ({pl.equipo.codigo})
              </p>
              <p className="px-2 py-1">
                <b>FECHA MES:</b> {MESES[mes - 1]} {anio}
              </p>
              <p className="px-2 py-1">
                <b>FIRMA:</b> digital por control (ver fila Conductor)
              </p>
            </div>
          </header>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[11px] leading-tight">
              <thead>
                <tr>
                  <th className="border border-asfalto px-1 text-left">CONTROL</th>
                  {dias.map((d) => (
                    <th key={d} className="w-6 border border-asfalto text-center">
                      {d}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="bg-hormigon-claro">
                  <td className="border border-asfalto px-1 font-semibold">Conductor</td>
                  {dias.map((d) => (
                    <td key={d} className="border border-asfalto text-center" title={porDia.get(d)?.operario}>
                      {porDia.get(d)?.operario
                        .split(/\s+/)
                        .map((p) => p[0])
                        .join("") ?? ""}
                    </td>
                  ))}
                </tr>
                <tr className="bg-hormigon-claro">
                  <td className="border border-asfalto px-1 font-semibold">Horas</td>
                  {dias.map((d) => (
                    <td key={d} className="border border-asfalto text-center text-[9px]">
                      {porDia.get(d)?.horas ?? ""}
                    </td>
                  ))}
                </tr>
                {pl.filas.map((f) => (
                  <tr key={f.itemId}>
                    <td className="whitespace-nowrap border border-asfalto px-1">
                      {f.texto}
                      {f.critico && <b> *</b>}
                    </td>
                    {dias.map((d) => {
                      const v = pl.celdas[`${f.itemId}-${d}`];
                      return (
                        <td
                          key={d}
                          className={`border border-asfalto text-center font-bold ${v === false ? "bg-rojo-claro text-rojo" : "text-verde"}`}
                        >
                          {v === undefined ? "" : v ? "✓" : "✗"}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-1 text-[10px] text-asfalto-500">
            Conductor: iniciales del operario que firmó el control del día (nombre completo al pasar el mouse y en el CSV).
          </p>

          <p className="mt-3 text-xs">{ACLARACION}</p>
          <p className="mt-1 text-xs font-bold">{AVISO}</p>

          <section className="mt-3 border-2 border-asfalto">
            <h3 className="border-b-2 border-asfalto px-2 py-1 text-sm font-bold">Observaciones:</h3>
            {pl.observaciones.length === 0 ? (
              <p className="px-2 py-1 text-xs text-asfalto-500">Sin observaciones en el mes.</p>
            ) : (
              <ul className="px-2 py-1 text-xs">
                {pl.observaciones.map((o, i) => (
                  <li key={i}>
                    <b>Día {o.dia}</b> · {o.item}
                    {o.critico ? " *" : ""}: {o.observacion ?? "—"}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="mt-3 border-2 border-asfalto">
            <h3 className="border-b-2 border-asfalto px-2 py-1 text-sm font-bold">
              A COMPLETAR POR EL SERVICIO DE MANTENIMIENTO DE AUTOELEVADORES
            </h3>
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr>
                  <th className="border border-asfalto px-1 text-left">Ítem</th>
                  <th className="border border-asfalto px-1 text-left">Fecha de recepción</th>
                  <th className="border border-asfalto px-1 text-left">Fecha de reparación</th>
                  <th className="border border-asfalto px-1 text-left">Responsable de la reparación</th>
                  <th className="border border-asfalto px-1 text-left">Conformidad del autoelevadorista</th>
                </tr>
              </thead>
              <tbody>
                {pl.fallas.map((f) => (
                  <tr key={f.id}>
                    <td className="border border-asfalto px-1">
                      {f.item}
                      {f.critica ? " *" : ""} <span className="text-asfalto-500">({ETIQUETA_FALLA[f.estado]})</span>
                    </td>
                    <td className="border border-asfalto px-1">{fmtFechaHora(f.fechaRecepcion)}</td>
                    <td className="border border-asfalto px-1">{fmtFecha(f.fechaReparacion)}</td>
                    <td className="border border-asfalto px-1">{f.responsable ?? ""}</td>
                    <td className="border border-asfalto px-1">
                      {f.conformidadEn ? `${f.conformidadDe} · ${fmtFechaHora(f.conformidadEn)}` : ""}
                    </td>
                  </tr>
                ))}
                {pl.fallas.length === 0 && (
                  <tr>
                    <td colSpan={5} className="border border-asfalto px-1 py-2 text-asfalto-500">
                      Sin fallas en el mes.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>
          <p className="mt-2 text-center text-xs font-semibold">F-068 Rev.2</p>
        </article>
      )}
    </div>
  );
}
