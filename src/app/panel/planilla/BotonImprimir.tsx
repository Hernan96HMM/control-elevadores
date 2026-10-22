"use client";

import Button from "@/components/Button";

export default function BotonImprimir({ texto = "Imprimir" }: { texto?: string }) {
  return (
    <Button type="button" variante="secundario" icono="imprimir" onClick={() => window.print()}>
      {texto}
    </Button>
  );
}
