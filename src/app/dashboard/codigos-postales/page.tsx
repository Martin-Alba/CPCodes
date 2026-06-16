import CodigoPostalExplorer from "@/components/CodigoPostalExplorer";

export default function CodigosPostalesPage() {
  return (
    <section>
      <h1 className="text-xl font-semibold">Códigos postales</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Busca un código postal para ver su zona dibujada en el mapa.
      </p>
      <div className="mt-4">
        <CodigoPostalExplorer />
      </div>
    </section>
  );
}
