import "server-only";
import QRCode from "qrcode";

/** URL pública fija que codifica el QR pegado en el equipo. */
export function urlEquipo(codigo: string): string {
  const base = (process.env.PUBLIC_URL || process.env.NEXTAUTH_URL || "http://control-autoelevadores.sica").replace(/\/+$/, "");
  return `${base}/a/${encodeURIComponent(codigo)}`;
}

export async function qrSvg(texto: string): Promise<string> {
  // Negro sobre blanco y zona de silencio completa (4 módulos, ISO/IEC 18004): no colorear el QR.
  return QRCode.toString(texto, { type: "svg", errorCorrectionLevel: "M", margin: 4, color: { dark: "#000000", light: "#ffffff" } });
}
