import Link from "next/link";
import { boton } from "@/components/Button";
import Icono from "@/components/Icono";
import { asc } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { requerirUsuario } from "@/lib/sesion";
import { urlEquipo } from "@/lib/qr";
import { Encabezado } from "../../ui";
import FormAdmin from "../FormAdmin";
import { Campo, Check, FilaAbm, AltaAbm } from "../campos";
import { guardarEquipo } from "../acciones";

export const dynamic = "force-dynamic";

export default async function PaginaEquipos() {
  await requerirUsuario("admin");
  const equipos = getDb().select().from(schema.equipos).orderBy(asc(schema.equipos.nombre)).all();
  return (
    <div>
      <Encabezado titulo="Equipos y QR">
        <Link href="/panel/admin/equipos/qr?formato=a4" className={boton({ variante: "secundario" })}>
          <Icono nombre="imprimir" className="h-5 w-5" /> QR en hoja A4
        </Link>
        <Link href="/panel/admin/equipos/qr?formato=etiqueta" className={boton({ variante: "secundario" })}>
          <Icono nombre="qr" className="h-5 w-5" /> QR en etiquetas
        </Link>
      </Encabezado>
      <div className="space-y-6 px-6 py-5 lg:px-8">
        <AltaAbm titulo="Agregar equipo">
          <FormAdmin accion={guardarEquipo} boton="Agregar" limpiar>
            <Campo etiqueta="Código (va en el QR)" name="codigo" required placeholder="AE-07" className="w-40" />
            <Campo etiqueta="Nombre" name="nombre" required placeholder="Autoelevador 7" className="w-56" />
            <Campo etiqueta="Descripción" name="descripcion" placeholder="Marca, modelo, sector" className="w-72" />
            <Check etiqueta="Activo" name="activo" defaultChecked />
          </FormAdmin>
        </AltaAbm>

        <section className="space-y-3">
          {equipos.map((e) => (
            <FilaAbm key={e.id} inactivo={!e.activo}>
              <FormAdmin accion={guardarEquipo}>
                <input type="hidden" name="id" value={e.id} />
                <Campo etiqueta="Código" name="codigo" defaultValue={e.codigo} required className="w-40" />
                <Campo etiqueta="Nombre" name="nombre" defaultValue={e.nombre} required className="w-56" />
                <Campo etiqueta="Descripción" name="descripcion" defaultValue={e.descripcion ?? ""} className="w-72" />
                <Check etiqueta="Activo" name="activo" defaultChecked={e.activo} />
                <Link href={`/panel/admin/equipos/qr?formato=a4&equipo=${e.id}`} className={boton({ variante: "secundario" })}>
                  QR
                </Link>
              </FormAdmin>
              <p className="mt-2 break-all text-xs text-tinta-2">{urlEquipo(e.codigo)}</p>
            </FilaAbm>
          ))}
        </section>
        <p className="text-sm text-tinta-2">
          Si cambiás el código de un equipo, cambia la dirección del QR: hay que reimprimirlo y reemplazar la etiqueta.
        </p>
      </div>
    </div>
  );
}
