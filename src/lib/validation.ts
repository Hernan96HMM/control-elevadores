import { z } from "zod";

export const MAX_FOTO_BYTES = 3 * 1024 * 1024; // tras la compresión del cliente sobra margen

const texto = (max: number) => z.string().trim().max(max);

export const pinSchema = z.string().regex(/^\d{4}$/, "El PIN debe tener 4 dígitos");

export const itemControlSchema = z
  .object({
    itemId: z.number().int().positive(),
    ok: z.boolean(),
    observacion: texto(500).optional().nullable(),
    foto: z.string().max(5_000_000).optional().nullable(), // data URL
  })
  .refine((i) => i.ok || (i.observacion ?? "").trim().length >= 3, {
    message: "Toda FALLA requiere una observación",
    path: ["observacion"],
  });

export const controlSchema = z.object({
  clientId: z.string().regex(/^[A-Za-z0-9-]{8,64}$/),
  equipoCodigo: z.string().trim().min(1).max(40),
  operarioId: z.number().int().positive(),
  pin: pinSchema.optional().nullable(),
  horas: z.number().finite().min(0, "Horas inválidas").max(999_999, "Horas inválidas"),
  observaciones: texto(1000).optional().nullable(),
  items: z.array(itemControlSchema).min(1).max(100),
});
export type ControlInput = z.infer<typeof controlSchema>;

export const conformidadSchema = z.object({
  fallaId: z.number().int().positive(),
  operarioId: z.number().int().positive(),
  pin: pinSchema.optional().nullable(),
});

export const loginSchema = z.object({
  usuario: z.string().trim().min(1).max(64),
  password: z.string().min(1).max(200),
});

export const codigoEquipoSchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9_-]{1,40}$/, "Código: letras, números, guion o guion bajo (sin espacios)");

/** Verifica que el control cubra exactamente los ítems activos, sin repetidos ni extras. */
export function validarCoberturaItems(activos: number[], recibidos: number[]): string | null {
  const set = new Set(recibidos);
  if (set.size !== recibidos.length) return "Hay ítems repetidos";
  const faltan = activos.filter((id) => !set.has(id));
  if (faltan.length) return `Faltan ${faltan.length} ítem(s) por controlar`;
  const activosSet = new Set(activos);
  if (recibidos.some((id) => !activosSet.has(id))) return "Hay ítems que no corresponden al checklist";
  return null;
}

export type ImagenDecodificada = { buffer: Buffer; ext: "jpg" | "png" | "webp"; mime: string };

/**
 * Decodifica una data URL de imagen y valida el contenido REAL por magic bytes
 * (no confía en el MIME declarado). Solo JPEG / PNG / WebP.
 */
export function decodificarImagen(dataUrl: string): ImagenDecodificada | { error: string } {
  const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!m) return { error: "Formato de imagen no permitido" };
  const buffer = Buffer.from(m[2], "base64");
  if (buffer.length === 0) return { error: "Imagen vacía" };
  if (buffer.length > MAX_FOTO_BYTES) return { error: "La imagen supera el tamaño máximo" };
  const tipo = detectarTipo(buffer);
  if (!tipo) return { error: "El archivo no es una imagen válida" };
  return { buffer, ...tipo };
}

export function detectarTipo(b: Buffer): { ext: "jpg" | "png" | "webp"; mime: string } | null {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { ext: "jpg", mime: "image/jpeg" };
  if (b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])))
    return { ext: "png", mime: "image/png" };
  if (b.length >= 12 && b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP")
    return { ext: "webp", mime: "image/webp" };
  return null;
}
