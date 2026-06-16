import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import LogoutButton from "@/components/LogoutButton";
import ThemeToggle from "@/components/ThemeToggle";

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
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
            <Link href="/dashboard" className="font-semibold">
              CPCodes
            </Link>
            <nav className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
              <Link href="/dashboard/codigos-postales" className="hover:text-text">
                Códigos postales
              </Link>
              <Link href="/dashboard/repartidores" className="hover:text-text">
                Repartidores
              </Link>
              {isAdmin && (
                <Link href="/dashboard/usuarios" className="hover:text-text">
                  Usuarios
                </Link>
              )}
            </nav>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="hidden text-muted sm:inline">{session.name}</span>
            <span className="rounded bg-elevated px-1.5 py-0.5 text-xs text-muted">
              {isAdmin ? "admin" : "lectura"}
            </span>
            <ThemeToggle />
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
