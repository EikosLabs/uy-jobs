"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { track } from "@/lib/track";

type Profile = { cv_text: string; titulo: string; skills: string; experiencia: string };
type Gap = { skill: string; n: number };
type Suggested = { categoria: string; n: number };

export default function PerfilClient() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [matches, setMatches] = useState(0);
  const [intereses, setIntereses] = useState("");
  const [gaps, setGaps] = useState<Gap[]>([]);
  const [suggested, setSuggested] = useState<Suggested[]>([]);
  const [skills, setSkills] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    fetch("/api/perfil")
      .then((r) => r.json())
      .then((d) => {
        if (d.profile) {
          setProfile(d.profile);
          setSkills((d.profile.skills || "").split(",").filter(Boolean));
        }
        setMatches(d.matches ?? 0);
        setGaps(d.gaps ?? []);
        setSuggested(d.suggested ?? []);
        setIntereses(((d.intereses as string[]) ?? []).join(", "));
      })
      .finally(() => setLoading(false));
  }, []);

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    const fd = new FormData(e.currentTarget);
    if (file) fd.set("cv", file);
    const r = await fetch("/api/perfil", { method: "POST", body: fd });
    const d = await r.json();
    setSaving(false);
    if (!r.ok) {
      setMsg(d.error ?? "Error al guardar.");
      return;
    }
    if (file) track("cv_uploaded", {});
    setProfile(d.profile);
    setSkills(d.skills ?? []);
    setFile(null);
    const m = await fetch("/api/perfil").then((x) => x.json());
    setMatches(m.matches ?? 0);
    setGaps(m.gaps ?? []);
    setSuggested(m.suggested ?? []);
    setMsg(`Perfil guardado. ${m.matches ?? 0} ofertas hacen match con vos.`);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6">
      <div className="mt-6 rounded-3xl border border-stone-200 bg-white p-8 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-widest text-[#0038a8]">Tu perfil profesional</p>
          <h1 className="mt-2 font-[var(--font-display)] text-3xl font-bold">Mi CV y mis matches</h1>
          <p className="mt-2 text-sm font-medium text-stone-600">
            Subí tu CV (PDF o foto). Lo leemos con OCR, armamos tu perfil y te avisamos de ofertas que encajan.
          </p>
          {matches > 0 && (
            <Link href="/notificaciones" className="mt-4 block rounded-2xl border-2 border-[#0a2156] bg-[#fcd116] px-4 py-3 text-center font-bold">
              Tenés {matches} ofertas con buen match →
            </Link>
          )}
          {(suggested.length > 0 || gaps.length > 0) && (
            <div className="mt-4 rounded-2xl border border-[#e7e5e4] bg-[#f6f9ff] p-5">
              <p className="text-xs font-bold uppercase tracking-widest text-[#0038a8]">Tu radiografía</p>
              {suggested.length > 0 && (
                <>
                  <p className="mt-2 text-sm font-bold">Tus rubros más fuertes</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {suggested.map((s) => (
                      <span key={s.categoria} className="rounded-full bg-[#0a2156] px-3 py-1 text-xs font-bold text-white">
                        {s.categoria.replace(/_/g, " ")} · {s.n}
                      </span>
                    ))}
                  </div>
                </>
              )}
              {gaps.length > 0 && (
                <>
                  <p className="mt-3 text-sm font-bold">Para destacar más, te conviene sumar</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {gaps.map((g) => (
                      <span key={g.skill} title={`Aparece en ${g.n} avisos de tus rubros`}
                        className="rounded-full border border-[#0038a8]/30 bg-white px-3 py-1 text-xs font-bold text-[#0038a8]">
                        {g.skill.replace(/_/g, " ")} · {g.n}
                      </span>
                    ))}
                  </div>
                  <p className="mt-2 text-xs font-medium text-stone-500">Habilidades pedidas en avisos de tus rubros que no figuran en tu CV.</p>
                </>
              )}
              <Link href="/ofertas" className="mt-3 inline-block text-sm font-bold text-[#0038a8] underline">
                Ver mis ofertas →
              </Link>
            </div>
          )}
          {loading ? (
            <p className="mt-6 text-sm font-medium text-stone-500">Cargando…</p>
          ) : (
            <form onSubmit={save} className="mt-6 space-y-4">
              <div>
                <label className="text-sm font-bold">Archivo del CV (PDF, PNG o JPG · máx 6 MB)</label>
                <label className="field mt-1.5 flex cursor-pointer items-center gap-3 !py-3">
                  <span className="shrink-0 rounded-lg bg-[#0a2156] px-3 py-1.5 text-xs font-bold text-white">
                    Elegir archivo
                  </span>
                  <span className="truncate text-sm font-medium text-stone-500">
                    {file ? file.name : "Ningún archivo seleccionado"}
                  </span>
                  <input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    className="sr-only" />
                </label>
                {profile?.cv_text && !file && (
                  <p className="mt-1.5 text-xs font-medium text-stone-500">Ya hay un CV cargado. Subí otro para reemplazarlo.</p>
                )}
              </div>
              <div>
                <label className="text-sm font-bold">Título profesional</label>
                <input name="titulo" defaultValue={profile?.titulo ?? ""} placeholder="Ej: Vendedora / Desarrollador Python"
                  className="field mt-1.5" />
              </div>
              <div>
                <label className="text-sm font-bold">Rubros que me interesan (separados por coma)</label>
                <input name="intereses" value={intereses} onChange={(e) => setIntereses(e.target.value)}
                  placeholder="Ej: ventas, tecnologia, administracion" className="field mt-1.5" />
              </div>
              <div>
                <label className="text-sm font-bold">Habilidades (separadas por coma)</label>
                <input name="skills" defaultValue={skills.join(", ")} placeholder="Se detectan solas del CV"
                  className="field mt-1.5" />
              </div>
              <div>
                <label className="text-sm font-bold">Experiencia (resumen)</label>
                <textarea name="experiencia" rows={4} defaultValue={profile?.experiencia ?? ""}
                  placeholder="Contanos en 2-3 líneas tu experiencia" className="field mt-1.5" />
              </div>
              {skills.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {skills.map((s) => (
                    <span key={s} className="rounded-full border-2 border-[#0a2156] bg-[#dbeafe] px-2.5 py-0.5 text-xs font-bold text-[#0038a8]">
                      {s}
                    </span>
                  ))}
                </div>
              )}
              {msg && <p className="rounded-xl border-2 border-[#0a2156] bg-[#f6f9ff] px-3 py-2.5 text-sm font-bold">{msg}</p>}
              <button disabled={saving} type="submit" className="btn-accent w-full py-3">
                {saving ? "Leyendo CV…" : "Guardar perfil"}
              </button>
            </form>
          )}
        </div>
      </div>
  );
}
