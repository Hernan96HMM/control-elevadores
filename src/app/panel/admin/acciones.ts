"use server";

import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/lib/db";
import { requerirUsuario } from "@/lib/sesion";
import { auditar } from "@/lib/audit";
import { publicar } from "@/lib/events";
import { ipDe } from "@/lib/ratelimit";
import { codigoEquipoSchema, pinSchema } from "@/lib/validation";
import { guardarConfig } from "@/lib/servicios/config";

export type EstadoForm = { ok?: string; error?: string } | null;

const id = z.coerce.number().int().positive().optional();
const check = (f: FormData, k: string) => f.get(k) === "on";
const str = (f: FormData, k: string) => String(f.get(k) ?? "");
const primerError = (e: z.ZodError) => e.issues[0]?.message ?? "Datos inválidos";
const esUnico = (e: unknown) => e instanceof Error && /UNIQUE/i.test(e.message);

async function admin() {
  const u = await requerirUsuario("admin");
  return { u, actor: `usuario:${u.usuario}`, ip: ipDe(headers()) };
}

// ---------- Equipos ----------
const equipoSchema = z.object({
  id,
  codigo: codigoEquipoSchema,
  nombre: z.string().trim().min(1, "Falta el nombre").max(80),
  descripcion: z.string().trim().max(200),
  activo: z.boolean(),
});

export async function guardarEquipo(_p: EstadoForm, f: FormData): Promise<EstadoForm> {
  const { actor, ip } = await admin();
  const p = equipoSchema.safeParse({
    id: f.get("id") || undefined,
    codigo: str(f, "codigo"),
    nombre: str(f, "nombre"),
    descripcion: str(f, "descripcion"),
    activo: check(f, "activo"),
  });
  if (!p.success) return { error: primerError(p.error) };
  const { id: eid, ...v } = p.data;
  const db = getDb();
  try {
    if (eid) db.update(schema.equipos).set({ ...v, descripcion: v.descripcion || null }).where(eq(schema.equipos.id, eid)).run();
    else db.insert(schema.equipos).values({ ...v, descripcion: v.descripcion || null }).run();
  } catch (e) {
    if (esUnico(e)) return { error: `Ya existe un equipo con el código ${v.codigo}` };
    throw e;
  }
  auditar({ actor, accion: eid ? "equipo.editado" : "equipo.creado", entidad: "equipo", entidadId: eid ?? v.codigo, detalle: v, ip });
  publicar({ tipo: "equipos" });
  revalidatePath("/panel/admin/equipos");
  return { ok: eid ? "Equipo actualizado" : "Equipo creado" };
}

// ---------- Operarios ----------
const operarioSchema = z.object({
  id,
  nombre: z.string().trim().min(2, "Falta el nombre").max(80),
  legajo: z.string().trim().max(30),
  habilitado: z.boolean(),
  pin: z.union([z.literal(""), pinSchema]),
  quitarPin: z.boolean(),
});

export async function guardarOperario(_p: EstadoForm, f: FormData): Promise<EstadoForm> {
  const { actor, ip } = await admin();
  const p = operarioSchema.safeParse({
    id: f.get("id") || undefined,
    nombre: str(f, "nombre"),
    legajo: str(f, "legajo"),
    habilitado: check(f, "habilitado"),
    pin: str(f, "pin"),
    quitarPin: check(f, "quitarPin"),
  });
  if (!p.success) return { error: primerError(p.error) };
  const { id: oid, pin, quitarPin, ...v } = p.data;
  const set: Partial<typeof schema.operarios.$inferInsert> = { ...v, legajo: v.legajo || null };
  if (pin) set.pinHash = await bcrypt.hash(pin, 10);
  else if (quitarPin) set.pinHash = null;
  const db = getDb();
  try {
    if (oid) db.update(schema.operarios).set(set).where(eq(schema.operarios.id, oid)).run();
    else db.insert(schema.operarios).values({ nombre: v.nombre, ...set }).run();
  } catch (e) {
    if (esUnico(e)) return { error: `Ya existe un operario llamado ${v.nombre}` };
    throw e;
  }
  auditar({
    actor,
    accion: oid ? "operario.editado" : "operario.creado",
    entidad: "operario",
    entidadId: oid ?? v.nombre,
    detalle: { ...v, pin: pin ? "cambiado" : quitarPin ? "quitado" : "sin cambios" },
    ip,
  });
  revalidatePath("/panel/admin/operarios");
  return { ok: oid ? "Operario actualizado" : "Operario creado" };
}

// ---------- Ítems del checklist ----------
const itemSchema = z.object({
  id,
  texto: z.string().trim().min(2, "Falta el texto").max(120),
  orden: z.coerce.number().int().min(1).max(999),
  critico: z.boolean(),
  activo: z.boolean(),
});

export async function guardarItem(_p: EstadoForm, f: FormData): Promise<EstadoForm> {
  const { actor, ip } = await admin();
  const p = itemSchema.safeParse({
    id: f.get("id") || undefined,
    texto: str(f, "texto"),
    orden: f.get("orden"),
    critico: check(f, "critico"),
    activo: check(f, "activo"),
  });
  if (!p.success) return { error: primerError(p.error) };
  const { id: iid, ...v } = p.data;
  const db = getDb();
  if (iid) db.update(schema.itemsChecklist).set(v).where(eq(schema.itemsChecklist.id, iid)).run();
  else db.insert(schema.itemsChecklist).values(v).run();
  auditar({ actor, accion: iid ? "item.editado" : "item.creado", entidad: "item", entidadId: iid ?? v.texto, detalle: v, ip });
  revalidatePath("/panel/admin/items");
  return { ok: iid ? "Ítem actualizado" : "Ítem agregado" };
}

// ---------- Usuarios de mantenimiento ----------
const usuarioSchema = z.object({
  id,
  usuario: z
    .string()
    .trim()
    .regex(/^[a-zA-Z0-9._-]{3,40}$/, "Usuario: 3 a 40 caracteres, sin espacios"),
  nombre: z.string().trim().min(2, "Falta el nombre").max(80),
  rol: z.enum(["mantenimiento", "admin"]),
  activo: z.boolean(),
  password: z.union([z.literal(""), z.string().min(8, "La contraseña debe tener al menos 8 caracteres").max(200)]),
});

export async function guardarUsuario(_p: EstadoForm, f: FormData): Promise<EstadoForm> {
  const { u, actor, ip } = await admin();
  const p = usuarioSchema.safeParse({
    id: f.get("id") || undefined,
    usuario: str(f, "usuario"),
    nombre: str(f, "nombre"),
    rol: str(f, "rol"),
    activo: check(f, "activo"),
    password: str(f, "password"),
  });
  if (!p.success) return { error: primerError(p.error) };
  const { id: uid, password, ...v } = p.data;
  if (uid && String(uid) === u.id && (!v.activo || v.rol !== "admin")) {
    return { error: "No podés desactivarte ni quitarte el rol de administrador a vos mismo" };
  }
  if (!uid && !password) return { error: "Definí una contraseña inicial" };
  const db = getDb();
  if (uid && (!v.activo || v.rol !== "admin")) {
    const otrosAdmins = db
      .select({ id: schema.usuarios.id })
      .from(schema.usuarios)
      .where(and(eq(schema.usuarios.rol, "admin"), eq(schema.usuarios.activo, true), ne(schema.usuarios.id, uid)))
      .all();
    if (otrosAdmins.length === 0) return { error: "Tiene que quedar al menos un administrador activo" };
  }
  const set: Partial<typeof schema.usuarios.$inferInsert> = { ...v };
  if (password) set.passwordHash = await bcrypt.hash(password, 10);
  try {
    if (uid) db.update(schema.usuarios).set(set).where(eq(schema.usuarios.id, uid)).run();
    else db.insert(schema.usuarios).values({ ...v, passwordHash: set.passwordHash! }).run();
  } catch (e) {
    if (esUnico(e)) return { error: `El usuario ${v.usuario} ya existe` };
    throw e;
  }
  auditar({
    actor,
    accion: uid ? "usuario.editado" : "usuario.creado",
    entidad: "usuario",
    entidadId: uid ?? v.usuario,
    detalle: { ...v, password: password ? "cambiada" : "sin cambios" },
    ip,
  });
  revalidatePath("/panel/admin/usuarios");
  return { ok: uid ? "Usuario actualizado" : "Usuario creado" };
}

// ---------- Destinatarios de email ----------
export async function guardarDestinatarios(_p: EstadoForm, f: FormData): Promise<EstadoForm> {
  const { actor, ip } = await admin();
  const lista = str(f, "emails")
    .split(/[\s,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const invalidos = lista.filter((e) => !z.email().safeParse(e).success);
  if (invalidos.length) return { error: `Direcciones inválidas: ${invalidos.join(", ")}` };
  guardarConfig("alert_emails", lista.join(","));
  auditar({ actor, accion: "config.emails", detalle: lista, ip });
  revalidatePath("/panel/admin/config");
  return { ok: "Destinatarios guardados" };
}
