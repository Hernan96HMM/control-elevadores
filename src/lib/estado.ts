// Reglas de negocio del F-068 Rev.2 — funciones puras (testeadas en estado.test.ts).
import type { EstadoFalla } from "./db/schema";

export type EstadoEquipo = "operativo" | "observaciones" | "fuera_servicio" | "sin_control";
export type ResultadoControl = "ok" | "observaciones" | "fuera_servicio";

export const ETIQUETA_ESTADO: Record<EstadoEquipo, string> = {
  operativo: "Operativo",
  observaciones: "Operativo con observaciones",
  fuera_servicio: "Fuera de servicio",
  sin_control: "Sin control hoy",
};

export const ETIQUETA_FALLA: Record<EstadoFalla, string> = {
  abierta: "Abierta",
  en_reparacion: "En reparación",
  resuelta: "Resuelta",
  conformidad: "Conformidad",
};

/** Una falla sigue afectando al equipo mientras Mantenimiento no la marque Resuelta. */
export function fallaPendiente(estado: EstadoFalla): boolean {
  return estado === "abierta" || estado === "en_reparacion";
}

/** Resultado de un control según sus ítems: un crítico en falla saca al equipo de servicio. */
export function resultadoControl(items: { ok: boolean; critico: boolean }[]): ResultadoControl {
  if (items.some((i) => !i.ok && i.critico)) return "fuera_servicio";
  if (items.some((i) => !i.ok)) return "observaciones";
  return "ok";
}

/**
 * Estado del equipo a partir de sus fallas y de si tuvo control hoy.
 * Prioridad: Fuera de servicio > Con observaciones > Sin control hoy > Operativo.
 */
export function estadoEquipo(input: {
  fallas: { critica: boolean; estado: EstadoFalla }[];
  controlHoy: boolean;
}): EstadoEquipo {
  const pendientes = input.fallas.filter((f) => fallaPendiente(f.estado));
  if (pendientes.some((f) => f.critica)) return "fuera_servicio";
  if (pendientes.length > 0) return "observaciones";
  if (!input.controlHoy) return "sin_control";
  return "operativo";
}

/** Transiciones que puede hacer Mantenimiento. "conformidad" la da solo el operario. */
const TRANSICIONES_MANT: Record<EstadoFalla, EstadoFalla[]> = {
  abierta: ["en_reparacion", "resuelta"],
  en_reparacion: ["resuelta", "abierta"],
  resuelta: ["en_reparacion"],
  conformidad: [],
};

export function transicionValida(desde: EstadoFalla, hasta: EstadoFalla, actor: "mantenimiento" | "operario"): boolean {
  if (actor === "operario") return desde === "resuelta" && hasta === "conformidad";
  return TRANSICIONES_MANT[desde].includes(hasta);
}
