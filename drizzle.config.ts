import { defineConfig } from "drizzle-kit";

// Solo para desarrollo: genera las migraciones SQL en ./drizzle.
// En producción se aplican con `npm run db:migrate:prod` (scripts/migrate.js).
export default defineConfig({
  dialect: "sqlite",
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
});
