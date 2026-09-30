"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { track } from "@/lib/track";
import { catLabel, tagLabel } from "@/lib/format";
import { CATEGORIAS } from "@/lib/supabase";

type Profile = { cv_text: string; titulo: string; skills: string; experiencia: string };
type Gap = { skill: string; n: number };
type Suggested = { categoria: string; n: number };

export default function PerfilClient() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [matches, setMatches] = useState(0);
  const [intereses, setIntereses] = useState<string[]>([]);
  const [gaps, setGaps] = useState<Gap[]>([]);
  const [suggested, setSuggested] = useState<Suggested[]>([]);
  const [skills, setSkills] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fileErr, setFileErr] = useState("");
  const [dragOver, setDragOver] = useState(false);

  function pick(f: File | null | undefined) {
    setFileErr("");
    if (!f) return;
    const okType = /\.(pdf|png|jpe?g)$/i.test(f.name);
    if (!okType) return setFileErr("Ese formato no lo leemos. Subí un PDF, PNG o JPG.");
    if (f.size > 6 * 1024 * 1024) return setFileErr("El archivo pesa más de 6 MB. Probá con un PDF más liviano.");
    setFile(f);
  }

  const checks: [string, boolean][] = [
    ["CV", !!profile?.cv_text],
    ["Título", !!profile?.titulo],
    ["Rubros", intereses.length > 0],
    ["Habilidades", skills.length > 0],
    ["Experiencia", !!profile?.experiencia],
  ];
  const pct = Math.round((checks.filter(([, v]) => v).length / checks.length) * 100);

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
        setIntereses((d.intereses as string[]) ?? []);
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
      <div className="card mt-6 p-6 sm:p-8">
          <p className="text-xs font-bold uppercase tracking-widest text-[#0038a8]">Tu perfil profesional</p>
          <h1 className="mt-2 font-[var(--font-display)] text-2xl font-bold sm:text-3xl">Mi CV y mis matches</h1>
          <p className="mt-2 text-sm font-medium text-stone-600">
            Con tu CV ordenamos las ofertas por cuánto encajás y te avisamos cada mañana de las nuevas.
          </p>
          {!loading && (
            <div className="mt-5 rounded-xl border border-[#e7e5e4] bg-[#faf9f7] p-4">
              <div className="flex items-center justify-between text-sm font-bold">
                <span>Perfil completo al {pct}%</span>
                <span className="text-xs font-semibold text-stone-500">{pct === 100 ? "¡Listo para los mejores matches!" : "Cuanto más completo, más preciso el match"}</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#e7e5e4]">
                <div className="h-full rounded-full bg-[#0038a8] transition-[width] duration-500" style={{ width: `${pct}%` }} />
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5 text-xs font-semibold">
                {checks.map(([k, v]) => (
                  <span key={k} className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 ${v ? "bg-green-50 text-green-700" : "bg-white text-stone-400 ring-1 ring-[#e7e5e4]"}`}>
                    {v ? "✓" : "○"} {k}
                  </span>
                ))}
              </div>
            </div>
          )}
          {matches > 0 && (
            <Link href="/notificaciones" className="notice mt-5 justify-between font-bold transition hover:border-[#93c5fd]">
              <span><span className="tnum mr-1.5 rounded-md bg-[#fcd116] px-1.5 py-0.5">{matches}</span> ofertas encajan con tu perfil</span>
              <span className="text-sm text-[#0038a8]">Verlas →</span>
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
                        {catLabel(s.categoria)} · {s.n}
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
                        {tagLabel(g.skill)} · {g.n}
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
                <span className="text-sm font-bold">Tu CV</span>
                <label
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => { e.preventDefault(); setDragOver(false); pick(e.dataTransfer.files?.[0]); }}
                  className={`mt-1.5 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-7 text-center transition has-focus-visible:outline-2 has-focus-visible:outline-[#0038a8] ${
                    dragOver ? "border-[#0038a8] bg-[#eff6ff]" : file ? "border-green-300 bg-green-50/50" : "border-stone-300 bg-[#faf9f7] hover:border-[#0038a8]"
                  }`}>
                  <span className={`grid h-11 w-11 place-items-center rounded-xl ${file ? "bg-green-100 text-green-700" : "bg-white text-[#0038a8] ring-1 ring-[#e7e5e4]"}`}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      {file ? <path d="M5 12l5 5L20 7" /> : <><path d="M12 16V4" /><path d="M7 9l5-5 5 5" /><path d="M4 16v3a1 1 0 001 1h14a1 1 0 001-1v-3" /></>}
                    </svg>
                  </span>
                  {file ? (
                    <>
                      <span className="max-w-full truncate text-sm font-bold text-[#1c1917]">{file.name}</span>
                      <span className="text-xs font-medium text-stone-500">{(file.size / 1024 / 1024).toFixed(1)} MB · tocá para cambiarlo · se lee al guardar</span>
                    </>
                  ) : (
                    <>
                      <span className="text-sm font-bold text-[#1c1917]">
                        {profile?.cv_text ? "Ya tenés un CV cargado. Soltá otro para reemplazarlo" : "Arrastrá tu CV acá o tocá para elegirlo"}
                      </span>
                      <span className="text-xs font-medium text-stone-500">PDF, PNG o JPG · hasta 6 MB · también sirve una foto</span>
                    </>
                  )}
                  <input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={(e) => pick(e.target.files?.[0])} className="sr-only" />
                </label>
                {fileErr && <p role="alert" className="notice notice-error mt-2 text-xs font-semibold">{fileErr}</p>}
              </div>
              <div>
                <label className="text-sm font-bold">Título profesional</label>
                <input name="titulo" defaultValue={profile?.titulo ?? ""} placeholder="Ej: Vendedora / Desarrollador Python"
                  className="field mt-1.5" />
              </div>
              <fieldset>
                <legend className="text-sm font-bold">Rubros que me interesan</legend>
                <input type="hidden" name="intereses" value={intereses.join(",")} />
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {CATEGORIAS.map((c) => {
                    const on = intereses.includes(c);
                    return (
                      <button key={c} type="button" aria-pressed={on}
                        onClick={() => setIntereses((prev) => (on ? prev.filter((x) => x !== c) : [...prev, c]))}
                        className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                          on ? "border-[#0038a8] bg-[#0038a8] text-white" : "border-stone-200 bg-white text-stone-600 hover:border-[#0038a8] hover:text-[#0038a8]"
                        }`}>
                        {catLabel(c)}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-1.5 text-xs font-medium text-stone-500">Si no elegís ninguno, los deducimos de tu CV.</p>
              </fieldset>
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
                    <span key={s} className="rounded-full border border-[#bfdbfe] bg-[#eff6ff] px-2.5 py-0.5 text-xs font-bold text-[#0038a8]">
                      {tagLabel(s)}
                    </span>
                  ))}
                </div>
              )}
              {msg && <p role="status" className="notice text-sm font-bold">{msg}</p>}
              <button disabled={saving} type="submit" className="btn-accent w-full py-3">
                {saving ? (file ? "Leyendo tu CV… puede tardar unos segundos" : "Guardando…") : file ? "Guardar y leer mi CV" : "Guardar perfil"}
              </button>
            </form>
          )}
        </div>
      </div>
  );
}
