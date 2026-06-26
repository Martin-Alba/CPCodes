import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { driverPostalCodes, postalCodes } from "@/db/schema";
import { getSession } from "@/lib/session";
import { roundGeometry } from "@/lib/geo";

export const runtime = "nodejs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Geometrías (ligeras) + municipio de los CP asignados a un repartidor.
// Solo con sesión (fail-closed).
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;
  if (!UUID.test(id)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  try {
    const db = getDb();
    const rows = await db
      .select({
        code: driverPostalCodes.postalCode,
        municipio: postalCodes.municipio,
        provincia: postalCodes.provincia,
        geometry: postalCodes.geometry,
      })
      .from(driverPostalCodes)
      .leftJoin(postalCodes, eq(driverPostalCodes.postalCode, postalCodes.code))
      .where(eq(driverPostalCodes.driverId, id))
      .orderBy(asc(driverPostalCodes.postalCode));

    const cps = rows.map((r) => ({
      code: r.code,
      municipio: r.municipio,
      provincia: r.provincia,
      // 4 decimales: para una vista de cobertura sobra precisión y pesa menos.
      geometry: roundGeometry(r.geometry, 4),
    }));

    return NextResponse.json({ cps }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Error de servidor" }, { status: 500 });
  }
}
