import { asc } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { requerirUsuario } from "@/lib/sesion";
import { Encabezado } from "../../ui";
import FormAdmin from "../FormAdmin";
import { Campo, Check } from "../campos";
import { guardarUsuario } from "../acciones";

export const dynamic = "force-dynamic";

function SelectRol({ valor }: { valor?: string }) {
  return (
    <label className="block w-44">
      <span className="etiqueta">Rol</span>
      <select name="rol" defaultValue={valor ?? "mantenimiento"} className="campo">
        <option value="mantenimiento">Mantenimiento</option>
        <option value="admin">Administrador</option>
      </select>
    </label>
  );
}

export default async function PaginaUsuarios() {
  await requerirUsuario("admin");
  const us = getDb().select().from(schema.usuarios).orderBy(asc(schema.usuarios.usuario)).all();
  return (
    <div>
      <Encabezado titulo="Usuarios" />
      <div className="space-y-6 px-8 py-6">
        <section className="rounded-lg bg-white p-5">
          <h2 className="mb-3 font-cartel text-xl font-bold">Agregar usuario</h2>
          <FormAdmin accion={guardarUsuario} boton="Agregar" limpiar>
            <Campo etiqueta="Usuario" name="usuario" required autoComplete="off" className="w-40" />
            <Campo etiqueta="Nombre" name="nombre" required className="w-56" />
            <SelectRol />
            <Campo etiqueta="Contraseña inicial" name="password" type="password" minLength={8} required autoComplete="new-password" className="w-48" />
            <Check etiqueta="Activo" name="activo" defaultChecked />
          </FormAdmin>
        </section>
        <section className="space-y-3">
          {us.map((u) => (
            <div key={u.id} className={`rounded-lg bg-white p-4 ${u.activo ? "" : "opacity-60"}`}>
              <FormAdmin accion={guardarUsuario}>
                <input type="hidden" name="id" value={u.id} />
                <Campo etiqueta="Usuario" name="usuario" defaultValue={u.usuario} required className="w-40" />
                <Campo etiqueta="Nombre" name="nombre" defaultValue={u.nombre} required className="w-56" />
                <SelectRol valor={u.rol} />
                <Campo
                  etiqueta="Nueva contraseña"
                  name="password"
                  type="password"
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="Sin cambios"
                  className="w-48"
                />
                <Check etiqueta="Activo" name="activo" defaultChecked={u.activo} />
              </FormAdmin>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
