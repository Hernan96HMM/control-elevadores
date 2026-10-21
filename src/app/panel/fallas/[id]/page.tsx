import Link from "next/link";
import { notFound } from "next/navigation";
import { detalleFalla } from "@/lib/servicios/fallas";
import { ETIQUETA_FALLA } from "@/lib/estado";
import type { EstadoFalla } from "@/lib/db/schema";
import { fmtFecha, fmtFechaHora } from "@/lib/time";
import { ChipFalla, Critico, Encabezado } from "../../ui";
import FormFalla from "./FormFalla";

export const dynamic = "force-dynamic";

const autorLegible = (a: string) => a.replace(/^usuario:/, "").replace(/^operario:/, "Operario ");

export default function PaginaFalla({ params }: { params: { id: string } }) {
  const d = detalleFalla(Number(params.id));
  if (!d) notFound();
  const f = d.falla;

  return (
    <div>
      <Encabezado titulo={`Falla #${f.id}`}>
        <Link href="/panel/fallas" className="btn-secundario">
          Volver a fallas
        </Link>
      </Encabezado>
      <div className="grid gap-6 px-8 py-6 xl:grid-cols-[1fr,420px]">
        <div className="space-y-6">
          <section className={`rounded-lg border-l-8 bg-white p-5 ${f.critica ? "border-rojo" : "border-amarillo"}`}>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <ChipFalla estado={f.estado} />
              {f.critica && <Critico />}
            </div>
            <h2 className="font-cartel text-3xl font-bold">{f.itemTexto}</h2>
            <p className="text-lg">{f.descripcion ?? "Sin observación"}</p>
            <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm md:grid-cols-4">
              <div>
                <dt className="text-asfalto-500">Equipo</dt>
                <dd className="font-semibold">{d.equipo}</dd>
              </div>
              <div>
                <dt className="text-asfalto-500">Informó</dt>
                <dd className="font-semibold">{d.operario}</dd>
              </div>
              <div>
                <dt className="text-asfalto-500">Horas</dt>
                <dd className="font-semibold">{d.horas}</dd>
              </div>
              <div>
                <dt className="text-asfalto-500">Veces informada</dt>
                <dd className="font-semibold">{f.ocurrencias}</dd>
              </div>
            </dl>
            {d.fotoOriginal && (
              <a href={`/api/uploads/${d.fotoOriginal}`} target="_blank" rel="noreferrer" className="mt-4 inline-block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/uploads/${d.fotoOriginal}`} alt="Foto tomada por el operario" className="max-h-72 rounded" />
              </a>
            )}
          </section>

          <section className="rounded-lg bg-white p-5">
            <h2 className="mb-3 font-cartel text-2xl font-bold">A completar por el Servicio de Mantenimiento</h2>
            <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
              <div>
                <dt className="text-sm text-asfalto-500">Fecha de recepción</dt>
                <dd className="font-semibold">{fmtFechaHora(f.fechaRecepcion)}</dd>
              </div>
              <div>
                <dt className="text-sm text-asfalto-500">Fecha de reparación</dt>
                <dd className="font-semibold">{fmtFecha(f.fechaReparacion)}</dd>
              </div>
              <div>
                <dt className="text-sm text-asfalto-500">Responsable de la reparación</dt>
                <dd className="font-semibold">{f.responsableReparacion ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-sm text-asfalto-500">Conformidad del autoelevadorista</dt>
                <dd className="font-semibold">
                  {f.conformidadEn ? `${d.conformidadDe} · ${fmtFechaHora(f.conformidadEn)}` : "Pendiente"}
                </dd>
              </div>
            </dl>
          </section>

          <section className="rounded-lg bg-white p-5">
            <h2 className="mb-3 font-cartel text-2xl font-bold">Historial</h2>
            <ol className="space-y-3">
              {d.eventos.map((e) => (
                <li key={e.id} className="border-l-4 border-hormigon pl-3">
                  <p className="text-sm text-asfalto-500">
                    {fmtFechaHora(e.creadoEn)} · {autorLegible(e.autor)}
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
                      <img src={`/api/uploads/${e.foto}`} alt="Foto adjunta" className="mt-1 max-h-40 rounded" />
                    </a>
                  )}
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside>
          <FormFalla
            id={f.id}
            estado={f.estado}
            critica={f.critica}
            responsable={f.responsableReparacion ?? ""}
            fechaReparacion={f.fechaReparacion ?? ""}
          />
        </aside>
      </div>
    </div>
  );
}
