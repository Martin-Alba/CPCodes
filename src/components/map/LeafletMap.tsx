"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import * as L from "leaflet";
import type { Feature, GeoJsonObject } from "geojson";

interface LeafletMapProps {
  geometry?: GeoJsonObject | null;
  // Código del CP a enfocar/resaltar (al pulsar una localidad). null = ver todo.
  focusCode?: string | null;
  center?: [number, number];
  zoom?: number;
}

const cpStyle = (active: boolean): L.PathOptions => ({
  color: "#2563eb",
  weight: active ? 3 : 2,
  fillColor: "#3b82f6",
  fillOpacity: active ? 0.3 : 0.12,
});

type CodedLayer = L.Path & { feature?: Feature };

// Dibuja las zonas de los CP y encuadra: a todas, o a la del CP enfocado.
// Imperativo (y no <GeoJSON>) para poder reencuadrar y resaltar al cambiar.
function CpLayer({
  geometry,
  focusCode,
}: {
  geometry: GeoJsonObject | null;
  focusCode?: string | null;
}) {
  const map = useMap();
  const layerRef = useRef<L.GeoJSON | null>(null);

  useEffect(() => {
    if (!geometry) return;
    const layer = L.geoJSON(geometry, { style: () => cpStyle(false) }).addTo(map);
    layerRef.current = layer;
    return () => {
      map.removeLayer(layer);
      layerRef.current = null;
    };
  }, [geometry, map]);

  // Encuadra a la zona del CP enfocado (resaltándola) o a todas si no hay foco.
  // animate:false a propósito: si el mapa se desmonta con una animación viva
  // (p. ej. al quitar la última zona) rompe con "_leaflet_pos".
  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    let target: CodedLayer | null = null;
    layer.eachLayer((l) => {
      const cl = l as CodedLayer;
      const code = cl.feature?.properties?.code as string | undefined;
      const active = !!focusCode && code === focusCode;
      cl.setStyle(cpStyle(active));
      if (active) target = cl;
    });
    const bounds = target ? (target as L.Polygon).getBounds() : layer.getBounds();
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: target ? [30, 30] : [20, 20], animate: false });
    }
  }, [focusCode, geometry, map]);

  return null;
}

// Implementación concreta del mapa (proveedor: OpenStreetMap vía Leaflet).
// Siempre se usa a través de MapView para mantener la abstracción.
export default function LeafletMap({
  geometry = null,
  focusCode = null,
  center = [40.4168, -3.7038], // Centro de España (Madrid)
  zoom = 6,
}: LeafletMapProps) {
  return (
    <MapContainer center={center} zoom={zoom} scrollWheelZoom className="h-full w-full">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <CpLayer geometry={geometry} focusCode={focusCode} />
    </MapContainer>
  );
}
