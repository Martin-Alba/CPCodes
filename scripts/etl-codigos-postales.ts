/**
 * ETL de códigos postales — FASE 1 (pendiente de implementar).
 *
 * Objetivo: cargar en la tabla `postal_codes` la geometría real de cada CP de España.
 *
 * Fuente recomendada (datos abiertos, origen oficial CNIG):
 *   https://github.com/inigoflores/ds-codigos-postales
 *   - GeoJSON por provincias en /data
 *   - Cruce CP -> municipio (código INE) en /data/codigos_postales_municipios_join.csv
 *
 * Pasos previstos:
 *   1. Descargar los GeoJSON por provincia (o el shapefile unificado).
 *   2. Simplificar la geometría (Douglas-Peucker, p.ej. con mapshaper/topojson)
 *      para reducir vértices y que el navegador reciba pocos KB por CP.
 *   3. Calcular el centroide de cada CP (centroidLat / centroidLng).
 *   4. Insertar/actualizar en `postal_codes` (code, municipio, provincia,
 *      ineMunicipio, centroide y geometry como GeoJSON).
 *
 * Ejecución (cuando se implemente): se lanzará con un runner de TS (p.ej. tsx)
 * usando DATABASE_URL del entorno.
 */

async function main(): Promise<void> {
  console.log("ETL de códigos postales: pendiente de implementar (Fase 1).");
  console.log("Ver instrucciones y fuente de datos en el encabezado de este archivo.");
}

void main();
