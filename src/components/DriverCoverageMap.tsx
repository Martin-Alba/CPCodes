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

// Pone en mayúscula inicial cada palabra (respeta espacios, guiones y barras):
// "VIELLA-SIERO" → "Viella-Siero".
function titleCase(s: string): string {
  return s.toLowerCase().replace(/(^|[\s\-/])([a-zà-ÿñ])/g, (_, sep, ch) => sep + ch.toUpperCase());
}

// Las localidades vienen en mayúsculas con el concejo/parroquia entre paréntesis
// ("BALBONA (SIERO)"). Dejamos el nombre tal cual y ponemos el paréntesis en
// formato Título: "BALBONA (Siero)", "ESTACION (VIELLA-SIERO)" → "(Viella-Siero)".
function formatLocality(raw: string): string {
  return raw.replace(/\(([^)]+)\)/g, (_, inner: string) => `(${titleCase(inner)})`);
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
    // Sin zonas no hay nada que cargar y el componente no se renderiza.
    if (count === 0) return;
    let alive = true;
    // No vaciamos cps en cada refetch: mantenemos el mapa montado mientras
    // llega la nueva cobertura. Evita desmontar/re-montar Leaflet en cada
    // cambio (mejor en equipos de bajos recursos) y la race del unmount con
    // la animación del mapa. El único desmontaje queda en count===0.
    // Los setState van dentro del async (no síncronos en el efecto).
    (async () => {
      setError(null);
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
          <ul className="mt-1 max-h-72 space-y-1 overflow-auto pr-1">
            {cps.map((cp) => (
              <li key={cp.code}>
                {cp.localities.length > 0 ? (
                  <details className="group rounded-lg border border-border bg-elevated/40">
                    <summary className="flex cursor-pointer list-none items-center gap-1.5 px-3 py-2 text-sm select-none [&::-webkit-details-marker]:hidden">
                      <svg
                        className="h-3 w-3 shrink-0 text-muted transition-transform group-open:rotate-90"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                      <span className="font-medium">{cp.code}</span>
                      {cp.municipio && <span className="text-muted"> · {cp.municipio}</span>}
                      <span className="ml-auto text-xs text-muted">{cp.localities.length}</span>
                    </summary>
                    <ul className="list-disc space-y-0.5 border-t border-border py-2 pr-3 pl-9 text-xs text-muted marker:text-muted/50">
                      {cp.localities.map((loc) => (
                        <li key={loc}>{formatLocality(loc)}</li>
                      ))}
                    </ul>
                  </details>
                ) : (
                  <div className="rounded-lg border border-border bg-elevated/40 px-3 py-2 text-sm">
                    <span className="font-medium">{cp.code}</span>
                    {cp.municipio && <span className="text-muted"> · {cp.municipio}</span>}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
