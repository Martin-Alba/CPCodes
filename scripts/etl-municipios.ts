/**
 * ETL de NOMBRES de municipio (Fase 1).
 *
 * El dataset del CNIG solo trae el código INE del municipio (ya guardado en
 * postal_codes.ine_municipio). Este script cruza ese código con la tabla
 * código→nombre del INE y rellena postal_codes.municipio, habilitando la
 * búsqueda por nombre de municipio (el endpoint /api/postal-codes/search ya
 * busca por municipio si está relleno).
 *
 * Datos: codeforspain/ds-organizacion-administrativa (columnas municipio_id, nombre).
 *   git clone --depth 1 https://github.com/codeforspain/ds-organizacion-administrativa /tmp/oa
 * Ejecutar: pnpm etl:municipios /tmp/oa/data/<archivo_municipios>.csv
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });

import { readFile } from "node:fs/promises";
import { isNotNull, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { postalCodes } from "@/db/schema";

const INPUT = process.argv[2];
const CODE_COLS = ["municipio_id", "codigo_ine", "cod_ine", "cod_mun", "codigo", "cmun_dc", "id"];
const NAME_COLS = ["nombre", "municipio", "name", "denominacion", "nombre_municipio"];

function detectDelimiter(headerLine: string): string {
  const commas = (headerLine.match(/,/g) ?? []).length;
  const semis = (headerLine.match(/;/g) ?? []).length;
  return semis > commas ? ";" : ",";
}

// Parser CSV mínimo pero correcto: respeta campos entre comillas (nombres con comas).
function parseCsv(text: string, delim: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === delim) {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (c !== "\r") {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function findCol(header: string[], candidates: string[]): number {
  const norm = header.map((h) => h.trim().toLowerCase());
  for (const cand of candidates) {
    const i = norm.indexOf(cand);
    if (i >= 0) return i;
  }
  return -1;
}

async function main(): Promise<void> {
  if (!INPUT) {
    console.error("Uso: pnpm etl:municipios <ruta/al/csv>");
    process.exit(1);
  }
  const text = await readFile(INPUT, "utf8").catch(() => {
    console.error(`No se pudo leer "${INPUT}".`);
    process.exit(1);
  });

  const firstLine = text.split("\n", 1)[0] ?? "";
  const delim = detectDelimiter(firstLine);
  const rows = parseCsv(text, delim);
  if (rows.length < 2) {
    console.error("CSV vacío o sin filas.");
    process.exit(1);
  }
  const header = rows[0];
  const codeIdx = findCol(header, CODE_COLS);
  const nameIdx = findCol(header, NAME_COLS);
  console.log("Cabecera:", header);
  console.log(`Delimitador "${delim}" · código: col ${codeIdx} (${header[codeIdx]}) · nombre: col ${nameIdx} (${header[nameIdx]})`);
  if (codeIdx < 0 || nameIdx < 0) {
    console.error("No encuentro columnas de código INE y/o nombre. Revisa la cabecera de arriba.");
    process.exit(1);
  }

  // pares [ine sin ceros a la izquierda, nombre] — formato en el que guardamos ine_municipio
  const pairs: [string, string][] = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const digits = (r[codeIdx] ?? "").replace(/\D/g, "");
    const name = (r[nameIdx] ?? "").trim();
    if (!digits || !name) continue;
    pairs.push([String(Number(digits)), name]);
  }
  if (pairs.length === 0) {
    console.error("No se extrajo ningún municipio.");
    process.exit(1);
  }
  console.log(`Municipios en el CSV: ${pairs.length}. Ejemplo:`, pairs[0]);

  const db = getDb();
  const CHUNK = 1000;
  for (let i = 0; i < pairs.length; i += CHUNK) {
    const chunk = pairs.slice(i, i + CHUNK);
    const values = sql.join(
      chunk.map(([ine, name]) => sql`(${ine}, ${name})`),
      sql`, `,
    );
    await db.execute(sql`
      UPDATE postal_codes AS p
      SET municipio = v.name, updated_at = now()
      FROM (VALUES ${values}) AS v(ine, name)
      WHERE p.ine_municipio = v.ine
    `);
    console.log(`  ${Math.min(i + CHUNK, pairs.length)}/${pairs.length} municipios procesados`);
  }

  const sample = await db
    .select({ code: postalCodes.code, municipio: postalCodes.municipio, provincia: postalCodes.provincia })
    .from(postalCodes)
    .where(isNotNull(postalCodes.municipio))
    .limit(3);
  console.log("Ejemplos con municipio relleno:", sample);
  console.log("Hecho.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
