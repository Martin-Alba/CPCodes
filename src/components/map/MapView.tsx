"use client";

import dynamic from "next/dynamic";
import type { GeoJsonObject } from "geojson";

// Leaflet necesita `window`, así que cargamos el mapa solo en el cliente (ssr: false).
const LeafletMap = dynamic(() => import("./LeafletMap"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full w-full place-items-center text-sm text-muted">
      Cargando mapa…
    </div>
  ),
});

export interface MapViewProps {
  geometry?: GeoJsonObject | null;
  focusCode?: string | null;
  // Cambia en cada pulsación para forzar el reencuadre (ver DriverCoverageMap).
  focusKey?: number;
  center?: [number, number];
  zoom?: number;
}

export default function MapView(props: MapViewProps) {
  return <LeafletMap {...props} />;
}
