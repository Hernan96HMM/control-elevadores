import Link from "next/link";
import { asc } from "drizzle-orm";
import { listarFallas } from "@/lib/servicios/fallas";
import { getDb, schema } from "@/lib/db";
import { ESTADOS_FALLA, type EstadoFalla } from "@/lib/db/schema";
import { ETIQUETA_FALLA } from "@/lib/estado";
import { fmtFecha, fmtFechaHora } from "@/lib/time";
import { ChipFalla, Critico, Encabezado } from "../ui";

export const dynamic = "force-dynamic";

const FILTROS: { clave: string; etiqueta: string; estados: EstadoFalla[] }[] = [
  { clave: "pendientes", etiqueta: "Sin resolver", estados: ["abierta", "en_reparacion"] },
  { clave: "resuelta", etiqueta: "Esperando conformidad", estados: ["resuelta"] },
  { clave: "conformidad", etiqueta: "Cerradas", estados: ["conformidad"] },
  { clave: "todas", etiqueta: "Todas", estados: [...ESTADOS_FALLA] },
];

export default function PaginaFallas({ searchParams }: { searchParams: { f?: string; equipo?: string } }) {
  const filtro = FILTROS.find((f) => f.clave === searchParams.f) ?? FILTROS[0];
  const equipoId = Number(searchParams.equipo) || undefined;
  const fallas = listarFallas({ estados: filtro.estados, equipoId });
  const equipos = getDb().select().from(schema.equipos).orderBy(asc(schema.equipos.nombre)).all();
  const qs = (f: string, e?: number) => `?f=${f}${e ? `&equipo=${e}` : ""}`;

  return (
    <div>
      <Encabezado titulo="Fallas" />
      <div className="space-y-4 px-8 py-6">
        <div className="flex flex-wrap items-center gap-2">
          {FILTROS.map((f) => (
            <Link
              key={f.clave}
              href={qs(f.clave, equipoId)}
              className={`rounded-full px-3 py-1 text-sm font-semibold ${f.clave === filtro.clave ? "bg-asfalto text-white" : "bg-white text-asfalto"}`}
            >
              {f.etiqueta}
            </Link>
          ))}
          <span className="mx-2 text-asfalto-300">|</span>
          <Link
            href={qs(filtro.clave)}
            className={`rounded-full px-3 py-1 text-sm ${!equipoId ? "bg-amarillo font-semibold" : "bg-white"}`}
          >
            Todos los equipos
          </Link>
          {equipos.map((e) => (
            <Link
              key={e.id}
              href={qs(filtro.clave, e.id)}
              className={`rounded-full px-3 py-1 text-sm ${equipoId === e.id ? "bg-amarillo font-semibold" : "bg-white"}`}
            >
              {e.nombre}
            </Link>
          ))}
        </div>

        {fallas.length === 0 ? (
          <p className="rounded-lg bg-white p-6 text-asfalto-500">No hay fallas con este filtro.</p>
        ) : (
          <table className="tabla w-full rounded-lg bg-white">
            <thead>
              <tr>
                <th>N.º</th>
                <th>Equipo</th>
                <th>Ítem / observación</th>
                <th>Informó</th>
                <th>Recepción</th>
                <th>Reparación</th>
                <th>Responsable</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {fallas.map((f) => (
                <tr key={f.id} className="hover:bg-hormigon-claro">
                  <td>
                    <Link href={`/panel/fallas/${f.id}`} className="font-semibold underline">
                      #{f.id}
                    </Link>
                  </td>
                  <td>{f.equipo}</td>
                  <td>
                    <Link href={`/panel/fallas/${f.id}`} className="font-semibold hover:underline">
                      {f.item}
                    </Link>
                    {f.critica && <Critico />}
                    {f.descripcion && <span className="block text-asfalto-500">{f.descripcion}</span>}
                    {f.ocurrencias > 1 && <span className="block text-xs text-naranja">Informada {f.ocurrencias} veces</span>}
                  </td>
                  <td>{f.operario}</td>
                  <td>{fmtFechaHora(f.fechaRecepcion)}</td>
                  <td>{fmtFecha(f.fechaReparacion)}</td>
                  <td>{f.responsable ?? "—"}</td>
                  <td>
                    <ChipFalla estado={f.estado} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="text-sm text-asfalto-500">
          Flujo: {ESTADOS_FALLA.map((e) => ETIQUETA_FALLA[e]).join(" → ")}. Al marcar una falla crítica como resuelta el equipo
          vuelve a estar habilitado; la conformidad la da el operario desde su celular.
        </p>
      </div>
    </div>
  );
}
