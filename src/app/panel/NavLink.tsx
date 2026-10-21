"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function NavLink({ href, exacto, children }: { href: string; exacto?: boolean; children: React.ReactNode }) {
  const path = usePathname();
  const activo = exacto ? path === href : path === href || path.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      aria-current={activo ? "page" : undefined}
      className={`block rounded px-3 py-2 ${activo ? "bg-amarillo font-semibold text-asfalto" : "text-hormigon hover:bg-asfalto-700"}`}
    >
      {children}
    </Link>
  );
}
