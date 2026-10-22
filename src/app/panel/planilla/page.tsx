import { asc } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { planillaMensual } from "@/lib/servicios/planilla";
import { ETIQUETA_FALLA } from "@/lib/estado";
import { MESES, fechaAR, fmtFecha, fmtFechaHora } from "@/lib/time";
import BrandLogo from "@/components/BrandLogo";
import Button, { boton } from "@/components/Button";
import Icono from "@/components/Icono";
import { Encabezado } from "../ui";
import BotonImprimir from "./BotonImprimir";

export const dynamic = "force-dynamic";

const ACLARACION =
  "Aclaración: en el caso que se encuentre incorrecto marcar con una cruz y colocar en el recuadro de observaciones. Los ítems señalados con asterisco (*) requieren su reparación y/o reemplazo antes de la operación del equipo. Respecto a los demás ítems se deberá programar la reparación con Mantenimiento. En el caso que se encuentre correcto marcar con un tilde.";
const AVISO =
  "Ante la falta de elementos de seguridad, EL EQUIPO NO PODRÁ SER UTILIZADO; en caso de hacerlo será responsabilidad directa del conductor.";

// Celdas: borde fino; en pantalla, falla con fondo suave; en papel, solo el símbolo (sin gastar tinta).
const CELDA = "border border-linea print:border-tinta";
const STICKY_COL = "sticky left-0 z-10 bg-superficie print:static";

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
      <Encabezado titulo="Planilla mensual" descripcion="Igual al F-068 en papel: ítems × días del mes, con tilde o cruz.">
        <form className="flex flex-wrap items-end gap-2">
          <select name="equipo" defaultValue={equipoId} className="campo w-auto" aria-label="Equipo">
            {equipos.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nombre}
              </option>
            ))}
          </select>
          <input type="month" name="mes" defaultValue={mesSel} className="campo w-auto" aria-label="Mes" />
          <Button>Ver</Button>
        </form>
        {pl && (
          <>
            <a className={boton({ variante: "secundario" })} href={`/api/panel/planilla?equipo=${pl.equipo.id}&anio=${anio}&mes=${mes}`}>
              <Icono nombre="descargar" className="h-5 w-5" /> Exportar CSV
            </a>
            <BotonImprimir />
          </>
        )}
      </Encabezado>

      {!pl ? (
        <p className="px-8 py-6 text-tinta-2">No hay equipos cargados.</p>
      ) : (
        <article className="mx-6 my-5 rounded-lg border border-linea bg-superficie p-6 shadow-tarjeta lg:mx-8 print:m-0 print:rounded-none print:border-0 print:p-0 print:shadow-none">
          <style>{`@media print { @page { size: A4 landscape; margin: 8mm; } }`}</style>
          <header className="mb-3 flex items-center justify-between gap-4 border-b-2 border-sica-navy pb-3">
            <BrandLogo variant="completo" tone="positivo" size={56} />
            <h2 className="text-center text-2xl font-bold text-sica-navy">Check list de autoelevadores</h2>
            <span className="text-right text-sm font-semibold text-sica-navy">F-068 Rev.2</span>
          </header>
          <dl className="mb-3 grid grid-cols-2 gap-x-6 gap-y-1 text-sm md:grid-cols-4">
            <div>
              <dt className="inline font-semibold text-sica-navy">Conductor: </dt>
              <dd className="inline">{pl.conductores.join(", ") || "—"}</dd>
            </div>
            <div>
              <dt className="inline font-semibold text-sica-navy">Equipo: </dt>
              <dd className="inline">
                {pl.equipo.nombre} ({pl.equipo.codigo})
              </dd>
            </div>
            <div>
              <dt className="inline font-semibold text-sica-navy">Fecha mes: </dt>
              <dd className="inline">
                {MESES[mes - 1]} {anio}
              </dd>
            </div>
            <div>
              <dt className="inline font-semibold text-sica-navy">Firma: </dt>
              <dd className="inline">digital por control (fila Conductor)</dd>
            </div>
          </dl>

          {/* Encabezado de días y columna de ítems fijos al desplazar. */}
          <div className="max-h-[70vh] overflow-auto rounded border border-linea print:max-h-none print:overflow-visible print:border-0">
            <table className="w-full border-collapse text-[12px] leading-tight print:text-[10px]">
              <thead className="sticky top-0 z-20 bg-sica-navy text-white print:static print:bg-transparent print:text-tinta">
                <tr>
                  <th className={`${CELDA} sticky left-0 z-30 min-w-[220px] bg-sica-navy px-2 py-1.5 text-left print:static print:bg-transparent`}>
                    Control
                  </th>
                  {dias.map((d) => (
                    <th key={d} className={`${CELDA} w-7 min-w-[28px] text-center tabular-nums`}>
                      {d}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="bg-sica-navy-50 print:bg-transparent">
                  <td className={`${CELDA} ${STICKY_COL} bg-sica-navy-50 px-2 font-semibold print:bg-transparent`}>Conductor</td>
                  {dias.map((d) => (
                    <td key={d} className={`${CELDA} text-center`} title={porDia.get(d)?.operario}>
                      {porDia
                        .get(d)
                        ?.operario.split(/\s+/)
                        .map((p) => p[0])
                        .join("") ?? ""}
                    </td>
                  ))}
                </tr>
                <tr className="bg-sica-navy-50 print:bg-transparent">
                  <td className={`${CELDA} ${STICKY_COL} bg-sica-navy-50 px-2 font-semibold print:bg-transparent`}>Horas</td>
                  {dias.map((d) => (
                    <td key={d} className={`${CELDA} text-center text-[10px] tabular-nums`}>
                      {porDia.get(d)?.horas ?? ""}
                    </td>
                  ))}
                </tr>
                {pl.filas.map((f) => (
                  <tr key={f.itemId}>
                    <td className={`${CELDA} ${STICKY_COL} whitespace-nowrap px-2 py-1`}>
                      {f.texto}
                      {f.critico && (
                        <span className="ml-1 font-bold text-fs print:text-tinta" title="Ítem crítico">
                          *
                        </span>
                      )}
                    </td>
                    {dias.map((d) => {
                      const v = pl.celdas[`${f.itemId}-${d}`];
                      return (
                        <td
                          key={d}
                          className={`${CELDA} text-center text-sm font-bold ${
                            v === false ? "bg-fs-bg text-fs print:bg-transparent print:text-tinta" : "text-ok print:text-tinta"
                          }`}
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
          <p className="mt-1 text-[11px] text-tinta-2">
            Conductor: iniciales del operario que firmó el control del día (nombre completo al pasar el mouse y en el CSV). * Ítem
            crítico.
          </p>

          <p className="mt-3 text-xs">{ACLARACION}</p>
          <p className="mt-1 text-xs font-bold">{AVISO}</p>

          <section className="mt-4 rounded border border-linea print:border-tinta">
            <h3 className="border-b border-linea px-3 py-1.5 text-sm font-bold text-sica-navy print:border-tinta">Observaciones</h3>
            {pl.observaciones.length === 0 ? (
              <p className="px-3 py-2 text-xs text-tinta-2">Sin observaciones en el mes.</p>
            ) : (
              <ul className="px-3 py-2 text-xs">
                {pl.observaciones.map((o, i) => (
                  <li key={i}>
                    <b>Día {o.dia}</b> · {o.item}
                    {o.critico ? " *" : ""}: {o.observacion ?? "—"}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="mt-4 overflow-x-auto rounded border border-linea print:border-tinta">
            <h3 className="border-b border-linea px-3 py-1.5 text-sm font-bold text-sica-navy print:border-tinta">
              A completar por el Servicio de Mantenimiento de autoelevadores
            </h3>
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="text-left text-sica-navy">
                  {["Ítem", "Fecha de recepción", "Fecha de reparación", "Responsable de la reparación", "Conformidad del autoelevadorista"].map(
                    (h) => (
                      <th key={h} className={`${CELDA} px-2 py-1`}>
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {pl.fallas.map((f) => (
                  <tr key={f.id}>
                    <td className={`${CELDA} px-2 py-1`}>
                      {f.item}
                      {f.critica ? " *" : ""} <span className="text-tinta-2">({ETIQUETA_FALLA[f.estado]})</span>
                    </td>
                    <td className={`${CELDA} px-2 py-1 tabular-nums`}>{fmtFechaHora(f.fechaRecepcion)}</td>
                    <td className={`${CELDA} px-2 py-1 tabular-nums`}>{fmtFecha(f.fechaReparacion)}</td>
                    <td className={`${CELDA} px-2 py-1`}>{f.responsable ?? ""}</td>
                    <td className={`${CELDA} px-2 py-1`}>
                      {f.conformidadEn ? `${f.conformidadDe} · ${fmtFechaHora(f.conformidadEn)}` : ""}
                    </td>
                  </tr>
                ))}
                {pl.fallas.length === 0 && (
                  <tr>
                    <td colSpan={5} className={`${CELDA} px-2 py-2 text-tinta-2`}>
                      Sin fallas en el mes.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>
          <footer className="mt-3 flex flex-wrap justify-between gap-2 border-t border-linea pt-2 text-[11px] text-tinta-2 print:border-tinta">
            <span>SICA Metalúrgica Argentina S.A. · R. P. Kreder 3746, Esperanza (3080), Santa Fe, Argentina · www.sica.com.ar</span>
            <span className="font-semibold text-sica-navy">F-068 Rev.2</span>
          </footer>
        </article>
      )}
    </div>
  );
}
