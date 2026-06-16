import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Carga las variables de .env.local para las herramientas de migración
config({ path: ".env.local" });

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
});
