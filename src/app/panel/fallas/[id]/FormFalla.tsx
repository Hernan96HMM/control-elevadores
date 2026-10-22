"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import type { EstadoFalla } from "@/lib/db/schema";
import Button, { type Variante } from "@/components/Button";
import type { NombreIcono } from "@/components/Icono";
import { Aviso } from "@/components/Estado";
import { guardarFalla } from "../acciones";

const SIGUIENTE: Record<EstadoFalla, { estado: EstadoFalla; etiqueta: string; variante: Variante; icono: NombreIcono }[]> = {
  abierta: [
    { estado: "en_reparacion", etiqueta: "Pasar a En reparación", variante: "primario", icono: "llave" },
    { estado: "resuelta", etiqueta: "Marcar Resuelta", variante: "exito", icono: "check" },
  ],
  en_reparacion: [
    { estado: "resuelta", etiqueta: "Marcar Resuelta", variante: "exito", icono: "check" },
    { estado: "abierta", etiqueta: "Volver a Abierta", variante: "secundario", icono: "volver" },
  ],
  resuelta: [{ estado: "en_reparacion", etiqueta: "Reabrir (En reparación)", variante: "secundario", icono: "llave" }],
  conformidad: [],
};

function Enviar(props: { name?: string; value?: string; variante: Variante; icono?: NombreIcono; children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <Button name={props.name} value={props.value} variante={props.variante} icono={props.icono} ancho disabled={pending}>
      {props.children}
    </Button>
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
      <div className="rounded-lg border border-linea bg-superficie p-5 shadow-tarjeta">
        <h2 className="text-lg font-semibold text-sica-navy">Falla cerrada</h2>
        <p className="text-tinta-2">El operario dio su conformidad. No admite más cambios.</p>
      </div>
    );
  }

  return (
    <form ref={ref} action={accion} className="sticky top-4 space-y-4 rounded-lg border border-linea bg-superficie p-5 shadow-tarjeta">
      <input type="hidden" name="id" value={props.id} />
      <h2 className="text-lg font-semibold text-sica-navy">Gestión</h2>
      {props.critica && props.estado !== "resuelta" && (
        <Aviso tipo="error">Ítem crítico: el equipo sigue fuera de servicio hasta marcar la falla como Resuelta.</Aviso>
      )}
      {props.estado === "resuelta" && (
        <Aviso>Resuelta. Falta la conformidad del autoelevadorista, que la da desde el QR del equipo.</Aviso>
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
        <input
          id="foto"
          name="foto"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="block w-full text-sm file:mr-3 file:min-h-[40px] file:rounded file:border file:border-sica-navy file:bg-superficie file:px-3 file:font-semibold file:text-sica-navy"
        />
      </div>
      {res?.error && <Aviso tipo="error">{res.error}</Aviso>}
      {res?.ok && <Aviso>{res.ok}</Aviso>}
      {/* "Guardar" va primero en el DOM: es el botón que usa Enter (nunca un cambio de estado). */}
      <div className="flex flex-col gap-2 border-t border-linea pt-4">
        <div className="order-last">
          <Enviar variante="secundario">Guardar datos y comentario</Enviar>
        </div>
        {SIGUIENTE[props.estado].map((s) => (
          <Enviar key={s.estado} name="estado" value={s.estado} variante={s.variante} icono={s.icono}>
            {s.etiqueta}
          </Enviar>
        ))}
      </div>
    </form>
  );
}
