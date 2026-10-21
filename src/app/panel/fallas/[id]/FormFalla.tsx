"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import type { EstadoFalla } from "@/lib/db/schema";
import { guardarFalla } from "../acciones";
import { Aviso } from "../../ui";

const SIGUIENTE: Record<EstadoFalla, { estado: EstadoFalla; etiqueta: string }[]> = {
  abierta: [
    { estado: "en_reparacion", etiqueta: "Pasar a En reparación" },
    { estado: "resuelta", etiqueta: "Marcar Resuelta" },
  ],
  en_reparacion: [
    { estado: "resuelta", etiqueta: "Marcar Resuelta" },
    { estado: "abierta", etiqueta: "Volver a Abierta" },
  ],
  resuelta: [{ estado: "en_reparacion", etiqueta: "Reabrir (En reparación)" }],
  conformidad: [],
};

function Enviar({ name, value, children, primario }: { name?: string; value?: string; children: React.ReactNode; primario?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button name={name} value={value} disabled={pending} className={`${primario ? "btn-primario" : "btn-secundario"} w-full`}>
      {children}
    </button>
  );
}

export default function FormFalla(props: {
  id: number;
  estado: EstadoFalla;
  critica: boolean;
  responsable: string;
  fechaReparacion: string;
}) {
  const [res, accion] = useFormState(guardarFalla, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (res?.ok) {
      const c = ref.current?.elements.namedItem("comentario") as HTMLTextAreaElement | null;
      const f = ref.current?.elements.namedItem("foto") as HTMLInputElement | null;
      if (c) c.value = "";
      if (f) f.value = "";
    }
  }, [res]);

  if (props.estado === "conformidad") {
    return (
      <div className="rounded-lg bg-white p-5">
        <h2 className="font-cartel text-2xl font-bold">Falla cerrada</h2>
        <p className="text-asfalto-500">El operario dio su conformidad. No admite más cambios.</p>
      </div>
    );
  }

  return (
    <form ref={ref} action={accion} className="sticky top-4 space-y-4 rounded-lg bg-white p-5">
      <input type="hidden" name="id" value={props.id} />
      <h2 className="font-cartel text-2xl font-bold">Gestión</h2>
      {props.critica && props.estado !== "resuelta" && (
        <p className="rounded bg-rojo-claro px-3 py-2 text-sm font-semibold text-rojo">
          Ítem crítico: el equipo sigue fuera de servicio hasta marcar la falla como Resuelta.
        </p>
      )}
      {props.estado === "resuelta" && (
        <p className="rounded bg-verde-claro px-3 py-2 text-sm font-semibold text-verde">
          Resuelta. Falta la conformidad del autoelevadorista, que la da desde el QR del equipo.
        </p>
      )}
      <div>
        <label className="etiqueta" htmlFor="responsable">
          Responsable de la reparación
        </label>
        <input id="responsable" name="responsable" className="campo" defaultValue={props.responsable} maxLength={120} />
      </div>
      <div>
        <label className="etiqueta" htmlFor="fechaReparacion">
          Fecha de reparación
        </label>
        <input id="fechaReparacion" name="fechaReparacion" type="date" className="campo" defaultValue={props.fechaReparacion} />
      </div>
      <div>
        <label className="etiqueta" htmlFor="comentario">
          Comentario
        </label>
        <textarea id="comentario" name="comentario" rows={3} className="campo" maxLength={2000} />
      </div>
      <div>
        <label className="etiqueta" htmlFor="foto">
          Foto (opcional)
        </label>
        <input id="foto" name="foto" type="file" accept="image/jpeg,image/png,image/webp" className="text-sm" />
      </div>
      {res?.error && <Aviso tipo="error">{res.error}</Aviso>}
      {res?.ok && <Aviso>{res.ok}</Aviso>}
      <div className="space-y-2">
        <Enviar>Guardar datos y comentario</Enviar>
        {SIGUIENTE[props.estado].map((s, i) => (
          <Enviar key={s.estado} name="estado" value={s.estado} primario={i === 0}>
            {s.etiqueta}
          </Enviar>
        ))}
      </div>
    </form>
  );
}
