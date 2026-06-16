import Link from "next/link";
import { getSession } from "@/lib/session";

function Card({
  title,
  desc,
  href,
}: {
  title: string;
  desc: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="block rounded-xl border border-border bg-surface p-5 transition hover:bg-elevated"
    >
      <h2 className="font-medium">{title}</h2>
      <p className="mt-1 text-sm text-muted">{desc}</p>
    </Link>
  );
}

export default async function DashboardHome() {
  const session = await getSession();
  const isAdmin = session?.role === "admin";

  return (
    <section>
      <h1 className="text-xl font-semibold">Hola, {session?.name}</h1>
      <p className="mt-1 text-sm text-muted">Panel de gestión de almacén y repartidores.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card
          title="Códigos postales"
          desc="Consulta la zona de cada CP sobre el mapa."
          href="/dashboard/codigos-postales"
        />
        <Card
          title="Repartidores"
          desc="Gestiona repartidores y los CP que cubren."
          href="/dashboard/repartidores"
        />
        {isAdmin && (
          <Card
            title="Usuarios"
            desc="Crea y administra usuarios de solo lectura."
            href="/dashboard/usuarios"
          />
        )}
      </div>
    </section>
  );
}
