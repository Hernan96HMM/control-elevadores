"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import Button from "@/components/Button";
import { Aviso } from "@/components/Estado";
import type { EstadoForm } from "./acciones";

function Guardar({ texto }: { texto: string }) {
  const { pending } = useFormStatus();
  return (
    <Button cargando={pending} className="whitespace-nowrap">
      {pending ? "Guardando…" : texto}
    </Button>
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
      {(res?.error || res?.ok) && (
        <div className="mt-3 max-w-xl">
          {res.error ? <Aviso tipo="error">{res.error}</Aviso> : <Aviso>{res.ok}</Aviso>}
        </div>
      )}
    </form>
  );
}
