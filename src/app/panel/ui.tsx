// Piezas de página del panel. Los estados/badges viven en @/components/Estado.
export { BadgeFalla as ChipFalla, BadgeCritico as Critico, Aviso, StatusPill as ChipEstado } from "@/components/Estado";

export function Encabezado({ titulo, descripcion, children }: { titulo: string; descripcion?: string; children?: React.ReactNode }) {
  return (
    <header className="no-imprimir flex flex-wrap items-end justify-between gap-4 px-6 pb-2 pt-6 lg:px-8">
      <div>
        <h1 className="text-[1.75rem] font-bold leading-tight text-sica-navy">{titulo}</h1>
        {descripcion && <p className="mt-0.5 max-w-3xl text-tinta-2">{descripcion}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </header>
  );
}

export function Contenido({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`space-y-6 px-6 py-5 lg:px-8 ${className}`}>{children}</div>;
}

/** Contenedor de tabla con scroll horizontal propio (la página nunca scrollea en X). */
export function TablaContenedor({ children }: { children: React.ReactNode }) {
  return <div className="overflow-x-auto rounded-lg border border-linea bg-superficie shadow-tarjeta">{children}</div>;
}
