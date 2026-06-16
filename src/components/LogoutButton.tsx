"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ConfirmDialog from "@/components/ConfirmDialog";

export default function LogoutButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function logout() {
    setLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.replace("/login");
      router.refresh();
    } catch {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg border border-border px-3 py-1.5 text-sm transition hover:bg-elevated"
      >
        Salir
      </button>

      <ConfirmDialog
        open={open}
        title="Cerrar sesión"
        message="¿Seguro que quieres cerrar sesión?"
        confirmText="Salir"
        onConfirm={logout}
        onCancel={() => setOpen(false)}
        busy={loading}
      />
    </>
  );
}
