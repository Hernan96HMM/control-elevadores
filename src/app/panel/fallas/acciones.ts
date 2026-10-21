"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requerirUsuario } from "@/lib/sesion";
import { actualizarFalla } from "@/lib/servicios/fallas";
import { guardarImagenBuffer } from "@/lib/uploads";
import { ipDe } from "@/lib/ratelimit";
import { ESTADOS_FALLA } from "@/lib/db/schema";

const esquema = z.object({
  id: z.coerce.number().int().positive(),
  estado: z.enum(ESTADOS_FALLA).optional(),
  responsable: z.string().trim().max(120).optional(),
  fechaReparacion: z
    .string()
    .regex(/^(\d{4}-\d{2}-\d{2})?$/)
    .optional(),
  comentario: z.string().trim().max(2000).optional(),
});

export type EstadoForm = { ok?: string; error?: string } | null;

export async function guardarFalla(_prev: EstadoForm, form: FormData): Promise<EstadoForm> {
  const u = await requerirUsuario();
  const p = esquema.safeParse({
    id: form.get("id"),
    estado: form.get("estado") || undefined,
    responsable: form.get("responsable") ?? undefined,
    fechaReparacion: form.get("fechaReparacion") ?? undefined,
    comentario: form.get("comentario") ?? undefined,
  });
  if (!p.success) return { error: p.error.issues[0]?.message ?? "Datos inválidos" };

  let foto: string | null = null;
  const archivo = form.get("foto");
  if (archivo instanceof File && archivo.size > 0) {
    const r = guardarImagenBuffer(Buffer.from(await archivo.arrayBuffer()));
    if ("error" in r) return { error: r.error };
    foto = r.nombre;
  }

  const r = actualizarFalla(
    p.data.id,
    {
      estado: p.data.estado,
      responsable: p.data.responsable,
      fechaReparacion: p.data.fechaReparacion,
      comentario: p.data.comentario || null,
      foto,
    },
    { usuario: u.usuario, nombre: u.nombre },
    ipDe(headers()),
  );
  if (!r.ok) return { error: r.error };
  revalidatePath(`/panel/fallas/${p.data.id}`);
  revalidatePath("/panel/fallas");
  return { ok: "Cambios guardados" };
}
