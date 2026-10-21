"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import type { EstadoForm } from "./acciones";

function Guardar({ texto }: { texto: string }) {
  const { pending } = useFormStatus();
  return (
    <button className="btn-primario whitespace-nowrap" disabled={pending}>
      {pending ? "Guardando…" : texto}
    </button>
  );
}

/** Formulario genérico de ABM: muestra el resultado de la server action y limpia los altas. */
export default function FormAdmin({
  accion,
  children,
  boton = "Guardar",
  limpiar = false,
  className = "",
}: {
  accion: (p: EstadoForm, f: FormData) => Promise<EstadoForm>;
  children: React.ReactNode;
  boton?: string;
  limpiar?: boolean;
  className?: string;
}) {
  const [res, act] = useFormState(accion, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (res?.ok && limpiar) ref.current?.reset();
  }, [res, limpiar]);
  return (
    <form ref={ref} action={act} className={className}>
      <div className="flex flex-wrap items-end gap-3">
        {children}
        <Guardar texto={boton} />
      </div>
      {res?.error && (
        <p role="alert" className="mt-2 text-sm font-semibold text-rojo">
          {res.error}
        </p>
      )}
      {res?.ok && (
        <p role="status" className="mt-2 text-sm font-semibold text-verde">
          {res.ok}
        </p>
      )}
    </form>
  );
}
