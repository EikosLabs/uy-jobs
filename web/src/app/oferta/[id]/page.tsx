import Link from "next/link";
import { notFound } from "next/navigation";
import { getPool } from "@/lib/db";
import { verifySession } from "@/lib/dal";
import { AppNav } from "@/components/AppNav";
import { Chip, CompanyAvatar } from "@/components/ui";
import { ApplyWidget } from "@/components/ApplyWidget";
import { CoverLetterWidget } from "@/components/CoverLetterWidget";
import { implicitIntereses, scoreOferta } from "@/lib/match";
import type { Oferta } from "@/lib/supabase";
import { catLabel, fuenteLabel, modalidadLabel, salaryLine, seniorityLabel, tagLabel, ubicacionLabel } from "@/lib/format";

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
        <div className="mt-4 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
          <article className="card p-6 sm:p-9">
            <div className="flex items-start gap-4">
              <CompanyAvatar name={o.empresa} size="lg" />
              <div className="min-w-0">
                <div className="flex flex-wrap gap-1.5">
                  <Chip tone="mint">{catLabel(o.categoria)}</Chip>
                  {o.modalidad && <Chip tone="sky">{modalidadLabel(o.modalidad)}</Chip>}
                  {o.seniority && <Chip tone="grape">{seniorityLabel(o.seniority)}</Chip>}
                  {tags.filter((t) => t !== o.categoria && t !== o.modalidad && t !== o.seniority).map((t) => (
                    <Chip key={t} tone="amber">{tagLabel(t)}</Chip>
                  ))}
                </div>
                <h1 className="mt-3 font-[var(--font-display)] text-2xl font-bold leading-tight sm:text-3xl">
                  {o.titulo || "(sin título)"}
                </h1>
                <p className="mt-2 font-medium text-stone-600">
                  {[o.empresa, ubicacionLabel(o.ubicacion)].filter(Boolean).join(" · ")}
                </p>
              </div>
            </div>
            {o.descripcion && (
              <>
                <h2 className="mt-8 text-xs font-bold uppercase tracking-widest text-stone-400">Descripción</h2>
                <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-stone-700">{o.descripcion}</p>
              </>
            )}
            <dl className="mt-7 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-[#e7e5e4] bg-[#e7e5e4] text-sm sm:grid-cols-4">
              {[
                ["Modalidad", o.modalidad ? modalidadLabel(o.modalidad) : "Presencial"],
                ["Nivel", o.seniority ? seniorityLabel(o.seniority) : "Sin especificar"],
                ["Zona", o.departamento || ubicacionLabel(o.ubicacion) || "Uruguay"],
                ["Fuente", fuenteLabel(o.fuente)],
              ].map(([k, v]) => (
                <div key={k} className="bg-white px-3.5 py-3">
                  <dt className="text-[11px] font-bold uppercase tracking-wider text-[#a8a29e]">{k}</dt>
                  <dd className="mt-0.5 truncate font-semibold text-[#1c1917]">{v}</dd>
                </div>
              ))}
            </dl>
            {!o.descripcion && !o.requisitos && (
              <div className="mt-8 rounded-2xl border border-dashed border-stone-300 bg-[#faf9f7] p-6">
                <p className="text-sm font-bold text-[#0a2156]">
                  {fuenteLabel(o.fuente)} no comparte la descripción completa de este aviso.
                </p>
                <p className="mt-1.5 text-sm leading-6 text-stone-600">
                  Te mostramos lo que pudimos leer: puesto, empresa, zona y rubro. Los requisitos y
                  el detalle están en el aviso original.
                </p>
                <a href={o.url} target="_blank" rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-[#0038a8] hover:underline">
                  Leer el aviso completo en {fuenteLabel(o.fuente)} →
                </a>
              </div>
            )}
            {o.requisitos && (
              <>
                <h2 className="mt-8 text-xs font-bold uppercase tracking-widest text-stone-400">Requisitos</h2>
                <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-stone-700">{o.requisitos}</p>
              </>
            )}
          </article>
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="card p-6">
              <p className="text-xs font-bold uppercase tracking-widest text-stone-400">Tu compatibilidad</p>
              {compat ? (
                <>
                  <div className="mt-2 flex items-center gap-3">
                    <p className="tnum text-3xl font-bold text-[#0038a8]">{compat.score}%</p>
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-[#eff6ff]">
                      <span className="block h-full rounded-full bg-[#0038a8]" style={{ width: `${Math.min(100, compat.score)}%` }} />
                    </span>
                  </div>
                  {!!compat.shared.length && (
                    <p className="mt-2 text-xs font-bold text-[#0a2156]">
                      Coincidís en {compat.shared.map(tagLabel).join(" · ")}
                    </p>
                  )}
                  {!!compat.missing.length && (
                    <p className="mt-1.5 text-xs font-medium text-stone-500">
                      Te faltaría: {compat.missing.map(tagLabel).join(" · ")}
                    </p>
                  )}
                  {!compat.shared.length && !compat.missing.length && (
                    <p className="mt-2 text-xs font-medium text-stone-500">Subí más detalle a tu CV para un análisis fino.</p>
                  )}
                </>
              ) : (
                <>
                  <p className="mt-1.5 text-sm leading-6 text-stone-600">Subí tu CV y te decimos qué tanto encajás con este puesto y qué te faltaría.</p>
                  <Link href="/perfil" className="btn-ghost mt-3 w-full py-2 text-sm">
                    Subir mi CV
                  </Link>
                </>
              )}
            </div>
            <div className="mt-5 card p-6">
              <p className="text-xs font-bold uppercase tracking-widest text-stone-400">Salario</p>
              <p className="mt-1 font-[var(--font-display)] text-2xl font-bold text-[#0038a8]">
                {salaryLine(o) || <span className="text-base font-bold text-stone-400">A convenir</span>}
              </p>
              <dl className="mt-5 space-y-3 text-sm">
                {[
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
              <a href={o.url} target="_blank" rel="noopener noreferrer" className="btn-accent mt-6 w-full py-3">
                Postularme en {fuenteLabel(o.fuente)} ↗
              </a>
              <p className="mt-2 text-center text-xs font-semibold text-stone-400">Se abre el aviso original en otra pestaña</p>
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
