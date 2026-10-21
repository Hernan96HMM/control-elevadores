import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { authConfig } from "./auth.config";
import { getDb, schema } from "./lib/db";
import { loginSchema } from "./lib/validation";
import { ipDe, limitar } from "./lib/ratelimit";
import { auditar } from "./lib/audit";

let HASH_FICTICIO: string | undefined;

class DemasiadosIntentos extends CredentialsSignin {
  code = "rate_limit";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  logger: {
    // Un login fallido es un caso esperado (queda en la auditoría): no ensuciar `docker logs` con stack traces.
    error(e) {
      if (e instanceof CredentialsSignin || e.name === "CredentialsSignin") return;
      console.error("[auth]", e);
    },
  },
  providers: [
    Credentials({
      credentials: { usuario: {}, password: {} },
      async authorize(raw, request) {
        const ip = ipDe(request.headers);
        if (!limitar(`login:${ip}`, 10, 15 * 60_000).ok) throw new DemasiadosIntentos();
        const parsed = loginSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { usuario, password } = parsed.data;
        const u = getDb().select().from(schema.usuarios).where(eq(schema.usuarios.usuario, usuario)).get();
        // Comparamos siempre (hash ficticio si no existe) para no filtrar usuarios por tiempo de respuesta.
        const hash = u?.passwordHash ?? (HASH_FICTICIO ??= bcrypt.hashSync("no-existe", 10));
        const ok = await bcrypt.compare(password, hash);
        if (!u || !ok || !u.activo) {
          auditar({ actor: `anonimo`, accion: "login.fallido", detalle: { usuario }, ip });
          return null;
        }
        auditar({ actor: `usuario:${u.usuario}`, accion: "login.ok", ip });
        return { id: String(u.id), name: u.nombre, usuario: u.usuario, rol: u.rol };
      },
    }),
  ],
});
