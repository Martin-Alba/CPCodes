import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { postalCodes } from "@/db/schema";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

// Devuelve la geometría (y datos) de un código postal. Solo con sesión (fail-closed).
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
      .select()
      .from(postalCodes)
      .where(eq(postalCodes.code, code))
      .limit(1);
    const cp = rows[0];
    if (!cp) {
      return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    }
    return NextResponse.json(cp);
  } catch {
    return NextResponse.json({ error: "Error de servidor" }, { status: 500 });
  }
}
