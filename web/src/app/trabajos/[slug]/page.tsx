import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPool } from "@/lib/db";

import { CATS_BY_SLUG } from "@/lib/seo";
import { fuenteLabel, modalidadLabel, ubicacionLabel } from "@/lib/format";
import { SiteFooter } from "@/components/ui";
import { AppNav } from "@/components/AppNav";

const PRETTY: Record<string, string> = {
  tecnologia: "tecnología",
  administracion: "administración",
  logistica: "logística",
  atencion_cliente: "atención al cliente",
  hoteleria_turismo: "hotelería y turismo",
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const cat = CATS_BY_SLUG[slug];
  if (!cat) return {};
  const pretty = PRETTY[cat] ?? cat.replace(/_/g, " ");
  return {
    title: `Trabajos de ${pretty} en Uruguay | Trabajogpt`,
    description: `Ofertas de ${pretty} en Uruguay reunidas de Computrabajo, BuscoJobs, LinkedIn e Indeed, actualizadas a diario. Filtrá por departamento y nivel gratis.`,
  };
}

export default async function TrabajosCat({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const cat = CATS_BY_SLUG[slug];
  if (!cat) notFound();
  const pretty = PRETTY[cat] ?? cat.replace(/_/g, " ");
  const pool = getPool();
  let total = 0;
  let rows: { id: number; titulo: string | null; empresa: string | null; ubicacion: string | null; departamento: string | null; modalidad: string | null; fuente: string }[] = [];
  let topDeptos: { departamento: string; n: number }[] = [];
  if (pool) {
    total = (await pool.query("SELECT count(*)::int AS n FROM ofertas WHERE categoria = $1", [cat])).rows[0]?.n ?? 0;
    rows = (
      await pool.query(
        "SELECT id, titulo, empresa, ubicacion, departamento, modalidad, fuente FROM ofertas WHERE categoria = $1 ORDER BY fecha_scrapeo DESC NULLS LAST, id DESC LIMIT 12",
        [cat]
      )
    ).rows;
    topDeptos = (
      await pool.query(
        "SELECT departamento, count(*)::int AS n FROM ofertas WHERE categoria = $1 AND departamento <> '' GROUP BY 1 ORDER BY 2 DESC LIMIT 6",
        [cat]
      )
    ).rows;
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Trabajos de ${pretty} en Uruguay`,
    numberOfItems: total,
    itemListElement: rows.slice(0, 10).map((o, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "JobPosting",
        title: o.titulo ?? "Oferta de empleo",
        hiringOrganization: { "@type": "Organization", name: o.empresa ?? "Empresa" },
        jobLocation: { "@type": "Place", address: { "@type": "PostalAddress", addressCountry: "UY" } },
      },
    })),
  };

  return (
    <main className="bg-scene-plain min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <AppNav />
      <div className="mx-auto max-w-5xl px-4 pb-20 pt-8 sm:px-6">
        <p className="text-xs font-bold uppercase tracking-widest text-[#0038a8]">
          <Link href="/ofertas" className="hover:underline">Ofertas</Link> / {pretty}
        </p>
        <h1 className="mt-2 font-[var(--font-display)] text-4xl font-bold capitalize sm:text-5xl">
          Trabajos de {pretty} en Uruguay
        </h1>
        <p className="mt-3 max-w-2xl text-stone-600">
          Hay <strong>{total.toLocaleString("es-UY")} ofertas de {pretty}</strong> activas, con
          descripciones, modalidad y salario cuando se publican. Registrate gratis para filtrar por
          departamento y nivel, y recibir avisos de las que encajan con tu CV.
        </p>
        <div className="mt-4">
          <Link href={`/register?next=${encodeURIComponent(`/ofertas?categoria=${cat}`)}`} className="btn-accent px-5 py-2.5 text-sm">
            Filtrar y recibir avisos →
          </Link>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {rows.map((o) => (
            <Link key={o.id} href={`/oferta/${o.id}`} className="card block p-5 transition hover:-translate-y-0.5 hover:border-[#bfdbfe] hover:shadow-[var(--shadow-lift)]">
              <div className="flex flex-wrap gap-1.5 text-xs font-bold">
                {o.modalidad && <span className="rounded-full bg-[#dbeafe] px-2.5 py-0.5 text-[#0038a8]">{modalidadLabel(o.modalidad)}</span>}
                {o.departamento && <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-stone-600">{o.departamento}</span>}
                <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-stone-500">{fuenteLabel(o.fuente)}</span>
              </div>
              <h2 className="mt-2 font-[var(--font-display)] font-bold">{o.titulo || "(sin título)"}</h2>
              <p className="mt-1 text-sm font-medium text-stone-500">{[o.empresa, ubicacionLabel(o.ubicacion)].filter(Boolean).join(" · ")}</p>
            </Link>
          ))}
        </div>

        {topDeptos.length > 0 && (
          <div className="mt-8 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <h2 className="text-xs font-bold uppercase tracking-widest text-stone-400">Dónde hay más trabajo de {pretty}</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {topDeptos.map((t) => (
                <Link key={t.departamento} href={`/empleos/${t.departamento.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-")}`}
                  className="rounded-full border border-stone-200 px-3 py-1.5 text-sm font-bold hover:border-[#0038a8] hover:text-[#0038a8]">
                  {t.departamento} · {t.n}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
      <SiteFooter />
    </main>
  );
}
