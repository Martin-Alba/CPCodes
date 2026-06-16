import { getSession } from "@/lib/session";

export default async function UsuariosPage() {
  const session = await getSession();

  // Defensa en servidor: solo el super-admin gestiona usuarios.
  if (session?.role !== "admin") {
    return (
      <section>
        <h1 className="text-xl font-semibold">Usuarios</h1>
        <p className="mt-2 text-sm text-red-600">
          No tienes permiso para ver esta sección.
        </p>
      </section>
    );
  }

  return (
    <section>
      <h1 className="text-xl font-semibold">Usuarios</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Crea, edita y elimina usuarios de solo lectura — Fase 1.
      </p>
      <div className="mt-6 rounded-xl border border-dashed border-neutral-300 bg-white p-10 text-center text-sm text-neutral-400">
        Gestión de usuarios pendiente (Fase 1).
      </div>
    </section>
  );
}
