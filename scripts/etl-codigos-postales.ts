/**
 * ETL de geometrías de códigos postales (Fase 1).
 *
 * Lee GeoJSON del CNIG (repo inigoflores/ds-codigos-postales) y hace upsert en
 * `postal_codes` (código, provincia, código INE, centroide y geometría). El CP se
 * detecta de forma defensiva (valor de 5 dígitos). La provincia se deduce del
 * nombre del archivo (el dataset no incluye nombres, solo COD_POSTAL y CODIGO_INE).
 *
 * Datos: descarga la carpeta /data del repo en ./data/cp-geojson (ver README).
 * Ejecutar todo:        pnpm etl:cp
 * Ejecutar 1 provincia: pnpm etl:cp data/cp-geojson/ALAVA.geojson
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });

import { readdir, readFile, stat } from "node:fs/promises";
import { basename, join } from "node:path";
import { sql } from "drizzle-orm";
import type {
  FeatureCollection,
  Geometry,
  MultiPolygon,
  Position,
} from "geojson";
import { getDb } from "@/db";
import { postalCodes } from "@/db/schema";

const INPUT = process.argv[2] ?? "data/cp-geojson";
const CHUNK = 100; // lote pequeño: los polígonos pueden ser grandes para el driver HTTP de Neon
const CP_KEYS = ["COD_POSTAL", "CODPOS", "codigo_postal", "cod_postal", "CP", "cp", "postal_code"];
const MUNI_KEYS = ["municipio", "MUNICIPIO", "nombre", "NOMBRE", "muni"];
const PROV_KEYS = ["provincia", "PROVINCIA", "prov"];
const INE_KEYS = ["CODIGO_INE", "cod_ine", "COD_INE", "ine", "INE", "municipio_id"];

type Props = Record<string, unknown> | null | undefined;

function pickString(props: Props, keys: string[]): string | null {
  if (!props) return null;
  for (const k of keys) {
    const v = props[k];
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number") return String(v);
  }
  return null;
}

function findPostalCode(props: Props): string | null {
  const direct = pickString(props, CP_KEYS);
  if (direct && /^\d{5}$/.test(direct)) return direct;
  if (props) {
    for (const v of Object.values(props)) {
      if (typeof v === "string" && /^\d{5}$/.test(v.trim())) return v.trim();
      if (typeof v === "number" && /^\d{5}$/.test(String(v).padStart(5, "0"))) {
        return String(v).padStart(5, "0");
      }
    }
  }
  return null;
}

interface Acc {
  polygons: Position[][][];
  municipio: string | null;
  provincia: string | null;
  ine: string | null;
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

function accBbox(acc: Acc, polygon: Position[][]): void {
  for (const ring of polygon) {
    for (const pos of ring) {
      const lng = pos[0];
      const lat = pos[1];
      if (lat < acc.minLat) acc.minLat = lat;
      if (lat > acc.maxLat) acc.maxLat = lat;
      if (lng < acc.minLng) acc.minLng = lng;
      if (lng > acc.maxLng) acc.maxLng = lng;
    }
  }
}

function addPolygons(acc: Acc, geom: Geometry | null): void {
  if (!geom) return;
  if (geom.type === "Polygon") {
    acc.polygons.push(geom.coordinates);
    accBbox(acc, geom.coordinates);
  } else if (geom.type === "MultiPolygon") {
    for (const poly of geom.coordinates) {
      acc.polygons.push(poly);
      accBbox(acc, poly);
    }
  }
}

function provinciaFromFile(path: string): string {
  return basename(path).replace(/\.(geo)?json$/i, "").replace(/_/g, " ");
}

async function resolveFiles(input: string): Promise<string[]> {
  const s = await stat(input).catch(() => null);
  if (!s) {
    console.error(`No existe "${input}". Descarga los GeoJSON del CNIG (ver README, "Datos de códigos postales").`);
    process.exit(1);
  }
  if (s.isFile()) return [input];
  const entries = await readdir(input);
  return entries.filter((f) => /\.(geo)?json$/i.test(f)).map((f) => join(input, f));
}

async function main(): Promise<void> {
  const files = await resolveFiles(INPUT);
  if (files.length === 0) {
    console.error(`No hay .geojson en "${INPUT}".`);
    process.exit(1);
  }

  const byCp = new Map<string, Acc>();
  let features = 0;
  let skipped = 0;

  for (const path of files) {
    const prov = provinciaFromFile(path);
    const fc = JSON.parse(await readFile(path, "utf8")) as FeatureCollection;
    if (!Array.isArray(fc.features)) continue;
    for (const feat of fc.features) {
      const cp = findPostalCode(feat.properties);
      if (!cp) {
        skipped++;
        continue;
      }
      features++;
      let acc = byCp.get(cp);
      if (!acc) {
        acc = { polygons: [], municipio: null, provincia: null, ine: null, minLat: 90, maxLat: -90, minLng: 180, maxLng: -180 };
        byCp.set(cp, acc);
      }
      acc.municipio ??= pickString(feat.properties, MUNI_KEYS);
      acc.provincia ??= pickString(feat.properties, PROV_KEYS) ?? prov;
      acc.ine ??= pickString(feat.properties, INE_KEYS);
      addPolygons(acc, feat.geometry);
    }
  }

  const rows = [...byCp.entries()]
    .filter(([, a]) => a.polygons.length > 0)
    .map(([code, a]) => ({
      code,
      municipio: a.municipio,
      provincia: a.provincia,
      ineMunicipio: a.ine,
      centroidLat: (a.minLat + a.maxLat) / 2,
      centroidLng: (a.minLng + a.maxLng) / 2,
      geometry: { type: "MultiPolygon", coordinates: a.polygons } satisfies MultiPolygon,
    }));

  console.log(`Archivos: ${files.length} · features con CP: ${features} · sin CP: ${skipped} · CP únicos: ${rows.length}`);
  if (rows.length === 0) {
    console.error("No se extrajo ningún CP. Revisa las propiedades del GeoJSON.");
    process.exit(1);
  }
  console.log("Ejemplo:", { code: rows[0].code, provincia: rows[0].provincia, ine: rows[0].ineMunicipio });

  const db = getDb();
  let upserted = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const batch = rows.slice(i, i + CHUNK);
    await db
      .insert(postalCodes)
      .values(batch)
      .onConflictDoUpdate({
        target: postalCodes.code,
        set: {
          municipio: sql`excluded.municipio`,
          provincia: sql`excluded.provincia`,
          ineMunicipio: sql`excluded.ine_municipio`,
          centroidLat: sql`excluded.centroid_lat`,
          centroidLng: sql`excluded.centroid_lng`,
          geometry: sql`excluded.geometry`,
          updatedAt: sql`now()`,
        },
      });
    upserted += batch.length;
    if (upserted % 1000 < CHUNK) console.log(`  upsert ${upserted}/${rows.length}`);
  }
  console.log(`Hecho. ${upserted} códigos postales cargados/actualizados.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
