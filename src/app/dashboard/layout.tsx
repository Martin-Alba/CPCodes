import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import Brand from "@/components/Brand";
import LogoutButton from "@/components/LogoutButton";
import ThemeToggle from "@/components/ThemeToggle";

const navLinkCls =
  "whitespace-nowrap rounded-md px-2.5 py-1.5 text-sm text-muted transition hover:bg-elevated hover:text-text";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const isAdmin = session.role === "admin";

  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto max-w-6xl px-4">
          {/* Fila superior: marca + controles */}
          <div className="flex h-14 items-center justify-between gap-3">
            <Link href="/dashboard" className="text-base">
              <Brand />
            </Link>
            <div className="flex items-center gap-2">
              <span className="hidden text-sm text-muted sm:inline">{session.name}</span>
              <span className="rounded-md bg-elevated px-2 py-0.5 text-xs text-muted">
                {isAdmin ? "admin" : "lectura"}
              </span>
              <ThemeToggle />
              <LogoutButton />
            </div>
          </div>
          {/* Fila inferior: navegación (se desplaza en horizontal si no cabe) */}
          <nav className="flex gap-1 overflow-x-auto pb-2">
            <Link href="/dashboard/codigos-postales" className={navLinkCls}>
              Códigos postales
            </Link>
            <Link href="/dashboard/repartidores" className={navLinkCls}>
              Repartidores
            </Link>
            {isAdmin && (
              <Link href="/dashboard/usuarios" className={navLinkCls}>
                Usuarios
              </Link>
            )}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
