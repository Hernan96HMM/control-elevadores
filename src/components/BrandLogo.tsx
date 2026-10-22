/* eslint-disable @next/next/no-img-element */

// Único punto de uso del logo SICA (Manual de Marca).
// - positivo: azul + celeste sobre fondo claro · negativo: blanco + celeste sobre azul #21396E.
// - "completo" lleva el tagline; por debajo del 50% del tamaño original se usa "sin-tagline".
// - "isotipo" solo para favicon / ícono PWA o junto al nombre de la app en el mismo contexto.
// Nunca deformar, recolorear, girar ni agregar sombras: solo se escala por alto.
//
// TODO(marca): los archivos son PNG provisorios tomados de otras apps SicaLab (el negativo se
// extrajo del logo de pie de pdf-sica quitando el fondo liso). Cuando Marketing entregue los SVG
// oficiales, copiarlos a public/brand/ y cambiar EXT a "svg".
const EXT = "png";

type Variante = "completo" | "sin-tagline" | "isotipo";
type Tono = "positivo" | "negativo";

// Proporción ancho/alto de cada archivo (para reservar el espacio y no deformar).
const ARCHIVOS: Record<Variante, Record<Tono, { archivo: string; proporcion: number }>> = {
  completo: {
    positivo: { archivo: "sica-logo-positivo", proporcion: 319 / 124 },
    negativo: { archivo: "sica-logo-negativo", proporcion: 899 / 309 },
  },
  "sin-tagline": {
    positivo: { archivo: "sica-logo-sin-tagline-positivo", proporcion: 440 / 142 },
    negativo: { archivo: "sica-logo-sin-tagline-negativo", proporcion: 899 / 256 },
  },
  isotipo: {
    positivo: { archivo: "sica-isotipo", proporcion: 127 / 142 },
    negativo: { archivo: "sica-isotipo-negativo", proporcion: 275 / 309 },
  },
};

// Debajo de esta altura el tagline no se lee: se fuerza la versión sin tagline (regla del 50%).
const ALTO_MINIMO_TAGLINE = 56;

export default function BrandLogo({
  variant = "completo",
  tone = "positivo",
  size = 40,
  className = "",
}: {
  variant?: Variante;
  tone?: Tono;
  /** Alto en px. */
  size?: number;
  className?: string;
}) {
  const v: Variante = variant === "completo" && size < ALTO_MINIMO_TAGLINE ? "sin-tagline" : variant;
  const { archivo, proporcion } = ARCHIVOS[v][tone];
  return (
    <img
      src={`/brand/${archivo}.${EXT}`}
      alt={v === "isotipo" ? "SICA" : "SICA Metalúrgica Argentina"}
      height={size}
      width={Math.round(size * proporcion)}
      // Ancho explícito + alto automático: un contenedor flex nunca puede estirarlo ni deformarlo.
      style={{ width: Math.round(size * proporcion), height: "auto", maxWidth: "100%" }}
      className={`shrink-0 select-none ${className}`}
      draggable={false}
    />
  );
}
