import { asc } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { requerirUsuario } from "@/lib/sesion";
import { Encabezado } from "../../ui";
import FormAdmin from "../FormAdmin";
import { Campo, Check, AltaAbm } from "../campos";
import { guardarItem } from "../acciones";

export const dynamic = "force-dynamic";

export default async function PaginaItems() {
  await requerirUsuario("admin");
  const items = getDb().select().from(schema.itemsChecklist).orderBy(asc(schema.itemsChecklist.orden)).all();
  const siguiente = (items.at(-1)?.orden ?? 0) + 1;
  return (
    <div>
      <Encabezado titulo="Ítems del checklist" />
      <div className="space-y-6 px-6 py-5 lg:px-8">
        <p className="max-w-3xl text-tinta-2">
          Los ítems <b>críticos</b> (marcados con escudo y * en el F-068) dejan el equipo fuera de servicio si fallan. Desactivá un ítem en lugar de borrarlo: los
          controles ya hechos conservan el texto con el que se registraron.
        </p>
        <AltaAbm titulo="Agregar ítem">
          <FormAdmin accion={guardarItem} boton="Agregar" limpiar>
            <Campo etiqueta="Orden" name="orden" type="number" min={1} defaultValue={siguiente} required className="w-20" />
            <Campo etiqueta="Texto" name="texto" required className="w-96" />
            <Check etiqueta="Crítico (*)" name="critico" />
            <Check etiqueta="Activo" name="activo" defaultChecked />
          </FormAdmin>
        </AltaAbm>
        <section className="space-y-2">
          {items.map((i) => (
            <div key={i.id} className={`rounded-lg border border-linea bg-superficie shadow-tarjeta ${i.critico ? "border-l-4 border-l-fs" : ""} ${i.activo ? "" : "opacity-60"}`}>
              <FormAdmin accion={guardarItem} className="p-4">
                <input type="hidden" name="id" value={i.id} />
                <Campo etiqueta="Orden" name="orden" type="number" min={1} defaultValue={i.orden} required className="w-20" />
                <Campo etiqueta="Texto" name="texto" defaultValue={i.texto} required className="w-96" />
                <Check etiqueta="Crítico (*)" name="critico" defaultChecked={i.critico} />
                <Check etiqueta="Activo" name="activo" defaultChecked={i.activo} />
              </FormAdmin>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
