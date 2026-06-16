"use client";

import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import * as L from "leaflet";
import type { GeoJsonObject } from "geojson";

interface LeafletMapProps {
  geometry?: GeoJsonObject | null;
  center?: [number, number];
  zoom?: number;
}

// Dibuja la geometría del CP de forma imperativa y encuadra el mapa a ella.
// Se hace así (y no con <GeoJSON>) para que se actualice y reencuadre al cambiar de CP.
function CpLayer({ geometry }: { geometry: GeoJsonObject | null }) {
  const map = useMap();
  useEffect(() => {
    if (!geometry) return;
    const layer = L.geoJSON(geometry, {
      style: { color: "#2563eb", weight: 2, fillColor: "#3b82f6", fillOpacity: 0.12 },
    }).addTo(map);
    const bounds = layer.getBounds();
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [20, 20] });
    }
    return () => {
      map.removeLayer(layer);
    };
  }, [geometry, map]);
  return null;
}

// Implementación concreta del mapa (proveedor: OpenStreetMap vía Leaflet).
// Siempre se usa a través de MapView para mantener la abstracción.
export default function LeafletMap({
  geometry = null,
  center = [40.4168, -3.7038], // Centro de España (Madrid)
  zoom = 6,
}: LeafletMapProps) {
  return (
    <MapContainer center={center} zoom={zoom} scrollWheelZoom className="h-full w-full">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <CpLayer geometry={geometry} />
    </MapContainer>
  );
}
