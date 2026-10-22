// Motivo angular de la marca: chevron azul con filo celeste que "entra" desde el borde.
// Uso con moderación (login, encabezados, estados vacíos). Decorativo: aria-hidden.
export default function Chevron({
  className = "",
  direccion = "arriba",
  tono = "navy",
}: {
  className?: string;
  /** "arriba": la punta apunta hacia arriba (pie de bloque). "derecha": entra desde la izquierda. */
  direccion?: "arriba" | "derecha";
  /** Color del cuerpo: "navy" sobre fondo claro, "claro" para cerrar un bloque azul. */
  tono?: "navy" | "claro";
}) {
  if (direccion === "derecha") {
    return (
      <svg viewBox="0 0 100 400" preserveAspectRatio="none" className={className} aria-hidden focusable="false">
        <polygon points="0,0 72,0 100,200 72,400 0,400" className="fill-sica-navy" />
        <polygon points="72,0 80,0 100,200 80,400 72,400 92,200" className="fill-sica-cyan" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 400 60" preserveAspectRatio="none" className={className} aria-hidden focusable="false">
      <polygon points="0,28 200,0 400,28 400,60 0,60" className="fill-sica-cyan" />
      <polygon points="0,38 200,10 400,38 400,60 0,60" className={tono === "claro" ? "fill-superficie" : "fill-sica-navy"} />
    </svg>
  );
}
