import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { drivers, driverPostalCodes, postalCodes } from "@/db/schema";
import { getSession } from "@/lib/session";
import ConfirmSubmit from "@/components/ConfirmSubmit";
import SubmitButton from "@/components/SubmitButton";
import { assignCp, deleteDriver, unassignCp, updateDriver } from "../actions";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const inputCls =
  "mt-1 block rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900";

export default async function DriverDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getSession();
  const isAdmin = session?.role === "admin";
  const { id } = await params;
  const { error } = await searchParams;
  if (!UUID.test(id)) notFound();

  const db = getDb();
  const found = await db.select().from(drivers).where(eq(drivers.id, id)).limit(1);
  const driver = found[0];
  if (!driver) notFound();

  const cps = await db
    .select({
      code: driverPostalCodes.postalCode,
      provincia: postalCodes.provincia,
    })
    .from(driverPostalCodes)
    .leftJoin(postalCodes, eq(driverPostalCodes.postalCode, postalCodes.code))
    .where(eq(driverPostalCodes.driverId, id))
    .orderBy(asc(driverPostalCodes.postalCode));

  return (
    <section className="space-y-6">
      <div>
        <Link
          href="/dashboard/repartidores"
          className="text-sm text-neutral-500 hover:text-neutral-900"
        >
          ← Repartidores
        </Link>
        <h1 className="mt-1 text-xl font-semibold">{driver.nombre}</h1>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Datos */}
      <div className="rounded-xl border border-neutral-200 bg-white p-4">
        <h2 className="text-sm font-medium">Datos</h2>
        {isAdmin ? (
          <form action={updateDriver} className="mt-3 flex flex-wrap items-end gap-3">
            <input type="hidden" name="id" value={driver.id} />
            <label className="block">
              <span className="text-xs font-medium text-neutral-600">Nombre *</span>
              <input name="nombre" required defaultValue={driver.nombre} maxLength={160} className={`${inputCls} w-48`} />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-neutral-600">Teléfono</span>
              <input name="telefono" defaultValue={driver.telefono ?? ""} maxLength={40} className={`${inputCls} w-36`} />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-neutral-600">Vehículo</span>
              <input name="vehiculo" defaultValue={driver.vehiculo ?? ""} maxLength={80} className={`${inputCls} w-36`} />
            </label>
            <SubmitButton
              pendingText="Guardando…"
              className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:opacity-60"
            >
              Guardar
            </SubmitButton>
          </form>
        ) : (
          <p className="mt-2 text-sm text-neutral-600">
            {[driver.telefono, driver.vehiculo].filter(Boolean).join(" · ") || "—"}
          </p>
        )}
      </div>

      {/* CP asignados */}
      <div className="rounded-xl border border-neutral-200 bg-white p-4">
        <h2 className="text-sm font-medium">
          Códigos postales que cubre ({cps.length})
        </h2>

        {isAdmin && (
          <form action={assignCp} className="mt-3 flex items-end gap-2">
            <input type="hidden" name="driverId" value={driver.id} />
            <input
              name="code"
              inputMode="numeric"
              maxLength={5}
              placeholder="Ej. 01193"
              className={`${inputCls} w-32`}
            />
            <SubmitButton
              pendingText="Asignando…"
              className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium transition hover:bg-neutral-50 disabled:opacity-60"
            >
              Asignar
            </SubmitButton>
          </form>
        )}

        {cps.length === 0 ? (
          <p className="mt-3 text-sm text-neutral-400">Sin CP asignados.</p>
        ) : (
          <ul className="mt-3 flex flex-wrap gap-2">
            {cps.map((c) => (
              <li
                key={c.code}
                className="flex items-center gap-1.5 rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-xs"
              >
                <span className="font-medium">{c.code}</span>
                {c.provincia && <span className="text-neutral-500">{c.provincia}</span>}
                {isAdmin && (
                  <form action={unassignCp} className="ml-0.5 inline-flex">
                    <input type="hidden" name="driverId" value={driver.id} />
                    <input type="hidden" name="code" value={c.code} />
                    <button
                      type="submit"
                      title="Quitar"
                      className="leading-none text-neutral-400 transition hover:text-red-600"
                    >
                      ×
                    </button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Eliminar */}
      {isAdmin && (
        <form action={deleteDriver}>
          <input type="hidden" name="id" value={driver.id} />
          <ConfirmSubmit
            message={`¿Eliminar a ${driver.nombre}? También se quitarán sus CP asignados.`}
            className="rounded-lg border border-red-300 px-3 py-1.5 text-sm text-red-600 transition hover:bg-red-50"
          >
            Eliminar repartidor
          </ConfirmSubmit>
        </form>
      )}
    </section>
  );
}
