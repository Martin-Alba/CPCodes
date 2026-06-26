"use client";

import { useEffect, useState } from "react";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import MapView from "@/components/map/MapView";

interface CoverageCp {
  code: string;
  municipio: string | null;
  provincia: string | null;
  geometry: Geometry | null;
}

// Muestra la zona de cobertura de un repartidor: el mapa con todas las zonas
// de sus CP asignados + la lista de localidades que cubre.
export default function DriverCoverageMap({
  driverId,
  count,
}: {
  driverId: string;
  count: number;
}) {
  const [cps, setCps] = useState<CoverageCp[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (count === 0) {
      setCps([]);
      return;
    }
    let alive = true;
    setCps(null);
    setError(null);
    (async () => {
      try {
        const res = await fetch(`/api/drivers/${driverId}/coverage`, { cache: "no-store" });
        if (!res.ok) throw new Error();
        const data = (await res.json()) as { cps?: CoverageCp[] };
        if (alive) setCps(data.cps ?? []);
      } catch {
        if (alive) setError("No se pudo cargar la cobertura.");
      }
    })();
    return () => {
      alive = false;
    };
  }, [driverId, count]);

  if (count === 0) return null;

  const localities = cps
    ? [
        ...new Set(cps.map((c) => c.municipio).filter((m): m is string => Boolean(m))),
      ].sort((a, b) => a.localeCompare(b, "es"))
    : [];

  const features: Feature[] = (cps ?? [])
    .filter((c) => c.geometry)
    .map((c) => ({
      type: "Feature" as const,
      geometry: c.geometry as Geometry,
      properties: { code: c.code },
    }));
  const featureCollection: FeatureCollection | null =
    features.length > 0 ? { type: "FeatureCollection", features } : null;

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <h2 className="text-sm font-medium">Zona de cobertura</h2>

      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
      {!cps && !error && <p className="mt-2 text-sm text-muted">Cargando cobertura…</p>}

      {localities.length > 0 && (
        <p className="mt-2 text-sm">
          <span className="text-muted">Localidades ({localities.length}): </span>
          {localities.join(", ")}
        </p>
      )}

      {featureCollection && (
        <div className="mt-3 h-[55vh] overflow-hidden rounded-lg border border-border">
          <MapView geometry={featureCollection} />
        </div>
      )}

      {cps && cps.length > 0 && !featureCollection && localities.length === 0 && (
        <p className="mt-2 text-sm text-muted">
          Los CP asignados no tienen geometría ni municipio cargados.
        </p>
      )}
    </div>
  );
}
