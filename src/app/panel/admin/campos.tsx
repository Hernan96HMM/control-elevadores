// Campos compactos para las filas de los ABM.
export function Campo({
  etiqueta,
  className = "",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { etiqueta: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="etiqueta">{etiqueta}</span>
      <input className="campo" {...props} />
    </label>
  );
}

export function Check({ etiqueta, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { etiqueta: string }) {
  return (
    <label className="flex items-center gap-2 pb-2 text-sm font-semibold">
      <input type="checkbox" className="h-5 w-5 accent-asfalto" {...props} />
      {etiqueta}
    </label>
  );
}
