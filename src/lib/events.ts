import "server-only";
import { EventEmitter } from "node:events";

// Bus de eventos en memoria (un solo proceso Node). Alimenta /api/stream (SSE).
export type EventoApp =
  | {
      tipo: "control";
      controlId: number;
      equipo: string;
      operario: string;
      hora: string;
      resultado: "ok" | "observaciones" | "fuera_servicio";
      fallasNuevas: number;
      criticas: number;
    }
  | { tipo: "falla"; fallaId: number; equipo: string; estado: string; item: string; critica: boolean; autor: string }
  | { tipo: "equipos" };

const g = globalThis as unknown as { __bus?: EventEmitter };

function bus(): EventEmitter {
  if (!g.__bus) {
    g.__bus = new EventEmitter();
    g.__bus.setMaxListeners(200); // pantallas de mantenimiento conectadas
  }
  return g.__bus;
}

export function publicar(ev: EventoApp): void {
  bus().emit("evento", ev);
}

export function suscribir(fn: (ev: EventoApp) => void): () => void {
  bus().on("evento", fn);
  return () => bus().off("evento", fn);
}
