export default function NoEncontrado() {
  return (
    <main className="mx-auto max-w-xl p-6">
      <div className="cinta-peligro mb-6 h-3" aria-hidden />
      <h1 className="font-cartel text-4xl font-bold">No encontramos esta página</h1>
      <p className="mt-2 text-lg">
        Si escaneaste el QR de un autoelevador, puede que la etiqueta esté desactualizada o que el equipo esté dado de baja. Avisá a
        Mantenimiento.
      </p>
    </main>
  );
}
