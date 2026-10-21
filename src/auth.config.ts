import type { NextAuthConfig } from "next-auth";

// Configuración compatible con el runtime edge (middleware): sin DB ni bcrypt.
export const authConfig = {
  trustHost: true, // detrás de Nginx sobre HTTP interno (además de AUTH_TRUST_HOST=true)
  pages: { signIn: "/login" },
  session: { strategy: "jwt", maxAge: 12 * 60 * 60 },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const logueado = Boolean(auth?.user);
      if (pathname.startsWith("/api/")) {
        if (!logueado) return Response.json({ error: "No autenticado" }, { status: 401 });
        return true;
      }
      if (pathname.startsWith("/panel/admin") && auth?.user?.rol !== "admin") {
        return Response.redirect(new URL("/panel", request.nextUrl));
      }
      return logueado; // false → redirige a /login
    },
    jwt({ token, user }) {
      if (user) {
        token.rol = user.rol;
        token.usuario = user.usuario;
        token.uid = user.id;
      }
      return token;
    },
    session({ session, token }) {
      session.user.rol = token.rol as "admin" | "mantenimiento";
      session.user.usuario = token.usuario as string;
      session.user.id = token.uid as string;
      return session;
    },
  },
} satisfies NextAuthConfig;
