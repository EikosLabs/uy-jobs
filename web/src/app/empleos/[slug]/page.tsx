import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPool } from "@/lib/db";
import { Logo } from "@/components/ui";
import { DEPTOS_BY_SLUG } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const depto = DEPTOS_BY_SLUG[slug];
  if (!depto) return {};
  return {
    title: `Empleos en ${depto} · Ofertas actualizadas | Trabajogpt`,
    description: `Ofertas de trabajo en ${depto}, Uruguay: reunidas de Computrabajo, BuscoJobs, LinkedIn e Indeed, actualizadas a diario. Creá tu cuenta gratis.`,
  };
}

export default async function EmpleosDepto({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const depto = DEPTOS_BY_SLUG[slug];
  if (!depto) notFound();
  const pool = getPool();
  let total = 0;
  let rows: { id: number; titulo: string | null; empresa: string | null; ubicacion: string | null; categoria: string | null; modalidad: string | null; fuente: string }[] = [];
  let topCats: { categoria: string; n: number }[] = [];
  let topEmp: { empresa: string; n: number }[] = [];
  if (pool) {
    total = (await pool.query("SELECT count(*)::int AS n FROM ofertas WHERE departamento = $1", [depto])).rows[0]?.n ?? 0;
    rows = (
      await pool.query(
        "SELECT id, titulo, empresa, ubicacion, categoria, modalidad, fuente FROM ofertas WHERE departamento = $1 ORDER BY fecha_scrapeo DESC NULLS LAST, id DESC LIMIT 12",
        [depto]
      )
    ).rows;
    topCats = (
      await pool.query("SELECT categoria, count(*)::int AS n FROM ofertas WHERE departamento = $1 GROUP BY 1 ORDER BY 2 DESC LIMIT 5", [depto])
    ).rows;
    topEmp = (
      await pool.query(
        "SELECT empresa, count(*)::int AS n FROM ofertas WHERE departamento = $1 AND empresa IS NOT NULL AND empresa <> '' GROUP BY 1 ORDER BY 2 DESC LIMIT 5",
        [depto]
      )
    ).rows;
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Empleos en ${depto}`,
    numberOfItems: total,
    itemListElement: rows.slice(0, 10).map((o, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "JobPosting",
        title: o.titulo ?? "Oferta de empleo",
        hiringOrganization: { "@type": "Organization", name: o.empresa ?? "Empresa" },
        jobLocation: { "@type": "Place", address: { "@type": "PostalAddress", addressRegion: depto, addressCountry: "UY" } },
      },
    })),
  };

  return (
    <main className="bg-scene-plain min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5 sm:px-6">
        <Logo />
        <div className="flex gap-2 text-sm font-bold">
          <Link href="/login" className="rounded-xl border border-stone-200 bg-white px-4 py-2 hover:bg-stone-50">Entrar</Link>
          <Link href="/register" className="rounded-xl bg-[#0038a8] px-4 py-2 text-white hover:bg-[#2f6fed]">Crear cuenta</Link>
        </div>
      </nav>
      <div className="mx-auto max-w-5xl px-4 pb-20 sm:px-6">
        <p className="text-xs font-bold uppercase tracking-widest text-[#0038a8]">
          <Link href="/mapa" className="hover:underline">Uruguay</Link> / {depto}
        </p>
        <h1 className="mt-2 font-[var(--font-display)] text-4xl font-bold sm:text-5xl">
          Empleos en {depto}
        </h1>
        <p className="mt-3 max-w-2xl text-stone-600">
          Hay <strong>{total.toLocaleString("es-UY")} ofertas activas en {depto}</strong>, reunidas de
          Computrabajo, BuscoJobs, LinkedIn e Indeed y actualizadas a diario. Creá tu cuenta gratis
          para filtrar por rubro, modalidad y nivel, y recibir avisos de las que encajan con tu CV.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/register" className="rounded-xl bg-[#0a2156] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#0038a8]">
            Ver todas y filtrar →
          </Link>
          <Link href="/mapa" className="rounded-xl border border-stone-200 bg-white px-5 py-2.5 text-sm font-bold hover:bg-stone-50">
            Ver mapa
          </Link>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {rows.map((o) => (
            <article key={o.id} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap gap-1.5 text-xs font-bold">
                <span className="rounded-full bg-[#dbeafe] px-2.5 py-0.5 text-[#0038a8]">{(o.categoria ?? "otros").replace(/_/g, " ")}</span>
                {o.modalidad && <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-stone-600">{o.modalidad}</span>}
                <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-stone-500">{o.fuente}</span>
              </div>
              <h2 className="mt-2 font-[var(--font-display)] font-bold">{o.titulo || "(sin título)"}</h2>
              <p className="mt-1 text-sm font-medium text-stone-500">{[o.empresa, o.ubicacion].filter(Boolean).join(" · ")}</p>
            </article>
          ))}
          {rows.length === 0 && (
            <p className="rounded-2xl border border-stone-200 bg-white p-6 text-sm font-medium text-stone-500">
              Todavía no hay avisos ubicados en {depto}. Probá con <Link href="/ofertas" className="font-bold text-[#0038a8]">todas las ofertas</Link>.
            </p>
          )}
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <h2 className="text-xs font-bold uppercase tracking-widest text-stone-400">Rubros top en {depto}</h2>
            <ul className="mt-2 space-y-1.5 text-sm font-bold">
              {topCats.map((t) => (
                <li key={t.categoria} className="flex justify-between">
                  <span className="capitalize">{(t.categoria || "otros").replace(/_/g, " ")}</span>
                  <span className="text-stone-400">{t.n}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <h2 className="text-xs font-bold uppercase tracking-widest text-stone-400">Empresas que más publican</h2>
            <ul className="mt-2 space-y-1.5 text-sm font-bold">
              {topEmp.map((t) => (
                <li key={t.empresa} className="flex justify-between">
                  <span>{t.empresa}</span>
                  <span className="text-stone-400">{t.n}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}
