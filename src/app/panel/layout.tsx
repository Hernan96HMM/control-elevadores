import Link from "next/link";
import { signOut } from "@/auth";
import { requerirUsuario } from "@/lib/sesion";
import NavLink from "./NavLink";

export const dynamic = "force-dynamic";

export default async function LayoutPanel({ children }: { children: React.ReactNode }) {
  const u = await requerirUsuario();
  return (
    <div className="flex min-h-dvh">
      <aside className="no-imprimir sticky top-0 flex h-dvh w-60 shrink-0 flex-col bg-asfalto text-white">
        <div className="cinta-peligro h-2" aria-hidden />
        <Link href="/panel" className="px-5 py-5">
          <span className="block font-cartel text-2xl font-bold leading-tight">Autoelevadores</span>
          <span className="text-sm text-asfalto-300">SICA · Mantenimiento</span>
        </Link>
        <nav className="flex-1 space-y-0.5 px-2 text-[15px]">
          <NavLink href="/panel" exacto>
            Tablero en vivo
          </NavLink>
          <NavLink href="/panel/fallas">Fallas</NavLink>
          <NavLink href="/panel/planilla">Planilla mensual</NavLink>
          <NavLink href="/panel/cumplimiento">Cumplimiento</NavLink>
          <NavLink href="/panel/auditoria">Auditoría</NavLink>
          {u.rol === "admin" && (
            <>
              <p className="px-3 pb-1 pt-5 text-sm text-asfalto-300">Administración</p>
              <NavLink href="/panel/admin/equipos">Equipos y QR</NavLink>
              <NavLink href="/panel/admin/operarios">Operarios</NavLink>
              <NavLink href="/panel/admin/items">Ítems del checklist</NavLink>
              <NavLink href="/panel/admin/usuarios">Usuarios</NavLink>
              <NavLink href="/panel/admin/config">Avisos por email</NavLink>
            </>
          )}
        </nav>
        <div className="border-t border-asfalto-700 px-5 py-4 text-sm">
          <p className="font-semibold">{u.nombre}</p>
          <p className="text-asfalto-300">{u.rol === "admin" ? "Administrador" : "Mantenimiento"}</p>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button className="mt-2 text-asfalto-300 underline hover:text-white">Cerrar sesión</button>
          </form>
        </div>
      </aside>
      <div className="min-w-0 flex-1 bg-hormigon-claro">{children}</div>
    </div>
  );
}
