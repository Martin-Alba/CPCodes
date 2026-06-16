import MapView from "@/components/map/MapView";

export default function CodigosPostalesPage() {
  return (
    <section>
      <h1 className="text-xl font-semibold">Códigos postales</h1>
      <p className="mt-1 text-sm text-neutral-500">
        El buscador de CP y el dibujo del polígono real de la zona llegan en la Fase 1.
        Aquí tienes el mapa base ya operativo.
      </p>
      <div className="mt-4 h-[70vh] overflow-hidden rounded-xl border border-neutral-200">
        <MapView />
      </div>
    </section>
  );
}
