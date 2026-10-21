import { asc } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { requerirUsuario } from "@/lib/sesion";
import { Encabezado } from "../../ui";
import FormAdmin from "../FormAdmin";
import { Campo, Check } from "../campos";
import { guardarItem } from "../acciones";

export const dynamic = "force-dynamic";

export default async function PaginaItems() {
  await requerirUsuario("admin");
  const items = getDb().select().from(schema.itemsChecklist).orderBy(asc(schema.itemsChecklist.orden)).all();
  const siguiente = (items.at(-1)?.orden ?? 0) + 1;
  return (
    <div>
      <Encabezado titulo="Ítems del checklist" />
      <div className="space-y-6 px-8 py-6">
        <p className="max-w-3xl text-asfalto-700">
          Los ítems <b>críticos (*)</b> dejan el equipo fuera de servicio si fallan. Desactivá un ítem en lugar de borrarlo: los
          controles ya hechos conservan el texto con el que se registraron.
        </p>
        <section className="rounded-lg bg-white p-5">
          <h2 className="mb-3 font-cartel text-xl font-bold">Agregar ítem</h2>
          <FormAdmin accion={guardarItem} boton="Agregar" limpiar>
            <Campo etiqueta="Orden" name="orden" type="number" min={1} defaultValue={siguiente} required className="w-20" />
            <Campo etiqueta="Texto" name="texto" required className="w-96" />
            <Check etiqueta="Crítico (*)" name="critico" />
            <Check etiqueta="Activo" name="activo" defaultChecked />
          </FormAdmin>
        </section>
        <section className="space-y-2">
          {items.map((i) => (
            <div key={i.id} className={`flex overflow-hidden rounded-lg bg-white ${i.activo ? "" : "opacity-60"}`}>
              {i.critico && <div className="cinta-peligro w-2 shrink-0" aria-hidden />}
              <FormAdmin accion={guardarItem} className="flex-1 p-3">
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
