import { NextResponse } from "next/server";
import { and, asc, eq, ilike, isNotNull, like, or } from "drizzle-orm";
import { getDb } from "@/db";
import { postalCodes } from "@/db/schema";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

// Busca CP por código (exacto o prefijo) o por texto (provincia / municipio).
// Solo con sesión (fail-closed). Devuelve una lista ligera (sin geometría).
export async function GET(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const q = (new URL(req.url).searchParams.get("q") ?? "").trim();
  if (q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  try {
    const db = getDb();
    let where;
    if (/^\d{5}$/.test(q)) {
      where = eq(postalCodes.code, q);
    } else if (/^\d+$/.test(q)) {
      where = like(postalCodes.code, `${q}%`);
    } else {
      const term = `%${q}%`;
      where = or(ilike(postalCodes.provincia, term), ilike(postalCodes.municipio, term));
    }

    const rows = await db
      .select({
        code: postalCodes.code,
        municipio: postalCodes.municipio,
        provincia: postalCodes.provincia,
      })
      .from(postalCodes)
      .where(and(isNotNull(postalCodes.geometry), where))
      .orderBy(asc(postalCodes.code))
      .limit(50);

    return NextResponse.json({ results: rows });
  } catch {
    return NextResponse.json({ error: "Error de servidor" }, { status: 500 });
  }
}
