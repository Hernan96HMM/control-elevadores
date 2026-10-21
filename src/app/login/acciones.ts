"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";

export async function ingresar(_prev: { error: string } | null, form: FormData): Promise<{ error: string } | null> {
  try {
    await signIn("credentials", {
      usuario: String(form.get("usuario") ?? ""),
      password: String(form.get("password") ?? ""),
      redirectTo: "/panel",
    });
    return null;
  } catch (e) {
    if (e instanceof AuthError) {
      const code = (e as AuthError & { code?: string }).code;
      if (code === "rate_limit") return { error: "Demasiados intentos. Esperá 15 minutos y volvé a probar." };
      return { error: "Usuario o contraseña incorrectos." };
    }
    throw e; // el redirect de éxito se propaga como excepción de Next
  }
}
