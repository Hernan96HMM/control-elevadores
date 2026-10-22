import Link from "next/link";
import { asc } from "drizzle-orm";
import { listarFallas } from "@/lib/servicios/fallas";
import { getDb, schema } from "@/lib/db";
import { ESTADOS_FALLA, type EstadoFalla } from "@/lib/db/schema";
import { fmtFecha, fmtFechaHora } from "@/lib/time";
import Icono from "@/components/Icono";
import { ChipFalla, Contenido, Critico, Encabezado, TablaContenedor } from "../ui";

export const dynamic = "force-dynamic";

const FILTROS: { clave: string; etiqueta: string; estados: EstadoFalla[] }[] = [
  { clave: "pendientes", etiqueta: "Sin resolver", estados: ["abierta", "en_reparacion"] },
  { clave: "resuelta", etiqueta: "Esperando conformidad", estados: ["resuelta"] },
  { clave: "conformidad", etiqueta: "Cerradas", estados: ["conformidad"] },
  { clave: "todas", etiqueta: "Todas", estados: [...ESTADOS_FALLA] },
];

function Filtro({ href, activo, children }: { href: string; activo: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={activo ? "true" : undefined}
      className={`inline-flex min-h-[36px] items-center rounded-full border px-3.5 text-sm font-semibold ${
        activo ? "border-sica-navy bg-sica-navy text-white" : "border-linea bg-superficie text-sica-navy hover:border-sica-navy"
      }`}
    >
      {children}
    </Link>
  );
}

export default function PaginaFallas({ searchParams }: { searchParams: { f?: string; equipo?: string } }) {
  const filtro = FILTROS.find((f) => f.clave === searchParams.f) ?? FILTROS[0];
  const equipoId = Number(searchParams.equipo) || undefined;
  const fallas = listarFallas({ estados: filtro.estados, equipoId });
  const equipos = getDb().select().from(schema.equipos).orderBy(asc(schema.equipos.nombre)).all();
  const qs = (f: string, e?: number) => `?f=${f}${e ? `&equipo=${e}` : ""}`;

  return (
    <div>
      <Encabezado
        titulo="Fallas"
        descripcion="Sección «A completar por el Servicio de Mantenimiento» del F-068. Al marcar Resuelta una falla crítica, el equipo vuelve a estar habilitado."
      />
      <Contenido>
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Estado">
            <span className="mr-1 text-sm font-semibold text-tinta-2">Estado</span>
            {FILTROS.map((f) => (
              <Filtro key={f.clave} href={qs(f.clave, equipoId)} activo={f.clave === filtro.clave}>
                {f.etiqueta}
              </Filtro>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Equipo">
            <span className="mr-1 text-sm font-semibold text-tinta-2">Equipo</span>
            <Filtro href={qs(filtro.clave)} activo={!equipoId}>
              Todos
            </Filtro>
            {equipos.map((e) => (
              <Filtro key={e.id} href={qs(filtro.clave, e.id)} activo={equipoId === e.id}>
                {e.nombre}
              </Filtro>
            ))}
          </div>
        </div>

        {fallas.length === 0 ? (
          <div className="flex items-center gap-3 rounded-lg border border-dashed border-linea bg-superficie p-6 text-tinta-2">
            <Icono nombre="okCirculo" className="h-6 w-6 text-ok" /> No hay fallas con este filtro.
          </div>
        ) : (
          <TablaContenedor>
            <table className="tabla">
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
                  <tr key={f.id}>
                    <td>
                      <Link href={`/panel/fallas/${f.id}`} className="font-semibold text-sica-navy underline">
                        #{f.id}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap">{f.equipo}</td>
                    <td className="min-w-[220px]">
                      <span className="flex flex-wrap items-center gap-2">
                        <Link href={`/panel/fallas/${f.id}`} className="font-semibold text-sica-navy hover:underline">
                          {f.item}
                        </Link>
                        {f.critica && <Critico />}
                      </span>
                      {f.descripcion && <span className="block text-tinta-2">{f.descripcion}</span>}
                      {f.ocurrencias > 1 && <span className="block text-xs font-semibold text-obs">Informada {f.ocurrencias} veces</span>}
                    </td>
                    <td className="whitespace-nowrap">{f.operario}</td>
                    <td className="whitespace-nowrap tabular-nums">{fmtFechaHora(f.fechaRecepcion)}</td>
                    <td className="whitespace-nowrap tabular-nums">{fmtFecha(f.fechaReparacion)}</td>
                    <td>{f.responsable ?? "—"}</td>
                    <td>
                      <ChipFalla estado={f.estado} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TablaContenedor>
        )}
      </Contenido>
    </div>
  );
}
