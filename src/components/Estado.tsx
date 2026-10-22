import Icono, { type NombreIcono } from "./Icono";
import { ETIQUETA_FALLA, type EstadoEquipo } from "@/lib/estado";
import type { EstadoFalla } from "@/lib/db/schema";

// Estados siempre con ícono + texto: nunca solo color.
export const ESTILO_EQUIPO: Record<EstadoEquipo, { icono: NombreIcono; texto: string; color: string; pill: string; solido: string; borde: string }> = {
  operativo: { icono: "okCirculo", texto: "Operativo", color: "text-ok", pill: "bg-ok-bg text-ok", solido: "bg-ok text-white", borde: "border-ok" },
  observaciones: {
    icono: "alerta",
    texto: "Con observaciones",
    color: "text-obs",
    pill: "bg-obs-bg text-obs",
    solido: "bg-obs-bg text-obs",
    borde: "border-obs-acento",
  },
  fuera_servicio: {
    icono: "prohibido",
    texto: "Fuera de servicio",
    color: "text-fs",
    pill: "bg-fs-bg text-fs",
    solido: "bg-fs text-white",
    borde: "border-fs",
  },
  sin_control: { icono: "reloj", texto: "Sin control hoy", color: "text-sin", pill: "bg-sin-bg text-sin", solido: "bg-sin text-white", borde: "border-linea" },
};

export function StatusPill({ estado, solido = false, grande = false }: { estado: EstadoEquipo; solido?: boolean; grande?: boolean }) {
  const e = ESTILO_EQUIPO[estado];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${solido ? e.solido : e.pill} ${
        grande ? "px-3 py-1 text-base" : "px-2.5 py-0.5 text-sm"
      }`}
    >
      <Icono nombre={e.icono} className={grande ? "h-5 w-5" : "h-4 w-4"} />
      {e.texto}
    </span>
  );
}

const ESTILO_FALLA: Record<EstadoFalla, { icono: NombreIcono; clase: string }> = {
  abierta: { icono: "alerta", clase: "bg-fs-bg text-fs" },
  en_reparacion: { icono: "llave", clase: "bg-obs-bg text-obs" },
  resuelta: { icono: "check", clase: "bg-ok-bg text-ok" },
  conformidad: { icono: "okCirculo", clase: "bg-sica-navy-50 text-sica-navy" },
};

export function BadgeFalla({ estado }: { estado: EstadoFalla }) {
  const e = ESTILO_FALLA[estado];
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-sm font-semibold ${e.clase}`}>
      <Icono nombre={e.icono} className="h-4 w-4" />
      {ETIQUETA_FALLA[estado]}
    </span>
  );
}

/** Distintivo de ítem crítico (*): escudo + texto, no depende del color. */
export function BadgeCritico({ grande = false }: { grande?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-fs font-semibold text-fs ${
        grande ? "px-2.5 py-0.5 text-sm" : "px-2 py-px text-xs"
      }`}
    >
      <Icono nombre="escudo" className={grande ? "h-4 w-4" : "h-3.5 w-3.5"} />
      Crítico
    </span>
  );
}

export function Aviso({ tipo = "ok", children }: { tipo?: "ok" | "error" | "info"; children: React.ReactNode }) {
  const est = {
    ok: { c: "bg-ok-bg text-ok", i: "okCirculo" as const },
    error: { c: "bg-fs-bg text-fs", i: "alerta" as const },
    info: { c: "bg-sica-navy-50 text-sica-navy", i: "info" as const },
  }[tipo];
  return (
    <p role={tipo === "error" ? "alert" : "status"} className={`flex items-start gap-2 rounded px-3 py-2 text-sm font-semibold ${est.c}`}>
      <Icono nombre={est.i} className="mt-px h-5 w-5" />
      <span>{children}</span>
    </p>
  );
}
