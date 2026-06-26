"use client";

import { useEffect, useState } from "react";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import MapView from "@/components/map/MapView";

interface CoverageCp {
  code: string;
  municipio: string | null;
  provincia: string | null;
  geometry: Geometry | null;
  localities: string[];
}

// Zona de cobertura de un repartidor: mapa con todas las zonas de sus CP +
// las localidades que comprende cada CP (con el municipio como respaldo).
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

      {featureCollection && (
        <div className="mt-3 h-[55vh] overflow-hidden rounded-lg border border-border">
          <MapView geometry={featureCollection} />
        </div>
      )}

      {cps && cps.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-medium text-muted">Localidades por código postal</p>
          <ul className="mt-1 max-h-72 space-y-2 overflow-auto pr-1 text-sm">
            {cps.map((cp) => (
              <li key={cp.code}>
                <span className="font-medium">{cp.code}</span>
                {cp.municipio && <span className="text-muted"> · {cp.municipio}</span>}
                {cp.localities.length > 0 && (
                  <div className="text-xs text-muted">{cp.localities.join(", ")}</div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
