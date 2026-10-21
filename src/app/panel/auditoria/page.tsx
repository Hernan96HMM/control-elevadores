import { desc } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { fmtFechaHora } from "@/lib/time";
import { Encabezado } from "../ui";

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
      <Encabezado titulo="Auditoría" />
      <div className="px-8 py-6">
        <table className="tabla w-full rounded-lg bg-white">
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
                <td className="whitespace-nowrap">{fmtFechaHora(a.creadoEn)}</td>
                <td>{a.actor}</td>
                <td className="font-semibold">{a.accion}</td>
                <td>{a.entidad ? `${a.entidad} #${a.entidadId}` : ""}</td>
                <td className="max-w-md break-words text-xs text-asfalto-500">{a.detalle}</td>
                <td className="text-xs">{a.ip}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-4 flex gap-2">
          {pagina > 1 && (
            <a className="btn-secundario" href={`?p=${pagina - 1}`}>
              Más recientes
            </a>
          )}
          {hayMas && (
            <a className="btn-secundario" href={`?p=${pagina + 1}`}>
              Anteriores
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
