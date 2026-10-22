import Link from "next/link";
import { notFound } from "next/navigation";
import { detalleFalla } from "@/lib/servicios/fallas";
import { ETIQUETA_FALLA } from "@/lib/estado";
import { ESTADOS_FALLA, type EstadoFalla } from "@/lib/db/schema";
import { fmtFecha, fmtFechaHora } from "@/lib/time";
import { boton } from "@/components/Button";
import Card from "@/components/Card";
import Icono from "@/components/Icono";
import { ChipFalla, Contenido, Critico, Encabezado } from "../../ui";
import FormFalla from "./FormFalla";

export const dynamic = "force-dynamic";

const autorLegible = (a: string) => a.replace(/^usuario:/, "").replace(/^operario:/, "Operario ");

/** Línea de tiempo del flujo del F-068: Abierta → En reparación → Resuelta → Conformidad. */
function Flujo({ estado, fechas }: { estado: EstadoFalla; fechas: Partial<Record<EstadoFalla, string>> }) {
  const actual = ESTADOS_FALLA.indexOf(estado);
  return (
    <ol className="grid grid-cols-4" aria-label="Estado de la falla">
      {ESTADOS_FALLA.map((e, i) => {
        const cerrada = estado === "conformidad";
        const hecho = i < actual || cerrada;
        const esActual = i === actual && !cerrada;
        return (
          <li key={e} className="relative flex flex-col items-center text-center" aria-current={esActual ? "step" : undefined}>
            {i > 0 && (
              <span
                className={`absolute right-1/2 top-4 h-1 w-full -translate-y-1/2 ${i <= actual ? "bg-sica-navy" : "bg-linea"}`}
                aria-hidden
              />
            )}
            <span
              className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-bold ${
                hecho
                  ? "border-sica-navy bg-sica-navy text-white"
                  : esActual
                    ? "border-sica-cyan bg-superficie text-sica-navy ring-4 ring-sica-cyan-50"
                    : "border-linea bg-superficie text-tinta-3"
              }`}
            >
              {hecho ? <Icono nombre="check" className="h-4 w-4" /> : i + 1}
            </span>
            <span className={`mt-2 text-sm font-semibold ${esActual ? "text-sica-navy" : hecho ? "text-tinta" : "text-tinta-3"}`}>
              {ETIQUETA_FALLA[e]}
            </span>
            {fechas[e] && <span className="text-xs tabular-nums text-tinta-2">{fmtFechaHora(fechas[e])}</span>}
          </li>
        );
      })}
    </ol>
  );
}

export default function PaginaFalla({ params }: { params: { id: string } }) {
  const d = detalleFalla(Number(params.id));
  if (!d) notFound();
  const f = d.falla;

  // Fecha en que se llegó a cada estado (último evento que lo alcanzó).
  const fechas: Partial<Record<EstadoFalla, string>> = { abierta: f.fechaRecepcion };
  for (const e of d.eventos) if (e.tipo === "estado" && e.estadoHasta) fechas[e.estadoHasta as EstadoFalla] = e.creadoEn;

  return (
    <div>
      <Encabezado titulo={`Falla #${f.id}`}>
        <Link href="/panel/fallas" className={boton({ variante: "secundario" })}>
          <Icono nombre="volver" className="h-5 w-5" /> Volver a fallas
        </Link>
      </Encabezado>
      <Contenido className="grid gap-6 space-y-0 xl:grid-cols-[1fr,400px]">
        <div className="min-w-0 space-y-6">
          <section
            className={`rounded-lg border border-linea border-l-4 bg-superficie p-5 shadow-tarjeta ${f.critica ? "border-l-fs" : "border-l-obs-acento"}`}
          >
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <ChipFalla estado={f.estado} />
              {f.critica && <Critico grande />}
            </div>
            <h2 className="text-2xl font-bold text-sica-navy">{f.itemTexto}</h2>
            <p className="text-lg">{f.descripcion ?? "Sin observación"}</p>
            <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm md:grid-cols-4">
              {[
                ["Equipo", d.equipo],
                ["Informó", d.operario],
                ["Horas", String(d.horas)],
                ["Veces informada", String(f.ocurrencias)],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-tinta-2">{k}</dt>
                  <dd className="font-semibold">{v}</dd>
                </div>
              ))}
            </dl>
            {d.fotoOriginal && (
              <a href={`/api/uploads/${d.fotoOriginal}`} target="_blank" rel="noreferrer" className="mt-4 inline-block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/uploads/${d.fotoOriginal}`}
                  alt="Foto tomada por el operario"
                  className="max-h-72 rounded border border-linea"
                />
              </a>
            )}
          </section>

          <Card titulo="Seguimiento">
            <Flujo estado={f.estado} fechas={fechas} />
          </Card>

          <Card titulo="A completar por el Servicio de Mantenimiento">
            <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
              <div>
                <dt className="text-sm text-tinta-2">Fecha de recepción</dt>
                <dd className="font-semibold tabular-nums">{fmtFechaHora(f.fechaRecepcion)}</dd>
              </div>
              <div>
                <dt className="text-sm text-tinta-2">Fecha de reparación</dt>
                <dd className="font-semibold tabular-nums">{fmtFecha(f.fechaReparacion)}</dd>
              </div>
              <div>
                <dt className="text-sm text-tinta-2">Responsable de la reparación</dt>
                <dd className="font-semibold">{f.responsableReparacion ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-sm text-tinta-2">Conformidad del autoelevadorista</dt>
                <dd className="font-semibold">
                  {f.conformidadEn ? `${d.conformidadDe} · ${fmtFechaHora(f.conformidadEn)}` : "Pendiente"}
                </dd>
              </div>
            </dl>
          </Card>

          <Card titulo="Historial, comentarios y fotos">
            <ol className="relative space-y-5 border-l-2 border-linea pl-6">
              {d.eventos.map((e) => (
                <li key={e.id} className="relative">
                  <span
                    className={`absolute -left-[33px] top-0.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-superficie ${
                      e.tipo === "estado" ? "bg-sica-navy text-white" : "bg-sica-cyan-50 text-sica-navy"
                    }`}
                    aria-hidden
                  >
                    <Icono nombre={e.tipo === "estado" ? "check" : e.tipo === "ocurrencia" ? "alerta" : "info"} className="h-3.5 w-3.5" />
                  </span>
                  <p className="text-sm text-tinta-2">
                    <span className="tabular-nums">{fmtFechaHora(e.creadoEn)}</span> · {autorLegible(e.autor)}
                  </p>
                  <p className="font-semibold">
                    {e.tipo === "estado"
                      ? e.estadoDesde
                        ? `${ETIQUETA_FALLA[e.estadoDesde as EstadoFalla]} → ${ETIQUETA_FALLA[e.estadoHasta as EstadoFalla]}`
                        : "Falla informada"
                      : e.tipo === "ocurrencia"
                        ? "Volvió a informarse en otro control"
                        : "Comentario"}
                  </p>
                  {e.comentario && <p>{e.comentario}</p>}
                  {e.foto && (
                    <a href={`/api/uploads/${e.foto}`} target="_blank" rel="noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`/api/uploads/${e.foto}`} alt="Foto adjunta" className="mt-2 max-h-40 rounded border border-linea" />
                    </a>
                  )}
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <aside className="min-w-0">
          <FormFalla
            id={f.id}
            estado={f.estado}
            critica={f.critica}
            responsable={f.responsableReparacion ?? ""}
            fechaReparacion={f.fechaReparacion ?? ""}
          />
        </aside>
      </Contenido>
    </div>
  );
}
