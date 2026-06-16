"use client";

import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import type { GeoJsonObject } from "geojson";

interface LeafletMapProps {
  geometry?: GeoJsonObject | null;
  center?: [number, number];
  zoom?: number;
}

// Capa de mapa concreta (proveedor: OpenStreetMap vía Leaflet).
// Se importa siempre a través de MapView para mantener la abstracción y poder
// cambiar de proveedor (Google/MapLibre) sin tocar el resto de la app.
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
      {geometry && (
        <GeoJSON
          data={geometry}
          style={{ color: "#2563eb", weight: 2, fillColor: "#3b82f6", fillOpacity: 0.12 }}
        />
      )}
    </MapContainer>
  );
}
