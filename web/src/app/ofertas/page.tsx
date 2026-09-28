import { verifySession } from "@/lib/dal";
import { AppNav } from "@/components/AppNav";
import OfertasApp, { type Filters } from "@/components/OfertasApp";

type Params = { [k: string]: string | string[] | undefined };

function str(p: Params, k: string): string {
  const v = p[k];
  return Array.isArray(v) ? (v[0] ?? "") : (v ?? "");
}

/** Shell SSR (auth + nav) + app CSR (filtros/búsqueda por fetch). */
export default async function Ofertas({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  await verifySession();
  const p = await searchParams;
  const initial: Filters = {
    q: str(p, "q").slice(0, 120),
    categoria: str(p, "categoria"),
    modalidad: str(p, "modalidad"),
    fuente: str(p, "fuente"),
    departamento: str(p, "departamento"),
    seniority: str(p, "seniority"),
    page: Math.max(1, parseInt(str(p, "page") || "1", 10) || 1),
  };
  return (
    <main className="bg-scene-plain min-h-screen">
      <AppNav active="ofertas" />
      <OfertasApp initial={initial} />
    </main>
  );
}
