import Link from "next/link";
import { notFound } from "next/navigation";
import { getPool } from "@/lib/db";
import { verifySession } from "@/lib/dal";
import { AppNav } from "@/components/AppNav";
import { Chip, CompanyAvatar, salaryLine } from "@/components/ui";
import { ApplyWidget } from "@/components/ApplyWidget";
import { CoverLetterWidget } from "@/components/CoverLetterWidget";
import { implicitIntereses, scoreOferta } from "@/lib/match";
import type { Oferta } from "@/lib/supabase";

export default async function OfertaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await verifySession();
  const { id } = await params;
  const num = parseInt(id, 10);
  if (!Number.isFinite(num)) notFound();

  const pool = getPool();
  if (!pool) notFound();
  const r = await pool.query("SELECT * FROM ofertas WHERE id = $1", [num]);
  const o = r.rows[0] as Oferta | undefined;
  if (!o) notFound();

  const app = await pool.query("SELECT status FROM applications WHERE user_id = $1 AND oferta_id = $2", [
    session.userId,
    num,
  ]);
  const appStatus: string | null = app.rows[0]?.status ?? null;

  const tags = (o.tags ?? "").split(",").filter(Boolean);

  // compatibilidad con el perfil del usuario (capa asistente)
  const prof = await pool.query("SELECT titulo, skills FROM profiles WHERE user_id = $1", [session.userId]);
  const profSkills = String(prof.rows[0]?.skills || "").split(",").filter(Boolean);
  let compat: { score: number; shared: string[]; missing: string[] } | null = null;
  if (profSkills.length) {
    const uu = await pool.query("SELECT intereses FROM users WHERE id = $1", [session.userId]);
    const explicit = String(uu.rows[0]?.intereses || "").split(",").filter(Boolean);
    const sample = explicit.length
      ? null
      : await pool.query("SELECT categoria, titulo, descripcion FROM ofertas ORDER BY id DESC LIMIT 2000");
    const intereses = explicit.length ? explicit : implicitIntereses(sample?.rows ?? [], profSkills);
    const s = scoreOferta(o, { skills: profSkills, intereses, titulo: prof.rows[0]?.titulo || "" });
    compat = { score: s.score, shared: s.shared, missing: s.missing };
  }

  return (
    <main className="bg-scene-plain min-h-screen pb-24">
      <AppNav active="ofertas" />
      <div className="mx-auto max-w-5xl px-4 pt-6 sm:px-6">
        <Link href="/ofertas" className="text-sm font-bold text-stone-500 hover:text-[#0038a8]">
          ← todas las ofertas
        </Link>
        <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
          <article className="rounded-3xl border border-stone-200 bg-white p-7 shadow-sm sm:p-9">
            <div className="flex items-start gap-4">
              <CompanyAvatar name={o.empresa} size="lg" />
              <div className="min-w-0">
                <div className="flex flex-wrap gap-1.5">
                  <Chip tone="mint">{(o.categoria ?? "otros").replace(/_/g, " ")}</Chip>
                  {o.modalidad && <Chip tone="sky">{o.modalidad}</Chip>}
                  {o.seniority && <Chip tone="grape">{o.seniority}</Chip>}
                  {tags.filter((t) => t !== o.categoria && t !== o.modalidad && t !== o.seniority).map((t) => (
                    <Chip key={t} tone="amber">{t}</Chip>
                  ))}
                </div>
                <h1 className="mt-3 font-[var(--font-display)] text-2xl font-bold leading-tight sm:text-3xl">
                  {o.titulo || "(sin título)"}
                </h1>
                <p className="mt-2 font-medium text-stone-600">
                  {[o.empresa, o.ubicacion].filter(Boolean).join(" · ")}
                </p>
              </div>
            </div>
            {o.descripcion && (
              <>
                <h2 className="mt-8 text-xs font-bold uppercase tracking-widest text-stone-400">Descripción</h2>
                <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-stone-700">{o.descripcion}</p>
              </>
            )}
            {o.requisitos && (
              <>
                <h2 className="mt-8 text-xs font-bold uppercase tracking-widest text-stone-400">Requisitos</h2>
                <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-stone-700">{o.requisitos}</p>
              </>
            )}
          </article>
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-widest text-stone-400">Tu compatibilidad</p>
              {compat ? (
                <>
                  <p className="mt-1 font-[var(--font-display)] text-2xl font-bold text-[#0038a8]">{compat.score}%</p>
                  {!!compat.shared.length && (
                    <p className="mt-2 text-xs font-bold text-[#0a2156]">
                      ✓ Coincidís en {compat.shared.map((s) => s.replace(/_/g, " ")).join(" · ")}
                    </p>
                  )}
                  {!!compat.missing.length && (
                    <p className="mt-1.5 text-xs font-medium text-stone-500">
                      Te faltaría: {compat.missing.map((s) => s.replace(/_/g, " ")).join(" · ")}
                    </p>
                  )}
                  {!compat.shared.length && !compat.missing.length && (
                    <p className="mt-2 text-xs font-medium text-stone-500">Subí más detalle a tu CV para un análisis fino.</p>
                  )}
                </>
              ) : (
                <Link href="/perfil" className="mt-2 block text-sm font-bold text-[#0038a8] underline">
                  Subí tu CV y vemos si encajás →
                </Link>
              )}
            </div>
            <div className="mt-5 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-widest text-stone-400">Salario</p>
              <p className="mt-1 font-[var(--font-display)] text-2xl font-bold text-[#0038a8]">
                {salaryLine(o) || <span className="text-base font-bold text-stone-400">A convenir</span>}
              </p>
              <dl className="mt-5 space-y-3 text-sm">
                {[
                  ["Fuente", o.fuente],
                  ["Contrato", o.contrato],
                  ["Jornada", o.jornada],
                  ["Experiencia", o.experiencia_min === null || o.experiencia_min === undefined ? "" : o.experiencia_min === 0 ? "No requiere" : `${o.experiencia_min}+ años`],
                  ["Publicado", o.fecha_publicacion],
                ].filter(([, v]) => v).map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3 border-t border-stone-100 pt-3">
                    <dt className="text-stone-500">{k}</dt>
                    <dd className="text-right font-semibold text-[#0a2156]">{v}</dd>
                  </div>
                ))}
              </dl>
              <a href={o.url} target="_blank" rel="noopener noreferrer" className="btn-accent mt-6 block py-3 text-center">
                Postularme →
              </a>
              <p className="mt-2.5 text-center text-xs font-semibold text-stone-400">Te llevamos al aviso original</p>
              <div className="mt-4 border-t border-stone-100 pt-4">
                <ApplyWidget ofertaId={num} initialStatus={appStatus} />
              </div>
              <div className="mt-4 border-t border-stone-100 pt-4">
                <CoverLetterWidget ofertaId={num} />
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
