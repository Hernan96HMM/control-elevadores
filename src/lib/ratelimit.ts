import "server-only";

// Rate limit en memoria por clave (IP + endpoint). Suficiente para un único contenedor.
type Bucket = { n: number; reset: number };
const g = globalThis as unknown as { __rl?: Map<string, Bucket> };
const buckets = (g.__rl ??= new Map());

export function limitar(clave: string, max: number, ventanaMs: number): { ok: boolean; reintentarEn: number } {
  const ahora = Date.now();
  if (buckets.size > 5000) {
    for (const [k, b] of buckets) if (b.reset < ahora) buckets.delete(k);
  }
  const b = buckets.get(clave);
  if (!b || b.reset < ahora) {
    buckets.set(clave, { n: 1, reset: ahora + ventanaMs });
    return { ok: true, reintentarEn: 0 };
  }
  b.n++;
  return { ok: b.n <= max, reintentarEn: Math.ceil((b.reset - ahora) / 1000) };
}

/** IP del cliente detrás de Nginx (X-Real-IP / X-Forwarded-For). */
export function ipDe(headers: Headers): string {
  return (
    headers.get("x-real-ip") ||
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "desconocida"
  );
}
