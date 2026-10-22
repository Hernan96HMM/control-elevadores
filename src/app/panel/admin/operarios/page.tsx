import { asc } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { requerirUsuario } from "@/lib/sesion";
import { Encabezado } from "../../ui";
import FormAdmin from "../FormAdmin";
import { Campo, Check, FilaAbm, AltaAbm } from "../campos";
import { guardarOperario } from "../acciones";

export const dynamic = "force-dynamic";

export default async function PaginaOperarios() {
  await requerirUsuario("admin");
  const ops = getDb().select().from(schema.operarios).orderBy(asc(schema.operarios.nombre)).all();
  return (
    <div>
      <Encabezado titulo="Operarios" />
      <div className="space-y-6 px-6 py-5 lg:px-8">
        <p className="max-w-3xl text-tinta-2">
          Esta lista es la <b>planilla de operarios habilitados</b> (ítem 20 del F-068): solo los habilitados aparecen en el celular
          para hacer el control. El PIN es opcional; si se carga, se pide al firmar.
        </p>
        <AltaAbm titulo="Agregar operario">
          <FormAdmin accion={guardarOperario} boton="Agregar" limpiar>
            <Campo etiqueta="Nombre y apellido" name="nombre" required className="w-64" />
            <Campo etiqueta="Legajo" name="legajo" className="w-28" />
            <Campo etiqueta="PIN (4 dígitos, opcional)" name="pin" inputMode="numeric" pattern="\d{4}" maxLength={4} className="w-44" />
            <Check etiqueta="Habilitado" name="habilitado" defaultChecked />
          </FormAdmin>
        </AltaAbm>

        <section className="space-y-3">
          {ops.length === 0 && <p className="text-tinta-2">Todavía no hay operarios cargados.</p>}
          {ops.map((o) => (
            <FilaAbm key={o.id} inactivo={!o.habilitado}>
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
            </FilaAbm>
          ))}
        </section>
      </div>
    </div>
  );
}
