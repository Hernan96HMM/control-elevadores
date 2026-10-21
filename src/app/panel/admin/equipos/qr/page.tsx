import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { requerirUsuario } from "@/lib/sesion";
import { qrSvg, urlEquipo } from "@/lib/qr";
import BotonImprimir from "../../../planilla/BotonImprimir";

export const dynamic = "force-dynamic";

// Hoja imprimible de QR: "a4" = un QR grande por hoja; "etiqueta" = 6 por A4 (2×3) para recortar.
export default async function PaginaQR({ searchParams }: { searchParams: { formato?: string; equipo?: string } }) {
  await requerirUsuario("admin");
  const formato = searchParams.formato === "etiqueta" ? "etiqueta" : "a4";
  const db = getDb();
  const equipos = searchParams.equipo
    ? db.select().from(schema.equipos).where(eq(schema.equipos.id, Number(searchParams.equipo))).all()
    : db.select().from(schema.equipos).where(eq(schema.equipos.activo, true)).orderBy(asc(schema.equipos.nombre)).all();
  const qrs = await Promise.all(equipos.map(async (e) => ({ ...e, url: urlEquipo(e.codigo), svg: await qrSvg(urlEquipo(e.codigo)) })));

  return (
    <div className="bg-white">
      <style>{`@media print { @page { size: A4 portrait; margin: ${formato === "a4" ? "15mm" : "8mm"}; } }`}</style>
      <div className="no-imprimir flex items-center gap-3 border-b border-hormigon px-8 py-4">
        <Link href="/panel/admin/equipos" className="btn-secundario">
          Volver
        </Link>
        <BotonImprimir />
        <span className="text-sm text-asfalto-500">
          {formato === "a4" ? "Un QR por hoja A4" : "6 etiquetas por hoja A4"} · {qrs.length} equipo(s)
        </span>
      </div>

      {formato === "a4" ? (
        qrs.map((q) => (
          <section
            key={q.id}
            className="mx-auto flex max-w-[180mm] flex-col items-center px-8 py-10 text-center [break-after:page] print:h-[267mm] print:justify-center print:py-0"
          >
            <div className="cinta-peligro mb-6 h-6 w-full [print-color-adjust:exact]" />
            <h1 className="font-cartel text-6xl font-bold">{q.nombre}</h1>
            <p className="mb-4 text-2xl">Control diario antes de usar</p>
            <div className="w-[120mm]" dangerouslySetInnerHTML={{ __html: q.svg }} />
            <p className="mt-4 text-xl font-semibold">Escaneá con la cámara del celular</p>
            <p className="mt-1 font-mono text-base">{q.url}</p>
            <p className="mt-6 max-w-[150mm] text-base">
              Ante la falta de elementos de seguridad, el equipo no podrá ser utilizado; de hacerlo será responsabilidad directa
              del conductor.
            </p>
            <div className="cinta-peligro mt-6 h-6 w-full [print-color-adjust:exact]" />
            <p className="mt-2 text-sm">F-068 Rev.2 · {q.codigo}</p>
          </section>
        ))
      ) : (
        <div className="mx-auto grid max-w-[194mm] grid-cols-2 gap-[4mm] p-8 print:p-0">
          {qrs.map((q) => (
            <section
              key={q.id}
              className="flex h-[90mm] flex-col items-center justify-center border-2 border-dashed border-asfalto-300 p-3 text-center [break-inside:avoid]"
            >
              <h2 className="font-cartel text-3xl font-bold leading-none">{q.nombre}</h2>
              <p className="text-sm">Control diario antes de usar</p>
              <div className="my-2 w-[55mm]" dangerouslySetInnerHTML={{ __html: q.svg }} />
              <p className="font-mono text-[10px]">{q.url}</p>
              <p className="text-[10px]">F-068 Rev.2</p>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
