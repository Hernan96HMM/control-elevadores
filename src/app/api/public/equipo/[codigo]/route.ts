import { datosPantallaOperario } from "@/lib/servicios/equipos";
import { ipDe, limitar } from "@/lib/ratelimit";
import { codigoEquipoSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

// Público (lo usa el celular del operario tras escanear el QR).
export function GET(req: Request, { params }: { params: { codigo: string } }) {
  const rl = limitar(`equipo:${ipDe(req.headers)}`, 120, 60_000);
  if (!rl.ok) return Response.json({ error: "Demasiadas solicitudes" }, { status: 429 });
  const codigo = codigoEquipoSchema.safeParse(params.codigo);
  if (!codigo.success) return Response.json({ error: "Código inválido" }, { status: 400 });
  const datos = datosPantallaOperario(codigo.data);
  if (!datos) return Response.json({ error: "Equipo inexistente" }, { status: 404 });
  return Response.json(datos, { headers: { "Cache-Control": "no-store" } });
}
