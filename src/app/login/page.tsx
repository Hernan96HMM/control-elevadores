import { redirect } from "next/navigation";
import { auth } from "@/auth";
import BrandLogo from "@/components/BrandLogo";
import Chevron from "@/components/Chevron";
import FormLogin from "./FormLogin";

export const dynamic = "force-dynamic";

export const metadata = { title: "Ingresar · Control de autoelevadores · SICA" };

export default async function PaginaLogin() {
  if ((await auth())?.user) redirect("/panel");
  return (
    <main className="flex min-h-dvh flex-col bg-superficie lg:flex-row">
      {/* Panel de marca: azul con logo negativo y el chevron que entra desde el borde. */}
      <section className="relative flex flex-col justify-between overflow-hidden bg-sica-navy px-8 pb-16 pt-10 text-white lg:w-[44%] lg:px-14 lg:py-14">
        <BrandLogo variant="completo" tone="negativo" size={96} />
        <div className="relative z-10 mt-10 max-w-md">
          <h1 className="text-3xl font-bold leading-tight lg:text-4xl">Control diario de autoelevadores</h1>
          <p className="mt-3 text-lg text-sica-navy-100">
            Seguimiento del checklist F-068 pre-uso, fallas y reparaciones de los equipos de planta.
          </p>
          <span className="mt-6 block h-1 w-16 rounded bg-sica-cyan" aria-hidden />
        </div>
        <Chevron tono="claro" className="absolute inset-x-0 bottom-0 h-10 w-full lg:hidden" />
        <svg viewBox="0 0 100 400" preserveAspectRatio="none" aria-hidden className="absolute inset-y-0 right-0 hidden h-full w-16 lg:block">
          <polygon points="100,0 100,400 40,400 100,200 40,0" className="fill-superficie" />
          <polygon points="40,0 52,0 100,200 52,400 40,400 88,200" className="fill-sica-cyan" />
        </svg>
      </section>

      <section className="diagonal-suave flex flex-1 flex-col">
        <div className="flex flex-1 items-center justify-center px-6 py-12">
          <div className="w-full max-w-sm">
            <h2 className="text-2xl font-bold text-sica-navy">Ingreso de Mantenimiento</h2>
            <p className="mb-6 text-tinta-2">Usá tu usuario y contraseña de la app.</p>
            <FormLogin />
            <p className="mt-6 text-sm text-tinta-2">
              ¿Sos operario? No necesitás usuario: escaneá el QR del autoelevador con la cámara del celular.
            </p>
          </div>
        </div>
        <footer className="border-t border-linea px-6 py-4 text-center text-sm text-tinta-2">
          SICA Metalúrgica Argentina S.A. · R. P. Kreder 3746, Esperanza (3080), Santa Fe, Argentina ·{" "}
          <a href="https://www.sica.com.ar" className="font-semibold text-sica-navy hover:underline">
            www.sica.com.ar
          </a>
        </footer>
      </section>
    </main>
  );
}
