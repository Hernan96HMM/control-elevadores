import BrandLogo from "@/components/BrandLogo";
import Chevron from "@/components/Chevron";
import Icono from "@/components/Icono";

export default function NoEncontrado() {
  return (
    <main className="flex min-h-dvh flex-col bg-superficie">
      <header className="relative bg-sica-navy px-5 pb-12 pt-5">
        <BrandLogo variant="sin-tagline" tone="negativo" size={28} />
        <Chevron tono="claro" className="absolute inset-x-0 bottom-0 h-8 w-full" />
      </header>
      <div className="mx-auto w-full max-w-xl flex-1 px-5 py-8">
        <Icono nombre="qr" className="mb-4 h-12 w-12 text-sica-cyan" />
        <h1 className="text-3xl font-bold text-sica-navy">No encontramos esta página</h1>
        <p className="mt-2 text-lg text-tinta-2">
          Si escaneaste el QR de un autoelevador, puede que la etiqueta esté desactualizada o que el equipo esté dado de baja. Avisá a
          Mantenimiento.
        </p>
      </div>
    </main>
  );
}
