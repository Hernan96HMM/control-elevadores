"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import Icono from "@/components/Icono";

// Una sola conexión SSE (/api/stream) por pestaña del panel: la usa el indicador del header
// y la consumen las páginas (tablero) mediante useEventos().
type Oyente = (tipo: string, datos: unknown) => void;
type Ctx = { conectado: boolean | null; suscribir: (fn: Oyente) => () => void };

const EventosCtx = createContext<Ctx>({ conectado: null, suscribir: () => () => {} });
const TIPOS = ["hola", "control", "falla", "equipos"] as const;

export function EventosProvider({ children }: { children: React.ReactNode }) {
  const [conectado, setConectado] = useState<boolean | null>(null);
  const oyentes = useRef(new Set<Oyente>());

  useEffect(() => {
    const es = new EventSource("/api/stream");
    es.onerror = () => setConectado(false);
    for (const t of TIPOS) {
      es.addEventListener(t, (e) => {
        if (t === "hola") setConectado(true);
        let datos: unknown = null;
        try {
          datos = JSON.parse((e as MessageEvent).data);
        } catch {
          /* evento sin datos */
        }
        oyentes.current.forEach((fn) => fn(t, datos));
      });
    }
    return () => es.close();
  }, []);

  const suscribir = useCallback((fn: Oyente) => {
    oyentes.current.add(fn);
    return () => {
      oyentes.current.delete(fn);
    };
  }, []);

  return <EventosCtx.Provider value={{ conectado, suscribir }}>{children}</EventosCtx.Provider>;
}

export function useEventos(fn: Oyente) {
  const { suscribir } = useContext(EventosCtx);
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => suscribir((t, d) => ref.current(t, d)), [suscribir]);
}

export function IndicadorConexion() {
  const { conectado } = useContext(EventosCtx);
  const txt = conectado ? "En vivo" : conectado === false ? "Sin conexión, reintentando…" : "Conectando…";
  return (
    <span role="status" className="inline-flex items-center gap-2 text-sm font-semibold text-tinta-2">
      <span className="relative flex h-2.5 w-2.5" aria-hidden>
        {conectado && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sica-cyan opacity-60" />}
        <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${conectado ? "bg-ok" : conectado === false ? "bg-fs" : "bg-tinta-3"}`} />
      </span>
      {conectado === false && <Icono nombre="sinSenal" className="h-4 w-4 text-fs" />}
      {txt}
    </span>
  );
}
