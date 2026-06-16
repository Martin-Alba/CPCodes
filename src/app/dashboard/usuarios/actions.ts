"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { getSession } from "@/lib/session";

async function assertAdmin(): Promise<void> {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    throw new Error("No autorizado");
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PATH = "/dashboard/usuarios";

function str(v: FormDataEntryValue | null): string {
  return typeof v === "string" ? v.trim() : "";
}

function errorTo(msg: string): never {
  redirect(`${PATH}?error=${encodeURIComponent(msg)}`);
}

const createSchema = z.object({
  email: z.string().trim().max(255).refine((v) => EMAIL.test(v), "Email inválido"),
  name: z.string().trim().max(120).transform((v) => v || null),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres").max(200),
});

export async function createUser(formData: FormData): Promise<void> {
  await assertAdmin();
  const parsed = createSchema.safeParse({
    email: str(formData.get("email")).toLowerCase(),
    name: str(formData.get("name")),
    password: str(formData.get("password")),
  });
  if (!parsed.success) errorTo(parsed.error.issues[0]?.message ?? "Datos inválidos");

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  try {
    const db = getDb();
    await db.insert(users).values({
      email: parsed.data.email,
      name: parsed.data.name,
      passwordHash,
      role: "viewer",
    });
  } catch {
    errorTo("No se pudo crear (¿el email ya existe?)");
  }
  revalidatePath(PATH);
  redirect(PATH);
}

export async function setActive(formData: FormData): Promise<void> {
  await assertAdmin();
  const id = str(formData.get("id"));
  const active = str(formData.get("active")) === "true";
  if (UUID.test(id)) {
    const db = getDb();
    await db.update(users).set({ active, updatedAt: sql`now()` }).where(eq(users.id, id));
  }
  revalidatePath(PATH);
  redirect(PATH);
}

export async function resetPassword(formData: FormData): Promise<void> {
  await assertAdmin();
  const id = str(formData.get("id"));
  const password = str(formData.get("password"));
  if (!UUID.test(id)) redirect(PATH);
  if (password.length < 6) errorTo("La contraseña debe tener al menos 6 caracteres");
  const passwordHash = await bcrypt.hash(password, 12);
  const db = getDb();
  await db.update(users).set({ passwordHash, updatedAt: sql`now()` }).where(eq(users.id, id));
  revalidatePath(PATH);
  redirect(`${PATH}?ok=Contraseña actualizada`);
}

export async function deleteUser(formData: FormData): Promise<void> {
  await assertAdmin();
  const id = str(formData.get("id"));
  if (UUID.test(id)) {
    const db = getDb();
    await db.delete(users).where(eq(users.id, id));
  }
  revalidatePath(PATH);
  redirect(PATH);
}
