"use client";

import { useFormState, useFormStatus } from "react-dom";
import { ingresar } from "./acciones";

function Boton() {
  const { pending } = useFormStatus();
  return (
    <button className="btn-primario w-full py-3 text-lg" disabled={pending}>
      {pending ? "Ingresando…" : "Ingresar"}
    </button>
  );
}

export default function FormLogin() {
  const [estado, accion] = useFormState(ingresar, null);
  return (
    <form action={accion} className="space-y-4">
      <div>
        <label className="etiqueta" htmlFor="usuario">
          Usuario
        </label>
        <input id="usuario" name="usuario" className="campo" autoComplete="username" required autoFocus />
      </div>
      <div>
        <label className="etiqueta" htmlFor="password">
          Contraseña
        </label>
        <input id="password" name="password" type="password" className="campo" autoComplete="current-password" required />
      </div>
      {estado?.error && (
        <p role="alert" className="rounded bg-rojo-claro px-3 py-2 text-sm font-semibold text-rojo">
          {estado.error}
        </p>
      )}
      <Boton />
    </form>
  );
}
