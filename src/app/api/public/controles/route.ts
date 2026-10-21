import { registrarControl } from "@/lib/servicios/controles";
import { ipDe, limitar } from "@/lib/ratelimit";
import { controlSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

const MAX_BODY = 30 * 1024 * 1024; // 21 fotos comprimidas en base64, con margen

export async function POST(req: Request) {
  const ip = ipDe(req.headers);
  const rl = limitar(`controles:${ip}`, 20, 60_000);
  if (!rl.ok) return Response.json({ error: "Demasiados envíos, esperá un minuto" }, { status: 429 });
  if (Number(req.headers.get("content-length") || 0) > MAX_BODY) {
    return Response.json({ error: "El envío es demasiado grande" }, { status: 413 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "JSON inválido" }, { status: 400 });
  }
  const parsed = controlSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  }
  const r = await registrarControl(parsed.data, ip);
  if (!r.ok) return Response.json({ error: r.error, yaExiste: r.yaExiste ?? false }, { status: r.status });
  return Response.json(r, { status: r.duplicado ? 200 : 201 });
}
