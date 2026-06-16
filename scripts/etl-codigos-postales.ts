/**
 * ETL de geometrías de códigos postales (Fase 1).
 *
 * Lee los GeoJSON del CNIG (repo inigoflores/ds-codigos-postales) desde un
 * directorio local y hace upsert en la tabla `postal_codes` (código, municipio,
 * provincia, código INE, centroide y geometría). El campo del CP se detecta de
 * forma defensiva (busca un valor de 5 dígitos), porque las propiedades del
 * dataset pueden variar.
 *
 * Datos: descarga la carpeta /data del repo en `./data/cp-geojson` (ver README).
 * Ejecutar: `pnpm etl:cp [directorio]`   (por defecto ./data/cp-geojson)
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });

import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { sql } from "drizzle-orm";
import type {
  FeatureCollection,
  Geometry,
  MultiPolygon,
  Position,
} from "geojson";
import { getDb } from "@/db";
import { postalCodes } from "@/db/schema";

const INPUT_DIR = process.argv[2] ?? "data/cp-geojson";
const CP_KEYS = ["COD_POSTAL", "CODPOS", "codigo_postal", "cod_postal", "CP", "cp", "postal_code"];
const MUNI_KEYS = ["municipio", "MUNICIPIO", "nombre", "NOMBRE", "muni"];
const PROV_KEYS = ["provincia", "PROVINCIA", "prov"];
const INE_KEYS = ["ine", "INE", "cod_ine", "COD_INE", "municipio_id"];

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

async function main(): Promise<void> {
  const entries = await readdir(INPUT_DIR).catch(() => {
    console.error(`No se pudo leer ${INPUT_DIR}. Descarga los GeoJSON del CNIG (ver README, "Datos de códigos postales").`);
    process.exit(1);
  });
  const files = entries.filter((f) => /\.(geo)?json$/i.test(f));
  if (files.length === 0) {
    console.error(`No hay .geojson en ${INPUT_DIR}.`);
    process.exit(1);
  }

  const byCp = new Map<string, Acc>();
  let features = 0;
  let skipped = 0;

  for (const file of files) {
    const raw = await readFile(join(INPUT_DIR, file), "utf8");
    const fc = JSON.parse(raw) as FeatureCollection;
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
      acc.provincia ??= pickString(feat.properties, PROV_KEYS);
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

  console.log(`Ficheros: ${files.length} · features con CP: ${features} · sin CP: ${skipped} · CP únicos: ${rows.length}`);
  if (rows.length === 0) {
    console.error("No se extrajo ningún CP. Revisa las propiedades del GeoJSON.");
    process.exit(1);
  }
  console.log("Ejemplo:", { code: rows[0].code, municipio: rows[0].municipio, provincia: rows[0].provincia });

  const db = getDb();
  const CHUNK = 500;
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
    console.log(`  upsert ${upserted}/${rows.length}`);
  }
  console.log(`Hecho. ${upserted} códigos postales cargados/actualizados.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
