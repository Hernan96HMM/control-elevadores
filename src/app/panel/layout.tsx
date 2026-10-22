import Link from "next/link";
import { signOut } from "@/auth";
import { requerirUsuario } from "@/lib/sesion";
import BrandLogo from "@/components/BrandLogo";
import Icono from "@/components/Icono";
import NavLink from "./NavLink";
import { EventosProvider, IndicadorConexion } from "./Eventos";

export const dynamic = "force-dynamic";

export default async function LayoutPanel({ children }: { children: React.ReactNode }) {
  const u = await requerirUsuario();
  return (
    <EventosProvider>
      <div className="min-h-dvh lg:flex">
        <aside className="no-imprimir bg-sica-navy text-white lg:sticky lg:top-0 lg:flex lg:h-dvh lg:w-64 lg:shrink-0 lg:flex-col">
          <Link href="/panel" className="flex items-center gap-3 px-5 py-4 lg:block lg:pb-5 lg:pt-6">
            <BrandLogo variant="sin-tagline" tone="negativo" size={30} />
            <span className="block text-sm font-semibold leading-tight text-sica-navy-100 lg:mt-3">
              Control de autoelevadores
              <span className="block font-normal">Mantenimiento</span>
            </span>
          </Link>
          <nav aria-label="Secciones" className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-1 lg:flex-col lg:overflow-y-auto lg:pb-0">
            <NavLink href="/panel" exacto icono="tablero">
              Tablero en vivo
            </NavLink>
            <NavLink href="/panel/fallas" icono="alerta">
              Fallas
            </NavLink>
            <NavLink href="/panel/planilla" icono="grilla">
              Planilla mensual
            </NavLink>
            <NavLink href="/panel/cumplimiento" icono="calendario">
              Cumplimiento
            </NavLink>
            <NavLink href="/panel/auditoria" icono="historial">
              Auditoría
            </NavLink>
            {u.rol === "admin" && (
              <>
                <p className="hidden px-3 pb-1 pt-5 text-sm text-sica-navy-100/80 lg:block">
                  Administración
                </p>
                <NavLink href="/panel/admin/equipos" icono="qr">
                  Equipos y QR
                </NavLink>
                <NavLink href="/panel/admin/operarios" icono="usuario">
                  Operarios
                </NavLink>
                <NavLink href="/panel/admin/items" icono="lista">
                  Ítems del checklist
                </NavLink>
                <NavLink href="/panel/admin/usuarios" icono="llave">
                  Usuarios
                </NavLink>
                <NavLink href="/panel/admin/config" icono="sobre">
                  Avisos por email
                </NavLink>
              </>
            )}
          </nav>
          <span className="hidden h-1 bg-sica-cyan lg:block" aria-hidden />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col bg-fondo">
          <header className="no-imprimir flex flex-wrap items-center justify-between gap-3 border-b border-linea bg-superficie px-6 py-2.5 lg:px-8">
            <IndicadorConexion />
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-2 text-sm">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-sica-navy-50 text-sica-navy">
                  <Icono nombre="usuario" className="h-4 w-4" />
                </span>
                <span>
                  <span className="block font-semibold leading-tight">{u.nombre}</span>
                  <span className="block text-xs text-tinta-2">{u.rol === "admin" ? "Administrador" : "Mantenimiento"}</span>
                </span>
              </span>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/login" });
                }}
              >
                <button className="flex min-h-[40px] items-center gap-1.5 rounded px-2 text-sm font-semibold text-sica-navy hover:bg-sica-navy-50">
                  <Icono nombre="salir" className="h-4 w-4" /> Salir
                </button>
              </form>
            </div>
          </header>
          <div className="min-w-0 flex-1">{children}</div>
        </div>
      </div>
    </EventosProvider>
  );
}
