"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { track } from "@/lib/track";
import { shrinkImage } from "@/lib/shrink";
import { catLabel } from "@/lib/format";
import { CATEGORIAS, DEPARTAMENTOS, ETAPAS, JORNADAS } from "@/lib/supabase";
import { InstallButton } from "@/components/Pwa";
import { IconArrow, IconCheck, IconPin, IconSearch, IconSparkle, IconUser } from "@/components/ui";

type Props = { nombre: string; intereses: string[]; departamento: string; etapa: string; jornada: string };
type Match = { id: number; titulo: string; empresa: string | null; score: number; detail: string };

const STEPS = ["Bienvenida", "Qué buscás", "Tu CV", "Swipe", "Postulaciones", "Matches", "Listo"];

/** Onboarding guiado: cada paso explica una parte y, cuando puede, la deja configurada. */
export default function OnboardingWizard({ nombre, intereses: int0, departamento: dep0, etapa: et0, jornada: jo0 }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [total, setTotal] = useState<number | null>(null);
  const [intereses, setIntereses] = useState<string[]>(int0);
  const [departamento, setDepartamento] = useState(dep0);
  const [etapa, setEtapa] = useState(et0);
  const [jornada, setJornada] = useState(jo0);
  const [prefsSaved, setPrefsSaved] = useState(false);
  const [cv, setCv] = useState<{ titulo: string; skills: string[]; matches: number } | null>(null);
  const [practiced, setPracticed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    fetch("/api/public/stats").then((r) => r.json()).then((d) => setTotal(d.total ?? null)).catch(() => {});
    // si ya tenía CV, lo mostramos como hecho
    fetch("/api/perfil")
      .then((r) => r.json())
      .then((d) => {
        if (d.profile?.cv_text)
          setCv({ titulo: d.profile.titulo || "", skills: (d.profile.skills || "").split(",").filter(Boolean), matches: d.matches ?? 0 });
      })
      .catch(() => {});
  }, []);

  function go(n: number) {
    const s = Math.max(0, Math.min(STEPS.length - 1, n));
    setErr("");
    setStep(s);
    track("onboarding_step", { step: s, name: STEPS[s] });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function savePrefs() {
    setBusy(true);
    const fd = new FormData();
    fd.set("intereses", intereses.join(","));
    fd.set("departamento", departamento);
    fd.set("etapa", etapa);
    fd.set("jornada", jornada);
    const r = await fetch("/api/perfil", { method: "POST", body: fd }).catch(() => null);
    setBusy(false);
    if (!r?.ok) return setErr("No pudimos guardar tus preferencias. Probá de nuevo.");
    setPrefsSaved(true);
    go(step + 1);
  }

  const next: { label: string; action: () => void; disabled?: boolean } =
    step === 0 ? { label: "Empezar →", action: () => go(1) }
    : step === 1 ? { label: busy ? "Guardando…" : "Guardar y seguir →", action: savePrefs, disabled: busy }
    : step === 2 ? { label: cv ? "Seguir →" : "Lo subo después →", action: () => go(3) }
    : step === STEPS.length - 1 ? { label: "Ver mis ofertas →", action: () => { track("onboarding_done", {}); router.push("/ofertas"); } }
    : { label: "Seguir →", action: () => go(step + 1) };

  return (
    <div className="mx-auto max-w-2xl px-4 pb-10 pt-6 sm:px-6">
      {/* Progreso */}
      <div className="flex items-center justify-between text-xs font-bold">
        <span className="text-[#0038a8]">Paso {step + 1} de {STEPS.length} · {STEPS[step]}</span>
        {step < STEPS.length - 1 && (
          <Link href="/ofertas" onClick={() => track("onboarding_skip", { step })} className="text-stone-400 hover:text-stone-600">
            Saltar guía
          </Link>
        )}
      </div>
      <div className="mt-2 flex gap-1" aria-hidden="true">
        {STEPS.map((s, i) => (
          <button key={s} onClick={() => i < step && go(i)} tabIndex={-1}
            className={`h-1.5 flex-1 rounded-full transition-colors duration-500 ${i <= step ? "bg-[#0038a8]" : "bg-[#e7e5e4]"} ${i < step ? "cursor-pointer" : "cursor-default"}`} />
        ))}
      </div>

      <section key={step} className="onb-in card mt-5 overflow-hidden p-6 sm:p-8" aria-live="polite">
        {step === 0 && <Welcome nombre={nombre} total={total} />}
        {step === 1 && (
          <Prefs intereses={intereses} setIntereses={setIntereses} departamento={departamento} setDepartamento={setDepartamento}
            etapa={etapa} setEtapa={setEtapa} jornada={jornada} setJornada={setJornada} />
        )}
        {step === 2 && <CvStep cv={cv} setCv={setCv} />}
        {step === 3 && <SwipeDemo onDone={() => setPracticed(true)} />}
        {step === 4 && <BoardDemo />}
        {step === 5 && <MatchesStep hasCv={!!cv} goCv={() => go(2)} />}
        {step === 6 && <Done prefs={prefsSaved || intereses.length > 0} cv={!!cv} practiced={practiced} goCv={() => go(2)} />}
        {err && <p role="alert" className="notice notice-error mt-4 text-sm font-semibold">{err}</p>}
      </section>

      <div className="mt-5 flex items-center justify-between gap-3">
        <button onClick={() => go(step - 1)} disabled={step === 0}
          className="btn-ghost px-4 py-2.5 text-sm disabled:invisible">
          ← Atrás
        </button>
        <button onClick={next.action} disabled={next.disabled} className="btn-accent px-6 py-3 text-sm">
          {next.label}
        </button>
      </div>
    </div>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-bold uppercase tracking-widest text-[#0038a8]">{children}</p>;
}

function H({ children }: { children: React.ReactNode }) {
  return <h1 className="mt-2 font-[var(--font-display)] text-2xl font-bold leading-tight sm:text-3xl">{children}</h1>;
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <p className="notice mt-5 gap-2 text-sm font-medium">
      <span className="mt-0.5 shrink-0 text-[#0038a8]"><IconSparkle /></span>
      <span>{children}</span>
    </p>
  );
}

function Bullets({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="mt-4 space-y-2 text-sm leading-6 text-stone-700">
      {items.map((it, i) => (
        <li key={i} className="flex gap-2.5">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#0038a8]" aria-hidden="true" />
          <span>{it}</span>
        </li>
      ))}
    </ul>
  );
}

function IconBox({ children, tone = "blue" }: { children: React.ReactNode; tone?: "blue" | "green" }) {
  return (
    <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${tone === "green" ? "bg-green-100 text-green-700" : "bg-[#0038a8]/10 text-[#0038a8]"}`}>
      {children}
    </span>
  );
}

/* ── 1. Bienvenida ─────────────────────────────────────────── */
function Welcome({ nombre, total }: { nombre: string; total: number | null }) {
  const items: [React.ReactNode, string, string][] = [
    [<IconSearch key="s" />, "Todo en un lugar", "Juntamos las ofertas de Computrabajo, BuscoJobs, LinkedIn e Indeed, sin repetidos y actualizadas cada mañana."],
    [<IconSparkle key="m" />, "Ordenadas para vos", "Con tu CV calculamos cuánto encajás con cada oferta y te mostramos primero las mejores."],
    [<IconCheck key="c" />, "Todo bajo control", "Guardá, postulate y seguí cada búsqueda en un tablero, con alertas cuando aparece algo para vos."],
  ];
  return (
    <>
      <Eyebrow>Bienvenida</Eyebrow>
      <H>¡Hola, {nombre}! Te armamos tu búsqueda en 2 minutos</H>
      <p className="mt-3 text-sm font-medium leading-6 text-stone-600">
        {total ? <><strong className="text-[#0a2156]">{total.toLocaleString("es-UY")} ofertas activas</strong> en Uruguay te esperan. </> : null}
        En esta guía configuramos lo que buscás y te mostramos cómo sacarle el jugo a cada parte de Trabajogpt.
      </p>
      <ul className="mt-6 space-y-3">
        {items.map(([icon, t, d], i) => (
          <li key={t} className="onb-in flex gap-3 rounded-xl bg-[#faf9f7] p-4" style={{ animationDelay: `${150 + i * 120}ms` }}>
            <IconBox>{icon}</IconBox>
            <div>
              <p className="text-sm font-bold">{t}</p>
              <p className="mt-0.5 text-sm leading-6 text-stone-600">{d}</p>
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-5 text-xs font-semibold text-stone-400">Podés volver a esta guía cuando quieras desde «Cómo funciona».</p>
    </>
  );
}

/* ── 2. Preferencias ───────────────────────────────────────── */
function Choice({ options, value, onChange }: { options: [string, string][]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="mt-2 grid gap-2 sm:grid-cols-3">
      {options.map(([v, l]) => (
        <button key={l} type="button" onClick={() => onChange(v)} aria-pressed={value === v}
          className={`rounded-xl border px-3 py-2.5 text-left text-sm font-bold transition ${
            value === v ? "border-[#0038a8] bg-[#eff6ff] text-[#0038a8]" : "border-stone-200 bg-white text-stone-600 hover:border-[#0038a8]"
          }`}>
          {value === v ? "✓ " : ""}{l}
        </button>
      ))}
    </div>
  );
}

function Prefs(p: {
  intereses: string[]; setIntereses: (v: string[]) => void; departamento: string; setDepartamento: (v: string) => void;
  etapa: string; setEtapa: (v: string) => void; jornada: string; setJornada: (v: string) => void;
}) {
  const toggle = (c: string) =>
    p.setIntereses(p.intereses.includes(c) ? p.intereses.filter((x) => x !== c) : [...p.intereses, c].slice(0, 10));
  return (
    <>
      <Eyebrow>Qué buscás</Eyebrow>
      <H>Contanos qué tipo de trabajo te interesa</H>
      <p className="mt-3 text-sm font-medium leading-6 text-stone-600">
        Usamos esto para ordenar las ofertas y elegir qué alertas mandarte. Podés cambiarlo cuando quieras en Mi perfil.
      </p>
      <p className="mt-6 text-sm font-bold">¿En qué momento estás?</p>
      <Choice options={ETAPAS} value={p.etapa} onChange={p.setEtapa} />
      <p className="mt-6 text-sm font-bold">¿Qué jornada buscás?</p>
      <Choice options={JORNADAS} value={p.jornada} onChange={p.setJornada} />
      <p className="mt-6 text-sm font-bold">Rubros <span className="font-medium text-stone-400">· elegí todos los que quieras</span></p>
      <div className="mt-2 flex flex-wrap gap-2">
        {CATEGORIAS.filter((c) => c !== "otros").map((c) => {
          const on = p.intereses.includes(c);
          return (
            <button key={c} type="button" onClick={() => toggle(c)} aria-pressed={on}
              className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                on ? "border-[#0038a8] bg-[#0038a8] text-white" : "border-stone-200 bg-white text-stone-600 hover:border-[#0038a8] hover:text-[#0038a8]"
              }`}>
              {on ? "✓ " : ""}{catLabel(c)}
            </button>
          );
        })}
      </div>
      <label htmlFor="onb-dep" className="mt-6 block text-sm font-bold">¿Dónde vivís?</label>
      <select id="onb-dep" value={p.departamento} onChange={(e) => p.setDepartamento(e.target.value)} className="field mt-2 max-w-xs">
        <option value="">Prefiero no decir</option>
        {DEPARTAMENTOS.map((d) => <option key={d} value={d}>{d}</option>)}
      </select>
      <Tip>Si estás estudiando, te mostramos primero pasantías y avisos sin experiencia; si buscás part time, esos van arriba. Si no elegís rubros, los deducimos de tu CV.</Tip>
    </>
  );
}

/* ── 3. CV ─────────────────────────────────────────────────── */
function CvStep({ cv, setCv }: { cv: { titulo: string; skills: string[]; matches: number } | null; setCv: (v: { titulo: string; skills: string[]; matches: number }) => void }) {
  const [state, setState] = useState<"idle" | "reading" | "error">("idle");
  const [msg, setMsg] = useState("");
  const [over, setOver] = useState(false);

  async function upload(f0: File | undefined) {
    if (!f0) return;
    if (!/\.(pdf|png|jpe?g)$/i.test(f0.name)) return (setState("error"), setMsg("Ese formato no lo leemos. Subí un PDF, PNG o JPG."));
    setState("reading");
    const f = await shrinkImage(f0);
    if (f.size > 6 * 1024 * 1024) return (setState("error"), setMsg("El archivo pesa más de 6 MB. Probá con un PDF más liviano."));
    setState("reading");
    const fd = new FormData();
    fd.set("cv", f);
    const r = await fetch("/api/perfil", { method: "POST", body: fd }).catch(() => null);
    const d = await r?.json().catch(() => ({}));
    if (!r?.ok) return (setState("error"), setMsg(d?.error ?? "No pudimos leer el archivo."));
    track("cv_uploaded", { from: "onboarding" });
    const m = await fetch("/api/perfil").then((x) => x.json()).catch(() => ({}));
    setCv({ titulo: d.profile?.titulo || "", skills: d.skills ?? [], matches: m.matches ?? 0 });
    setState("idle");
  }

  return (
    <>
      <Eyebrow>Tu CV · el paso que más rinde</Eyebrow>
      <H>{cv ? "¡Listo! Ya leímos tu CV" : "Subí tu CV y nosotros hacemos el resto"}</H>
      {!cv && (
        <p className="mt-3 text-sm font-medium leading-6 text-stone-600">
          Lo leemos automáticamente para detectar tus habilidades y experiencia. Con eso calculamos tu % de coincidencia
          con cada oferta y te avisamos de las nuevas que encajan.
        </p>
      )}
      {cv ? (
        <div className="mt-5 space-y-4">
          {cv.matches > 0 && (
            <p className="flex items-center gap-3 rounded-xl bg-green-50 p-4 text-sm font-bold text-green-800">
              <IconBox tone="green"><IconCheck /></IconBox>
              {cv.matches.toLocaleString("es-UY")} ofertas encajan con tu perfil. Te las mostramos en un ratito.
            </p>
          )}
          {cv.skills.length > 0 && (
            <div>
              <p className="text-sm font-bold">Habilidades que detectamos</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {cv.skills.slice(0, 18).map((s) => (
                  <span key={s} className="rounded-md bg-[#eff6ff] px-2 py-1 text-xs font-semibold text-[#0038a8]">{s}</span>
                ))}
              </div>
            </div>
          )}
          <p className="text-sm text-stone-600">
            ¿Falta algo o querés sumar tu título y experiencia? Lo podés completar después en{" "}
            <Link href="/perfil" className="font-bold text-[#0038a8] hover:underline">Mi perfil</Link>.
          </p>
        </div>
      ) : (
        <label
          onDragOver={(e) => { e.preventDefault(); setOver(true); }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => { e.preventDefault(); setOver(false); upload(e.dataTransfer.files?.[0]); }}
          className={`mt-6 flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed p-8 text-center transition ${
            over ? "border-[#0038a8] bg-[#eff6ff]" : "border-stone-300 bg-[#faf9f7] hover:border-[#0038a8]"
          }`}>
          {state === "reading" ? (
            <>
              <span className="h-8 w-8 animate-spin rounded-full border-4 border-[#0038a8]/20 border-t-[#0038a8]" aria-hidden="true" />
              <span className="text-sm font-bold">Leyendo tu CV…</span>
              <span className="text-xs font-medium text-stone-500">Si es una foto puede tardar unos segundos más.</span>
            </>
          ) : (
            <>
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#0038a8]/10 text-[#0038a8] [&_svg]:-rotate-90"><IconArrow /></span>
              <span className="text-sm font-bold">Arrastrá tu CV acá o tocá para elegirlo</span>
              <span className="text-xs font-medium text-stone-500">PDF, PNG o JPG · hasta 6 MB · una foto del papel también sirve</span>
            </>
          )}
          <input type="file" accept=".pdf,.png,.jpg,.jpeg" className="sr-only" disabled={state === "reading"}
            onChange={(e) => upload(e.target.files?.[0])} />
        </label>
      )}
      {state === "error" && <p role="alert" className="notice notice-error mt-3 text-sm font-semibold">{msg}</p>}
      {!cv && <Tip>¿Tu CV está en papel? Sacale una foto con el celular: también la leemos.</Tip>}
    </>
  );
}

/* ── 4. Swipe (práctica) ───────────────────────────────────── */
const DEMO = [
  { titulo: "Vendedor/a de salón", empresa: "Tienda de ejemplo", zona: "Montevideo", match: 82 },
  { titulo: "Administrativo/a contable", empresa: "Estudio de ejemplo", zona: "Canelones", match: 64 },
  { titulo: "Desarrollador/a Frontend", empresa: "Software de ejemplo", zona: "Remoto", match: 91 },
];

function SwipeDemo({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(0);
  const [dx, setDx] = useState(0);
  const [leaving, setLeaving] = useState<"l" | "r" | null>(null);
  const [feedback, setFeedback] = useState("");
  const [dragging, setDragging] = useState(false);
  const start = useRef<number | null>(null);

  function act(save: boolean) {
    if (leaving || i >= DEMO.length) return;
    setLeaving(save ? "r" : "l");
    setFeedback(save ? "✓ Guardada. En la app, va directo a tu tablero de Postulaciones." : "Pasaste. En la app, no te la volvemos a mostrar.");
    setTimeout(() => {
      setLeaving(null);
      setDx(0);
      setI((n) => {
        if (n + 1 >= DEMO.length) onDone();
        return n + 1;
      });
    }, 280);
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") act(true);
      if (e.key === "ArrowLeft") act(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const card = DEMO[i];
  const x = leaving === "r" ? 400 : leaving === "l" ? -400 : dx;
  return (
    <>
      <Eyebrow>Cómo encontrar ofertas</Eyebrow>
      <H>Probá el modo Swipe</H>
      <p className="mt-3 text-sm font-medium leading-6 text-stone-600">
        En <strong>Ofertas</strong> tenés dos vistas: <strong>Lista</strong> para comparar con filtros (rubro, zona, modalidad, nivel)
        y <strong>Swipe</strong> para decidir rápido, una oferta a la vez. Practicá acá con estas 3 de ejemplo:
      </p>
      <div className="mt-5 grid grid-cols-2 gap-2 text-center text-xs font-bold">
        <span className="rounded-lg bg-red-50 py-2 text-red-700">← Deslizá a la izquierda: paso</span>
        <span className="rounded-lg bg-green-50 py-2 text-green-700">Deslizá a la derecha: guardar →</span>
      </div>
      <div className="relative mx-auto mt-5 h-52 max-w-sm select-none">
        {card ? (
          <div
            onPointerDown={(e) => { start.current = e.clientX; setDragging(true); (e.target as HTMLElement).setPointerCapture?.(e.pointerId); }}
            onPointerMove={(e) => start.current !== null && setDx(e.clientX - start.current)}
            onPointerCancel={() => { start.current = null; setDragging(false); setDx(0); }}
            onPointerUp={() => { start.current = null; setDragging(false); if (Math.abs(dx) > 80) act(dx > 0); else setDx(0); }}
            style={{ transform: `translateX(${x}px) rotate(${x / 18}deg)`, transition: dragging ? "none" : "transform 280ms ease", opacity: leaving ? 0 : 1 }}
            className="absolute inset-0 flex cursor-grab touch-pan-y flex-col justify-between rounded-2xl bg-[#0a2156] p-5 text-white shadow-lg active:cursor-grabbing">
            <div className="flex items-start justify-between gap-2">
              <span className="rounded-md bg-white/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">Práctica {i + 1}/3</span>
              <span className="rounded-md bg-[#fcd116] px-2 py-0.5 text-xs font-bold text-[#0a2156]">{card.match}% match</span>
            </div>
            <div>
              <p className="text-xl font-bold">{card.titulo}</p>
              <p className="mt-1 text-sm text-white/75">{card.empresa} · {card.zona}</p>
            </div>
            {Math.abs(dx) > 30 && (
              <span className={`absolute top-1/2 text-3xl font-bold ${dx > 0 ? "left-5 text-green-300" : "right-5 text-red-300"}`}>
                {dx > 0 ? "GUARDAR" : "PASO"}
              </span>
            )}
          </div>
        ) : (
          <div className="onb-in absolute inset-0 grid place-items-center rounded-2xl bg-green-50 p-6 text-center">
            <div>
              <span className="mx-auto block w-fit"><IconBox tone="green"><IconCheck /></IconBox></span>
              <p className="mt-2 font-bold text-green-800">¡Ya sabés usar el Swipe!</p>
              <button onClick={() => setI(0)} className="mt-2 text-xs font-bold text-green-700 underline">Repetir práctica</button>
            </div>
          </div>
        )}
      </div>
      {card && (
        <div className="mt-4 flex justify-center gap-3">
          <button onClick={() => act(false)} className="btn-ghost px-5 py-2.5 text-sm">✕ Paso</button>
          <button onClick={() => act(true)} className="btn-primary px-5 py-2.5 text-sm">♥ Guardar</button>
        </div>
      )}
      <p className="mt-3 min-h-5 text-center text-sm font-semibold text-[#0038a8]">{feedback}</p>
      <Tip>Tocá la tarjeta para ver el aviso completo. En la compu usá las flechas ← → y la Z para deshacer.</Tip>
    </>
  );
}

/* ── 5. Tablero ────────────────────────────────────────────── */
const STAGES = [
  ["Guardadas", "bg-stone-400", "Lo que te interesó en el Swipe o en la lista. Tu lista de pendientes."],
  ["Postulado", "bg-[#0038a8]", "Ya mandaste tu CV. Desde cada aviso podés generar una carta de presentación con IA."],
  ["Respuesta", "bg-amber-500", "La empresa te contestó. Anotá qué te dijeron para no olvidarlo."],
  ["Entrevista", "bg-[#fcd116]", "Tenés una entrevista agendada o ya la hiciste. Dejá notas de cómo te fue."],
  ["¡Oferta!", "bg-green-600", "Te ofrecieron el puesto. ¡Felicitaciones!"],
] as const;

function BoardDemo() {
  const [at, setAt] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setAt((n) => (n + 1) % STAGES.length), 1800);
    return () => clearInterval(t);
  }, []);
  return (
    <>
      <Eyebrow>Postulaciones</Eyebrow>
      <H>Seguí cada búsqueda de principio a fin</H>
      <p className="mt-3 text-sm font-medium leading-6 text-stone-600">
        Todo lo que guardás va a un tablero con etapas. Movés la tarjeta a medida que avanza, así siempre sabés dónde estás parado.
      </p>
      <ol className="mt-6 flex flex-wrap items-center gap-x-1 gap-y-2">
        {STAGES.map(([name, dot], i) => (
          <li key={name} className="flex items-center gap-1">
            <button onClick={() => setAt(i)} aria-pressed={i === at}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition duration-300 ${
                i === at ? "scale-105 border-[#0038a8] bg-[#0038a8] text-white" : i < at ? "border-[#bfdbfe] bg-[#eff6ff] text-[#0038a8]" : "border-[#e7e5e4] bg-white text-stone-500"
              }`}>
              <span className={`h-2 w-2 rounded-full ${dot}`} />
              {name}
            </button>
            {i < STAGES.length - 1 && <span className="text-stone-300" aria-hidden="true">→</span>}
          </li>
        ))}
      </ol>
      <p key={at} className="onb-in mt-4 rounded-xl bg-[#faf9f7] p-4 text-sm leading-6">
        <strong>{STAGES[at][0]}:</strong> {STAGES[at][2]}
      </p>
      <Bullets items={[
        <><strong>Arrastrá</strong> la tarjeta entre columnas, o abrila y elegí la etapa.</>,
        <>Si una postulación pasa <strong>7 días sin moverse</strong>, la marcamos como «quieta» para que hagas seguimiento.</>,
        <>Con <strong>Exportar CSV</strong> te llevás todo a una planilla.</>,
      ]} />
      <Tip>Si una postulación quedó quieta, un mensaje corto a RRHH suele reactivarla.</Tip>
    </>
  );
}

/* ── 6. Matches ────────────────────────────────────────────── */
function MatchesStep({ hasCv, goCv }: { hasCv: boolean; goCv: () => void }) {
  const [top, setTop] = useState<Match[] | null>(null);
  useEffect(() => {
    if (!hasCv) return;
    fetch("/api/notificaciones").then((r) => r.json()).then((d) => setTop((d.top ?? []).slice(0, 3))).catch(() => setTop([]));
  }, [hasCv]);
  return (
    <>
      <Eyebrow>Matches</Eyebrow>
      <H>Las ofertas que encajan con vos, sin buscarlas</H>
      <Bullets items={[
        <><strong>Mejores matches ahora:</strong> se calculan en vivo con todas las ofertas activas.</>,
        <><strong>Alertas diarias:</strong> cada mañana te dejamos las nuevas con buen match. El número amarillo en «Matches» te avisa cuántas hay.</>,
        <>Cada match te dice <strong>por qué encaja</strong> y qué te falta.</>,
      ]} />
      {hasCv ? (
        <div className="mt-5">
          <p className="text-sm font-bold">Tus 3 mejores matches de hoy</p>
          {top === null ? (
            <div className="mt-2 space-y-2">{[0, 1, 2].map((k) => <div key={k} className="h-14 animate-pulse rounded-xl bg-[#f5f5f4]" />)}</div>
          ) : top.length ? (
            <div className="mt-2 space-y-2">
              {top.map((m, k) => (
                <a key={m.id} href={`/oferta/${m.id}`} target="_blank" rel="noopener"
                  className="onb-in flex items-center gap-3 rounded-xl border border-[#e7e5e4] p-3 transition hover:border-[#bfdbfe]"
                  style={{ animationDelay: `${k * 120}ms` }}>
                  <span className="grid h-10 w-12 shrink-0 place-items-center rounded-lg bg-[#fcd116] text-sm font-bold text-[#0a2156]">{m.score}%</span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold">{m.titulo}</span>
                    <span className="block truncate text-xs text-stone-500">{[m.empresa, m.detail].filter(Boolean).join(" · ")}</span>
                  </span>
                </a>
              ))}
            </div>
          ) : (
            <p className="notice mt-2 text-sm">Todavía no hay matches fuertes. A medida que entran ofertas nuevas te avisamos.</p>
          )}
        </div>
      ) : (
        <div className="mt-5 rounded-xl border border-dashed border-stone-300 p-5 text-center">
          <p className="text-sm font-bold">Sin CV no podemos calcular tus matches</p>
          <button onClick={goCv} className="btn-primary mt-3 px-4 py-2 text-sm">Subir mi CV ahora</button>
        </div>
      )}
      <Tip>Cuanto más usás el Swipe, mejor aprendemos qué te gusta y más finos se vuelven tus matches.</Tip>
    </>
  );
}

/* ── 7. Listo ──────────────────────────────────────────────── */
function Done({ prefs, cv, practiced, goCv }: { prefs: boolean; cv: boolean; practiced: boolean; goCv: () => void }) {
  const checks: [string, boolean][] = [
    ["Elegiste qué buscás", prefs],
    ["Subiste tu CV", cv],
    ["Practicaste el Swipe", practiced],
  ];
  return (
    <>
      <Eyebrow>Todo listo</Eyebrow>
      <H>¡Ya estás para encontrar tu próximo trabajo!</H>
      <ul className="mt-5 space-y-2">
        {checks.map(([t, ok]) => (
          <li key={t} className={`flex items-center gap-3 rounded-xl p-3 text-sm font-bold ${ok ? "bg-green-50 text-green-800" : "bg-[#faf9f7] text-stone-500"}`}>
            <span className={`grid h-6 w-6 place-items-center rounded-full text-xs ${ok ? "bg-green-600 text-white" : "bg-white ring-1 ring-stone-300"}`}>{ok ? "✓" : ""}</span>
            {t}
            {!ok && t === "Subiste tu CV" && (
              <button onClick={goCv} className="ml-auto text-xs font-bold text-[#0038a8] underline">Subirlo</button>
            )}
          </li>
        ))}
      </ul>
      <p className="mt-6 text-sm font-bold">Tu rutina recomendada</p>
      <ol className="mt-2 space-y-1.5 text-sm leading-6 text-stone-700">
        <li>1. Cada mañana mirá <strong>Matches</strong>: ahí están las nuevas para vos.</li>
        <li>2. Hacé un <strong>Swipe</strong> rápido y guardá lo que te guste.</li>
        <li>3. Postulate con una <strong>carta con IA</strong> y movelo en tu tablero.</li>
      </ol>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Link href="/mapa" className="rounded-xl border border-[#e7e5e4] p-4 text-sm transition hover:border-[#bfdbfe]">
          <strong className="flex items-center gap-2 text-[#0038a8]"><IconPin /> Mapa</strong>
          <span className="mt-1 block text-stone-600">Mirá dónde hay más trabajo por departamento.</span>
        </Link>
        <Link href="/referidos" className="rounded-xl border border-[#e7e5e4] p-4 text-sm transition hover:border-[#bfdbfe]">
          <strong className="flex items-center gap-2 text-[#0038a8]"><IconUser /> Invitar</strong>
          <span className="mt-1 block text-stone-600">Compartí tu link con amigos que también buscan.</span>
        </Link>
      </div>
      <div className="mt-5 [&_button]:w-full">
        <InstallButton />
      </div>
    </>
  );
}
