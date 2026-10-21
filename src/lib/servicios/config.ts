import "server-only";
import { eq } from "drizzle-orm";
import { getDb, schema } from "../db";

export function leerConfig(clave: string): string | null {
  const row = getDb().select().from(schema.config).where(eq(schema.config.clave, clave)).get();
  return row?.valor ?? null;
}

export function guardarConfig(clave: string, valor: string): void {
  getDb()
    .insert(schema.config)
    .values({ clave, valor })
    .onConflictDoUpdate({ target: schema.config.clave, set: { valor } })
    .run();
}
