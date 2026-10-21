import type { EstadoEquipo } from "@/lib/estado";
import { ETIQUETA_ESTADO, ETIQUETA_FALLA } from "@/lib/estado";
import type { EstadoFalla } from "@/lib/db/schema";

export function Encabezado({ titulo, children }: { titulo: string; children?: React.ReactNode }) {
  return (
    <header className="no-imprimir flex flex-wrap items-end justify-between gap-4 border-b border-hormigon bg-white px-8 py-5">
      <h1 className="font-cartel text-3xl font-bold">{titulo}</h1>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </header>
  );
}

const COLOR_ESTADO: Record<EstadoEquipo, string> = {
  operativo: "bg-verde text-white",
  observaciones: "bg-amarillo text-asfalto",
  fuera_servicio: "bg-rojo text-white",
  sin_control: "bg-asfalto-500 text-white",
};

export function ChipEstado({ estado }: { estado: EstadoEquipo }) {
  return <span className={`rounded px-2 py-0.5 text-sm font-semibold ${COLOR_ESTADO[estado]}`}>{ETIQUETA_ESTADO[estado]}</span>;
}

const COLOR_FALLA: Record<EstadoFalla, string> = {
  abierta: "bg-rojo-claro text-rojo",
  en_reparacion: "bg-naranja-claro text-naranja",
  resuelta: "bg-verde-claro text-verde",
  conformidad: "bg-hormigon text-asfalto-700",
};

export function ChipFalla({ estado }: { estado: EstadoFalla }) {
  return <span className={`rounded px-2 py-0.5 text-sm font-semibold ${COLOR_FALLA[estado]}`}>{ETIQUETA_FALLA[estado]}</span>;
}

export function Critico() {
  return <span className="ml-1 rounded bg-asfalto px-1.5 py-0.5 text-xs font-semibold text-amarillo">Crítico *</span>;
}

export function Aviso({ tipo = "ok", children }: { tipo?: "ok" | "error"; children: React.ReactNode }) {
  return (
    <p
      role={tipo === "error" ? "alert" : "status"}
      className={`rounded px-3 py-2 text-sm font-semibold ${tipo === "error" ? "bg-rojo-claro text-rojo" : "bg-verde-claro text-verde"}`}
    >
      {children}
    </p>
  );
}
