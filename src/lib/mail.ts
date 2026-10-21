import "server-only";
import nodemailer from "nodemailer";
import { leerConfig } from "./servicios/config";

// Email opcional ante falla crítica. Sin SMTP_HOST queda deshabilitado (no rompe nada).
export function mailHabilitado(): boolean {
  return Boolean(process.env.SMTP_HOST);
}

function destinatarios(): string[] {
  const env = (process.env.ALERT_EMAILS || "").split(",");
  const db = (leerConfig("alert_emails") || "").split(",");
  return [...new Set([...env, ...db].map((s) => s.trim()).filter((s) => /^[^@\s]+@[^@\s]+$/.test(s)))];
}

export async function enviarAlertaCritica(datos: {
  equipo: string;
  operario: string;
  items: string[];
  horas: number;
}): Promise<void> {
  if (!mailHabilitado()) return;
  const to = destinatarios();
  if (to.length === 0) return;
  try {
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 25),
      secure: process.env.SMTP_SECURE === "true",
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined,
      tls: { rejectUnauthorized: process.env.SMTP_TLS_REJECT_UNAUTHORIZED !== "false" },
    });
    const base = process.env.NEXTAUTH_URL || "http://control-autoelevadores.sica";
    await transport.sendMail({
      from: process.env.SMTP_FROM || "control-autoelevadores@sica",
      to,
      subject: `[NO USAR] ${datos.equipo} fuera de servicio — falla crítica`,
      text: [
        `Equipo: ${datos.equipo}`,
        `Conductor: ${datos.operario}`,
        `Horas: ${datos.horas}`,
        "",
        "Ítems críticos en FALLA:",
        ...datos.items.map((i) => ` - ${i}`),
        "",
        `Ver en el panel: ${base}/panel/fallas`,
        "",
        "F-068 Rev.2",
      ].join("\n"),
    });
  } catch (e) {
    console.error("[mail] no se pudo enviar la alerta:", e instanceof Error ? e.message : e);
  }
}
