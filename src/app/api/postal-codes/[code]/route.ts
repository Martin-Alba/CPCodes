import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import type { Geometry, Position } from "geojson";
import { getDb } from "@/db";
import { postalCodes } from "@/db/schema";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

// Redondeo de coordenadas a 5 decimales (~1 m): recorta el payload ~30-50% sin
// diferencia visible, clave para móviles/equipos de bajos recursos.
const r5 = (n: number) => Math.round(n * 1e5) / 1e5;
const roundRing = (ring: Position[]): Position[] => ring.map((p) => [r5(p[0]), r5(p[1])]);

function roundGeometry(geom: unknown): unknown {
  const g = geom as Geometry | null;
  if (!g) return g;
  if (g.type === "Polygon") {
    return { type: "Polygon", coordinates: g.coordinates.map(roundRing) };
  }
  if (g.type === "MultiPolygon") {
    return { type: "MultiPolygon", coordinates: g.coordinates.map((poly) => poly.map(roundRing)) };
  }
  return g;
}

// Devuelve la geometría (ligera) de un CP. Solo con sesión (fail-closed).
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { code } = await params;
  if (!/^\d{5}$/.test(code)) {
    return NextResponse.json({ error: "Código postal inválido" }, { status: 400 });
  }

  try {
    const db = getDb();
    const rows = await db
      .select({
        code: postalCodes.code,
        municipio: postalCodes.municipio,
        provincia: postalCodes.provincia,
        centroidLat: postalCodes.centroidLat,
        centroidLng: postalCodes.centroidLng,
        geometry: postalCodes.geometry,
      })
      .from(postalCodes)
      .where(eq(postalCodes.code, code))
      .limit(1);
    const cp = rows[0];
    if (!cp) {
      return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    }
    return NextResponse.json(
      { ...cp, geometry: roundGeometry(cp.geometry) },
      { headers: { "Cache-Control": "private, max-age=86400" } },
    );
  } catch {
    return NextResponse.json({ error: "Error de servidor" }, { status: 500 });
  }
}
