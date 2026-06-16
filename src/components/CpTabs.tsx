import Link from "next/link";

// Sub-navegación entre la vista de mapa y la de listado de códigos postales.
export default function CpTabs({ active }: { active: "mapa" | "listado" }) {
  const base = "rounded-lg px-3 py-1.5 text-sm transition";
  const on = "bg-primary text-primary-fg";
  const off = "border border-border text-muted hover:bg-elevated hover:text-text";
  return (
    <nav className="mt-3 flex gap-2">
      <Link href="/dashboard/codigos-postales" className={`${base} ${active === "mapa" ? on : off}`}>
        Mapa
      </Link>
      <Link
        href="/dashboard/codigos-postales/listado"
        className={`${base} ${active === "listado" ? on : off}`}
      >
        Listado
      </Link>
    </nav>
  );
}
