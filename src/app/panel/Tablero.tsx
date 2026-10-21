"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { TarjetaEquipo } from "@/lib/servicios/equipos";
import { ETIQUETA_ESTADO, type EstadoEquipo } from "@/lib/estado";
import type { EstadoFalla } from "@/lib/db/schema";
import { ChipFalla, Critico } from "./ui";

type Datos = {
  equipos: TarjetaEquipo[];
  feed: { id: number; firmadoEn: string; resultado: string; equipo: string; operario: string }[];
  fallas: { total: number; criticas: number };
  fallasAbiertas: { id: number; equipo: string; item: string; critica: boolean; estado: EstadoFalla; fechaRecepcion: string }[];
  paraConformidad: number;
};

type Alerta = { id: number; texto: string; critica: boolean };

const TITULO = "Tablero · Autoelevadores";

const hora = (iso: string) =>
  new Intl.DateTimeFormat("es-AR", { timeZone: "America/Argentina/Buenos_Aires", hour: "2-digit", minute: "2-digit" }).format(
    new Date(iso),
  );
const fechaHora = (iso: string) =>
  new Intl.DateTimeFormat("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));

const PLACA: Record<EstadoEquipo, string> = {
  operativo: "border-verde",
  observaciones: "border-amarillo",
  fuera_servicio: "border-rojo",
  sin_control: "border-asfalto-300",
};
const BANDA: Record<EstadoEquipo, string> = {
  operativo: "bg-verde text-white",
  observaciones: "bg-amarillo text-asfalto",
  fuera_servicio: "bg-rojo text-white",
  sin_control: "bg-asfalto-500 text-white",
};
const RESULTADO: Record<string, { txt: string; cls: string }> = {
  ok: { txt: "En orden", cls: "text-verde" },
  observaciones: { txt: "Con observaciones", cls: "text-naranja" },
  fuera_servicio: { txt: "Fuera de servicio", cls: "text-rojo" },
};

function pitido(ctx: AudioContext, critica: boolean) {
  // Patrón de sirena corta: dos tonos (crítica) o uno (no crítica).
  const tonos = critica ? [880, 660, 880, 660] : [740, 740];
  tonos.forEach((f, i) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "square";
    o.frequency.value = f;
    const t = ctx.currentTime + i * 0.22;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
    o.connect(g).connect(ctx.destination);
    o.start(t);
    o.stop(t + 0.21);
  });
}

export default function Tablero({ inicial }: { inicial: Datos }) {
  const [d, setD] = useState<Datos>(inicial);
  const [conectado, setConectado] = useState<boolean | null>(null);
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [sinVer, setSinVer] = useState(0);
  const [sonido, setSonido] = useState(false);
  const [nuevos, setNuevos] = useState<Set<number>>(new Set());
  const audio = useRef<AudioContext | null>(null);
  const sonidoRef = useRef(false);
  sonidoRef.current = sonido;

  const recargar = useCallback(async () => {
    try {
      const r = await fetch("/api/panel/dashboard", { cache: "no-store" });
      if (r.status === 401) return window.location.assign("/login");
      if (r.ok) setD(await r.json());
    } catch {
      /* se reintenta en el próximo evento */
    }
  }, []);

  useEffect(() => {
    const es = new EventSource("/api/stream");
    es.addEventListener("hola", () => {
      setConectado(true);
      void recargar(); // al reconectar, ponerse al día con lo que pasó mientras tanto
    });
    es.onerror = () => setConectado(false);
    es.addEventListener("control", (e) => {
      const ev = JSON.parse((e as MessageEvent).data);
      setNuevos((s) => new Set(s).add(ev.controlId));
      if (ev.fallasNuevas > 0 || ev.criticas > 0) {
        const critica = ev.criticas > 0;
        setAlertas((a) =>
          [
            {
              id: ev.controlId,
              critica,
              texto: critica
                ? `${ev.equipo}: falla crítica informada por ${ev.operario}. Equipo fuera de servicio.`
                : `${ev.equipo}: ${ev.fallasNuevas} falla(s) nueva(s) informada(s) por ${ev.operario}.`,
            },
            ...a,
          ].slice(0, 5),
        );
        setSinVer((n) => n + 1);
        if (sonidoRef.current && audio.current) pitido(audio.current, critica);
      }
      void recargar();
    });
    es.addEventListener("falla", () => void recargar());
    es.addEventListener("equipos", () => void recargar());
    return () => es.close();
  }, [recargar]);

  useEffect(() => {
    document.title = sinVer > 0 ? `(${sinVer}) ⚠ ${TITULO}` : TITULO;
  }, [sinVer]);

  // La política de autoplay exige un clic del usuario antes de poder reproducir audio.
  const activarSonido = async () => {
    if (sonido) return setSonido(false);
    try {
      if (!audio.current) audio.current = new AudioContext();
      await audio.current.resume();
      pitido(audio.current, false);
      setSonido(true);
    } catch {
      setSonido(false);
    }
  };

  const vistas = () => {
    setAlertas([]);
    setSinVer(0);
  };

  const sinControl = d.equipos.filter((e) => !e.controlHoy).length;

  return (
    <div>
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-hormigon bg-white px-8 py-5">
        <div>
          <h1 className="font-cartel text-3xl font-bold">Tablero en vivo</h1>
          <p className="text-sm text-asfalto-500">
            <span
              className={`mr-1.5 inline-block h-2.5 w-2.5 rounded-full ${conectado ? "bg-verde" : conectado === false ? "bg-rojo" : "bg-asfalto-300"}`}
              aria-hidden
            />
            {conectado ? "Conectado: los controles aparecen al instante" : conectado === false ? "Sin conexión, reintentando…" : "Conectando…"}
          </p>
        </div>
        <div className="flex items-center gap-6">
          <Link href="/panel/fallas" className="text-right">
            <span className="block font-cartel text-4xl font-bold leading-none text-rojo">{d.fallas.total}</span>
            <span className="text-sm text-asfalto-500">
              {d.fallas.total === 1 ? "falla abierta" : "fallas abiertas"}
              {d.fallas.criticas > 0 ? `, ${d.fallas.criticas} ${d.fallas.criticas === 1 ? "crítica" : "críticas"}` : ""}
            </span>
          </Link>
          <div className="text-right">
            <span className="block font-cartel text-4xl font-bold leading-none">{sinControl}</span>
            <span className="text-sm text-asfalto-500">sin control hoy</span>
          </div>
          <button className={sonido ? "btn-secundario" : "btn-primario"} onClick={() => void activarSonido()} aria-pressed={sonido}>
            {sonido ? "🔔 Sonido activo" : "🔕 Activar sonido"}
          </button>
        </div>
      </header>

      {alertas.length > 0 && (
        <section
          role="alert"
          className={`flex items-start justify-between gap-4 px-8 py-4 ${alertas.some((a) => a.critica) ? "animate-pulse bg-rojo text-white" : "bg-amarillo text-asfalto"}`}
        >
          <ul className="space-y-1 text-lg font-semibold">
            {alertas.map((a) => (
              <li key={a.id}>⚠ {a.texto}</li>
            ))}
          </ul>
          <button className="btn shrink-0 bg-white text-asfalto" onClick={vistas}>
            Visto
          </button>
        </section>
      )}

      <div className="grid gap-8 px-8 py-6 xl:grid-cols-[1fr,360px]">
        <div className="space-y-8">
          <section aria-label="Equipos">
            <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
              {d.equipos.map((e) => (
                <article key={e.id} className={`overflow-hidden rounded-lg border-4 bg-white ${PLACA[e.estado]}`}>
                  <div className={`px-4 py-2 font-cartel text-xl font-bold ${BANDA[e.estado]}`}>
                    {e.estado === "fuera_servicio" ? "NO USAR · Fuera de servicio" : ETIQUETA_ESTADO[e.estado]}
                  </div>
                  <div className="p-4">
                    <h2 className="font-cartel text-2xl font-bold leading-tight">{e.nombre}</h2>
                    <p className="mb-3 text-sm text-asfalto-500">{e.codigo}</p>
                    {e.controlHoy ? (
                      <p>
                        Control {hora(e.controlHoy.firmadoEn)} · {e.controlHoy.operario}
                        <span className="block text-sm text-asfalto-500">{e.controlHoy.horas} h de horómetro</span>
                      </p>
                    ) : (
                      <p className="font-semibold text-asfalto-500">Todavía sin control hoy</p>
                    )}
                    {e.fallasPendientes > 0 && (
                      <Link href={`/panel/fallas?equipo=${e.id}`} className="mt-2 block font-semibold text-rojo underline">
                        {e.fallasPendientes} falla(s) sin resolver{e.criticasPendientes ? ` (${e.criticasPendientes} crítica)` : ""}
                      </Link>
                    )}
                  </div>
                </article>
              ))}
              {d.equipos.length === 0 && (
                <p className="text-asfalto-500">
                  No hay equipos activos. <Link href="/panel/admin/equipos" className="underline">Cargá los equipos</Link>.
                </p>
              )}
            </div>
          </section>

          <section>
            <div className="mb-2 flex items-baseline justify-between">
              <h2 className="font-cartel text-2xl font-bold">Fallas sin resolver</h2>
              {d.paraConformidad > 0 && (
                <span className="text-sm text-asfalto-500">{d.paraConformidad} resuelta(s) esperando conformidad del operario</span>
              )}
            </div>
            {d.fallasAbiertas.length === 0 ? (
              <p className="rounded-lg bg-white p-4 text-asfalto-500">No hay fallas abiertas.</p>
            ) : (
              <table className="tabla w-full rounded-lg bg-white">
                <thead>
                  <tr>
                    <th>Equipo</th>
                    <th>Ítem</th>
                    <th>Recepción</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {d.fallasAbiertas.map((f) => (
                    <tr key={f.id} className="hover:bg-hormigon-claro">
                      <td>{f.equipo}</td>
                      <td>
                        <Link href={`/panel/fallas/${f.id}`} className="font-semibold underline">
                          {f.item}
                        </Link>
                        {f.critica && <Critico />}
                      </td>
                      <td>{fechaHora(f.fechaRecepcion)}</td>
                      <td>
                        <ChipFalla estado={f.estado} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </div>

        <aside aria-label="Controles recibidos">
          <h2 className="mb-2 font-cartel text-2xl font-bold">Controles recibidos</h2>
          <ol className="divide-y divide-hormigon rounded-lg bg-white">
            {d.feed.map((c) => {
              const r = RESULTADO[c.resultado];
              return (
                <li key={c.id} className={`px-4 py-3 ${nuevos.has(c.id) ? "bg-amarillo-claro" : ""}`}>
                  <p className="flex justify-between gap-2">
                    <span className="font-semibold">{c.equipo}</span>
                    <span className="text-sm text-asfalto-500">{fechaHora(c.firmadoEn)}</span>
                  </p>
                  <p className="text-sm">
                    {c.operario} · <span className={`font-semibold ${r?.cls}`}>{r?.txt}</span>
                  </p>
                </li>
              );
            })}
            {d.feed.length === 0 && <li className="px-4 py-3 text-asfalto-500">Todavía no se registraron controles.</li>}
          </ol>
        </aside>
      </div>
    </div>
  );
}
