export default function Card({
  titulo,
  accion,
  children,
  className = "",
  as: Tag = "section",
}: {
  titulo?: React.ReactNode;
  accion?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  as?: "section" | "div" | "article" | "aside";
}) {
  return (
    <Tag className={`rounded-lg border border-linea bg-superficie shadow-tarjeta ${className}`}>
      {(titulo || accion) && (
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-linea px-5 py-3">
          {titulo && <h2 className="text-lg font-semibold text-sica-navy">{titulo}</h2>}
          {accion}
        </header>
      )}
      <div className="p-5">{children}</div>
    </Tag>
  );
}
