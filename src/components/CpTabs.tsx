import Link from "next/link";

// Sub-navegación entre la vista de mapa y la de listado de códigos postales.
export default function CpTabs({ active }: { active: "mapa" | "listado" }) {
  const base = "rounded-lg px-3 py-1.5 text-sm transition";
  const on = "bg-neutral-900 text-white";
  const off = "border border-neutral-300 text-neutral-700 hover:bg-neutral-50";
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
