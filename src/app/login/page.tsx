import { redirect } from "next/navigation";
import { auth } from "@/auth";
import FormLogin from "./FormLogin";

export const dynamic = "force-dynamic";

export default async function PaginaLogin() {
  if ((await auth())?.user) redirect("/panel");
  return (
    <main className="flex min-h-dvh items-center justify-center bg-asfalto p-4">
      <div className="w-full max-w-sm overflow-hidden rounded-lg bg-white">
        <div className="cinta-peligro h-3" aria-hidden />
        <div className="p-6">
          <h1 className="font-cartel text-3xl font-bold">Control de autoelevadores</h1>
          <p className="mb-6 text-asfalto-500">Ingreso de Mantenimiento</p>
          <FormLogin />
        </div>
      </div>
    </main>
  );
}
