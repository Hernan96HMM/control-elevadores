// Íconos SVG inline (trazo 2px, 24×24). Sin dependencias: la app funciona sin internet externo.
const TRAZOS = {
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  x: <path d="M6 6l12 12M18 6L6 18" />,
  alerta: (
    <>
      <path d="M12 3.5L2.5 20h19L12 3.5z" />
      <path d="M12 10v4.5M12 17.5v.01" />
    </>
  ),
  prohibido: (
    <>
      <path d="M8.2 2.5h7.6l5.7 5.7v7.6l-5.7 5.7H8.2l-5.7-5.7V8.2z" />
      <path d="M7.5 12h9" />
    </>
  ),
  okCirculo: (
    <>
      <circle cx="12" cy="12" r="9.5" />
      <path d="M7.5 12.3l3 3 6-6.3" />
    </>
  ),
  reloj: (
    <>
      <circle cx="12" cy="12" r="9.5" />
      <path d="M12 7v5l3.5 2" />
    </>
  ),
  escudo: (
    <>
      <path d="M12 2.5l8 3v6c0 5-3.5 8.7-8 10-4.5-1.3-8-5-8-10v-6l8-3z" />
      <path d="M12 8v5M12 16v.01" />
    </>
  ),
  sinSenal: (
    <>
      <path d="M2.5 8.5a15 15 0 0 1 5-2.8M21.5 8.5A15 15 0 0 0 12 5.2" />
      <path d="M5.5 12a10 10 0 0 1 3.4-2M18.5 12a10 10 0 0 0-3-1.8" />
      <path d="M9 15.5a4.5 4.5 0 0 1 6 0M12 19.5v.01M3 3l18 18" />
    </>
  ),
  camara: (
    <>
      <path d="M3 8h3.5l1.8-2.5h7.4L17.5 8H21v11H3z" />
      <circle cx="12" cy="13.5" r="3.5" />
    </>
  ),
  usuario: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c1-4 4.2-6 8-6s7 2 8 6" />
    </>
  ),
  volver: <path d="M15 5l-7 7 7 7" />,
  campana: (
    <>
      <path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" />
      <path d="M10 20.5a2 2 0 0 0 4 0" />
    </>
  ),
  campanaOff: (
    <>
      <path d="M6 16V11a6 6 0 0 1 9.5-4.9M18 11v5l1.5 2H8" />
      <path d="M10 20.5a2 2 0 0 0 4 0M3 3l18 18" />
    </>
  ),
  imprimir: (
    <>
      <path d="M7 9V3h10v6M7 17H4v-8h16v8h-3" />
      <path d="M7 14h10v7H7z" />
    </>
  ),
  descargar: <path d="M12 3v12m-5-5l5 5 5-5M4 20h16" />,
  llave: (
    <>
      <circle cx="8" cy="15" r="4.5" />
      <path d="M11.2 11.8L20 3M16 7l3 3M14 9l2 2" />
    </>
  ),
  cerrar: <path d="M6 6l12 12M18 6L6 18" />,
  info: (
    <>
      <circle cx="12" cy="12" r="9.5" />
      <path d="M12 11v6M12 7.5v.01" />
    </>
  ),
  qr: (
    <>
      <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4z" />
      <path d="M14 14h2v2h-2zM18 18h2v2h-2zM18 14h2M14 18v2" />
    </>
  ),
  salir: <path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10" />,
  tablero: <path d="M4 4h7v9H4zM13 4h7v5h-7zM13 11h7v9h-7zM4 15h7v5H4z" />,
  lista: <path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01" />,
  grilla: <path d="M4 4h16v16H4zM4 10h16M4 15h16M10 4v16M15 4v16" />,
  calendario: (
    <>
      <path d="M4 6h16v14H4zM4 10h16M8 3v5M16 3v5" />
      <path d="M8 14h2M14 14h2M8 17h2" />
    </>
  ),
  historial: <path d="M3 12a9 9 0 1 0 3-6.7M3 4v4h4M12 7v5l3 2" />,
  ajustes: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1" />
    </>
  ),
  sobre: (
    <>
      <path d="M3 5h18v14H3z" />
      <path d="M3 6l9 7 9-7" />
    </>
  ),
  cargando: <path d="M12 3a9 9 0 1 0 9 9" />,
} as const;

export type NombreIcono = keyof typeof TRAZOS;

export default function Icono({
  nombre,
  className = "h-5 w-5",
  etiqueta,
}: {
  nombre: NombreIcono;
  className?: string;
  /** Si se pasa, el ícono se anuncia a lectores de pantalla; si no, es decorativo. */
  etiqueta?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`${className} shrink-0 ${nombre === "cargando" ? "animate-spin" : ""}`}
      role={etiqueta ? "img" : undefined}
      aria-label={etiqueta}
      aria-hidden={etiqueta ? undefined : true}
      focusable="false"
    >
      {TRAZOS[nombre]}
    </svg>
  );
}
