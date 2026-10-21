import { tarjetasEquipos } from "@/lib/servicios/equipos";
import { ultimosControles } from "@/lib/servicios/controles";
import { contarFallasAbiertas, listarFallas } from "@/lib/servicios/fallas";
import { usuarioApi } from "@/lib/sesion";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await usuarioApi())) return Response.json({ error: "No autenticado" }, { status: 401 });
  return Response.json(
    {
      equipos: tarjetasEquipos(),
      feed: ultimosControles(30),
      fallas: contarFallasAbiertas(),
      fallasAbiertas: listarFallas({ estados: ["abierta", "en_reparacion"] }).slice(0, 15),
      paraConformidad: listarFallas({ estados: ["resuelta"] }).length,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
