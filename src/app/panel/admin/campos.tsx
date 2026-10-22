// Campos compactos para las filas de los ABM.
export function Campo({
  etiqueta,
  className = "",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { etiqueta: string }) {
  return (
    <label className={`block max-w-full ${className}`}>
      <span className="etiqueta">{etiqueta}</span>
      <input className="campo" {...props} />
    </label>
  );
}

export function Check({ etiqueta, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { etiqueta: string }) {
  return (
    <label className="flex min-h-[44px] cursor-pointer items-center gap-2 text-sm font-semibold">
      <input type="checkbox" className="h-5 w-5 rounded accent-sica-navy" {...props} />
      {etiqueta}
    </label>
  );
}

/** Fila de ABM en tarjeta. */
export function FilaAbm({ inactivo, children }: { inactivo?: boolean; children: React.ReactNode }) {
  return (
    <div className={`rounded-lg border border-linea bg-superficie p-4 shadow-tarjeta ${inactivo ? "opacity-60" : ""}`}>{children}</div>
  );
}

export function AltaAbm({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border-2 border-dashed border-sica-navy-100 bg-sica-navy-50 p-5">
      <h2 className="mb-3 text-lg font-semibold text-sica-navy">{titulo}</h2>
      {children}
    </section>
  );
}
