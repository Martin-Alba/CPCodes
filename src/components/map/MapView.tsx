"use client";

import dynamic from "next/dynamic";
import type { GeoJsonObject } from "geojson";

// Leaflet necesita `window`, así que cargamos el mapa solo en el cliente (ssr: false).
const LeafletMap = dynamic(() => import("./LeafletMap"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full w-full place-items-center text-sm text-neutral-500">
      Cargando mapa…
    </div>
  ),
});

export interface MapViewProps {
  geometry?: GeoJsonObject | null;
  center?: [number, number];
  zoom?: number;
}

export default function MapView(props: MapViewProps) {
  return <LeafletMap {...props} />;
}
