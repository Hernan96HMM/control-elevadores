import Icono, { type NombreIcono } from "./Icono";

export type Variante = "primario" | "secundario" | "peligro" | "exito" | "fantasma" | "claro";
export type Tamano = "sm" | "md" | "lg" | "xl";

const BASE =
  "inline-flex select-none items-center justify-center gap-2 rounded font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50";

const VARIANTES: Record<Variante, string> = {
  primario: "bg-sica-navy text-white hover:bg-sica-navy-900 active:bg-sica-navy-900",
  secundario: "border border-sica-navy bg-superficie text-sica-navy hover:bg-sica-navy-50",
  peligro: "bg-fs text-white hover:brightness-95",
  exito: "bg-ok text-white hover:brightness-95",
  fantasma: "text-sica-navy underline-offset-4 hover:underline",
  claro: "bg-superficie text-sica-navy hover:bg-sica-navy-50",
};

// sm/md: escritorio (≥44 px). lg: táctil (≥56 px). xl: acción principal del operario con guantes.
const TAMANOS: Record<Tamano, string> = {
  sm: "min-h-[36px] px-3 text-sm",
  md: "min-h-[44px] px-4 text-[15px]",
  lg: "min-h-toque px-5 text-lg",
  xl: "min-h-[64px] px-6 text-xl",
};

/** Clases de botón, para usar también en <Link> / <a>. */
export function boton({
  variante = "primario",
  tamano = "md",
  ancho = false,
}: { variante?: Variante; tamano?: Tamano; ancho?: boolean } = {}) {
  return `${BASE} ${VARIANTES[variante]} ${TAMANOS[tamano]} ${ancho ? "w-full" : ""}`;
}

export default function Button({
  variante,
  tamano,
  ancho,
  icono,
  cargando,
  className = "",
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: Variante;
  tamano?: Tamano;
  ancho?: boolean;
  icono?: NombreIcono;
  cargando?: boolean;
}) {
  const tamIcono = tamano === "xl" || tamano === "lg" ? "h-6 w-6" : "h-5 w-5";
  return (
    <button
      {...props}
      disabled={props.disabled || cargando}
      aria-busy={cargando || undefined}
      className={`${boton({ variante, tamano, ancho })} ${className}`}
    >
      {cargando ? <Icono nombre="cargando" className={tamIcono} /> : icono && <Icono nombre={icono} className={tamIcono} />}
      {children}
    </button>
  );
}
