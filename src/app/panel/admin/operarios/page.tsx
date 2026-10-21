import { asc } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { requerirUsuario } from "@/lib/sesion";
import { Encabezado } from "../../ui";
import FormAdmin from "../FormAdmin";
import { Campo, Check } from "../campos";
import { guardarOperario } from "../acciones";

export const dynamic = "force-dynamic";

export default async function PaginaOperarios() {
  await requerirUsuario("admin");
  const ops = getDb().select().from(schema.operarios).orderBy(asc(schema.operarios.nombre)).all();
  return (
    <div>
      <Encabezado titulo="Operarios" />
      <div className="space-y-6 px-8 py-6">
        <p className="max-w-3xl text-asfalto-700">
          Esta lista es la <b>planilla de operarios habilitados</b> (ítem 20 del F-068): solo los habilitados aparecen en el celular
          para hacer el control. El PIN es opcional; si se carga, se pide al firmar.
        </p>
        <section className="rounded-lg bg-white p-5">
          <h2 className="mb-3 font-cartel text-xl font-bold">Agregar operario</h2>
          <FormAdmin accion={guardarOperario} boton="Agregar" limpiar>
            <Campo etiqueta="Nombre y apellido" name="nombre" required className="w-64" />
            <Campo etiqueta="Legajo" name="legajo" className="w-28" />
            <Campo etiqueta="PIN (4 dígitos, opcional)" name="pin" inputMode="numeric" pattern="\d{4}" maxLength={4} className="w-44" />
            <Check etiqueta="Habilitado" name="habilitado" defaultChecked />
          </FormAdmin>
        </section>

        <section className="space-y-3">
          {ops.length === 0 && <p className="text-asfalto-500">Todavía no hay operarios cargados.</p>}
          {ops.map((o) => (
            <div key={o.id} className={`rounded-lg bg-white p-4 ${o.habilitado ? "" : "opacity-60"}`}>
              <FormAdmin accion={guardarOperario}>
                <input type="hidden" name="id" value={o.id} />
                <Campo etiqueta="Nombre y apellido" name="nombre" defaultValue={o.nombre} required className="w-64" />
                <Campo etiqueta="Legajo" name="legajo" defaultValue={o.legajo ?? ""} className="w-28" />
                <Campo
                  etiqueta={o.pinHash ? "Nuevo PIN (tiene PIN)" : "PIN (no tiene)"}
                  name="pin"
                  inputMode="numeric"
                  pattern="\d{4}"
                  maxLength={4}
                  className="w-44"
                />
                {o.pinHash && <Check etiqueta="Quitar PIN" name="quitarPin" />}
                <Check etiqueta="Habilitado" name="habilitado" defaultChecked={o.habilitado} />
              </FormAdmin>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
