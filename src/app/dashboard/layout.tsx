import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import LogoutButton from "@/components/LogoutButton";

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
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
            <Link href="/dashboard" className="font-semibold">
              CPCodes
            </Link>
            <nav className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-neutral-600">
              <Link href="/dashboard/codigos-postales" className="hover:text-neutral-900">
                Códigos postales
              </Link>
              <Link href="/dashboard/repartidores" className="hover:text-neutral-900">
                Repartidores
              </Link>
              {isAdmin && (
                <Link href="/dashboard/usuarios" className="hover:text-neutral-900">
                  Usuarios
                </Link>
              )}
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-neutral-500">
              {session.name}{" "}
              <span className="ml-1 rounded bg-neutral-100 px-1.5 py-0.5 text-xs">
                {isAdmin ? "admin" : "lectura"}
              </span>
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
