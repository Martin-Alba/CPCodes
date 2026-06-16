import Link from "next/link";
import { asc } from "drizzle-orm";
import { getDb } from "@/db";
import { drivers } from "@/db/schema";
import { getSession } from "@/lib/session";
import SubmitButton from "@/components/SubmitButton";
import { createDriver } from "./actions";

type Driver = typeof drivers.$inferSelect;

const inputCls =
  "mt-1 block rounded-lg border border-border bg-elevated px-3 py-2 text-sm outline-none focus:border-text";

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
      <p className="mt-1 text-sm text-muted">
        {isAdmin
          ? "Gestiona repartidores y los CP que cubren."
          : "Listado de repartidores (solo lectura)."}
      </p>

      {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

      {isAdmin && (
        <form
          action={createDriver}
          className="mt-4 flex flex-wrap items-end gap-3 rounded-xl border border-border bg-surface p-4"
        >
          <label className="block">
            <span className="text-xs font-medium text-muted">Nombre *</span>
            <input name="nombre" required maxLength={160} className={`${inputCls} w-48`} />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-muted">Teléfono</span>
            <input name="telefono" maxLength={40} className={`${inputCls} w-36`} />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-muted">Vehículo</span>
            <input name="vehiculo" maxLength={80} className={`${inputCls} w-36`} />
          </label>
          <SubmitButton
            pendingText="Añadiendo…"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-fg transition hover:opacity-90 disabled:opacity-60"
          >
            Añadir
          </SubmitButton>
        </form>
      )}

      {dbError ? (
        <p className="mt-6 text-sm text-red-500">No se pudo cargar la lista (¿base de datos conectada?).</p>
      ) : list.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-border bg-surface p-10 text-center text-sm text-muted">
          Aún no hay repartidores.
        </div>
      ) : (
        <ul className="mt-6 divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
          {list.map((d) => (
            <li key={d.id}>
              <Link
                href={`/dashboard/repartidores/${d.id}`}
                className="flex items-center justify-between px-4 py-3 text-sm hover:bg-elevated"
              >
                <span className="font-medium">{d.nombre}</span>
                <span className="text-muted">
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
