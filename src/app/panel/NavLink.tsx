"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Icono, { type NombreIcono } from "@/components/Icono";

export default function NavLink({
  href,
  exacto,
  icono,
  children,
}: {
  href: string;
  exacto?: boolean;
  icono: NombreIcono;
  children: React.ReactNode;
}) {
  const path = usePathname();
  const activo = exacto ? path === href : path === href || path.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      aria-current={activo ? "page" : undefined}
      className={`relative flex min-h-[44px] items-center gap-3 whitespace-nowrap rounded px-3 py-2 text-[15px] ${
        activo ? "bg-white/10 font-semibold text-white" : "text-sica-navy-100 hover:bg-white/5 hover:text-white"
      }`}
    >
      {/* Indicador activo en celeste (acento, no texto). */}
      {activo && <span className="absolute inset-y-1.5 left-0 w-1 rounded-r bg-sica-cyan" aria-hidden />}
      <Icono nombre={icono} className="h-5 w-5" />
      {children}
    </Link>
  );
}
