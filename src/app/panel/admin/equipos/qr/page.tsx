import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { requerirUsuario } from "@/lib/sesion";
import { qrSvg, urlEquipo } from "@/lib/qr";
import BrandLogo from "@/components/BrandLogo";
import { boton } from "@/components/Button";
import Icono from "@/components/Icono";
import BotonImprimir from "../../../planilla/BotonImprimir";

export const dynamic = "force-dynamic";

const LEYENDA = "Escaneá para completar el control diario";

// Hoja imprimible de QR: "a4" = un QR grande por hoja; "etiqueta" = 6 por A4 (2×3) para recortar.
// El QR va siempre negro sobre blanco con zona de silencio: la marca va alrededor, nunca encima.
export default async function PaginaQR({ searchParams }: { searchParams: { formato?: string; equipo?: string } }) {
  await requerirUsuario("admin");
  const formato = searchParams.formato === "etiqueta" ? "etiqueta" : "a4";
  const db = getDb();
  const equipos = searchParams.equipo
    ? db.select().from(schema.equipos).where(eq(schema.equipos.id, Number(searchParams.equipo))).all()
    : db.select().from(schema.equipos).where(eq(schema.equipos.activo, true)).orderBy(asc(schema.equipos.nombre)).all();
  const qrs = await Promise.all(equipos.map(async (e) => ({ ...e, url: urlEquipo(e.codigo), svg: await qrSvg(urlEquipo(e.codigo)) })));

  return (
    <div className="bg-superficie">
      <style>{`@media print { @page { size: A4 portrait; margin: ${formato === "a4" ? "15mm" : "8mm"}; } }`}</style>
      <div className="no-imprimir flex flex-wrap items-center gap-3 border-b border-linea px-6 py-4 lg:px-8">
        <Link href="/panel/admin/equipos" className={boton({ variante: "secundario" })}>
          <Icono nombre="volver" className="h-5 w-5" /> Volver
        </Link>
        <BotonImprimir />
        <span className="text-sm text-tinta-2">
          {formato === "a4" ? "Un QR por hoja A4" : "6 etiquetas por hoja A4"} · {qrs.length} equipo(s) · Imprimir al 100 %, sin ajustar a
          página.
        </span>
      </div>

      {formato === "a4" ? (
        qrs.map((q) => (
          <section
            key={q.id}
            className="mx-auto flex max-w-[180mm] flex-col items-center px-8 py-10 text-center [break-after:page] print:h-[267mm] print:justify-center print:py-0"
          >
            <BrandLogo variant="completo" tone="positivo" size={64} />
            <span className="mt-6 block h-1 w-24 rounded bg-sica-cyan [print-color-adjust:exact]" aria-hidden />
            <h1 className="mt-6 text-6xl font-bold text-sica-navy">{q.nombre}</h1>
            <p className="mt-1 text-xl text-tinta-2">Código {q.codigo}</p>
            <div className="mt-6 w-[120mm] bg-white" dangerouslySetInnerHTML={{ __html: q.svg }} />
            <p className="mt-4 text-2xl font-semibold text-sica-navy">{LEYENDA}</p>
            <p className="mt-1 text-base text-tinta-2">Con la cámara del celular, conectado al wifi de planta.</p>
            <p className="mt-2 break-all text-base">{q.url}</p>
            <p className="mt-8 max-w-[150mm] border-t border-linea pt-4 text-base font-semibold">
              Ante la falta de elementos de seguridad, el equipo no podrá ser utilizado; de hacerlo será responsabilidad directa del
              conductor.
            </p>
            <p className="mt-3 text-sm text-tinta-2">F-068 Rev.2 · SICA Metalúrgica Argentina S.A.</p>
          </section>
        ))
      ) : (
        <div className="mx-auto grid max-w-[194mm] grid-cols-2 gap-[4mm] p-8 print:p-0">
          {qrs.map((q) => (
            <section
              key={q.id}
              className="flex h-[90mm] flex-col items-center justify-center rounded border border-dashed border-linea p-3 text-center [break-inside:avoid] print:rounded-none print:border-tinta-3"
            >
              <div className="flex items-center gap-2">
                <BrandLogo variant="isotipo" tone="positivo" size={22} />
                <h2 className="text-3xl font-bold leading-none text-sica-navy">{q.nombre}</h2>
              </div>
              <div className="my-1.5 w-[52mm] bg-white" dangerouslySetInnerHTML={{ __html: q.svg }} />
              <p className="text-sm font-semibold text-sica-navy">{LEYENDA}</p>
              <p className="break-all text-[10px] text-tinta-2">{q.url}</p>
              <p className="text-[10px] text-tinta-2">F-068 Rev.2 · {q.codigo}</p>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
