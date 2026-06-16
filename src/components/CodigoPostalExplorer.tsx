"use client";

import { useState } from "react";
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

export default function CodigoPostalExplorer() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<CpResult[]>([]);
  const [selected, setSelected] = useState<CpFull | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSearch(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResults([]);
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
    try {
      const res = await fetch(`/api/postal-codes/${r.code}`);
      if (res.ok) setSelected((await res.json()) as CpFull);
      else setError("No se pudo cargar la geometría.");
    } catch {
      setError("Error de red. Inténtalo de nuevo.");
    }
  }

  return (
    <div>
      <form onSubmit={onSearch} className="flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="CP o provincia (ej. 28013 o Madrid)"
          className="w-72 rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:opacity-50"
        >
          {loading ? "Buscando…" : "Buscar"}
        </button>
      </form>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {results.length > 1 && (
        <ul className="mt-3 flex max-h-32 flex-wrap gap-2 overflow-auto">
          {results.map((r) => (
            <li key={r.code}>
              <button
                type="button"
                onClick={() => select(r)}
                className={`rounded-full border px-3 py-1 text-xs transition hover:bg-neutral-50 ${
                  selected?.code === r.code ? "border-neutral-900" : "border-neutral-200"
                }`}
              >
                {r.code}
                {r.provincia ? ` · ${r.provincia}` : ""}
              </button>
            </li>
          ))}
        </ul>
      )}

      {selected && (
        <p className="mt-2 text-sm text-neutral-600">
          <span className="font-medium">{selected.code}</span>
          {selected.municipio ? ` · ${selected.municipio}` : ""}
          {selected.provincia ? ` (${selected.provincia})` : ""}
          {selected.geometry ? "" : " · (sin geometría)"}
        </p>
      )}

      <div className="mt-4 h-[60vh] overflow-hidden rounded-xl border border-neutral-200">
        <MapView geometry={selected?.geometry ?? null} />
      </div>
    </div>
  );
}
