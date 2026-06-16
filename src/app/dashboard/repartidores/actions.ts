"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { drivers, driverPostalCodes, postalCodes } from "@/db/schema";
import { getSession } from "@/lib/session";

// Permiso en servidor: solo el admin puede mutar (fail-closed).
async function assertAdmin(): Promise<void> {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    throw new Error("No autorizado");
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function str(v: FormDataEntryValue | null): string {
  return typeof v === "string" ? v.trim() : "";
}

const driverInput = z.object({
  nombre: z.string().trim().min(1, "El nombre es obligatorio").max(160),
  telefono: z.string().trim().max(40).transform((v) => v || null),
  vehiculo: z.string().trim().max(80).transform((v) => v || null),
});

const LIST = "/dashboard/repartidores";
const detail = (id: string) => `${LIST}/${id}`;

export async function createDriver(formData: FormData): Promise<void> {
  await assertAdmin();
  const parsed = driverInput.safeParse({
    nombre: str(formData.get("nombre")),
    telefono: str(formData.get("telefono")),
    vehiculo: str(formData.get("vehiculo")),
  });
  if (!parsed.success) {
    redirect(`${LIST}?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Datos inválidos")}`);
  }
  const db = getDb();
  await db.insert(drivers).values(parsed.data);
  revalidatePath(LIST);
  redirect(LIST);
}

export async function updateDriver(formData: FormData): Promise<void> {
  await assertAdmin();
  const id = str(formData.get("id"));
  if (!UUID.test(id)) redirect(LIST);
  const parsed = driverInput.safeParse({
    nombre: str(formData.get("nombre")),
    telefono: str(formData.get("telefono")),
    vehiculo: str(formData.get("vehiculo")),
  });
  if (!parsed.success) {
    redirect(`${detail(id)}?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Datos inválidos")}`);
  }
  const db = getDb();
  await db
    .update(drivers)
    .set({ ...parsed.data, updatedAt: sql`now()` })
    .where(eq(drivers.id, id));
  revalidatePath(detail(id));
  redirect(detail(id));
}

export async function deleteDriver(formData: FormData): Promise<void> {
  await assertAdmin();
  const id = str(formData.get("id"));
  if (UUID.test(id)) {
    const db = getDb();
    await db.delete(drivers).where(eq(drivers.id, id)); // cascade elimina sus asignaciones
  }
  revalidatePath(LIST);
  redirect(LIST);
}

export async function assignCp(formData: FormData): Promise<void> {
  await assertAdmin();
  const driverId = str(formData.get("driverId"));
  const code = str(formData.get("code"));
  if (!UUID.test(driverId)) redirect(LIST);
  if (!/^\d{5}$/.test(code)) {
    redirect(`${detail(driverId)}?error=${encodeURIComponent("Introduce un CP de 5 dígitos")}`);
  }
  const db = getDb();
  const exists = await db
    .select({ code: postalCodes.code })
    .from(postalCodes)
    .where(eq(postalCodes.code, code))
    .limit(1);
  if (exists.length === 0) {
    redirect(`${detail(driverId)}?error=${encodeURIComponent(`El CP ${code} no está en la base (¿cargado con pnpm etl:cp?)`)}`);
  }
  // Idempotente y sin condición de carrera (PK compuesta).
  await db.insert(driverPostalCodes).values({ driverId, postalCode: code }).onConflictDoNothing();
  revalidatePath(detail(driverId));
  redirect(detail(driverId));
}

export async function unassignCp(formData: FormData): Promise<void> {
  await assertAdmin();
  const driverId = str(formData.get("driverId"));
  const code = str(formData.get("code"));
  if (UUID.test(driverId) && /^\d{5}$/.test(code)) {
    const db = getDb();
    await db
      .delete(driverPostalCodes)
      .where(and(eq(driverPostalCodes.driverId, driverId), eq(driverPostalCodes.postalCode, code)));
  }
  revalidatePath(detail(driverId));
  redirect(detail(driverId));
}
