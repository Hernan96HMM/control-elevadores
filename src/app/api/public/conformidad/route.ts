import { darConformidad } from "@/lib/servicios/fallas";
import { ipDe, limitar } from "@/lib/ratelimit";
import { conformidadSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const ip = ipDe(req.headers);
  if (!limitar(`conformidad:${ip}`, 20, 60_000).ok) {
    return Response.json({ error: "Demasiadas solicitudes" }, { status: 429 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "JSON inválido" }, { status: 400 });
  }
  const parsed = conformidadSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  const r = await darConformidad(parsed.data.fallaId, parsed.data.operarioId, parsed.data.pin, ip);
  if (!r.ok) return Response.json({ error: r.error }, { status: r.status });
  return Response.json({ ok: true });
}
