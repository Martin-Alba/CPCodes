import { asc } from "drizzle-orm";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { getSession } from "@/lib/session";
import ConfirmSubmit from "@/components/ConfirmSubmit";
import SubmitButton from "@/components/SubmitButton";
import { createUser, deleteUser, resetPassword, setActive } from "./actions";

type UserRow = { id: string; username: string | null; active: boolean };

const inputCls =
  "rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900";

export default async function UsuariosPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const session = await getSession();
  if (session?.role !== "admin") {
    return (
      <section>
        <h1 className="text-xl font-semibold">Usuarios</h1>
        <p className="mt-2 text-sm text-red-600">No tienes permiso para ver esta sección.</p>
      </section>
    );
  }

  const { error, ok } = await searchParams;

  let list: UserRow[] = [];
  let dbError = false;
  try {
    const db = getDb();
    list = await db
      .select({ id: users.id, username: users.username, active: users.active })
      .from(users)
      .orderBy(asc(users.username));
  } catch {
    dbError = true;
  }

  return (
    <section>
      <h1 className="text-xl font-semibold">Usuarios</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Usuarios de solo lectura: ven todo pero no modifican nada. Entran con su usuario y contraseña.
      </p>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      {ok && <p className="mt-3 text-sm text-green-600">{ok}</p>}

      <form
        action={createUser}
        className="mt-4 flex flex-wrap items-end gap-3 rounded-xl border border-neutral-200 bg-white p-4"
      >
        <label className="block">
          <span className="text-xs font-medium text-neutral-600">Usuario *</span>
          <input
            name="username"
            required
            minLength={3}
            maxLength={80}
            autoComplete="off"
            className={`${inputCls} mt-1 block w-56`}
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-neutral-600">Contraseña *</span>
          <input name="password" type="password" required minLength={6} className={`${inputCls} mt-1 block w-40`} />
        </label>
        <SubmitButton
          pendingText="Creando…"
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:opacity-60"
        >
          Crear
        </SubmitButton>
      </form>

      {dbError ? (
        <p className="mt-6 text-sm text-red-600">No se pudo cargar la lista (¿base de datos conectada?).</p>
      ) : list.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-neutral-300 bg-white p-10 text-center text-sm text-neutral-400">
          Aún no hay usuarios.
        </div>
      ) : (
        <ul className="mt-6 divide-y divide-neutral-200 overflow-hidden rounded-xl border border-neutral-200 bg-white">
          {list.map((u) => (
            <li key={u.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="text-sm">
                <span className="font-medium">{u.username ?? "(sin usuario)"}</span>
                <span
                  className={`ml-2 rounded px-1.5 py-0.5 text-xs ${
                    u.active ? "bg-green-100 text-green-700" : "bg-neutral-100 text-neutral-500"
                  }`}
                >
                  {u.active ? "activo" : "inactivo"}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <form action={setActive}>
                  <input type="hidden" name="id" value={u.id} />
                  <input type="hidden" name="active" value={String(!u.active)} />
                  <SubmitButton
                    pendingText="…"
                    className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs transition hover:bg-neutral-50 disabled:opacity-60"
                  >
                    {u.active ? "Desactivar" : "Activar"}
                  </SubmitButton>
                </form>
                <form action={resetPassword} className="flex items-center gap-1">
                  <input type="hidden" name="id" value={u.id} />
                  <input
                    name="password"
                    type="password"
                    placeholder="Nueva contraseña"
                    minLength={6}
                    className={`${inputCls} w-40 px-2 py-1.5 text-xs`}
                  />
                  <SubmitButton
                    pendingText="…"
                    className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs transition hover:bg-neutral-50 disabled:opacity-60"
                  >
                    Reset
                  </SubmitButton>
                </form>
                <form action={deleteUser}>
                  <input type="hidden" name="id" value={u.id} />
                  <ConfirmSubmit
                    message={`¿Eliminar al usuario ${u.username ?? ""}?`}
                    className="rounded-lg border border-red-300 px-3 py-1.5 text-xs text-red-600 transition hover:bg-red-50"
                  >
                    Eliminar
                  </ConfirmSubmit>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
