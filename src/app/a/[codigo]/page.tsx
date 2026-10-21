import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { datosPantallaOperario } from "@/lib/servicios/equipos";
import { codigoEquipoSchema } from "@/lib/validation";
import OperarioApp from "./OperarioApp";

export const dynamic = "force-dynamic";

export function generateMetadata({ params }: { params: { codigo: string } }): Metadata {
  return { title: `Control ${params.codigo} · Autoelevadores` };
}

// Destino del QR pegado en cada equipo: http://control-autoelevadores.sica/a/<codigo>
export default function PaginaEquipo({ params }: { params: { codigo: string } }) {
  const codigo = codigoEquipoSchema.safeParse(decodeURIComponent(params.codigo));
  if (!codigo.success) notFound();
  const datos = datosPantallaOperario(codigo.data);
  if (!datos) notFound();
  return <OperarioApp inicial={datos} />;
}
