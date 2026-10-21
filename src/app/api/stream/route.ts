import { suscribir } from "@/lib/events";
import { usuarioApi } from "@/lib/sesion";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const HEARTBEAT_MS = 25_000;

// Server-Sent Events para el dashboard de Mantenimiento.
export async function GET(req: Request) {
  if (!(await usuarioApi())) return Response.json({ error: "No autenticado" }, { status: 401 });

  const enc = new TextEncoder();
  let limpiar: (() => void) | undefined;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const escribir = (txt: string) => {
        try {
          controller.enqueue(enc.encode(txt));
        } catch {
          limpiar?.();
        }
      };
      escribir(`retry: 3000\nevent: hola\ndata: {}\n\n`);
      const desuscribir = suscribir((ev) => escribir(`event: ${ev.tipo}\ndata: ${JSON.stringify(ev)}\n\n`));
      const hb = setInterval(() => escribir(`: ping\n\n`), HEARTBEAT_MS);
      limpiar = () => {
        clearInterval(hb);
        desuscribir();
        limpiar = undefined;
      };
      req.signal.addEventListener("abort", () => {
        limpiar?.();
        try {
          controller.close();
        } catch {
          /* ya cerrado */
        }
      });
    },
    cancel() {
      limpiar?.();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
