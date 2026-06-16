"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Brand from "@/components/Brand";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (res.ok) {
        router.replace("/dashboard");
        router.refresh();
        return;
      }
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "No se pudo iniciar sesión");
    } catch {
      setError("Error de red. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center px-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm rounded-xl border border-border bg-surface p-8 shadow-sm"
      >
        <h1 className="text-lg">
          <Brand />
        </h1>
        <p className="mt-1 text-sm text-muted">Inicia sesión para continuar</p>

        <div className="mt-6 space-y-4">
          <label className="block">
            <span className="text-sm font-medium">Usuario</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
              className="mt-1 w-full rounded-lg border border-border bg-elevated px-3 py-2 text-sm outline-none focus:border-text"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium">Contraseña</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              className="mt-1 w-full rounded-lg border border-border bg-elevated px-3 py-2 text-sm outline-none focus:border-text"
            />
          </label>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-fg transition hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Entrando…" : "Entrar"}
          </button>
        </div>
      </form>
    </main>
  );
}
