import { requerirUsuario } from "@/lib/sesion";
import { leerConfig } from "@/lib/servicios/config";
import { mailHabilitado } from "@/lib/mail";
import { Encabezado } from "../../ui";
import FormAdmin from "../FormAdmin";
import { guardarDestinatarios } from "../acciones";

export const dynamic = "force-dynamic";

export default async function PaginaConfig() {
  await requerirUsuario("admin");
  const emails = (leerConfig("alert_emails") || "").split(",").filter(Boolean);
  const env = (process.env.ALERT_EMAILS || "").split(",").map((s) => s.trim()).filter(Boolean);
  const habilitado = mailHabilitado();
  return (
    <div>
      <Encabezado titulo="Avisos por email" />
      <div className="max-w-3xl space-y-6 px-8 py-6">
        <p
          className={`rounded-lg px-4 py-3 font-semibold ${habilitado ? "bg-verde-claro text-verde" : "bg-amarillo-claro text-asfalto"}`}
        >
          {habilitado
            ? "El envío de email está activo: ante cada falla crítica se avisa a los destinatarios."
            : "El envío de email está desactivado porque el servidor no tiene SMTP configurado (SMTP_HOST en el .env). La app funciona igual; solo no manda mails."}
        </p>
        <section className="rounded-lg bg-white p-5">
          <h2 className="mb-1 font-cartel text-xl font-bold">Destinatarios ante falla crítica</h2>
          <p className="mb-3 text-sm text-asfalto-500">Una dirección por línea o separadas por coma.</p>
          <FormAdmin accion={guardarDestinatarios}>
            <textarea name="emails" rows={5} defaultValue={emails.join("\n")} className="campo w-[28rem] max-w-full font-mono text-sm" />
          </FormAdmin>
          {env.length > 0 && (
            <p className="mt-3 text-sm text-asfalto-500">
              También reciben los definidos en el servidor (ALERT_EMAILS): {env.join(", ")}
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
