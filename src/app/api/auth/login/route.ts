import { NextResponse, type NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { createSession } from "@/lib/session";

export const runtime = "nodejs";

const credentialsSchema = z.object({
  username: z.string().min(1).max(255),
  password: z.string().min(1).max(200),
});

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = credentialsSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }
  const { username, password } = parsed.data;

  // 1) Super-administrador fijo (definido por variables de entorno)
  const adminUser = process.env.ADMIN_USERNAME;
  const adminHash = process.env.ADMIN_PASSWORD_HASH;
  if (adminUser && adminHash && username === adminUser) {
    const ok = await bcrypt.compare(password, adminHash);
    if (ok) {
      await createSession({ sub: "admin", name: adminUser, role: "admin" });
      return NextResponse.json({ ok: true, role: "admin" });
    }
  }

  // 2) Usuarios de solo lectura (almacenados en la base de datos)
  try {
    const db = getDb();
    const found = await db
      .select()
      .from(users)
      .where(eq(users.email, username.toLowerCase()))
      .limit(1);
    const user = found[0];
    if (user && user.active) {
      const ok = await bcrypt.compare(password, user.passwordHash);
      if (ok) {
        await createSession({
          sub: user.id,
          name: user.name ?? user.email,
          role: "viewer",
        });
        return NextResponse.json({ ok: true, role: "viewer" });
      }
    }
  } catch {
    // DB aún no configurada o error transitorio: caemos a "credenciales incorrectas".
  }

  // Respuesta genérica: no revelamos si falló el usuario o la contraseña.
  return NextResponse.json({ error: "Credenciales incorrectas" }, { status: 401 });
}
