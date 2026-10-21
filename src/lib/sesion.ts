import "server-only";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

export type UsuarioSesion = { id: string; usuario: string; nombre: string; rol: "admin" | "mantenimiento" };

/** Para server components / actions: exige sesión (y rol admin si se pide). */
export async function requerirUsuario(rol?: "admin"): Promise<UsuarioSesion> {
  const s = await auth();
  if (!s?.user) redirect("/login");
  if (rol === "admin" && s.user.rol !== "admin") redirect("/panel");
  return { id: s.user.id, usuario: s.user.usuario, nombre: s.user.name ?? s.user.usuario, rol: s.user.rol };
}

/** Para route handlers: devuelve null si no hay sesión (la ruta responde 401). */
export async function usuarioApi(): Promise<UsuarioSesion | null> {
  const s = await auth();
  if (!s?.user) return null;
  return { id: s.user.id, usuario: s.user.usuario, nombre: s.user.name ?? s.user.usuario, rol: s.user.rol };
}
