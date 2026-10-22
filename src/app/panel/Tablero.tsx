"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { TarjetaEquipo } from "@/lib/servicios/equipos";
import type { EstadoFalla } from "@/lib/db/schema";
import Button from "@/components/Button";
import Icono from "@/components/Icono";
import { BadgeCritico, BadgeFalla, ESTILO_EQUIPO, StatusPill } from "@/components/Estado";
import { useEventos } from "./Eventos";
import { TablaContenedor } from "./ui";

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

const RESULTADO = {
  ok: { estado: "operativo", txt: "En orden" },
  observaciones: { estado: "observaciones", txt: "Con observaciones" },
  fuera_servicio: { estado: "fuera_servicio", txt: "Fuera de servicio" },
} as const;

function pitido(ctx: AudioContext, critica: boolean) {
  // Diferenciado: falla crítica = sirena de dos tonos repetida; no crítica = dos pitidos suaves.
  const tonos = critica ? [880, 620, 880, 620, 880, 620] : [740, 740];
  tonos.forEach((f, i) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = critica ? "square" : "sine";
    o.frequency.value = f;
    const t = ctx.currentTime + i * 0.22;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(critica ? 0.25 : 0.18, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
    o.connect(g).connect(ctx.destination);
    o.start(t);
    o.stop(t + 0.21);
  });
}

export default function Tablero({ inicial }: { inicial: Datos }) {
  const [d, setD] = useState<Datos>(inicial);
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [sinVer, setSinVer] = useState(0);
  const [sonido, setSonido] = useState(false);
  const [nuevos, setNuevos] = useState<Set<number>>(new Set());
  const audio = useRef<AudioContext | null>(null);

  const recargar = useCallback(async () => {
    try {
      const r = await fetch("/api/panel/dashboard", { cache: "no-store" });
      if (r.status === 401) return window.location.assign("/login");
      if (r.ok) setD(await r.json());
    } catch {
      /* se reintenta en el próximo evento */
    }
  }, []);

  useEventos((tipo, datos) => {
    if (tipo === "hola") return void recargar(); // al (re)conectar, ponerse al día
    if (tipo === "control") {
      const ev = datos as { controlId: number; equipo: string; operario: string; fallasNuevas: number; criticas: number };
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
        if (sonido && audio.current) pitido(audio.current, critica);
      }
    }
    void recargar();
  });

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
  const fueraServicio = d.equipos.filter((e) => e.estado === "fuera_servicio").length;
  const hayCritica = alertas.some((a) => a.critica);

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-4 px-6 pb-2 pt-6 lg:px-8">
        <h1 className="text-[1.75rem] font-bold leading-tight text-sica-navy">Tablero en vivo</h1>
        <Button variante={sonido ? "secundario" : "primario"} icono={sonido ? "campana" : "campanaOff"} onClick={() => void activarSonido()} aria-pressed={sonido}>
          {sonido ? "Sonido activo" : "Activar sonido"}
        </Button>
      </header>

      {alertas.length > 0 && (
        <section
          role="alert"
          className={`mx-6 mt-3 flex items-start gap-4 rounded-lg px-5 py-4 lg:mx-8 ${
            hayCritica ? "animar-alerta bg-fs text-white" : "border border-obs-acento bg-obs-bg text-obs"
          }`}
        >
          <Icono nombre={hayCritica ? "prohibido" : "alerta"} className="h-8 w-8" />
          <ul className="flex-1 space-y-1 text-lg font-semibold">
            {alertas.map((a) => (
              <li key={a.id}>{a.texto}</li>
            ))}
          </ul>
          <Button variante="claro" onClick={vistas}>
            Visto
          </Button>
        </section>
      )}

      <div className="grid gap-6 px-6 py-5 lg:px-8 2xl:grid-cols-[1fr,380px]">
        <div className="min-w-0 space-y-6">
          {/* Indicadores */}
          <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Indicador valor={d.fallas.total} etiqueta={d.fallas.total === 1 ? "falla abierta" : "fallas abiertas"} href="/panel/fallas" alerta={d.fallas.total > 0} />
            <Indicador valor={d.fallas.criticas} etiqueta={d.fallas.criticas === 1 ? "crítica" : "críticas"} href="/panel/fallas" alerta={d.fallas.criticas > 0} />
            <Indicador valor={fueraServicio} etiqueta="fuera de servicio" alerta={fueraServicio > 0} />
            <Indicador valor={sinControl} etiqueta="sin control hoy" />
          </dl>

          <section aria-label="Equipos">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {d.equipos.map((e) => {
                const est = ESTILO_EQUIPO[e.estado];
                return (
                  <article
                    key={e.id}
                    className={`flex flex-col rounded-lg border border-linea border-t-4 bg-superficie shadow-tarjeta ${est.borde}`}
                  >
                    <div className="px-4 pt-4">
                      <h2 className="text-xl font-bold leading-tight text-sica-navy">{e.nombre}</h2>
                      <p className="text-sm text-tinta-2">{e.codigo}</p>
                    </div>
                    <div className="px-4 pt-3">
                      {e.estado === "fuera_servicio" ? (
                        <span className="inline-flex items-center gap-1.5 rounded bg-fs px-2.5 py-1 font-bold text-white">
                          <Icono nombre="prohibido" className="h-5 w-5" /> NO USAR · Fuera de servicio
                        </span>
                      ) : (
                        <StatusPill estado={e.estado} grande />
                      )}
                    </div>
                    <dl className="mt-3 grid flex-1 grid-cols-[auto,1fr] gap-x-3 gap-y-1 border-t border-linea px-4 py-3 text-sm">
                      <dt className="text-tinta-2">Último control</dt>
                      <dd className="font-semibold">{e.controlHoy ? `Hoy ${hora(e.controlHoy.firmadoEn)}` : "Sin control hoy"}</dd>
                      <dt className="text-tinta-2">Operario</dt>
                      <dd className="font-semibold">{e.controlHoy?.operario ?? "—"}</dd>
                      <dt className="text-tinta-2">Horómetro</dt>
                      <dd className="font-semibold tabular-nums">{e.controlHoy ? `${e.controlHoy.horas} h` : "—"}</dd>
                      <dt className="text-tinta-2">Fallas abiertas</dt>
                      <dd>
                        {e.fallasPendientes > 0 ? (
                          <Link href={`/panel/fallas?equipo=${e.id}`} className="font-semibold text-fs underline">
                            {e.fallasPendientes}
                            {e.criticasPendientes ? ` (${e.criticasPendientes} crítica)` : ""}
                          </Link>
                        ) : (
                          <span className="font-semibold">0</span>
                        )}
                      </dd>
                    </dl>
                  </article>
                );
              })}
              {d.equipos.length === 0 && (
                <p className="rounded-lg border border-dashed border-linea bg-superficie p-6 text-tinta-2">
                  No hay equipos activos.{" "}
                  <Link href="/panel/admin/equipos" className="font-semibold text-sica-navy underline">
                    Cargá los equipos
                  </Link>
                  .
                </p>
              )}
            </div>
          </section>

          <section>
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-xl font-bold text-sica-navy">Fallas sin resolver</h2>
              {d.paraConformidad > 0 && (
                <span className="text-sm text-tinta-2">{d.paraConformidad} resuelta(s) esperando conformidad del operario</span>
              )}
            </div>
            {d.fallasAbiertas.length === 0 ? (
              <p className="flex items-center gap-2 rounded-lg border border-linea bg-superficie p-4 text-tinta-2">
                <Icono nombre="okCirculo" className="h-5 w-5 text-ok" /> No hay fallas abiertas.
              </p>
            ) : (
              <TablaContenedor>
                <table className="tabla">
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
                      <tr key={f.id}>
                        <td className="whitespace-nowrap">{f.equipo}</td>
                        <td>
                          <span className="flex flex-wrap items-center gap-2">
                            <Link href={`/panel/fallas/${f.id}`} className="font-semibold text-sica-navy underline">
                              {f.item}
                            </Link>
                            {f.critica && <BadgeCritico />}
                          </span>
                        </td>
                        <td className="whitespace-nowrap tabular-nums">{fechaHora(f.fechaRecepcion)}</td>
                        <td>
                          <BadgeFalla estado={f.estado} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TablaContenedor>
            )}
          </section>
        </div>

        <aside aria-label="Controles recibidos" className="min-w-0">
          <h2 className="mb-2 flex items-center gap-2 text-xl font-bold text-sica-navy">
            Controles recibidos
          </h2>
          <ol className="divide-y divide-linea overflow-hidden rounded-lg border border-linea bg-superficie shadow-tarjeta">
            {d.feed.map((c) => {
              const r = RESULTADO[c.resultado as keyof typeof RESULTADO];
              const est = r ? ESTILO_EQUIPO[r.estado] : null;
              return (
                <li key={c.id} className={`flex gap-3 px-4 py-3 ${nuevos.has(c.id) ? "bg-sica-cyan-50" : ""}`}>
                  {est && <Icono nombre={est.icono} className={`mt-0.5 h-5 w-5 ${est.color}`} />}
                  <div className="min-w-0 flex-1">
                    <p className="flex justify-between gap-2">
                      <span className="font-semibold">{c.equipo}</span>
                      <span className="whitespace-nowrap text-sm tabular-nums text-tinta-2">{fechaHora(c.firmadoEn)}</span>
                    </p>
                    <p className="text-sm">
                      {c.operario} · <span className="font-semibold">{r?.txt}</span>
                    </p>
                  </div>
                </li>
              );
            })}
            {d.feed.length === 0 && <li className="px-4 py-4 text-tinta-2">Todavía no se registraron controles.</li>}
          </ol>
        </aside>
      </div>
    </div>
  );
}

function Indicador({ valor, etiqueta, href, alerta }: { valor: number; etiqueta: string; href?: string; alerta?: boolean }) {
  // dt antes que dd en el DOM (semántica de <dl>); flex-col-reverse muestra el número arriba.
  const cuerpo = (
    <div className="flex flex-col-reverse">
      <dt className="mt-1 text-sm text-tinta-2">{etiqueta}</dt>
      <dd className={`text-3xl font-bold leading-none tabular-nums ${alerta ? "text-fs" : "text-sica-navy"}`}>{valor}</dd>
    </div>
  );
  const cls = "block rounded-lg border border-linea bg-superficie px-4 py-3 shadow-tarjeta";
  return href ? (
    <Link href={href} className={`${cls} hover:border-sica-navy`}>
      {cuerpo}
    </Link>
  ) : (
    <div className={cls}>{cuerpo}</div>
  );
}
