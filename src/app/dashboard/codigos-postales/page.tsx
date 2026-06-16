import CodigoPostalExplorer from "@/components/CodigoPostalExplorer";
import CpTabs from "@/components/CpTabs";

export default async function CodigosPostalesPage({
  searchParams,
}: {
  searchParams: Promise<{ cp?: string }>;
}) {
  const { cp } = await searchParams;

  return (
    <section>
      <h1 className="text-xl font-semibold">Códigos postales</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Busca por CP, municipio o provincia para ver la zona dibujada en el mapa.
      </p>

      <CpTabs active="mapa" />

      <div className="mt-4">
        <CodigoPostalExplorer initialCode={cp} />
      </div>
    </section>
  );
}
