"use client";

import { useFormState, useFormStatus } from "react-dom";
import Button from "@/components/Button";
import { Aviso } from "@/components/Estado";
import { ingresar } from "./acciones";

function Boton() {
  const { pending } = useFormStatus();
  return (
    <Button tamano="lg" ancho cargando={pending}>
      {pending ? "Ingresando…" : "Ingresar"}
    </Button>
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
      {estado?.error && <Aviso tipo="error">{estado.error}</Aviso>}
      <Boton />
    </form>
  );
}
