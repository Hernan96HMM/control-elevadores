import "server-only";
import QRCode from "qrcode";

/** URL pública fija que codifica el QR pegado en el equipo. */
export function urlEquipo(codigo: string): string {
  const base = (process.env.PUBLIC_URL || process.env.NEXTAUTH_URL || "http://control-autoelevadores.sica").replace(/\/+$/, "");
  return `${base}/a/${encodeURIComponent(codigo)}`;
}

export async function qrSvg(texto: string): Promise<string> {
  return QRCode.toString(texto, { type: "svg", errorCorrectionLevel: "M", margin: 1, color: { dark: "#000000", light: "#ffffff" } });
}
