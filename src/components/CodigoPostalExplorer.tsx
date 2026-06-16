"use client";

import { useState } from "react";
import type { GeoJsonObject } from "geojson";
import MapView from "@/components/map/MapView";

interface CpData {
  code: string;
  municipio: string | null;
  provincia: string | null;
  geometry: GeoJsonObject | null;
}

export default function CodigoPostalExplorer() {
  const [code, setCode] = useState("");
  const [data, setData] = useState<CpData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^\d{5}$/.test(code)) {
      setError("Introduce un código postal de 5 dígitos.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/postal-codes/${code}`);
      if (res.ok) {
        setData((await res.json()) as CpData);
      } else if (res.status === 404) {
        setData(null);
        setError(`No se encontró el CP ${code}. ¿Has cargado los datos con "pnpm etl:cp"?`);
      } else {
        setData(null);
        setError("No se pudo buscar el código postal.");
      }
    } catch {
      setError("Error de red. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <form onSubmit={onSubmit} className="flex gap-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 5))}
          inputMode="numeric"
          placeholder="Ej. 28013"
          className="w-40 rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
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
      {data && (
        <p className="mt-2 text-sm text-neutral-600">
          <span className="font-medium">{data.code}</span>
          {data.municipio ? ` · ${data.municipio}` : ""}
          {data.provincia ? ` (${data.provincia})` : ""}
          {data.geometry ? "" : " · (sin geometría cargada)"}
        </p>
      )}

      <div className="mt-4 h-[65vh] overflow-hidden rounded-xl border border-neutral-200">
        <MapView geometry={data?.geometry ?? null} />
      </div>
    </div>
  );
}
