import "server-only";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { decodificarImagen, detectarTipo } from "./validation";

export function uploadsDir(): string {
  const p = process.env.UPLOADS_DIR || path.resolve(process.cwd(), "data", "uploads");
  if (!path.isAbsolute(p)) throw new Error(`UPLOADS_DIR debe ser absoluta (recibido: ${p})`);
  return p;
}

const NOMBRE_VALIDO = /^[a-f0-9]{32}\.(jpg|png|webp)$/;

/** Valida (magic bytes, tamaño) y guarda una imagen enviada como data URL. Devuelve el nombre de archivo. */
export function guardarImagen(dataUrl: string): { nombre: string } | { error: string } {
  const img = decodificarImagen(dataUrl);
  if ("error" in img) return img;
  return escribirArchivo(img.buffer, img.ext);
}

/** Igual que guardarImagen pero desde un archivo subido por formulario (panel de Mantenimiento). */
export function guardarImagenBuffer(buffer: Buffer): { nombre: string } | { error: string } {
  if (buffer.length === 0) return { error: "Imagen vacía" };
  if (buffer.length > MAX_FOTO_SUBIDA) return { error: "La imagen supera los 8 MB" };
  const tipo = detectarTipo(buffer);
  if (!tipo) return { error: "Solo se aceptan fotos JPEG, PNG o WebP" };
  return escribirArchivo(buffer, tipo.ext);
}

const MAX_FOTO_SUBIDA = 8 * 1024 * 1024;

function escribirArchivo(buffer: Buffer, ext: string): { nombre: string } {
  const dir = uploadsDir();
  fs.mkdirSync(dir, { recursive: true });
  const nombre = `${crypto.randomBytes(16).toString("hex")}.${ext}`;
  fs.writeFileSync(path.join(dir, nombre), buffer, { mode: 0o640 });
  return { nombre };
}

export function leerImagen(nombre: string): { buffer: Buffer; mime: string } | null {
  if (!NOMBRE_VALIDO.test(nombre)) return null; // evita path traversal
  const file = path.join(uploadsDir(), nombre);
  if (!fs.existsSync(file)) return null;
  const ext = nombre.split(".").pop();
  const mime = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
  return { buffer: fs.readFileSync(file), mime };
}
