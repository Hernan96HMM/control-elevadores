"use client";

// Almacenamiento local tolerante a fallos: IndexedDB (admite fotos) con fallback a
// localStorage. Todo va con try/catch: en modo privado o con datos bloqueados la app
// sigue funcionando, solo sin borrador / cola persistente.

const DB = "control-autoelevadores";
const STORE = "kv";

function abrir(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      if (typeof indexedDB === "undefined") return resolve(null);
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function op<T>(modo: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest): Promise<T | undefined> {
  const db = await abrir();
  if (!db) throw new Error("sin indexeddb");
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(STORE, modo);
      const req = fn(tx.objectStore(STORE));
      req.onsuccess = () => resolve(req.result as T);
      req.onerror = () => reject(req.error);
    } catch (e) {
      reject(e);
    }
  });
}

export async function leer<T>(clave: string): Promise<T | null> {
  try {
    const v = await op<T>("readonly", (s) => s.get(clave));
    return v ?? null;
  } catch {
    try {
      const raw = localStorage.getItem(clave);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  }
}

export async function escribir(clave: string, valor: unknown): Promise<boolean> {
  try {
    await op("readwrite", (s) => s.put(valor, clave));
    return true;
  } catch {
    try {
      localStorage.setItem(clave, JSON.stringify(valor));
      return true;
    } catch {
      return false; // cuota llena o almacenamiento bloqueado
    }
  }
}

export async function borrar(clave: string): Promise<void> {
  try {
    await op("readwrite", (s) => s.delete(clave));
  } catch {
    /* ignorado */
  }
  try {
    localStorage.removeItem(clave);
  } catch {
    /* ignorado */
  }
}

// ---- Cola de reintento de controles ----

export type ControlPendiente = { clientId: string; equipoCodigo: string; payload: unknown; creado: string };
const COLA = "cola-controles";

export async function encolar(c: ControlPendiente): Promise<boolean> {
  const cola = (await leer<ControlPendiente[]>(COLA)) ?? [];
  if (!cola.some((x) => x.clientId === c.clientId)) cola.push(c);
  return escribir(COLA, cola);
}

export async function pendientes(): Promise<ControlPendiente[]> {
  return (await leer<ControlPendiente[]>(COLA)) ?? [];
}

export async function quitarDeCola(clientId: string): Promise<void> {
  const cola = (await leer<ControlPendiente[]>(COLA)) ?? [];
  await escribir(
    COLA,
    cola.filter((x) => x.clientId !== clientId),
  );
}

/**
 * Intenta enviar todo lo pendiente. Devuelve cuántos se enviaron.
 * Respuestas 4xx (datos inválidos, ya existe) se descartan para no reintentar para siempre.
 */
export async function vaciarCola(): Promise<{ enviados: number; descartados: string[] }> {
  const cola = await pendientes();
  let enviados = 0;
  const descartados: string[] = [];
  for (const c of cola) {
    try {
      const r = await fetch("/api/public/controles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(c.payload),
      });
      if (r.ok) {
        enviados++;
        await quitarDeCola(c.clientId);
      } else if (r.status >= 400 && r.status < 500 && r.status !== 429) {
        const j = await r.json().catch(() => ({}));
        descartados.push(`${c.equipoCodigo}: ${j.error ?? r.status}`);
        await quitarDeCola(c.clientId);
      }
    } catch {
      break; // sin red: se reintenta más tarde
    }
  }
  return { enviados, descartados };
}

export function nuevoId(): string {
  try {
    if (crypto?.randomUUID) return crypto.randomUUID();
  } catch {
    /* contexto no seguro (HTTP): randomUUID no existe */
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}-${Math.random().toString(36).slice(2, 10)}`;
}
