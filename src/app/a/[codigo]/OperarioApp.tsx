"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DatosPantallaOperario } from "@/lib/servicios/equipos";
import { ETIQUETA_FALLA, resultadoControl, type EstadoEquipo } from "@/lib/estado";
import { borrar, encolar, escribir, leer, nuevoId, pendientes, vaciarCola } from "@/lib/cliente/almacen";
import { comprimirFoto } from "@/lib/cliente/fotos";
import BrandLogo from "@/components/BrandLogo";
import Button from "@/components/Button";
import Icono from "@/components/Icono";
import { BadgeCritico, ESTILO_EQUIPO } from "@/components/Estado";

type Datos = DatosPantallaOperario;
type Resp = { ok: boolean | null; observacion: string; foto: string | null };
type Paso = "inicio" | "operario" | "horas" | "items" | "firma" | "resultado";
type Borrador = {
  clientId: string;
  fecha: string;
  paso: Paso;
  operarioId: number | null;
  horas: string;
  respuestas: Record<number, Resp>;
  observaciones: string;
};

const AVISO_SEGURIDAD =
  "Ante la falta de elementos de seguridad, el equipo no podrá ser utilizado; de hacerlo será responsabilidad directa del conductor.";

const PASOS_NUMERADOS: Partial<Record<Paso, number>> = { operario: 1, horas: 2, items: 3, firma: 4 };

const hora = (iso: string) =>
  new Intl.DateTimeFormat("es-AR", { timeZone: "America/Argentina/Buenos_Aires", hour: "2-digit", minute: "2-digit" }).format(
    new Date(iso),
  );

const fechaLarga = (ymd: string) =>
  new Intl.DateTimeFormat("es-AR", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" }).format(
    new Date(`${ymd}T12:00:00Z`),
  );

export default function OperarioApp({ inicial }: { inicial: Datos }) {
  const [datos, setDatos] = useState<Datos>(inicial);
  const codigo = datos.equipo.codigo;
  const claveBorrador = `borrador:${codigo}:${datos.fecha}`;

  const vacio = useCallback(
    (): Borrador => ({
      clientId: nuevoId(),
      fecha: datos.fecha,
      paso: "inicio",
      operarioId: null,
      horas: "",
      respuestas: {},
      observaciones: "",
    }),
    [datos.fecha],
  );

  const [b, setB] = useState<Borrador>(vacio);
  const [cargado, setCargado] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<{ tipo: "enviado" | "encolado"; resultado: string } | null>(null);
  const [enCola, setEnCola] = useState(0);
  const [confirmarTodo, setConfirmarTodo] = useState(false);
  const [conformidad, setConformidad] = useState<number | null>(null);
  const [enLinea, setEnLinea] = useState(true);

  const refrescar = useCallback(async () => {
    try {
      const r = await fetch(`/api/public/equipo/${encodeURIComponent(codigo)}`, { cache: "no-store" });
      if (r.ok) setDatos(await r.json());
    } catch {
      /* sin señal: seguimos con lo que hay */
    }
  }, [codigo]);

  // Borrador local + service worker (solo assets) + cola de reintento.
  useEffect(() => {
    let vivo = true;
    (async () => {
      const guardado = await leer<Borrador>(claveBorrador);
      if (vivo && guardado && guardado.fecha === datos.fecha && guardado.paso !== "resultado") setB(guardado);
      if (vivo) setCargado(true);
      setEnCola((await pendientes()).length);
    })();
    try {
      if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
    } catch {
      /* SW no disponible en HTTP fuera de localhost: no es necesario para operar */
    }
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (cargado && b.paso !== "inicio" && b.paso !== "resultado") void escribir(claveBorrador, b);
  }, [b, cargado, claveBorrador]);

  const reintentar = useCallback(async () => {
    const { enviados, descartados } = await vaciarCola();
    setEnCola((await pendientes()).length);
    if (descartados.length) setError(`No se pudo registrar: ${descartados.join(" · ")}`);
    if (enviados > 0) {
      setResultado((r) => (r?.tipo === "encolado" ? { ...r, tipo: "enviado" } : r));
      void refrescar();
    }
  }, [refrescar]);

  useEffect(() => {
    void reintentar();
    const onOnline = () => {
      setEnLinea(true);
      void reintentar();
    };
    const onOffline = () => setEnLinea(false);
    setEnLinea(navigator.onLine);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    const t = setInterval(() => void reintentar(), 20_000);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      clearInterval(t);
    };
  }, [reintentar]);

  const ir = (paso: Paso) => {
    setError(null);
    setB((x) => ({ ...x, paso }));
    window.scrollTo({ top: 0 });
  };

  const operario = datos.operarios.find((o) => o.id === b.operarioId) ?? null;
  const respondidos = datos.items.filter((i) => b.respuestas[i.id]?.ok != null).length;
  const hayFallas = datos.items.some((i) => b.respuestas[i.id]?.ok === false);
  const faltaObs = datos.items.some((i) => b.respuestas[i.id]?.ok === false && b.respuestas[i.id].observacion.trim().length < 3);
  const resultadoPrevio = resultadoControl(
    datos.items.map((i) => ({ ok: b.respuestas[i.id]?.ok !== false, critico: i.critico })),
  );

  const setResp = (id: number, r: Partial<Resp>) =>
    setB((x) => ({
      ...x,
      respuestas: { ...x.respuestas, [id]: { ...(x.respuestas[id] ?? { ok: null, observacion: "", foto: null }), ...r } },
    }));

  const todoEnOrden = () => {
    const respuestas: Record<number, Resp> = {};
    for (const i of datos.items) respuestas[i.id] = { ok: true, observacion: "", foto: null };
    setConfirmarTodo(false);
    setB((x) => ({ ...x, respuestas, paso: "firma" }));
    window.scrollTo({ top: 0 });
  };

  const enviar = async () => {
    if (!operario) return ir("operario");
    if (operario.requierePin && !/^\d{4}$/.test(pin)) return setError("Ingresá tu PIN de 4 dígitos");
    const payload = {
      clientId: b.clientId,
      equipoCodigo: codigo,
      operarioId: operario.id,
      pin: operario.requierePin ? pin : null,
      horas: Number(b.horas.replace(",", ".")),
      observaciones: b.observaciones.trim() || null,
      items: datos.items.map((i) => {
        const r = b.respuestas[i.id];
        return { itemId: i.id, ok: r.ok === true, observacion: r.ok ? null : r.observacion.trim(), foto: r.ok ? null : r.foto };
      }),
    };
    setEnviando(true);
    setError(null);
    try {
      const r = await fetch("/api/public/controles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await r.json().catch(() => ({}));
      if (r.ok) {
        await borrar(claveBorrador);
        setResultado({ tipo: "enviado", resultado: j.resultado });
        setB((x) => ({ ...x, paso: "resultado" }));
        setPin("");
        void refrescar();
      } else if (r.status === 409 && j.yaExiste) {
        await borrar(claveBorrador);
        setB(vacio());
        await refrescar();
        setError("Otro operario ya registró el control de hoy para este equipo.");
      } else if (r.status >= 500 || r.status === 429) {
        throw new Error("servidor");
      } else {
        setError(j.error ?? "No se pudo registrar el control");
      }
    } catch {
      // Sin señal o servidor caído: queda en la cola del teléfono y se reintenta solo.
      const guardado = await encolar({ clientId: b.clientId, equipoCodigo: codigo, payload, creado: new Date().toISOString() });
      if (guardado) {
        await borrar(claveBorrador);
        setEnCola((await pendientes()).length);
        setResultado({ tipo: "encolado", resultado: resultadoPrevio });
        setB((x) => ({ ...x, paso: "resultado" }));
      } else {
        setError("Sin conexión y no se pudo guardar en el teléfono. Acercate a una zona con wifi y probá de nuevo.");
      }
    } finally {
      setEnviando(false);
    }
  };

  const resueltasPendientes = datos.fallas.filter((f) => f.estado === "resuelta");
  const numPaso = PASOS_NUMERADOS[b.paso];

  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col bg-fondo">
      <AppBar equipo={datos.equipo.nombre} codigo={datos.equipo.codigo} fecha={fechaLarga(datos.fecha)} />

      {/* El estado del equipo se ve siempre, antes de empezar. */}
      {b.paso !== "resultado" && <FranjaEstado estado={datos.estado} />}

      {!enLinea && (
        <Banda tono="aviso" icono="sinSenal">
          Sin conexión. Podés completar el control: se guarda en el teléfono y se envía cuando vuelva la señal.
        </Banda>
      )}
      {enCola > 0 && (
        <Banda tono="aviso" icono="sinSenal" accion={<Button variante="secundario" tamano="md" onClick={() => void reintentar()}>Reintentar</Button>}>
          {enCola === 1 ? "1 control guardado" : `${enCola} controles guardados`} en el teléfono, esperando señal.
        </Banda>
      )}
      {error && (
        <Banda tono="error" icono="alerta">
          {error}
        </Banda>
      )}

      <main className="flex-1 px-4 pb-6 pt-5">
        {numPaso && (
          <p className="mb-2 text-sm font-semibold text-tinta-2">
            Paso {numPaso} de 4
          </p>
        )}

        {b.paso === "inicio" && (
          <Inicio
            datos={datos}
            cargado={cargado}
            resueltas={resueltasPendientes}
            onEmpezar={() => ir("operario")}
            onConformidad={(id) => setConformidad(id)}
            borradorEnCurso={cargado && Object.keys(b.respuestas).length > 0}
            onDescartar={async () => {
              await borrar(claveBorrador);
              setB(vacio());
            }}
          />
        )}

        {b.paso === "operario" && (
          <Paso titulo="¿Quién conduce?" ayuda="Tocá tu nombre. Solo figuran los operarios habilitados.">
            <ListaOperarios
              operarios={datos.operarios}
              seleccionado={b.operarioId}
              onElegir={(id) => {
                setB((x) => ({ ...x, operarioId: id, paso: "horas" }));
                window.scrollTo({ top: 0 });
              }}
            />
            <BotonVolver onClick={() => ir("inicio")} />
          </Paso>
        )}

        {b.paso === "horas" && (
          <Paso titulo="Horas del equipo" ayuda="Copiá el número que marca el horómetro.">
            <label className="sr-only" htmlFor="horas">
              Horas
            </label>
            <input
              id="horas"
              inputMode="decimal"
              autoFocus
              className="w-full rounded-lg border-2 border-sica-navy bg-superficie px-4 py-4 text-center text-5xl font-bold tabular-nums text-sica-navy"
              placeholder="0"
              value={b.horas}
              onChange={(e) => setB((x) => ({ ...x, horas: e.target.value.replace(/[^\d.,]/g, "") }))}
            />
            <Button
              tamano="xl"
              ancho
              disabled={!(Number(b.horas.replace(",", ".")) >= 0) || b.horas.trim() === ""}
              onClick={() => ir("items")}
            >
              Continuar
            </Button>
            <BotonVolver onClick={() => ir("operario")} />
          </Paso>
        )}

        {b.paso === "items" && (
          <div>
            <h2 className="text-2xl font-bold text-sica-navy">Revisá el equipo</h2>
            <p className="mb-4 text-lg text-tinta-2">
              Marcá OK o FALLA en cada ítem. Los marcados <span className="font-semibold text-fs">Crítico</span> impiden usar el
              equipo si fallan.
            </p>
            <ol className="space-y-3">
              {datos.items.map((it, idx) => (
                <ItemFila
                  key={it.id}
                  n={idx + 1}
                  texto={it.texto}
                  critico={it.critico}
                  resp={b.respuestas[it.id]}
                  onCambio={(r) => setResp(it.id, r)}
                  onError={setError}
                />
              ))}
            </ol>
            <BotonVolver onClick={() => ir("horas")} />
          </div>
        )}

        {b.paso === "firma" && operario && (
          <Paso titulo="Firma del conductor" ayuda="Revisá el resumen y confirmá.">
            <ResumenPrevio datos={datos} respuestas={b.respuestas} resultado={resultadoPrevio} />
            <dl className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-1 rounded-lg border border-linea bg-superficie p-4 text-lg">
              <dt className="text-tinta-2">Conductor</dt>
              <dd className="font-semibold">{operario.nombre}</dd>
              <dt className="text-tinta-2">Equipo</dt>
              <dd className="font-semibold">{datos.equipo.nombre}</dd>
              <dt className="text-tinta-2">Horas</dt>
              <dd className="font-semibold tabular-nums">{b.horas}</dd>
            </dl>
            <div>
              <label className="etiqueta text-base" htmlFor="obs">
                Observaciones generales (opcional)
              </label>
              <textarea
                id="obs"
                rows={2}
                className="campo text-lg"
                value={b.observaciones}
                onChange={(e) => setB((x) => ({ ...x, observaciones: e.target.value }))}
              />
            </div>
            {operario.requierePin && (
              <div>
                <label className="etiqueta text-base" htmlFor="pin">
                  Tu PIN
                </label>
                <CampoPin id="pin" valor={pin} onCambio={setPin} />
              </div>
            )}
            <p className="text-sm text-tinta-2">
              Al firmar declarás, como {operario.nombre}, que realizaste el control del equipo. Se registran la fecha y la hora.
            </p>
            <Button tamano="xl" ancho onClick={() => void enviar()} cargando={enviando} icono="check">
              {enviando ? "Enviando…" : "Firmar y registrar"}
            </Button>
            <BotonVolver onClick={() => ir("items")} />
          </Paso>
        )}

        {b.paso === "resultado" && resultado && (
          <PantallaResultado
            resultado={resultado}
            onListo={() => {
              setResultado(null);
              setB(vacio());
            }}
          />
        )}

        {b.paso !== "resultado" && (
          <p className="mt-8 flex gap-3 rounded-lg border-l-4 border-sica-navy bg-superficie px-4 py-3 text-base font-semibold">
            <Icono nombre="escudo" className="mt-0.5 h-6 w-6 text-sica-navy" />
            {AVISO_SEGURIDAD}
          </p>
        )}
      </main>

      {/* Acción principal fija al pie durante el checklist. */}
      {b.paso === "items" && (
        <div className="sticky bottom-0 z-10 border-t border-linea bg-superficie px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 shadow-flotante">
          <div className="mb-2 flex items-center justify-between text-sm font-semibold">
            <span>
              {respondidos} de {datos.items.length} ítems revisados
            </span>
            <span className="h-2 w-28 overflow-hidden rounded-full bg-sica-navy-100" aria-hidden>
              <span className="block h-full bg-sica-cyan" style={{ width: `${(respondidos / datos.items.length) * 100}%` }} />
            </span>
          </div>
          {faltaObs && (
            <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-fs">
              <Icono nombre="alerta" className="h-4 w-4" /> Completá la observación de cada FALLA
            </p>
          )}
          {respondidos === datos.items.length ? (
            <Button tamano="xl" ancho disabled={faltaObs} onClick={() => ir("firma")}>
              Continuar a la firma
            </Button>
          ) : hayFallas ? (
            <Button tamano="xl" ancho disabled>
              Faltan {datos.items.length - respondidos} ítems
            </Button>
          ) : (
            <Button tamano="xl" ancho icono="check" onClick={() => setConfirmarTodo(true)}>
              TODO EN ORDEN
            </Button>
          )}
        </div>
      )}

      {confirmarTodo && (
        <Dialogo onCerrar={() => setConfirmarTodo(false)} titulo="¿Todo en orden?">
          <p className="mb-5 text-lg">
            Confirmás que revisaste los {datos.items.length} ítems del checklist y están todos bien, incluidos frenos, cinturón,
            matafuego y uñas.
          </p>
          <Button tamano="xl" ancho onClick={todoEnOrden}>
            Sí, revisé todo
          </Button>
          <Button variante="secundario" tamano="lg" ancho className="mt-3" onClick={() => setConfirmarTodo(false)}>
            No, revisar ítem por ítem
          </Button>
        </Dialogo>
      )}

      {conformidad != null && (
        <DialogoConformidad
          falla={datos.fallas.find((f) => f.id === conformidad)!}
          operarios={datos.operarios}
          onCerrar={() => setConformidad(null)}
          onListo={async () => {
            setConformidad(null);
            await refrescar();
          }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

function AppBar({ equipo, codigo, fecha }: { equipo: string; codigo: string; fecha: string }) {
  return (
    <header className="relative overflow-hidden bg-sica-navy px-4 pb-4 pt-3 text-white">
      <div className="flex items-center gap-3">
        <BrandLogo variant="sin-tagline" tone="negativo" size={26} />
        <span className="border-l border-white/30 pl-3 text-sm font-semibold leading-tight">Control diario de autoelevadores</span>
      </div>
      <div className="mt-3">
        <h1 className="text-[2rem] font-bold leading-none">{equipo}</h1>
        <p className="mt-1 text-sm text-sica-navy-100">
          Código {codigo} · {fecha}
        </p>
      </div>
      <span className="absolute inset-x-0 bottom-0 h-1 bg-sica-cyan" aria-hidden />
    </header>
  );
}

function FranjaEstado({ estado }: { estado: EstadoEquipo }) {
  if (estado === "fuera_servicio") {
    return (
      <div role="alert" className="flex items-center gap-3 bg-fs px-4 py-4 text-white">
        <Icono nombre="prohibido" className="h-12 w-12" />
        <div>
          <p className="text-3xl font-bold leading-none">NO USAR</p>
          <p className="mt-1 text-lg font-semibold">Fuera de servicio – avisar a Mantenimiento</p>
        </div>
      </div>
    );
  }
  const e = ESTILO_EQUIPO[estado];
  return (
    <div className={`flex items-center gap-2 px-4 py-3 text-lg font-semibold ${e.pill}`}>
      <Icono nombre={e.icono} className="h-6 w-6" />
      {e.texto}
    </div>
  );
}

function Banda({
  tono,
  icono,
  accion,
  children,
}: {
  tono: "aviso" | "error";
  icono: "sinSenal" | "alerta";
  accion?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      role={tono === "error" ? "alert" : "status"}
      className={`flex items-center gap-3 border-b px-4 py-3 ${tono === "error" ? "border-fs bg-fs-bg text-fs" : "border-obs-acento bg-obs-bg text-obs"}`}
    >
      <Icono nombre={icono} className="h-6 w-6" />
      <p className="flex-1 font-semibold">{children}</p>
      {accion}
    </div>
  );
}

function Inicio({
  datos,
  cargado,
  resueltas,
  onEmpezar,
  onConformidad,
  borradorEnCurso,
  onDescartar,
}: {
  datos: Datos;
  cargado: boolean;
  resueltas: Datos["fallas"];
  onEmpezar: () => void;
  onConformidad: (id: number) => void;
  borradorEnCurso: boolean;
  onDescartar: () => void;
}) {
  const pendientes = datos.fallas.filter((f) => f.estado === "abierta" || f.estado === "en_reparacion");
  return (
    <div className="space-y-5">
      {pendientes.length > 0 && (
        <section className="rounded-lg border border-linea bg-superficie p-4 shadow-tarjeta">
          <h2 className="mb-3 text-xl font-bold text-sica-navy">Fallas sin resolver</h2>
          <ul className="space-y-3">
            {pendientes.map((f) => (
              <li key={f.id} className={`border-l-4 pl-3 ${f.critica ? "border-fs" : "border-obs-acento"}`}>
                <p className="flex flex-wrap items-center gap-2 text-lg font-semibold">
                  {f.itemTexto}
                  {f.critica && <BadgeCritico grande />}
                </p>
                <p className="text-tinta-2">
                  {ETIQUETA_FALLA[f.estado]}
                  {f.descripcion ? ` · ${f.descripcion}` : ""}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {resueltas.length > 0 && (
        <section className="rounded-lg border-2 border-ok bg-superficie p-4 shadow-tarjeta">
          <h2 className="text-xl font-bold text-sica-navy">Reparaciones para confirmar</h2>
          <p className="mb-3 text-tinta-2">Mantenimiento marcó estas fallas como resueltas. Probalas y dá tu conformidad.</p>
          <ul className="space-y-2">
            {resueltas.map((f) => (
              <li key={f.id}>
                <button
                  className="flex min-h-toque w-full items-center justify-between gap-3 rounded-lg border border-ok bg-ok-bg px-4 py-2 text-left text-lg font-semibold"
                  onClick={() => onConformidad(f.id)}
                >
                  <span>{f.itemTexto}</span>
                  <span className="flex shrink-0 items-center gap-1 rounded bg-ok px-3 py-1.5 text-base text-white">
                    <Icono nombre="check" className="h-4 w-4" /> Dar conformidad
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {datos.control ? (
        <section className="rounded-lg border border-linea bg-superficie p-4 shadow-tarjeta">
          <h2 className="flex items-center gap-2 text-xl font-bold text-sica-navy">
            <Icono nombre="okCirculo" className="h-6 w-6 text-ok" />
            Control de hoy registrado
          </h2>
          <p className="mb-3 text-lg">
            {datos.control.operario} · {hora(datos.control.firmadoEn)} · {datos.control.horas} h
          </p>
          {datos.control.items.some((i) => !i.ok) ? (
            <ul className="space-y-1.5">
              {datos.control.items
                .filter((i) => !i.ok)
                .map((i) => (
                  <li key={i.texto} className="flex gap-2 text-lg">
                    <Icono nombre="x" className="mt-1 h-5 w-5 text-fs" />
                    <span>
                      <span className="font-semibold">{i.texto}</span>
                      {i.observacion ? ` — ${i.observacion}` : ""}
                    </span>
                  </li>
                ))}
            </ul>
          ) : (
            <p className="text-lg font-semibold text-ok">Los {datos.control.items.length} ítems estaban en orden.</p>
          )}
          <p className="mt-3 text-tinta-2">El control se hace una vez por día, en el primer uso.</p>
        </section>
      ) : !cargado ? (
        <div className="flex min-h-[64px] items-center justify-center gap-2 rounded-lg bg-superficie text-tinta-2" role="status">
          <Icono nombre="cargando" className="h-6 w-6" /> Cargando…
        </div>
      ) : datos.operarios.length === 0 ? (
        <p className="flex gap-2 rounded-lg border border-linea bg-superficie p-4 text-lg">
          <Icono nombre="info" className="mt-1 h-5 w-5 text-sica-navy" />
          No hay operarios habilitados cargados. Pedile a Mantenimiento que los dé de alta.
        </p>
      ) : (
        <>
          <Button tamano="xl" ancho onClick={onEmpezar}>
            {borradorEnCurso ? "Seguir con el control" : "Empezar control"}
          </Button>
          {borradorEnCurso && (
            <button className="min-h-[48px] w-full text-tinta-2 underline" onClick={onDescartar}>
              Descartar lo cargado y empezar de nuevo
            </button>
          )}
        </>
      )}
    </div>
  );
}

function Paso({ titulo, ayuda, children }: { titulo: string; ayuda?: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-2xl font-bold text-sica-navy">{titulo}</h2>
      {ayuda && <p className="mb-4 text-lg text-tinta-2">{ayuda}</p>}
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function BotonVolver({ onClick }: { onClick: () => void }) {
  return (
    <button className="mt-2 flex min-h-[48px] w-full items-center justify-center gap-1 text-lg text-sica-navy" onClick={onClick}>
      <Icono nombre="volver" className="h-5 w-5" /> Volver
    </button>
  );
}

function CampoPin({ id, valor, onCambio, etiqueta }: { id?: string; valor: string; onCambio: (v: string) => void; etiqueta?: string }) {
  return (
    <input
      id={id}
      type="password"
      inputMode="numeric"
      autoComplete="off"
      maxLength={4}
      aria-label={etiqueta}
      placeholder={etiqueta ? "PIN" : undefined}
      className="w-full rounded-lg border-2 border-sica-navy bg-superficie px-4 py-3 text-center text-4xl font-bold tracking-[0.5em] text-sica-navy"
      value={valor}
      onChange={(e) => onCambio(e.target.value.replace(/\D/g, "").slice(0, 4))}
    />
  );
}

function ListaOperarios({
  operarios,
  seleccionado,
  onElegir,
}: {
  operarios: Datos["operarios"];
  seleccionado: number | null;
  onElegir: (id: number) => void;
}) {
  return (
    <ul className="space-y-3">
      {operarios.map((o) => {
        const activo = seleccionado === o.id;
        return (
          <li key={o.id}>
            <button
              aria-pressed={activo}
              className={`flex min-h-[64px] w-full items-center gap-3 rounded-lg border-2 px-4 text-left text-xl font-semibold shadow-tarjeta ${
                activo ? "border-sica-navy bg-sica-navy text-white" : "border-linea bg-superficie text-tinta"
              }`}
              onClick={() => onElegir(o.id)}
            >
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${activo ? "bg-white/15" : "bg-sica-navy-50 text-sica-navy"}`}
              >
                <Icono nombre="usuario" className="h-6 w-6" />
              </span>
              <span className="flex-1">{o.nombre}</span>
              {o.requierePin && <span className={`text-sm ${activo ? "text-white" : "text-tinta-2"}`}>con PIN</span>}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function ItemFila({
  n,
  texto,
  critico,
  resp,
  onCambio,
  onError,
}: {
  n: number;
  texto: string;
  critico: boolean;
  resp: Resp | undefined;
  onCambio: (r: Partial<Resp>) => void;
  onError: (e: string | null) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [procesando, setProcesando] = useState(false);
  const falla = resp?.ok === false;
  const ok = resp?.ok === true;
  return (
    <li
      className={`rounded-lg border-2 bg-superficie p-4 shadow-tarjeta ${
        falla ? "border-fs" : critico ? "border-sica-navy-100" : "border-transparent"
      }`}
    >
      <div className="mb-3 flex items-start gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sica-navy-50 text-sm font-bold text-sica-navy">
          {n}
        </span>
        <p className="flex-1 text-xl font-semibold leading-snug">
          {texto}
          {critico && (
            <span className="ml-2 inline-block align-middle">
              <BadgeCritico grande />
            </span>
          )}
        </p>
      </div>
      {/* gap-4 entre OK y FALLA: evita toques accidentales con guantes */}
      <div className="grid grid-cols-2 gap-4" role="group" aria-label={texto}>
        <button
          aria-pressed={ok}
          className={`flex min-h-toque items-center justify-center gap-2 rounded-lg border-2 text-xl font-bold ${
            ok ? "border-ok bg-ok text-white" : "border-ok bg-superficie text-ok"
          }`}
          onClick={() => onCambio({ ok: true })}
        >
          <Icono nombre="check" className="h-6 w-6" /> OK
        </button>
        <button
          aria-pressed={falla}
          className={`flex min-h-toque items-center justify-center gap-2 rounded-lg border-2 text-xl font-bold ${
            falla ? "border-fs bg-fs text-white" : "border-fs bg-superficie text-fs"
          }`}
          onClick={() => onCambio({ ok: false })}
        >
          <Icono nombre="x" className="h-6 w-6" /> FALLA
        </button>
      </div>
      {falla && (
        <div className="mt-4 space-y-3">
          {critico && (
            <p className="flex gap-2 rounded bg-fs-bg px-3 py-2 font-semibold text-fs">
              <Icono nombre="prohibido" className="mt-0.5 h-5 w-5" />
              Ítem crítico: el equipo queda fuera de servicio hasta que Mantenimiento lo repare.
            </p>
          )}
          <div>
            <label className="etiqueta text-base" htmlFor={`obs-${n}`}>
              ¿Qué pasa? (obligatorio)
            </label>
            <textarea
              id={`obs-${n}`}
              rows={2}
              className="campo text-lg"
              value={resp?.observacion ?? ""}
              onChange={(e) => onCambio({ observacion: e.target.value })}
            />
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (!f) return;
              setProcesando(true);
              try {
                onCambio({ foto: await comprimirFoto(f) });
                onError(null);
              } catch (err) {
                onError(err instanceof Error ? err.message : "No se pudo procesar la foto");
              } finally {
                setProcesando(false);
              }
            }}
          />
          {resp?.foto ? (
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={resp.foto} alt="Foto de la falla" className="h-20 w-20 rounded object-cover" />
              <Button variante="secundario" tamano="lg" onClick={() => onCambio({ foto: null })}>
                Quitar foto
              </Button>
            </div>
          ) : (
            <Button
              variante="secundario"
              tamano="lg"
              ancho
              icono="camara"
              cargando={procesando}
              onClick={() => fileRef.current?.click()}
            >
              {procesando ? "Procesando foto…" : "Sacar foto (opcional)"}
            </Button>
          )}
        </div>
      )}
    </li>
  );
}

function ResumenPrevio({
  datos,
  respuestas,
  resultado,
}: {
  datos: Datos;
  respuestas: Record<number, Resp>;
  resultado: string;
}) {
  const fallas = datos.items.filter((i) => respuestas[i.id]?.ok === false);
  if (resultado === "ok") {
    return (
      <p className="flex items-center gap-2 rounded-lg border-2 border-ok bg-ok-bg p-4 text-xl font-bold text-ok">
        <Icono nombre="okCirculo" className="h-7 w-7" /> {datos.items.length} ítems en orden
      </p>
    );
  }
  const fs = resultado === "fuera_servicio";
  return (
    <div className={`rounded-lg border-2 p-4 ${fs ? "border-fs bg-fs-bg" : "border-obs-acento bg-obs-bg"}`}>
      <p className={`flex items-center gap-2 text-xl font-bold ${fs ? "text-fs" : "text-obs"}`}>
        <Icono nombre={fs ? "prohibido" : "alerta"} className="h-7 w-7" />
        {fs ? "NO USAR: hay fallas críticas" : "Operativo con observaciones"}
      </p>
      <ul className="mt-2 space-y-1 text-lg">
        {fallas.map((i) => (
          <li key={i.id} className="flex gap-2">
            <Icono nombre="x" className="mt-1 h-5 w-5" />
            <span>
              {i.texto}
              {i.critico ? " (crítico)" : ""} — {respuestas[i.id].observacion}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PantallaResultado({
  resultado,
  onListo,
}: {
  resultado: { tipo: "enviado" | "encolado"; resultado: string };
  onListo: () => void;
}) {
  const fs = resultado.resultado === "fuera_servicio";
  return (
    <section className="space-y-5">
      {fs ? (
        // Alto impacto, legible al sol: rojo sólido a ancho completo, texto blanco grande.
        <div role="alert" className="-mx-4 -mt-5 bg-fs px-4 py-8 text-white">
          <Icono nombre="prohibido" className="mb-3 h-16 w-16" />
          <p className="text-5xl font-bold leading-none">NO USAR</p>
          <p className="mt-3 text-2xl font-semibold">Avisá a Mantenimiento. El equipo quedó fuera de servicio.</p>
          <p className="mt-5 border-t border-white/40 pt-4 text-lg font-semibold">{AVISO_SEGURIDAD}</p>
        </div>
      ) : resultado.resultado === "observaciones" ? (
        <div className="rounded-lg border-2 border-obs-acento bg-obs-bg p-5 text-obs">
          <Icono nombre="alerta" className="mb-2 h-10 w-10" />
          <p className="text-3xl font-bold">Podés operar con observaciones</p>
          <p className="mt-1 text-xl">Mantenimiento va a programar la reparación.</p>
        </div>
      ) : (
        <div className="rounded-lg bg-ok p-5 text-white">
          <Icono nombre="okCirculo" className="mb-2 h-10 w-10" />
          <p className="text-3xl font-bold">Control registrado</p>
          <p className="mt-1 text-xl">Equipo en condiciones. Buen turno.</p>
        </div>
      )}
      <p className="flex gap-2 text-lg">
        <Icono nombre={resultado.tipo === "enviado" ? "okCirculo" : "sinSenal"} className="mt-1 h-5 w-5 text-sica-navy" />
        {resultado.tipo === "enviado"
          ? "El control llegó a Mantenimiento."
          : "No hay señal: el control quedó guardado en este teléfono y se va a enviar solo cuando vuelva la conexión. No cierres el navegador hasta ver el aviso de envío."}
      </p>
      <Button tamano="xl" ancho onClick={onListo}>
        Listo
      </Button>
    </section>
  );
}

function Dialogo({ titulo, onCerrar, children }: { titulo: string; onCerrar: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onCerrar();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onCerrar]);
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-sica-navy-900/60 sm:items-center" onClick={onCerrar}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className="mx-auto max-h-[90dvh] w-full max-w-xl overflow-y-auto rounded-t-xl bg-superficie p-5 sm:rounded-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <h2 className="text-2xl font-bold text-sica-navy">{titulo}</h2>
          <button aria-label="Cerrar" className="flex h-12 w-12 items-center justify-center rounded text-tinta-2" onClick={onCerrar}>
            <Icono nombre="cerrar" className="h-6 w-6" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function DialogoConformidad({
  falla,
  operarios,
  onCerrar,
  onListo,
}: {
  falla: Datos["fallas"][number];
  operarios: Datos["operarios"];
  onCerrar: () => void;
  onListo: () => void;
}) {
  const [opId, setOpId] = useState<number | null>(null);
  const [pin, setPin] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const op = operarios.find((o) => o.id === opId);

  const confirmar = async () => {
    if (!op) return;
    setEnviando(true);
    setErr(null);
    try {
      const r = await fetch("/api/public/conformidad", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fallaId: falla.id, operarioId: op.id, pin: op.requierePin ? pin : null }),
      });
      const j = await r.json().catch(() => ({}));
      if (r.ok) onListo();
      else setErr(j.error ?? "No se pudo registrar la conformidad");
    } catch {
      setErr("Sin conexión. Probá de nuevo cuando haya señal.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Dialogo titulo="Conformidad del autoelevadorista" onCerrar={onCerrar}>
      <p className="mb-1 text-xl font-semibold">{falla.itemTexto}</p>
      <p className="mb-4 text-tinta-2">
        Reparado{falla.responsableReparacion ? ` por ${falla.responsableReparacion}` : ""}. Confirmá solo si probaste que funciona
        bien.
      </p>
      {err && (
        <p role="alert" className="mb-3 flex gap-2 rounded bg-fs-bg px-3 py-2 font-semibold text-fs">
          <Icono nombre="alerta" className="mt-0.5 h-5 w-5" /> {err}
        </p>
      )}
      {!op ? (
        <ListaOperarios operarios={operarios} seleccionado={opId} onElegir={setOpId} />
      ) : (
        <div className="space-y-4">
          <p className="text-lg">
            Conformidad de <strong>{op.nombre}</strong>{" "}
            <button className="min-h-[44px] px-1 text-sica-navy underline" onClick={() => setOpId(null)}>
              cambiar
            </button>
          </p>
          {op.requierePin && <CampoPin valor={pin} onCambio={setPin} etiqueta="PIN" />}
          <Button
            tamano="xl"
            ancho
            icono="check"
            cargando={enviando}
            onClick={() => void confirmar()}
            disabled={op.requierePin && pin.length !== 4}
          >
            {enviando ? "Registrando…" : "Doy conformidad"}
          </Button>
        </div>
      )}
      <Button variante="fantasma" tamano="lg" ancho className="mt-2" onClick={onCerrar}>
        Cancelar
      </Button>
    </Dialogo>
  );
}
