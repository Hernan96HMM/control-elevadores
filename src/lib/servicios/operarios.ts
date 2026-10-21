import "server-only";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { getDb, schema } from "../db";

/** Identifica al operario: debe existir, estar habilitado y, si tiene PIN, coincidir. */
export async function verificarOperario(
  id: number,
  pin: string | null | undefined,
): Promise<{ ok: true; operario: { id: number; nombre: string } } | { ok: false; error: string }> {
  const op = getDb().select().from(schema.operarios).where(eq(schema.operarios.id, id)).get();
  if (!op) return { ok: false, error: "Operario inexistente" };
  if (!op.habilitado) return { ok: false, error: "El operario no está habilitado para conducir autoelevadores" };
  if (op.pinHash) {
    if (!pin) return { ok: false, error: "Ingresá tu PIN" };
    if (!(await bcrypt.compare(pin, op.pinHash))) return { ok: false, error: "PIN incorrecto" };
  }
  return { ok: true, operario: { id: op.id, nombre: op.nombre } };
}
