import type { Geometry, Position } from "geojson";

// Redondea las coordenadas de un polígono para aligerar el payload.
// Más decimales = más precisión y más peso. 5 decimales ≈ 1 m · 4 ≈ 11 m.
export function roundGeometry(geom: unknown, decimals = 5): unknown {
  const g = geom as Geometry | null;
  if (!g) return g;
  const f = 10 ** decimals;
  const r = (n: number) => Math.round(n * f) / f;
  const ring = (positions: Position[]): Position[] => positions.map((p) => [r(p[0]), r(p[1])]);
  if (g.type === "Polygon") {
    return { type: "Polygon", coordinates: g.coordinates.map(ring) };
  }
  if (g.type === "MultiPolygon") {
    return { type: "MultiPolygon", coordinates: g.coordinates.map((poly) => poly.map(ring)) };
  }
  return g;
}
