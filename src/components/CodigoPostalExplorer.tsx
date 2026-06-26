"use client";

import { useEffect, useState } from "react";
import type { GeoJsonObject } from "geojson";
import MapView from "@/components/map/MapView";

interface CpResult {
  code: string;
  municipio: string | null;
  provincia: string | null;
}
interface CpFull extends CpResult {
  geometry: GeoJsonObject | null;
}

export default function CodigoPostalExplorer({ initialCode }: { initialCode?: string }) {
  const [q, setQ] = useState(initialCode ?? "");
  const [results, setResults] = useState<CpResult[]>([]);
  const [selected, setSelected] = useState<CpFull | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingGeo, setLoadingGeo] = useState(false);

  async function onSearch(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResults([]);
    setSelected(null);
    const term = q.trim();
    if (term.length < 2) {
      setError("Escribe al menos 2 caracteres (un CP o una provincia).");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/postal-codes/search?q=${encodeURIComponent(term)}`);
      const data = (await res.json()) as { results?: CpResult[] };
      const list = data.results ?? [];
      setResults(list);
      if (list.length === 0) setError("Sin resultados.");
      else if (list.length === 1) await select(list[0]);
    } catch {
      setError("Error de red. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  async function select(r: CpResult) {
    setError(null);
    setLoadingGeo(true);
    try {
      const res = await fetch(`/api/postal-codes/${r.code}`);
      if (res.ok) setSelected((await res.json()) as CpFull);
      else setError("No se pudo cargar la geometría.");
    } catch {
      setError("Error de red. Inténtalo de nuevo.");
    } finally {
      setLoadingGeo(false);
    }
  }

  // Si llega un CP desde el listado (?cp=...), lo cargamos y dibujamos al entrar.
  useEffect(() => {
    if (initialCode && /^\d{5}$/.test(initialCode)) {
      void select({ code: initialCode, municipio: null, provincia: null });
    }
  }, [initialCode]);

  return (
    <div>
      <form onSubmit={onSearch} className="flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="CP o provincia (ej. 28013 o Madrid)"
          className="w-full max-w-xs rounded-lg border border-border bg-elevated px-3 py-2 text-sm outline-none focus:border-text"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-fg transition hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Buscando…" : "Buscar"}
        </button>
      </form>

      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}

      {results.length > 1 && (
        <ul className="mt-3 flex max-h-32 flex-wrap gap-2 overflow-auto">
          {results.map((r) => (
            <li key={r.code}>
              <button
                type="button"
                onClick={() => select(r)}
                className={`rounded-full border px-3 py-1 text-xs transition hover:bg-elevated ${
                  selected?.code === r.code ? "border-text" : "border-border"
                }`}
              >
                {r.code}
                {r.municipio ? ` · ${r.municipio}` : r.provincia ? ` · ${r.provincia}` : ""}
              </button>
            </li>
          ))}
        </ul>
      )}

      {selected && (
        <p className="mt-2 text-sm text-muted">
          <span className="font-medium text-text">{selected.code}</span>
          {selected.municipio ? ` · ${selected.municipio}` : ""}
          {selected.provincia ? ` (${selected.provincia})` : ""}
          {selected.geometry ? "" : " · (sin geometría)"}
        </p>
      )}

      <div className="relative mt-4 h-[60vh] overflow-hidden rounded-xl border border-border">
        {loadingGeo && (
          <div className="absolute inset-0 z-[1000] grid place-items-center bg-bg/70 text-sm text-muted">
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-text" />
              Cargando zona…
            </span>
          </div>
        )}
        <MapView geometry={selected?.geometry ?? null} />
      </div>
    </div>
  );
}
