"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DatosPantallaOperario } from "@/lib/servicios/equipos";
import { ETIQUETA_ESTADO, ETIQUETA_FALLA, resultadoControl, type EstadoEquipo } from "@/lib/estado";
import { borrar, encolar, escribir, leer, nuevoId, pendientes, vaciarCola } from "@/lib/cliente/almacen";
import { comprimirFoto } from "@/lib/cliente/fotos";

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
    const onOnline = () => void reintentar();
    window.addEventListener("online", onOnline);
    const t = setInterval(() => void reintentar(), 20_000);
    return () => {
      window.removeEventListener("online", onOnline);
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

  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col bg-hormigon">
      <header className="bg-asfalto px-4 pb-4 pt-5 text-white">
        <p className="text-sm text-asfalto-300">Control diario · {fechaLarga(datos.fecha)}</p>
        <h1 className="font-cartel text-4xl font-bold leading-tight">{datos.equipo.nombre}</h1>
        <p className="text-sm text-asfalto-300">Código {datos.equipo.codigo}</p>
      </header>

      <PlacaEstado estado={datos.estado} />

      {enCola > 0 && (
        <div className="flex items-center justify-between gap-3 border-b-4 border-naranja bg-naranja-claro px-4 py-3">
          <p className="font-semibold">
            {enCola === 1 ? "1 control guardado" : `${enCola} controles guardados`} en el teléfono, esperando señal.
          </p>
          <button className="btn-secundario shrink-0" onClick={() => void reintentar()}>
            Reintentar
          </button>
        </div>
      )}

      {error && (
        <div role="alert" className="border-b-4 border-rojo bg-rojo-claro px-4 py-3 text-lg font-semibold text-rojo">
          {error}
        </div>
      )}

      <main className="flex-1 px-4 py-5">
        {b.paso === "inicio" && (
          <Inicio
            datos={datos}
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
          <Paso titulo="¿Quién conduce?" ayuda="Elegí tu nombre. Solo figuran los operarios habilitados.">
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
          <Paso titulo="Horas del equipo" ayuda="Copiá el número del horómetro.">
            <label className="sr-only" htmlFor="horas">
              Horas
            </label>
            <input
              id="horas"
              inputMode="decimal"
              autoFocus
              className="w-full rounded-md border-4 border-asfalto bg-white px-4 py-4 text-center font-cartel text-5xl font-bold tracking-wide"
              placeholder="0"
              value={b.horas}
              onChange={(e) => setB((x) => ({ ...x, horas: e.target.value.replace(/[^\d.,]/g, "") }))}
            />
            <BotonGrande
              disabled={!(Number(b.horas.replace(",", ".")) >= 0) || b.horas.trim() === ""}
              onClick={() => ir("items")}
            >
              Continuar
            </BotonGrande>
            <BotonVolver onClick={() => ir("operario")} />
          </Paso>
        )}

        {b.paso === "items" && (
          <div>
            <button
              className="mb-2 flex min-h-20 w-full items-center justify-center rounded-lg bg-verde px-4 font-cartel text-3xl font-bold text-white shadow-[0_4px_0_#06512a] active:translate-y-1 active:shadow-none"
              onClick={() => setConfirmarTodo(true)}
            >
              ✓ Todo en orden
            </button>
            <p className="mb-5 text-center text-asfalto-500">o revisá ítem por ítem</p>

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

            <div className="sticky bottom-0 -mx-4 mt-5 border-t-2 border-asfalto-300 bg-hormigon px-4 py-3">
              <p className="mb-2 text-center font-semibold">
                {respondidos} de {datos.items.length} ítems revisados
                {faltaObs && <span className="block text-rojo">Completá la observación de cada FALLA</span>}
              </p>
              <BotonGrande disabled={respondidos < datos.items.length || faltaObs} onClick={() => ir("firma")}>
                Continuar a la firma
              </BotonGrande>
              <BotonVolver onClick={() => ir("horas")} />
            </div>
          </div>
        )}

        {b.paso === "firma" && operario && (
          <Paso titulo="Firma del conductor" ayuda="Revisá el resumen y confirmá.">
            <ResumenPrevio datos={datos} respuestas={b.respuestas} resultado={resultadoPrevio} />
            <dl className="mb-4 grid grid-cols-[auto,1fr] gap-x-4 gap-y-1 rounded-lg bg-white p-4 text-lg">
              <dt className="text-asfalto-500">Conductor</dt>
              <dd className="font-semibold">{operario.nombre}</dd>
              <dt className="text-asfalto-500">Equipo</dt>
              <dd className="font-semibold">{datos.equipo.nombre}</dd>
              <dt className="text-asfalto-500">Horas</dt>
              <dd className="font-semibold">{b.horas}</dd>
            </dl>
            <label className="etiqueta text-base" htmlFor="obs">
              Observaciones generales (opcional)
            </label>
            <textarea
              id="obs"
              rows={2}
              className="campo mb-4 text-lg"
              value={b.observaciones}
              onChange={(e) => setB((x) => ({ ...x, observaciones: e.target.value }))}
            />
            {operario.requierePin && (
              <>
                <label className="etiqueta text-base" htmlFor="pin">
                  Tu PIN
                </label>
                <input
                  id="pin"
                  type="password"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={4}
                  className="mb-4 w-full rounded-md border-4 border-asfalto bg-white px-4 py-3 text-center font-cartel text-4xl tracking-[0.5em]"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                />
              </>
            )}
            <p className="mb-3 text-sm text-asfalto-500">
              Al firmar declarás, como {operario.nombre}, que realizaste el control del equipo. Se registran la fecha y la hora.
            </p>
            <BotonGrande onClick={() => void enviar()} disabled={enviando}>
              {enviando ? "Enviando…" : "Firmar y registrar"}
            </BotonGrande>
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

        <p className="mt-8 border-l-8 border-amarillo bg-white px-4 py-3 text-base font-semibold">{AVISO_SEGURIDAD}</p>
      </main>

      {confirmarTodo && (
        <Dialogo onCerrar={() => setConfirmarTodo(false)} titulo="¿Todo en orden?">
          <p className="mb-5 text-lg">
            Confirmás que revisaste los {datos.items.length} ítems del checklist y están todos bien, incluidos frenos, cinturón,
            matafuego y uñas.
          </p>
          <BotonGrande onClick={todoEnOrden}>Sí, revisé todo</BotonGrande>
          <button className="btn-secundario mt-3 min-h-14 w-full text-lg" onClick={() => setConfirmarTodo(false)}>
            No, revisar ítem por ítem
          </button>
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

function PlacaEstado({ estado }: { estado: EstadoEquipo }) {
  if (estado === "fuera_servicio") {
    return (
      <div role="alert" className="bg-rojo px-4 py-5 text-white">
        <p className="font-cartel text-5xl font-bold leading-none">NO USAR</p>
        <p className="mt-1 text-xl font-semibold">Fuera de servicio · avisar a Mantenimiento</p>
      </div>
    );
  }
  const estilos: Record<Exclude<EstadoEquipo, "fuera_servicio">, string> = {
    operativo: "bg-verde text-white",
    observaciones: "bg-amarillo text-asfalto",
    sin_control: "bg-asfalto-700 text-white",
  };
  return (
    <div className={`px-4 py-3 font-cartel text-2xl font-bold ${estilos[estado]}`}>
      {estado === "sin_control" ? "Sin control hoy" : ETIQUETA_ESTADO[estado]}
    </div>
  );
}

function Inicio({
  datos,
  resueltas,
  onEmpezar,
  onConformidad,
  borradorEnCurso,
  onDescartar,
}: {
  datos: Datos;
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
        <section className="rounded-lg bg-white p-4">
          <h2 className="mb-2 font-cartel text-2xl font-bold">Fallas sin resolver</h2>
          <ul className="space-y-2">
            {pendientes.map((f) => (
              <li key={f.id} className={`border-l-8 pl-3 ${f.critica ? "border-rojo" : "border-amarillo"}`}>
                <p className="text-lg font-semibold">
                  {f.itemTexto}
                  {f.critica && <span className="ml-2 rounded bg-rojo px-2 py-0.5 text-sm text-white">Crítico</span>}
                </p>
                <p className="text-asfalto-500">
                  {ETIQUETA_FALLA[f.estado]}
                  {f.descripcion ? ` · ${f.descripcion}` : ""}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {resueltas.length > 0 && (
        <section className="rounded-lg border-4 border-verde bg-white p-4">
          <h2 className="mb-1 font-cartel text-2xl font-bold">Reparaciones para confirmar</h2>
          <p className="mb-3 text-asfalto-500">Mantenimiento marcó estas fallas como resueltas. Probalas y dá tu conformidad.</p>
          <ul className="space-y-2">
            {resueltas.map((f) => (
              <li key={f.id}>
                <button
                  className="flex min-h-16 w-full items-center justify-between gap-3 rounded-md border-2 border-verde px-4 py-2 text-left text-lg font-semibold"
                  onClick={() => onConformidad(f.id)}
                >
                  <span>{f.itemTexto}</span>
                  <span className="shrink-0 rounded bg-verde px-3 py-1 text-base text-white">Dar conformidad</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {datos.control ? (
        <section className="rounded-lg bg-white p-4">
          <h2 className="font-cartel text-2xl font-bold">Control de hoy registrado</h2>
          <p className="mb-3 text-lg">
            {datos.control.operario} · {hora(datos.control.firmadoEn)} · {datos.control.horas} h
          </p>
          {datos.control.items.some((i) => !i.ok) ? (
            <ul className="space-y-1">
              {datos.control.items
                .filter((i) => !i.ok)
                .map((i) => (
                  <li key={i.texto} className="text-lg">
                    <span className="font-semibold text-rojo">✗ {i.texto}</span>
                    {i.observacion ? ` — ${i.observacion}` : ""}
                  </li>
                ))}
            </ul>
          ) : (
            <p className="text-lg font-semibold text-verde">✓ Los {datos.control.items.length} ítems estaban en orden.</p>
          )}
          <p className="mt-3 text-asfalto-500">El control se hace una vez por día, en el primer uso.</p>
        </section>
      ) : (
        <>
          {datos.operarios.length === 0 ? (
            <p className="rounded-lg bg-white p-4 text-lg">
              No hay operarios habilitados cargados. Pedile a Mantenimiento que los dé de alta.
            </p>
          ) : (
            <BotonGrande onClick={onEmpezar}>{borradorEnCurso ? "Seguir con el control" : "Empezar control"}</BotonGrande>
          )}
          {borradorEnCurso && (
            <button className="w-full py-2 text-asfalto-500 underline" onClick={onDescartar}>
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
      <h2 className="font-cartel text-3xl font-bold">{titulo}</h2>
      {ayuda && <p className="mb-4 text-lg text-asfalto-500">{ayuda}</p>}
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function BotonGrande(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className="flex min-h-16 w-full items-center justify-center rounded-lg bg-asfalto px-4 font-cartel text-2xl font-bold text-amarillo shadow-[0_4px_0_#000] active:translate-y-1 active:shadow-none disabled:bg-asfalto-300 disabled:text-white disabled:shadow-none"
    />
  );
}

function BotonVolver({ onClick }: { onClick: () => void }) {
  return (
    <button className="mt-2 min-h-12 w-full text-lg text-asfalto-500 underline" onClick={onClick}>
      Volver
    </button>
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
    <ul className="space-y-2">
      {operarios.map((o) => (
        <li key={o.id}>
          <button
            className={`flex min-h-16 w-full items-center rounded-lg border-4 px-4 text-left text-2xl font-semibold ${
              seleccionado === o.id ? "border-asfalto bg-amarillo" : "border-white bg-white"
            }`}
            onClick={() => onElegir(o.id)}
          >
            {o.nombre}
          </button>
        </li>
      ))}
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
  return (
    <li className={`flex overflow-hidden rounded-lg bg-white ${falla ? "ring-4 ring-rojo" : ""}`}>
      {critico && <div className="cinta-peligro w-3 shrink-0" aria-hidden />}
      <div className="flex-1 p-3">
        <p className="mb-2 text-xl font-semibold leading-snug">
          <span className="mr-1 text-asfalto-500">{n}.</span>
          {texto}
          {critico && (
            <span className="ml-2 inline-block rounded bg-asfalto px-2 py-0.5 align-middle text-sm font-semibold text-amarillo">
              Crítico *
            </span>
          )}
        </p>
        <div className="grid grid-cols-2 gap-2" role="group" aria-label={texto}>
          <button
            aria-pressed={resp?.ok === true}
            className={`min-h-14 rounded-md border-4 font-cartel text-2xl font-bold ${
              resp?.ok === true ? "border-verde bg-verde text-white" : "border-verde bg-white text-verde"
            }`}
            onClick={() => onCambio({ ok: true })}
          >
            ✓ OK
          </button>
          <button
            aria-pressed={falla}
            className={`min-h-14 rounded-md border-4 font-cartel text-2xl font-bold ${
              falla ? "border-rojo bg-rojo text-white" : "border-rojo bg-white text-rojo"
            }`}
            onClick={() => onCambio({ ok: false })}
          >
            ✗ Falla
          </button>
        </div>
        {falla && (
          <div className="mt-3 space-y-2">
            {critico && (
              <p className="rounded bg-rojo-claro px-3 py-2 font-semibold text-rojo">
                Ítem crítico: el equipo queda fuera de servicio hasta que Mantenimiento lo repare.
              </p>
            )}
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
                <button className="btn-secundario min-h-12" onClick={() => onCambio({ foto: null })}>
                  Quitar foto
                </button>
              </div>
            ) : (
              <button className="btn-secundario min-h-12 w-full text-lg" onClick={() => fileRef.current?.click()} disabled={procesando}>
                {procesando ? "Procesando foto…" : "Sacar foto (opcional)"}
              </button>
            )}
          </div>
        )}
      </div>
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
  const caja =
    resultado === "fuera_servicio"
      ? "border-rojo bg-rojo-claro"
      : resultado === "observaciones"
        ? "border-amarillo bg-amarillo-claro"
        : "border-verde bg-verde-claro";
  return (
    <div className={`mb-4 rounded-lg border-4 p-4 ${caja}`}>
      {resultado === "ok" && <p className="font-cartel text-2xl font-bold text-verde">✓ {datos.items.length} ítems en orden</p>}
      {resultado !== "ok" && (
        <>
          <p className="font-cartel text-2xl font-bold">
            {resultado === "fuera_servicio" ? "NO USAR: hay fallas críticas" : "Operativo con observaciones"}
          </p>
          <ul className="mt-2 space-y-1 text-lg">
            {fallas.map((i) => (
              <li key={i.id}>
                ✗ {i.texto}
                {i.critico ? " *" : ""} — {respuestas[i.id].observacion}
              </li>
            ))}
          </ul>
        </>
      )}
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
    <section className="space-y-4">
      {fs ? (
        <div className="rounded-lg bg-rojo p-5 text-white">
          <p className="font-cartel text-6xl font-bold leading-none">NO USAR</p>
          <p className="mt-2 text-2xl font-semibold">Avisá a Mantenimiento. El equipo quedó fuera de servicio.</p>
        </div>
      ) : resultado.resultado === "observaciones" ? (
        <div className="rounded-lg bg-amarillo p-5">
          <p className="font-cartel text-4xl font-bold">Podés operar con observaciones</p>
          <p className="mt-1 text-xl">Mantenimiento va a programar la reparación.</p>
        </div>
      ) : (
        <div className="rounded-lg bg-verde p-5 text-white">
          <p className="font-cartel text-5xl font-bold">✓ Control registrado</p>
          <p className="mt-1 text-xl">Equipo en condiciones. Buen turno.</p>
        </div>
      )}
      <p className="text-lg">
        {resultado.tipo === "enviado"
          ? "El control llegó a Mantenimiento."
          : "No hay señal: el control quedó guardado en este teléfono y se va a enviar solo cuando vuelva la conexión. No cierres el navegador hasta ver el aviso de envío."}
      </p>
      <BotonGrande onClick={onListo}>Listo</BotonGrande>
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
    <div className="fixed inset-0 z-50 flex items-end bg-black/60 sm:items-center" onClick={onCerrar}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className="mx-auto max-h-[90dvh] w-full max-w-xl overflow-y-auto rounded-t-2xl bg-hormigon-claro p-5 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-3 font-cartel text-3xl font-bold">{titulo}</h2>
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
      <p className="mb-4 text-asfalto-500">
        Reparado{falla.responsableReparacion ? ` por ${falla.responsableReparacion}` : ""}. Confirmá solo si probaste que funciona
        bien.
      </p>
      {err && <p className="mb-3 rounded bg-rojo-claro px-3 py-2 font-semibold text-rojo">{err}</p>}
      {!op ? (
        <ListaOperarios operarios={operarios} seleccionado={opId} onElegir={setOpId} />
      ) : (
        <div className="space-y-3">
          <p className="text-lg">
            Conformidad de <strong>{op.nombre}</strong>{" "}
            <button className="text-asfalto-500 underline" onClick={() => setOpId(null)}>
              cambiar
            </button>
          </p>
          {op.requierePin && (
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              aria-label="PIN"
              placeholder="PIN"
              className="w-full rounded-md border-4 border-asfalto bg-white px-4 py-3 text-center font-cartel text-4xl tracking-[0.5em]"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
            />
          )}
          <BotonGrande onClick={() => void confirmar()} disabled={enviando || (op.requierePin && pin.length !== 4)}>
            {enviando ? "Registrando…" : "Doy conformidad"}
          </BotonGrande>
        </div>
      )}
      <button className="mt-3 min-h-12 w-full text-lg text-asfalto-500 underline" onClick={onCerrar}>
        Cancelar
      </button>
    </Dialogo>
  );
}
