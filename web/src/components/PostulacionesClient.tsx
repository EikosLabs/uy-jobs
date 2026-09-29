"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { StatusPill } from "@/components/ui";
import { ubicacionLabel } from "@/lib/format";

export type Application = {
  id: number;
  status: string;
  notes: string;
  applied_at: string | null;
  updated_at: string;
  oferta_id: number;
  titulo: string | null;
  empresa: string | null;
  ubicacion: string | null;
  categoria: string | null;
  modalidad: string | null;
  fuente: string;
  url: string;
};

type HistEvent = { from_status: string; to_status: string; created_at: string };

const PIPE = ["guardada", "postulado", "respuesta", "entrevista", "oferta"] as const;
const ARCHIVE = ["rechazado", "descartado"];
const LABELS: Record<string, string> = {
  guardada: "Guardadas",
  postulado: "Postulado",
  respuesta: "Respuesta",
  entrevista: "Entrevista",
  oferta: "¡Oferta!",
  rechazado: "Rechazado",
  descartado: "Descartado",
};
const STALE_DAYS = 7;
const ACTIVE_STALE = ["postulado", "respuesta", "entrevista"];

function daysSince(iso: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));
}

export default function PostulacionesClient() {
  const [items, setItems] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [activeCol, setActiveCol] = useState<string>("guardada");
  const [openNotes, setOpenNotes] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [openHist, setOpenHist] = useState<number | null>(null);
  const [hist, setHist] = useState<Record<number, HistEvent[]>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/postulaciones")
      .then((r) => r.json())
      .then((d) => setItems(d.applications ?? []))
      .finally(() => setLoading(false));
  }, []);

  async function mutate(a: Application, status: string, notes?: string) {
    setSaving(true);
    const r = await fetch("/api/postulaciones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ oferta_id: a.oferta_id, status, notes: notes ?? a.notes }),
    });
    setSaving(false);
    if (r.ok) setItems((xs) => xs.map((x) => (x.id === a.id ? { ...x, status, notes: notes ?? x.notes, updated_at: new Date().toISOString() } : x)));
  }

  function move(a: Application, dir: 1 | -1) {
    const i = PIPE.indexOf(a.status as (typeof PIPE)[number]);
    const next = PIPE[Math.min(PIPE.length - 1, Math.max(0, i + dir))];
    if (next && next !== a.status) mutate(a, next);
  }

  async function remove(id: number) {
    if (!confirm("¿Quitar de tus postulaciones?")) return;
    const r = await fetch(`/api/postulaciones?id=${id}`, { method: "DELETE" });
    if (r.ok) setItems((xs) => xs.filter((x) => x.id !== id));
  }

  async function toggleHist(a: Application) {
    if (openHist === a.id) {
      setOpenHist(null);
      return;
    }
    setOpenHist(a.id);
    if (!hist[a.id]) {
      const r = await fetch(`/api/postulaciones?history=${a.id}`).then((x) => x.json());
      setHist((h) => ({ ...h, [a.id]: r.events ?? [] }));
    }
  }

  function colSection(s: string, fullWidth: boolean) {
    const col = searched.filter((a) => a.status === s);
    return (
      <section key={s} aria-label={LABELS[s]}
        className={fullWidth ? "w-full rounded-2xl bg-stone-100/70 p-2.5" : "w-72 shrink-0 rounded-2xl bg-stone-100/70 p-2.5 sm:w-80"}>
        <header className="flex items-center justify-between px-1.5 pb-2">
          <h2 className="text-sm font-bold text-[#0a2156]">{LABELS[s]}</h2>
          <span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold text-stone-500">{col.length}</span>
        </header>
        <div className="space-y-2.5">
          {col.length === 0 && <p className="px-1.5 py-3 text-xs font-medium text-stone-400">Vacío</p>}
          {col.map(card)}
        </div>
      </section>
    );
  }

  function csv() {
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = ["estado,titulo,empresa,ubicacion,categoria,fuente,postulado,actualizado,notas,url"];
    for (const a of searched) {
      lines.push(
        [a.status, a.titulo, a.empresa, a.ubicacion, a.categoria, a.fuente, a.applied_at ?? "", a.updated_at, a.notes, a.url].map(esc).join(",")
      );
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const el = document.createElement("a");
    el.href = URL.createObjectURL(blob);
    el.download = "mis-postulaciones.csv";
    el.click();
  }

  const searched = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return items;
    return items.filter((a) => `${a.titulo ?? ""} ${a.empresa ?? ""}`.toLowerCase().includes(t));
  }, [items, q]);

  const stale = useMemo(
    () => searched.filter((a) => ACTIVE_STALE.includes(a.status) && daysSince(a.updated_at) >= STALE_DAYS),
    [searched]
  );
  const archived = useMemo(() => searched.filter((a) => ARCHIVE.includes(a.status)), [searched]);
  const pipeCount = (s: string) => searched.filter((a) => a.status === s).length;

  // en móvil se muestra una etapa por vez: si la activa quedó vacía, salta a la primera con contenido
  useEffect(() => {
    if (searched.some((a) => a.status === activeCol)) return;
    const first = PIPE.find((s) => searched.some((a) => a.status === s));
    if (first) setActiveCol(first);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searched]);

  function card(a: Application) {
    const staleDays = daysSince(a.updated_at);
    const isStale = ACTIVE_STALE.includes(a.status) && staleDays >= STALE_DAYS;
    return (
      <div key={a.id} className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
        <Link href={`/oferta/${a.oferta_id}`} className="font-bold leading-snug hover:text-[#0038a8]">
          {a.titulo || "(sin título)"}
        </Link>
        <p className="mt-0.5 truncate text-xs font-medium text-stone-500">
          {[a.empresa, ubicacionLabel(a.ubicacion)].filter(Boolean).join(" · ")}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <StatusPill status={a.status} />
          {isStale && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">
              {staleDays}d sin novedades
            </span>
          )}
        </div>
        <p className="mt-1.5 text-[11px] font-medium text-stone-400">
          {a.applied_at ? `Postulado el ${new Date(a.applied_at).toLocaleDateString("es-UY")}` : "Aún no te postulaste"}
        </p>
        <div className="mt-2.5 flex items-center gap-1.5 border-t border-stone-100 pt-2.5">
          {!ARCHIVE.includes(a.status) ? (
            <>
              <button onClick={() => move(a, -1)} disabled={saving || PIPE.indexOf(a.status as (typeof PIPE)[number]) <= 0}
                className="rounded-lg border border-stone-200 px-2 py-1 text-sm font-bold text-stone-600 hover:bg-stone-100 disabled:opacity-30" aria-label="Etapa anterior">‹</button>
              <button onClick={() => move(a, 1)} disabled={saving || PIPE.indexOf(a.status as (typeof PIPE)[number]) >= PIPE.length - 1}
                className="rounded-lg border border-stone-200 px-2 py-1 text-sm font-bold text-stone-600 hover:bg-stone-100 disabled:opacity-30" aria-label="Etapa siguiente">›</button>
              <button onClick={() => mutate(a, "descartado")} disabled={saving}
                className="ml-auto rounded-lg px-2 py-1 text-xs font-bold text-stone-400 hover:text-red-600 disabled:opacity-30">
                Archivar
              </button>
            </>
          ) : (
            <>
              <button onClick={() => mutate(a, "guardada")} disabled={saving}
                className="rounded-lg border border-stone-200 px-2 py-1 text-xs font-bold text-stone-600 hover:bg-stone-100 disabled:opacity-30">
                Restaurar
              </button>
              <button onClick={() => remove(a.id)} className="ml-auto rounded-lg px-2 py-1 text-xs font-bold text-stone-400 hover:text-red-600">
                Quitar
              </button>
            </>
          )}
        </div>
        <div className="mt-1.5 flex gap-3">
          <button onClick={() => { setOpenNotes(openNotes === a.id ? null : a.id); setDraft(a.notes); }}
            className="text-xs font-bold text-[#0038a8] hover:underline">
            {a.notes ? "✎ Notas" : "+ Notas"}
          </button>
          <button onClick={() => toggleHist(a)} className="text-xs font-bold text-[#0038a8] hover:underline">
            Historial
          </button>
          <a href={a.url} target="_blank" rel="noopener noreferrer" className="ml-auto text-xs font-bold text-stone-400 hover:text-[#0038a8]">
            Aviso ↗
          </a>
        </div>
        {openNotes === a.id && (
          <div className="mt-2">
            <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={3} maxLength={2000}
              placeholder="Ej: hablé con RRHH, me piden referencias…" className="field !text-sm" />
            <button onClick={() => { mutate(a, a.status, draft); setOpenNotes(null); }} disabled={saving}
              className="mt-1.5 rounded-lg bg-[#0a2156] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#0038a8] disabled:opacity-60">
              Guardar nota
            </button>
          </div>
        )}
        {openHist === a.id && (
          <div className="mt-2 rounded-xl bg-stone-50 p-3 text-xs">
            {(hist[a.id] ?? []).length === 0 ? (
              <p className="font-medium text-stone-500">Sin movimientos todavía.</p>
            ) : (
              (hist[a.id] ?? []).map((e, i) => (
                <p key={i} className="font-medium text-stone-600">
                  {e.from_status ? `${e.from_status} → ` : ""}<b>{e.to_status}</b>
                  {" · "}{new Date(e.created_at).toLocaleDateString("es-UY")}
                </p>
              ))
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3 pt-6">
        <h1 className="font-[var(--font-display)] text-2xl font-bold sm:text-3xl">
          Mis postulaciones
          <span className="ml-2 text-base font-bold text-stone-400">{items.length}</span>
        </h1>
        <div className="flex gap-2">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar…"
            className="field !w-40 !py-2 !text-sm" aria-label="Buscar en postulaciones" />
          {items.length > 0 && (
            <button onClick={csv} className="rounded-xl bg-[#0a2156] px-4 py-2 text-sm font-bold text-white hover:bg-[#0038a8]">
              CSV
            </button>
          )}
        </div>
      </div>

      {stale.length > 0 && (
        <div className="mt-4 rounded-2xl border-2 border-amber-300 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900">
          Tenés {stale.length} {stale.length === 1 ? "postulación quieta" : "postulaciones quietas"} hace +{STALE_DAYS} días. ¿Les escribís para reactivarlas?
        </div>
      )}

      {loading ? (
        <p className="mt-8 text-sm font-medium text-stone-500">Cargando…</p>
      ) : items.length === 0 ? (
        <div className="mx-auto mt-8 max-w-2xl rounded-2xl border border-stone-200 bg-white p-8 shadow-sm sm:p-10">
          <p className="text-xs font-bold uppercase tracking-widest text-[#0038a8]">Tu planilla de búsqueda</p>
          <p className="mt-2 font-[var(--font-display)] text-2xl font-bold">Todavía no guardaste ninguna oferta</p>
          <p className="mt-2 text-sm leading-6 text-stone-600">
            Cada aviso que guardes aparece acá y lo movés de estado a medida que avanza. Así sabés a qué te
            postulaste, quién respondió y qué entrevistas tenés, sin perder nada entre portales.
          </p>
          <ol className="mt-6 grid gap-3 sm:grid-cols-3">
            {[
              ["1", "Guardá", "Desde cualquier oferta, con “Guardar en mis postulaciones”."],
              ["2", "Actualizá", "Postulado, respuesta, entrevista u oferta: un toque."],
              ["3", "Exportá", "Bajá todo a CSV cuando lo necesites."],
            ].map(([n, t, d]) => (
              <li key={n} className="rounded-2xl bg-[#faf9f7] p-4">
                <span className="grid h-6 w-6 place-items-center rounded-md bg-[#0a2156] text-xs font-bold text-[#fcd116]">{n}</span>
                <p className="mt-2 text-sm font-bold">{t}</p>
                <p className="mt-0.5 text-xs leading-5 text-stone-500">{d}</p>
              </li>
            ))}
          </ol>
          <Link href="/ofertas" className="btn-accent mt-6 inline-block px-5 py-2.5 text-sm">
            Explorar ofertas →
          </Link>
        </div>
      ) : (
        <>
          {/* pestañas por etapa en móvil: una columna completa por vez */}
          <div className="scrollbar-none -mx-4 mt-6 flex gap-2 overflow-x-auto px-4 pb-1 sm:hidden" role="tablist" aria-label="Etapas">
            {PIPE.map((s) => (
              <button key={s} role="tab" aria-selected={activeCol === s} onClick={() => setActiveCol(s)}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold ${activeCol === s ? "border-[#0a2156] bg-[#0a2156] text-white" : "border-stone-200 bg-white text-stone-600"}`}>
                {LABELS[s]} · {pipeCount(s)}
              </button>
            ))}
          </div>
          <div className="mt-3 sm:hidden">{colSection(activeCol, true)}</div>
          {/* kanban horizontal en desktop */}
          <div className="scrollbar-none -mx-4 mt-6 hidden gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex sm:px-0">
            {PIPE.map((s) => colSection(s, false))}
          </div>
          {archived.length > 0 && (
            <section aria-label="Archivadas" className="mt-6">
              <h2 className="text-sm font-bold text-stone-500">Archivadas · {archived.length}</h2>
              <div className="mt-2 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                {archived.map(card)}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
