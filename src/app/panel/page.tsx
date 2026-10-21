import { tarjetasEquipos } from "@/lib/servicios/equipos";
import { ultimosControles } from "@/lib/servicios/controles";
import { contarFallasAbiertas, listarFallas } from "@/lib/servicios/fallas";
import Tablero from "./Tablero";

export const dynamic = "force-dynamic";

export default function PaginaTablero() {
  const inicial = {
    equipos: tarjetasEquipos(),
    feed: ultimosControles(30),
    fallas: contarFallasAbiertas(),
    fallasAbiertas: listarFallas({ estados: ["abierta", "en_reparacion"] }).slice(0, 15),
    paraConformidad: listarFallas({ estados: ["resuelta"] }).length,
  };
  return <Tablero inicial={inicial} />;
}
