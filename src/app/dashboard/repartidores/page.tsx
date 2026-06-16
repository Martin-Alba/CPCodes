import Link from "next/link";
import { asc } from "drizzle-orm";
import { getDb } from "@/db";
import { drivers } from "@/db/schema";
import { getSession } from "@/lib/session";
import { createDriver } from "./actions";

type Driver = typeof drivers.$inferSelect;

const inputCls =
  "mt-1 block rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900";

export default async function RepartidoresPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getSession();
  const isAdmin = session?.role === "admin";
  const { error } = await searchParams;

  let list: Driver[] = [];
  let dbError = false;
  try {
    const db = getDb();
    list = await db.select().from(drivers).orderBy(asc(drivers.nombre));
  } catch {
    dbError = true;
  }

  return (
    <section>
      <h1 className="text-xl font-semibold">Repartidores</h1>
      <p className="mt-1 text-sm text-neutral-500">
        {isAdmin
          ? "Gestiona repartidores y los CP que cubren."
          : "Listado de repartidores (solo lectura)."}
      </p>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {isAdmin && (
        <form
          action={createDriver}
          className="mt-4 flex flex-wrap items-end gap-3 rounded-xl border border-neutral-200 bg-white p-4"
        >
          <label className="block">
            <span className="text-xs font-medium text-neutral-600">Nombre *</span>
            <input name="nombre" required maxLength={160} className={`${inputCls} w-48`} />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-neutral-600">Teléfono</span>
            <input name="telefono" maxLength={40} className={`${inputCls} w-36`} />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-neutral-600">Vehículo</span>
            <input name="vehiculo" maxLength={80} className={`${inputCls} w-36`} />
          </label>
          <button
            type="submit"
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-800"
          >
            Añadir
          </button>
        </form>
      )}

      {dbError ? (
        <p className="mt-6 text-sm text-red-600">
          No se pudo cargar la lista (¿base de datos conectada?).
        </p>
      ) : list.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-neutral-300 bg-white p-10 text-center text-sm text-neutral-400">
          Aún no hay repartidores.
        </div>
      ) : (
        <ul className="mt-6 divide-y divide-neutral-200 overflow-hidden rounded-xl border border-neutral-200 bg-white">
          {list.map((d) => (
            <li key={d.id}>
              <Link
                href={`/dashboard/repartidores/${d.id}`}
                className="flex items-center justify-between px-4 py-3 text-sm hover:bg-neutral-50"
              >
                <span className="font-medium">{d.nombre}</span>
                <span className="text-neutral-500">
                  {[d.telefono, d.vehiculo].filter(Boolean).join(" · ") || "—"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
