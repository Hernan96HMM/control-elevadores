import { desc } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { fmtFechaHora } from "@/lib/time";
import { boton } from "@/components/Button";
import { Contenido, Encabezado, TablaContenedor } from "../ui";

export const dynamic = "force-dynamic";

export default function PaginaAuditoria({ searchParams }: { searchParams: { p?: string } }) {
  const pagina = Math.max(1, Number(searchParams.p) || 1);
  const tam = 100;
  const filas = getDb()
    .select()
    .from(schema.auditoria)
    .orderBy(desc(schema.auditoria.id))
    .limit(tam + 1)
    .offset((pagina - 1) * tam)
    .all();
  const hayMas = filas.length > tam;

  return (
    <div>
      <Encabezado titulo="Auditoría" descripcion="Ingresos, controles, cambios de estado y modificaciones de administración." />
      <Contenido>
        <TablaContenedor>
          <table className="tabla">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Quién</th>
                <th>Acción</th>
                <th>Sobre</th>
                <th>Detalle</th>
                <th>IP</th>
              </tr>
            </thead>
            <tbody>
              {filas.slice(0, tam).map((a) => (
                <tr key={a.id}>
                  <td className="whitespace-nowrap tabular-nums">{fmtFechaHora(a.creadoEn)}</td>
                  <td>{a.actor}</td>
                  <td className="whitespace-nowrap font-semibold text-sica-navy">{a.accion}</td>
                  <td className="whitespace-nowrap">{a.entidad ? `${a.entidad} #${a.entidadId}` : ""}</td>
                  <td className="max-w-md break-words text-xs text-tinta-2">{a.detalle}</td>
                  <td className="text-xs tabular-nums">{a.ip}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TablaContenedor>
        <div className="flex gap-2">
          {pagina > 1 && (
            <a className={boton({ variante: "secundario" })} href={`?p=${pagina - 1}`}>
              Más recientes
            </a>
          )}
          {hayMas && (
            <a className={boton({ variante: "secundario" })} href={`?p=${pagina + 1}`}>
              Anteriores
            </a>
          )}
        </div>
      </Contenido>
    </div>
  );
}
