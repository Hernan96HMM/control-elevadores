import { leerImagen } from "@/lib/uploads";
import { usuarioApi } from "@/lib/sesion";

export const dynamic = "force-dynamic";

// Fotos servidas solo a usuarios autenticados (nunca como archivos estáticos).
export async function GET(_req: Request, { params }: { params: { nombre: string } }) {
  if (!(await usuarioApi())) return Response.json({ error: "No autenticado" }, { status: 401 });
  const img = leerImagen(params.nombre);
  if (!img) return Response.json({ error: "No encontrada" }, { status: 404 });
  return new Response(new Uint8Array(img.buffer), {
    headers: {
      "Content-Type": img.mime,
      "Cache-Control": "private, max-age=86400",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'",
    },
  });
}
