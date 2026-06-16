import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

// Inicialización perezosa: no tocamos la conexión hasta la primera consulta.
// Así el `next build` no falla aunque DATABASE_URL no esté presente en build-time,
// y el driver HTTP de Neon evita agotar conexiones con muchos usuarios a la vez.
let instance: NeonHttpDatabase<typeof schema> | null = null;

export function getDb(): NeonHttpDatabase<typeof schema> {
  if (!instance) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL no está configurada");
    instance = drizzle(neon(url), { schema });
  }
  return instance;
}
