"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CATEGORIAS, DEPARTAMENTOS, FUENTES, MODALIDADES, SENIORITIES, type Oferta } from "@/lib/supabase";
import { IconPin, IconSearch, IconSparkle, OfertaCard } from "@/components/ui";
import { SwipeMode } from "@/components/SwipeMode";
import { nearestDepartamento } from "@/lib/geo";
import { catLabel, fuenteLabel, modalidadLabel, seniorityLabel } from "@/lib/format";

type Facets = {
  counts: Record<string, number>;
  remotos: number;
  topCats: { categoria: string; n: number }[];
  unread: number;
  hasProfile: boolean;
};

type Resp = {
  orden?: "relevancia" | "recientes";
  total: number;
  page: number;
  pages: number;
  data: (Oferta & { match?: number; matchShared?: string[]; matchMissing?: string[]; matchReasons?: string[] })[];
  facets: Facets;
  error?: string;
  /** Filtros con los que se pidió esta respuesta (el mazo del swipe se rearma cuando cambian). */
  q?: string;
};

export type Filters = { q: string; categoria: string; modalidad: string; fuente: string; departamento: string; seniority: string; extra?: string; orden?: string; page: number };

const QUICK: [string, string][] = [
  ["part_time", "Part time"],
  ["estudiantes", "Para estudiantes"],
  ["sin_experiencia", "Sin experiencia"],
  ["con_salario", "Con salario"],
];

function qs(f: Filters) {
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  if (f.categoria) p.set("categoria", f.categoria);
  if (f.modalidad) p.set("modalidad", f.modalidad);
  if (f.fuente) p.set("fuente", f.fuente);
  if (f.departamento) p.set("departamento", f.departamento);
  if (f.seniority) p.set("seniority", f.seniority);
  if (f.extra) p.set("extra", f.extra);
  if (f.orden) p.set("orden", f.orden);
  if (f.page > 1) p.set("page", String(f.page));
  p.set("limit", "50");
  return p.toString();
}

export default function OfertasApp({
  initial,
}: {
  initial: Filters;
}) {
  const [f, setF] = useState<Filters>(initial);
  const [qDraft, setQDraft] = useState(initial.q);
  const [locMsg, setLocMsg] = useState("");
  const [nearDept, setNearDept] = useState(""); // departamento que puso «Cerca de mí»
  const [locating, setLocating] = useState(false);
  const [resp, setResp] = useState<Resp | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"lista" | "swipe">("lista");
  const [showFilters, setShowFilters] = useState(false);
  const activeFilters = [f.categoria, f.modalidad, f.fuente, f.departamento, f.seniority].filter(Boolean).length;
  const extras = (f.extra ?? "").split(",").filter(Boolean);
  const toggleExtra = (k: string) =>
    set({ extra: (extras.includes(k) ? extras.filter((x) => x !== k) : [...extras, k]).join(",") });

  // en celular arranca en swipe, formato principal móvil
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 640) setView("swipe");
  }, []);

  const load = useCallback(async (ff: Filters) => {
    setLoading(true);
    try {
      const r = await fetch(`/api/ofertas?${qs(ff)}`);
      const d = (await r.json()) as Resp;
      setResp(r.ok ? { ...d, q: qs(ff) } : { ...d, data: [], facets: { counts: {}, remotos: 0, topCats: [], unread: 0, hasProfile: false } });
    } catch {
      setResp({ total: 0, page: 1, pages: 1, data: [], facets: { counts: {}, remotos: 0, topCats: [], unread: 0, hasProfile: false }, error: "Error de red." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(f);
    const q = qs(f).replace(/&?limit=50/, "");
    window.history.replaceState(null, "", q ? `/ofertas?${q}` : "/ofertas");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f]);

  const set = (patch: Partial<Filters>) => setF((prev) => ({ ...prev, ...patch, page: patch.page ?? 1 }));

  function locate() {
    setLocMsg("");
    if (!navigator.geolocation) {
      setLocMsg("Tu navegador no soporta ubicación.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const n = nearestDepartamento(pos.coords.latitude, pos.coords.longitude);
        setLocating(false);
        setNearDept(n.departamento);
        set({ departamento: n.departamento });
      },
      () => {
        setLocating(false);
        setLocMsg("No pudimos obtener tu ubicación. Revisá el permiso de ubicación del navegador.");
      },
      { timeout: 10000, maximumAge: 10 * 60 * 1000 }
    );
  }

  // Accesos rápidos visibles siempre (lista y swipe), sin abrir Filtros
  const nearOn = !!f.departamento && f.departamento === nearDept;
  const chip = (on: boolean) =>
    `inline-flex shrink-0 items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-bold transition active:scale-95 ${
      on ? "border-[#0a2156] bg-[#0a2156] text-white" : "border-stone-200 bg-white text-stone-600 hover:border-stone-400"
    }`;
  const quick = (
    <>
      <button type="button" onClick={() => (nearOn ? (setNearDept(""), set({ departamento: "" })) : locate())}
        aria-pressed={nearOn} className={`${chip(nearOn)} [&_svg]:h-3.5 [&_svg]:w-3.5`}>
        <IconPin />
        {locating ? "Ubicando…" : nearOn ? <>Cerca: {nearDept} <span aria-hidden>✕</span></> : "Cerca de mí"}
      </button>
      <button type="button" onClick={() => set({ modalidad: f.modalidad === "remoto" ? "" : "remoto" })}
        aria-pressed={f.modalidad === "remoto"} className={chip(f.modalidad === "remoto")}>
        Remoto
      </button>
      {QUICK.map(([k, label]) => (
        <button key={k} type="button" onClick={() => toggleExtra(k)} aria-pressed={extras.includes(k)} className={chip(extras.includes(k))}>
          {label}
        </button>
      ))}
    </>
  );

  return (
    <>
      <section className="border-b border-[#e7e5e4] bg-white">
        <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              set({ q: qDraft });
            }}
            className="grid gap-2"
            role="search"
          >
            <div className="flex gap-2">
              <label className="relative min-w-0 flex-1">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400"><IconSearch /></span>
                <input
                  value={qDraft}
                  onChange={(e) => setQDraft(e.target.value)}
                  placeholder="Puesto, empresa o palabra clave…"
                  className="field w-full"
                  style={{ paddingLeft: "2.5rem" }}
                  aria-label="Buscar ofertas"
                  type="search"
                />
              </label>
              <button type="button" onClick={() => setShowFilters((v) => !v)} aria-expanded={showFilters}
                className="btn-ghost shrink-0 px-3 py-2 text-sm sm:hidden">
                Filtros{activeFilters ? ` · ${activeFilters}` : ""}
              </button>
              <button type="submit" className="btn-primary shrink-0 px-5 py-2 text-sm">
                Buscar
              </button>
            </div>
            <div className={`${showFilters ? "flex" : "hidden"} flex-wrap items-center gap-2 sm:flex`}>
            <select value={f.categoria} onChange={(e) => set({ categoria: e.target.value })} className="field field-auto" aria-label="Categoría">
              <option value="">Todas las categorías</option>
              {CATEGORIAS.map((c) => (
                <option key={c} value={c}>{catLabel(c)}</option>
              ))}
            </select>
            <select value={f.modalidad} onChange={(e) => set({ modalidad: e.target.value })} className="field field-auto" aria-label="Modalidad">
              <option value="">Toda modalidad</option>
              {MODALIDADES.map((m) => (
                <option key={m} value={m}>{modalidadLabel(m)}</option>
              ))}
            </select>
            <select value={f.fuente} onChange={(e) => set({ fuente: e.target.value })} className="field field-auto" aria-label="Fuente">
              <option value="">Toda fuente</option>
              {FUENTES.filter((ff) => (resp?.facets.counts[ff] ?? 0) > 0).map((ff) => (
                <option key={ff} value={ff}>{fuenteLabel(ff)}</option>
              ))}
            </select>
            <select value={f.seniority} onChange={(e) => set({ seniority: e.target.value })} className="field field-auto" aria-label="Nivel">
              <option value="">Todos los niveles</option>
              {SENIORITIES.map((sn) => (
                <option key={sn} value={sn}>{seniorityLabel(sn)}</option>
              ))}
            </select>
            <select value={f.departamento} onChange={(e) => set({ departamento: e.target.value })} className="field field-auto" aria-label="Departamento">
              <option value="">Todo el país</option>
              {DEPARTAMENTOS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            {(f.categoria || f.modalidad || f.fuente || f.departamento || f.seniority || f.extra || f.q) && (
              <button type="button" onClick={() => { setQDraft(""); setLocMsg(""); setNearDept(""); setF({ q: "", categoria: "", modalidad: "", fuente: "", departamento: "", seniority: "", extra: "", page: 1 }); }}
                className="shrink-0 rounded-xl px-2 py-2 text-sm font-bold text-stone-500 underline hover:text-[#0038a8]">
                Limpiar
              </button>
            )}
            </div>
          </form>
          {locMsg && <p className="mt-2 text-xs font-bold text-[#0038a8]" role="status">{locMsg}</p>}
        </div>
      </section>

      <div className="mx-auto max-w-6xl overflow-x-clip px-4 pb-24 sm:px-6">
        {resp && !resp.error && !resp.facets.hasProfile && (
          <div className={view === "swipe" ? "max-sm:hidden" : ""}>
          <Link href="/perfil" className="notice mt-4 transition hover:border-[#93c5fd] sm:mt-6">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#fcd116] text-[#0a2156]"><IconSparkle /></span>
            <span className="min-w-0 flex-1">
              <span className="block font-bold">Subí tu CV y ordenamos las ofertas por cuánto encajás</span>
              <span className="hidden text-sm font-medium text-[#0a2156]/70 sm:block">Te avisamos cuando aparece un buen match. Tarda 30 segundos.</span>
            </span>
            <span className="hidden shrink-0 text-sm font-bold text-[#0038a8] sm:block">Subir CV →</span>
          </Link>
          </div>
        )}
        <div className="flex items-center justify-between gap-2 pt-5 sm:pt-6">
          <h1 className="min-w-0 truncate font-[var(--font-display)] text-xl font-bold sm:text-2xl">
            {f.q || f.categoria || f.modalidad || f.fuente || f.departamento || f.seniority || f.extra ? "Resultados" : resp?.orden === "relevancia" ? "Para vos" : "Ofertas recientes"}
            <span className="ml-2 hidden text-base font-bold text-stone-400 min-[400px]:inline sm:inline">{resp ? `${resp.total.toLocaleString("es-UY")} avisos` : ""}</span>
          </h1>
          <div className="flex items-center gap-2">
          {resp?.facets.hasProfile && (
            <select value={f.orden || (resp?.orden ?? "relevancia")} onChange={(e) => set({ orden: e.target.value })}
              aria-label="Ordenar" className="hidden rounded-xl border border-stone-200 bg-white px-2.5 py-1.5 text-sm font-bold text-stone-600 sm:block">
              <option value="relevancia">Más afines primero</option>
              <option value="recientes">Más recientes primero</option>
            </select>
          )}
          <div className="flex rounded-xl border border-stone-200 bg-white p-0.5 text-sm font-bold" role="tablist" aria-label="Vista">
            <button role="tab" aria-selected={view === "lista"} onClick={() => setView("lista")}
              className={`rounded-lg px-3 py-1.5 ${view === "lista" ? "bg-[#0a2156] text-white" : "text-stone-500"}`}>
              Lista
            </button>
            <button role="tab" aria-selected={view === "swipe"} onClick={() => setView("swipe")}
              className={`rounded-lg px-3 py-1.5 ${view === "swipe" ? "bg-[#0a2156] text-white" : "text-stone-500"}`}>
              Swipe
            </button>
          </div>
          </div>
        </div>

        <div className={`scrollbar-none -mx-4 mt-3 gap-2 overflow-x-auto px-4 text-xs font-bold sm:mx-0 sm:flex sm:flex-wrap sm:px-0 ${view === "swipe" ? "hidden" : "flex"}`}>
          {quick}
          {FUENTES.filter((ff) => (resp?.facets.counts[ff] ?? 0) > 0).map((ff) => (
            <button key={ff} onClick={() => set({ fuente: f.fuente === ff ? "" : ff })}
              className={`shrink-0 rounded-full border px-3 py-1.5 transition ${f.fuente === ff ? "border-[#0a2156] bg-[#0a2156] text-white" : "border-stone-200 bg-white text-stone-600 hover:border-stone-400"}`}>
              {fuenteLabel(ff)} · {resp?.facets.counts[ff] ?? "…"}
            </button>
          ))}
        </div>

        {(resp?.facets.topCats.length ?? 0) > 0 && (
          <div className={`scrollbar-none -mx-4 mt-2 gap-2 overflow-x-auto px-4 text-xs font-bold sm:mx-0 sm:flex sm:flex-wrap sm:px-0 ${view === "swipe" ? "hidden" : "flex"}`}>
            {(resp?.facets.topCats ?? []).map((t) => (
              <button key={t.categoria || "otros"} onClick={() => set({ categoria: f.categoria === t.categoria ? "" : (t.categoria || "") })}
                className={`shrink-0 rounded-full border px-3 py-1.5 transition ${f.categoria === (t.categoria || "") ? "border-[#0038a8] bg-[#0038a8] text-white" : "border-transparent bg-[#f1efec] text-stone-600 hover:bg-[#e7e5e4]"}`}>
                {catLabel(t.categoria)} · {t.n.toLocaleString("es-UY")}
              </button>
            ))}
          </div>
        )}
        {resp?.error && <p className="notice notice-error mt-8 font-semibold">No pudimos cargar las ofertas: {resp.error} Probá de nuevo en un momento.</p>}

        {loading && !resp ? (
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="card animate-pulse p-5">
                <div className="h-5 w-2/3 rounded bg-stone-200" />
                <div className="mt-3 h-4 w-1/2 rounded bg-stone-100" />
                <div className="mt-3 h-16 rounded bg-stone-100" />
              </div>
            ))}
          </div>
        ) : view === "swipe" && resp && !resp.error ? (
          <SwipeMode
            key={resp.q ?? ""}
            items={resp.data}
            query={qs({ ...f, page: 1 }).replace(/&?limit=50/, "")}
            startPage={resp.page}
            pages={resp.pages}
            onExit={() => setView("lista")}
            toolbar={<div className="scrollbar-none flex min-w-0 gap-1.5 overflow-x-auto">{quick}</div>}
          />
        ) : (
          <div className={`mt-6 grid gap-5 md:grid-cols-2 ${loading ? "opacity-60" : ""}`}>
            {(resp?.data ?? []).map((o) => (
              <OfertaCard key={o.id} o={o} match={o.match} shared={o.matchShared} reasons={o.matchReasons} />
            ))}
          </div>
        )}

        {(resp?.data.length ?? 0) === 0 && !loading && !resp?.error && (
          <div className="card mx-auto mt-12 max-w-md p-8 text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#f1efec] text-stone-500"><IconSearch /></span>
            <p className="mt-4 text-lg font-bold">No encontramos ofertas con esos filtros</p>
            <p className="mt-1 text-sm font-medium text-stone-600">Probá con otra palabra o sacá algún filtro.</p>
            <button type="button" onClick={() => { setQDraft(""); setF({ q: "", categoria: "", modalidad: "", fuente: "", departamento: "", seniority: "", page: 1 }); }}
              className="btn-ghost mt-5 px-4 py-2 text-sm">
              Ver todas las ofertas
            </button>
          </div>
        )}

        {view === "lista" && (resp?.pages ?? 1) > 1 && (
          <nav className="mt-8 flex items-center justify-center gap-3 text-sm font-bold">
            {f.page > 1 && (
              <button onClick={() => setF((p) => ({ ...p, page: p.page - 1 }))}
                className="btn-ghost px-4 py-2 text-sm">← Anterior</button>
            )}
            <span className="tnum px-2 text-stone-500">Página {resp?.page} de {resp?.pages}</span>
            {f.page < (resp?.pages ?? 1) && (
              <button onClick={() => setF((p) => ({ ...p, page: p.page + 1 }))}
                className="btn-ghost px-4 py-2 text-sm">Siguiente →</button>
            )}
          </nav>
        )}
      </div>
    </>
  );
}
