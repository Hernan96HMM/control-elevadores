import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    rol: "admin" | "mantenimiento";
    usuario: string;
  }
  interface Session {
    user: {
      id: string;
      rol: "admin" | "mantenimiento";
      usuario: string;
    } & DefaultSession["user"];
  }
}
