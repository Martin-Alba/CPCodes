import Link from "next/link";
import { asc, count, eq, ilike, like, or, type SQL } from "drizzle-orm";
import { getDb } from "@/db";
import { postalCodes } from "@/db/schema";
import CpTabs from "@/components/CpTabs";

const PAGE_SIZE = 50;

function buildWhere(q: string): SQL | undefined {
  if (!q) return undefined;
  if (/^\d{5}$/.test(q)) return eq(postalCodes.code, q);
  if (/^\d+$/.test(q)) return like(postalCodes.code, `${q}%`);
  const term = `%${q}%`;
  return or(ilike(postalCodes.provincia, term), ilike(postalCodes.municipio, term));
}

type Row = { code: string; municipio: string | null; provincia: string | null };

export default async function ListadoPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const page = Math.max(0, Number.parseInt(sp.page ?? "0", 10) || 0);
  const where = buildWhere(q);

  let rows: Row[] = [];
  let total = 0;
  let dbError = false;
  try {
    const db = getDb();
    rows = await db
      .select({
        code: postalCodes.code,
        municipio: postalCodes.municipio,
        provincia: postalCodes.provincia,
      })
      .from(postalCodes)
      .where(where)
      .orderBy(asc(postalCodes.code))
      .limit(PAGE_SIZE)
      .offset(page * PAGE_SIZE);
    const [c] = await db.select({ n: count() }).from(postalCodes).where(where);
    total = c?.n ?? 0;
  } catch {
    dbError = true;
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const href = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (p > 0) params.set("page", String(p));
    const s = params.toString();
    return s ? `?${s}` : "?";
  };

  return (
    <section>
      <h1 className="text-xl font-semibold">Códigos postales</h1>
      <p className="mt-1 text-sm text-muted">
        Listado de CP con su municipio. Busca por CP, municipio o provincia (en ambos sentidos).
      </p>

      <CpTabs active="listado" />

      <form method="get" className="mt-4 flex gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="CP, municipio o provincia"
          className="w-full max-w-xs rounded-lg border border-border bg-elevated px-3 py-2 text-sm outline-none focus:border-text"
        />
        <button
          type="submit"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-fg transition hover:opacity-90"
        >
          Buscar
        </button>
        {q && (
          <Link
            href="/dashboard/codigos-postales/listado"
            className="rounded-lg border border-border px-4 py-2 text-sm transition hover:bg-elevated"
          >
            Limpiar
          </Link>
        )}
      </form>

      {dbError ? (
        <p className="mt-6 text-sm text-red-500">No se pudo cargar el listado (¿base de datos conectada?).</p>
      ) : (
        <>
          <p className="mt-4 text-xs text-muted">
            {total.toLocaleString("es-ES")} resultado{total === 1 ? "" : "s"}
            {totalPages > 1 ? ` · página ${page + 1} de ${totalPages}` : ""}
          </p>

          <div className="mt-2 overflow-x-auto rounded-xl border border-border bg-surface">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted">
                  <th className="px-4 py-2 font-medium">CP</th>
                  <th className="px-4 py-2 font-medium">Municipio</th>
                  <th className="px-4 py-2 font-medium">Provincia</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-10 text-center text-muted">
                      Sin resultados.
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr key={r.code} className="border-b border-border last:border-0 hover:bg-elevated">
                      <td className="px-4 py-2 font-medium">
                        <Link
                          href={`/dashboard/codigos-postales?cp=${r.code}`}
                          className="text-accent hover:underline"
                          title="Ver en el mapa"
                        >
                          {r.code}
                        </Link>
                      </td>
                      <td className="px-4 py-2">{r.municipio ?? "—"}</td>
                      <td className="px-4 py-2 text-muted">{r.provincia ?? "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="mt-3 flex items-center justify-between text-sm">
              {page > 0 ? (
                <Link href={href(page - 1)} className="rounded-lg border border-border px-3 py-1.5 transition hover:bg-elevated">
                  ← Anterior
                </Link>
              ) : (
                <span className="rounded-lg border border-border px-3 py-1.5 text-muted opacity-50">← Anterior</span>
              )}
              <span className="text-muted">
                {page + 1} / {totalPages}
              </span>
              {page + 1 < totalPages ? (
                <Link href={href(page + 1)} className="rounded-lg border border-border px-3 py-1.5 transition hover:bg-elevated">
                  Siguiente →
                </Link>
              ) : (
                <span className="rounded-lg border border-border px-3 py-1.5 text-muted opacity-50">Siguiente →</span>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}
