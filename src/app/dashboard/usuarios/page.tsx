import { asc } from "drizzle-orm";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { getSession } from "@/lib/session";
import ConfirmSubmit from "@/components/ConfirmSubmit";
import SubmitButton from "@/components/SubmitButton";
import { createUser, deleteUser, resetPassword, setActive } from "./actions";

type UserRow = { id: string; username: string | null; active: boolean };

const inputCls =
  "rounded-lg border border-border bg-elevated px-3 py-2 text-sm outline-none focus:border-text";

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
        <p className="mt-2 text-sm text-red-500">No tienes permiso para ver esta sección.</p>
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
      <p className="mt-1 text-sm text-muted">
        Usuarios de solo lectura: ven todo pero no modifican nada. Entran con su usuario y contraseña.
      </p>

      {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
      {ok && <p className="mt-3 text-sm text-green-500">{ok}</p>}

      <form
        action={createUser}
        className="mt-4 flex flex-wrap items-end gap-3 rounded-xl border border-border bg-surface p-4"
      >
        <label className="block">
          <span className="text-xs font-medium text-muted">Usuario *</span>
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
          <span className="text-xs font-medium text-muted">Contraseña *</span>
          <input name="password" type="password" required minLength={6} className={`${inputCls} mt-1 block w-40`} />
        </label>
        <SubmitButton
          pendingText="Creando…"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-fg transition hover:opacity-90 disabled:opacity-60"
        >
          Crear
        </SubmitButton>
      </form>

      {dbError ? (
        <p className="mt-6 text-sm text-red-500">No se pudo cargar la lista (¿base de datos conectada?).</p>
      ) : list.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-border bg-surface p-10 text-center text-sm text-muted">
          Aún no hay usuarios.
        </div>
      ) : (
        <ul className="mt-6 divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
          {list.map((u) => (
            <li key={u.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="text-sm">
                <span className="font-medium">{u.username ?? "(sin usuario)"}</span>
                <span
                  className={`ml-2 rounded px-1.5 py-0.5 text-xs ${
                    u.active ? "bg-green-500/15 text-green-600 dark:text-green-400" : "bg-elevated text-muted"
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
                    className="rounded-lg border border-border px-3 py-1.5 text-xs transition hover:bg-elevated disabled:opacity-60"
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
                    className="rounded-lg border border-border px-3 py-1.5 text-xs transition hover:bg-elevated disabled:opacity-60"
                  >
                    Reset
                  </SubmitButton>
                </form>
                <form action={deleteUser}>
                  <input type="hidden" name="id" value={u.id} />
                  <ConfirmSubmit
                    message={`¿Eliminar al usuario ${u.username ?? ""}?`}
                    className="rounded-lg border border-red-500/40 px-3 py-1.5 text-xs text-red-500 transition hover:bg-red-500/10"
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
