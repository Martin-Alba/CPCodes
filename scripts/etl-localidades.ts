/**
 * ETL de localidades por CP (núcleos de población).
 *
 * Lee ficheros con líneas `CP:LOCALIDAD` (formato de los `NNxcodpos.txt`, una
 * localidad por línea, varias por CP) y hace upsert en `postal_code_localities`.
 *
 * Datos: deja los ficheros en `data/localidades/` (en .gitignore).
 * Ejecutar todo:        pnpm etl:localidades
 * Ejecutar un fichero:  pnpm etl:localidades data/localidades/33xcodpos.txt
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });

import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { getDb } from "@/db";
import { postalCodeLocalities } from "@/db/schema";

const INPUT = process.argv[2] ?? "data/localidades";

async function resolveFiles(input: string): Promise<string[]> {
  const s = await stat(input).catch(() => null);
  if (!s) {
    console.error(`No existe "${input}". Deja los ficheros CP:LOCALIDAD en data/localidades/.`);
    process.exit(1);
  }
  if (s.isFile()) return [input];
  const entries = await readdir(input);
  return entries.filter((f) => /\.(txt|csv)$/i.test(f)).map((f) => join(input, f));
}

async function main(): Promise<void> {
  const files = await resolveFiles(INPUT);
  if (files.length === 0) {
    console.error(`No hay ficheros .txt en "${INPUT}".`);
    process.exit(1);
  }

  const seen = new Set<string>();
  const rows: { postalCode: string; name: string }[] = [];
  let skipped = 0;
  for (const path of files) {
    const text = await readFile(path, "utf8");
    for (const line of text.split(/\r?\n/)) {
      const i = line.indexOf(":");
      if (i < 0) {
        if (line.trim()) skipped++;
        continue;
      }
      const cp = line.slice(0, i).trim();
      const name = line.slice(i + 1).replace(/\s+/g, " ").trim();
      if (!/^\d{5}$/.test(cp) || !name) {
        skipped++;
        continue;
      }
      const key = `${cp}|${name}`;
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push({ postalCode: cp, name: name.slice(0, 160) });
    }
  }

  console.log(`Ficheros: ${files.length} · localidades: ${rows.length} · líneas saltadas: ${skipped}`);
  if (rows.length === 0) {
    console.error("No se extrajo ninguna localidad. Revisa el formato (CP:LOCALIDAD).");
    process.exit(1);
  }
  console.log("Ejemplo:", rows[0]);

  const db = getDb();
  const CHUNK = 1000;
  let n = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const batch = rows.slice(i, i + CHUNK);
    await db.insert(postalCodeLocalities).values(batch).onConflictDoNothing();
    n += batch.length;
    if (n % 2000 < CHUNK) console.log(`  ${n}/${rows.length}`);
  }
  console.log(`Hecho. ${rows.length} localidades cargadas/actualizadas.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
