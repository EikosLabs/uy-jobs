"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CompanyAvatar } from "@/components/ui";
import { catLabel, fuenteLabel, ubicacionLabel } from "@/lib/format";

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
const STAGE: Record<string, { label: string; dot: string; hint: string }> = {
  guardada: { label: "Guardadas", dot: "bg-stone-400", hint: "Lo que te interesa. Arrastrá a “Postulado” cuando te postules." },
  postulado: { label: "Postulado", dot: "bg-[#0038a8]", hint: "Ya enviaste tu CV." },
  respuesta: { label: "Respuesta", dot: "bg-amber-500", hint: "Te contestaron." },
  entrevista: { label: "Entrevista", dot: "bg-[#fcd116]", hint: "Tenés entrevista agendada o hecha." },
  oferta: { label: "¡Oferta!", dot: "bg-green-600", hint: "Te ofrecieron el puesto." },
  rechazado: { label: "Rechazado", dot: "bg-red-500", hint: "" },
  descartado: { label: "Descartado", dot: "bg-stone-300", hint: "" },
};
const STALE_DAYS = 7;
const ACTIVE_STALE = ["postulado", "respuesta", "entrevista"];

function daysSince(iso: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));
}
function ago(iso: string) {
  const d = daysSince(iso);
  return d === 0 ? "hoy" : d === 1 ? "ayer" : `hace ${d} días`;
}

export default function PostulacionesClient() {
  const [items, setItems] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [onlyStale, setOnlyStale] = useState(false);
  const [activeCol, setActiveCol] = useState<string>("guardada");
  const [openId, setOpenId] = useState<number | null>(null);
  const [showArchive, setShowArchive] = useState(false);
  const [dragId, setDragId] = useState<number | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/postulaciones")
      .then((r) => r.json())
      .then((d) => setItems(d.applications ?? []))
      .catch(() => setError("No pudimos cargar tus postulaciones."))
      .finally(() => setLoading(false));
  }, []);

  // Optimista: el cambio se ve ya; si el servidor falla, vuelve atrás y avisa.
  const mutate = useCallback(async (a: Application, status: string, notes?: string) => {
    const before = a;
    const now = new Date().toISOString();
    setItems((xs) =>
      xs.map((x) =>
        x.id === a.id
          ? { ...x, status, notes: notes ?? x.notes, updated_at: now, applied_at: x.applied_at ?? (status !== "guardada" && !ARCHIVE.includes(status) ? now : null) }
          : x
      )
    );
    setError("");
    const r = await fetch("/api/postulaciones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ oferta_id: a.oferta_id, status, notes: notes ?? a.notes }),
    }).catch(() => null);
    if (!r?.ok) {
      setItems((xs) => xs.map((x) => (x.id === a.id ? before : x)));
      setError("No se pudo guardar el cambio. Probá de nuevo.");
      return false;
    }
    return true;
  }, []);

  const remove = useCallback(async (a: Application) => {
    setItems((xs) => xs.filter((x) => x.id !== a.id));
    setOpenId(null);
    const r = await fetch(`/api/postulaciones?id=${a.id}`, { method: "DELETE" }).catch(() => null);
    if (!r?.ok) {
      setItems((xs) => [...xs, a]);
      setError("No se pudo quitar. Probá de nuevo.");
    }
  }, []);

  function csv() {
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = ["estado,titulo,empresa,ubicacion,rubro,fuente,postulado,actualizado,notas,url"];
    for (const a of searched) {
      lines.push(
        [STAGE[a.status]?.label ?? a.status, a.titulo, a.empresa, ubicacionLabel(a.ubicacion), catLabel(a.categoria), fuenteLabel(a.fuente), a.applied_at ?? "", a.updated_at, a.notes, a.url]
          .map(esc)
          .join(",")
      );
    }
    const blob = new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const el = document.createElement("a");
    el.href = URL.createObjectURL(blob);
    el.download = "mis-postulaciones.csv";
    el.click();
  }

  const isStale = (a: Application) => ACTIVE_STALE.includes(a.status) && daysSince(a.updated_at) >= STALE_DAYS;

  const searched = useMemo(() => {
    const t = q.trim().toLowerCase();
    return items.filter(
      (a) => (!t || `${a.titulo ?? ""} ${a.empresa ?? ""}`.toLowerCase().includes(t)) && (!onlyStale || isStale(a))
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, q, onlyStale]);

  const byStage = useMemo(() => {
    const m: Record<string, Application[]> = {};
    for (const a of searched) (m[a.status] ??= []).push(a);
    for (const k in m) m[k].sort((x, y) => y.updated_at.localeCompare(x.updated_at));
    return m;
  }, [searched]);

  const staleCount = useMemo(() => items.filter(isStale).length, [items]); // eslint-disable-line react-hooks/exhaustive-deps
  const archived = useMemo(() => searched.filter((a) => ARCHIVE.includes(a.status)), [searched]);
  const count = (s: string) => items.filter((a) => a.status === s).length;
  const applied = items.filter((a) => ["postulado", "respuesta", "entrevista", "oferta", "rechazado"].includes(a.status)).length;
  const answered = items.filter((a) => ["respuesta", "entrevista", "oferta", "rechazado"].includes(a.status)).length;
  const open = items.find((a) => a.id === openId) ?? null;

  function onDrop(stage: string) {
    const a = items.find((x) => x.id === dragId);
    setDragId(null);
    setOverCol(null);
    if (a && a.status !== stage) mutate(a, stage);
  }

  function card(a: Application) {
    const stale = isStale(a);
    return (
      <button
        key={a.id}
        type="button"
        draggable
        onDragStart={(e) => {
          setDragId(a.id);
          e.dataTransfer.effectAllowed = "move";
        }}
        onDragEnd={() => {
          setDragId(null);
          setOverCol(null);
        }}
        onClick={() => setOpenId(a.id)}
        className={`group block w-full cursor-grab rounded-xl border bg-white p-3 text-left shadow-[var(--shadow-card)] transition hover:border-[#bfdbfe] active:cursor-grabbing ${
          dragId === a.id ? "opacity-40" : ""
        } ${openId === a.id ? "border-[#0038a8]" : "border-[#e7e5e4]"}`}
      >
        <div className="flex items-start gap-2.5">
          <CompanyAvatar name={a.empresa} />
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 text-sm font-bold leading-snug group-hover:text-[#0038a8]">{a.titulo || "(sin título)"}</p>
            <p className="mt-0.5 truncate text-xs font-medium text-stone-500">{a.empresa || ubicacionLabel(a.ubicacion)}</p>
          </div>
        </div>
        <div className="mt-2.5 flex items-center gap-2 text-[11px] font-semibold text-stone-400">
          <span>{ago(a.updated_at)}</span>
          {a.notes && (
            <span className="inline-flex items-center gap-1" title="Tiene notas">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden><path d="M4 20h4L19 9l-4-4L4 16z" /></svg>
              nota
            </span>
          )}
          {stale && <span className="ml-auto rounded-md bg-amber-100 px-1.5 py-0.5 text-amber-800">quieta</span>}
        </div>
      </button>
    );
  }

  function column(s: string, full: boolean) {
    const col = byStage[s] ?? [];
    const over = overCol === s && dragId !== null;
    return (
      <section
        key={s}
        aria-label={STAGE[s].label}
        onDragOver={(e) => {
          e.preventDefault();
          setOverCol(s);
        }}
        onDragLeave={() => setOverCol((c) => (c === s ? null : c))}
        onDrop={(e) => {
          e.preventDefault();
          onDrop(s);
        }}
        className={`flex min-w-0 flex-col rounded-2xl p-2 transition ${full ? "w-full" : ""} ${
          over ? "bg-[#eff6ff] ring-2 ring-[#0038a8]/40" : "bg-stone-100/70"
        }`}
      >
        <header className="flex items-center gap-2 px-1.5 pb-2 pt-1">
          <span className={`h-2 w-2 rounded-full ${STAGE[s].dot}`} />
          <h2 className="text-sm font-bold text-[#0a2156]">{STAGE[s].label}</h2>
          <span className="tnum ml-auto text-xs font-bold text-stone-400">{col.length}</span>
        </header>
        <div className="flex min-h-24 flex-col gap-2">
          {col.length === 0 ? (
            <p className="rounded-xl border border-dashed border-stone-300 px-3 py-4 text-center text-xs font-medium leading-5 text-stone-400">
              {dragId !== null ? "Soltá acá" : STAGE[s].hint}
            </p>
          ) : (
            col.map(card)
          )}
        </div>
      </section>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3 pt-6">
        <h1 className="font-[var(--font-display)] text-2xl font-bold sm:text-3xl">Mis postulaciones</h1>
        {items.length > 0 && (
          <div className="flex gap-2">
            <label className="relative">
              <span className="sr-only">Buscar en postulaciones</span>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar puesto o empresa"
                className="field !w-52 !py-2 !text-sm" type="search" />
            </label>
            <button onClick={csv} className="btn-ghost px-3.5 py-2 text-sm">Exportar CSV</button>
          </div>
        )}
      </div>

      {items.length > 0 && (
        <dl className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-[#e7e5e4] bg-[#e7e5e4] sm:grid-cols-4">
          {[
            ["En seguimiento", String(PIPE.reduce((n, s) => n + count(s), 0))],
            ["Postulaciones", String(applied)],
            ["Tasa de respuesta", applied ? `${Math.round((answered / applied) * 100)}%` : "—"],
            ["Entrevistas y ofertas", String(count("entrevista") + count("oferta"))],
          ].map(([k, v]) => (
            <div key={k} className="bg-white px-4 py-3">
              <dt className="text-[11px] font-bold uppercase tracking-wider text-stone-400">{k}</dt>
              <dd className="tnum mt-0.5 text-2xl font-bold text-[#0a2156]">{v}</dd>
            </div>
          ))}
        </dl>
      )}

      {staleCount > 0 && (
        <div className="notice mt-4 flex-wrap text-sm">
          <span className="font-semibold">
            {staleCount} {staleCount === 1 ? "postulación lleva" : "postulaciones llevan"} más de {STALE_DAYS} días sin novedades. Un mensaje corto a RRHH suele reactivarlas.
          </span>
          <button type="button" onClick={() => setOnlyStale((v) => !v)} className="ml-auto text-sm font-bold text-[#0038a8] hover:underline">
            {onlyStale ? "Ver todas" : "Ver cuáles"}
          </button>
        </div>
      )}
      {error && <p role="alert" className="notice notice-error mt-4 text-sm font-semibold">{error}</p>}

      {loading ? (
        <div className="mt-6 grid gap-3 sm:grid-cols-5">
          {PIPE.map((s) => <div key={s} className="h-48 animate-pulse rounded-2xl bg-stone-100" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="card mx-auto mt-8 max-w-2xl p-8 sm:p-10">
          <p className="text-xs font-bold uppercase tracking-widest text-[#0038a8]">Tu planilla de búsqueda</p>
          <p className="mt-2 text-2xl font-bold">Todavía no guardaste ninguna oferta</p>
          <p className="mt-2 text-sm leading-6 text-stone-600">
            Cada aviso que guardes aparece acá y lo movés de etapa a medida que avanza. Así sabés a qué te
            postulaste, quién respondió y qué entrevistas tenés, sin perder nada entre portales.
          </p>
          <ol className="mt-6 grid gap-3 sm:grid-cols-3">
            {[
              ["1", "Guardá", "Desde una oferta o deslizando a la derecha en el modo swipe."],
              ["2", "Mové", "Arrastrá cada tarjeta de etapa: postulado, respuesta, entrevista, oferta."],
              ["3", "Seguí", "Notas, historial y aviso de las que se quedaron quietas."],
            ].map(([n, t, d]) => (
              <li key={n} className="rounded-2xl bg-[#faf9f7] p-4">
                <span className="grid h-6 w-6 place-items-center rounded-md bg-[#0a2156] text-xs font-bold text-[#fcd116]">{n}</span>
                <p className="mt-2 text-sm font-bold">{t}</p>
                <p className="mt-0.5 text-xs leading-5 text-stone-500">{d}</p>
              </li>
            ))}
          </ol>
          <Link href="/ofertas" className="btn-accent mt-6 px-5 py-2.5 text-sm">Explorar ofertas →</Link>
        </div>
      ) : (
        <>
          {/* móvil: una etapa por vez */}
          <div className="scrollbar-none -mx-4 mt-6 flex gap-2 overflow-x-auto px-4 pb-1 sm:hidden" role="tablist" aria-label="Etapas">
            {PIPE.map((s) => (
              <button key={s} role="tab" aria-selected={activeCol === s} onClick={() => setActiveCol(s)}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold ${
                  activeCol === s ? "border-[#0a2156] bg-[#0a2156] text-white" : "border-stone-200 bg-white text-stone-600"
                }`}>
                <span className={`h-1.5 w-1.5 rounded-full ${STAGE[s].dot}`} />
                {STAGE[s].label} · {(byStage[s] ?? []).length}
              </button>
            ))}
          </div>
          <div className="mt-3 sm:hidden">{column(activeCol, true)}</div>

          {/* escritorio: tablero completo, sin scroll lateral */}
          <div className="mt-6 hidden grid-cols-5 gap-3 sm:grid">{PIPE.map((s) => column(s, false))}</div>
          <p className="mt-2 hidden text-xs font-medium text-stone-400 sm:block">Arrastrá las tarjetas entre columnas o tocá una para ver notas e historial.</p>

          {archived.length > 0 && (
            <section aria-label="Archivadas" className="mt-8">
              <button type="button" onClick={() => setShowArchive((v) => !v)} aria-expanded={showArchive}
                className="flex w-full items-center gap-2 border-t border-[#e7e5e4] pt-4 text-sm font-bold text-stone-500 hover:text-[#0a2156]">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden
                  style={{ transform: showArchive ? "rotate(90deg)" : undefined, transition: "transform .2s" }}><path d="M9 6l6 6-6 6" /></svg>
                Archivo · {count("rechazado")} rechazadas · {count("descartado")} descartadas
              </button>
              {showArchive && (
                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{archived.map(card)}</div>
              )}
            </section>
          )}
        </>
      )}

      {open && <Drawer a={open} onClose={() => setOpenId(null)} onMove={mutate} onRemove={remove} />}
    </div>
  );
}

/** Panel lateral de una postulación: etapa, notas, historial y enlaces. */
function Drawer({
  a,
  onClose,
  onMove,
  onRemove,
}: {
  a: Application;
  onClose: () => void;
  onMove: (a: Application, status: string, notes?: string) => Promise<boolean>;
  onRemove: (a: Application) => void;
}) {
  const [draft, setDraft] = useState(a.notes ?? "");
  const [noteState, setNoteState] = useState<"" | "saving" | "saved">("");
  const [hist, setHist] = useState<HistEvent[] | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const panel = useRef<HTMLDivElement>(null);

  const loadHist = useCallback(() => {
    fetch(`/api/postulaciones?history=${a.id}`)
      .then((r) => r.json())
      .then((d) => setHist(d.events ?? []))
      .catch(() => setHist([]));
  }, [a.id]);
  useEffect(loadHist, [loadHist]);

  // el historial se relee cuando el servidor ya registró el cambio
  async function moveTo(s: string) {
    if (s === a.status) return;
    if (await onMove(a, s)) loadHist();
  }

  useEffect(() => {
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function saveNote() {
    if (draft === (a.notes ?? "")) return;
    setNoteState("saving");
    const ok = await onMove(a, a.status, draft);
    setNoteState(ok ? "saved" : "");
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label={a.titulo ?? "Postulación"}>
      <button type="button" aria-label="Cerrar" onClick={onClose} className="absolute inset-0 bg-[#0a2156]/25 backdrop-blur-[2px]" />
      <div ref={panel} tabIndex={-1}
        className="relative flex h-full w-full max-w-md flex-col overflow-y-auto bg-white shadow-2xl outline-none max-sm:mt-16 max-sm:h-[calc(100%-4rem)] max-sm:rounded-t-2xl">
        <div className="flex items-start gap-3 border-b border-[#e7e5e4] p-5">
          <CompanyAvatar name={a.empresa} />
          <div className="min-w-0 flex-1">
            <p className="font-bold leading-snug">{a.titulo || "(sin título)"}</p>
            <p className="mt-0.5 text-sm font-medium text-stone-500">
              {[a.empresa, ubicacionLabel(a.ubicacion)].filter(Boolean).join(" · ")}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-stone-500 hover:bg-stone-100">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>

        <div className="space-y-6 p-5">
          <section>
            <h3 className="text-xs font-bold uppercase tracking-widest text-stone-400">Etapa</h3>
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              {[...PIPE, "rechazado"].map((s) => (
                <button key={s} type="button" onClick={() => moveTo(s)} aria-pressed={a.status === s}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm font-bold transition ${
                    a.status === s ? "border-[#0038a8] bg-[#eff6ff] text-[#0038a8]" : "border-[#e7e5e4] text-stone-600 hover:border-stone-300"
                  }`}>
                  <span className={`h-2 w-2 rounded-full ${STAGE[s].dot}`} />
                  {STAGE[s].label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs font-medium text-stone-400">
              {a.applied_at ? `Te postulaste el ${new Date(a.applied_at).toLocaleDateString("es-UY")}.` : "Todavía no te postulaste."}{" "}
              Último cambio {ago(a.updated_at)}.
            </p>
          </section>

          <section>
            <div className="flex items-baseline justify-between">
              <h3 className="text-xs font-bold uppercase tracking-widest text-stone-400">Notas</h3>
              <span className="text-xs font-semibold text-stone-400" aria-live="polite">
                {noteState === "saving" ? "Guardando…" : noteState === "saved" ? "Guardado" : ""}
              </span>
            </div>
            <textarea value={draft} onChange={(e) => { setDraft(e.target.value); setNoteState(""); }} onBlur={saveNote}
              rows={4} maxLength={2000} placeholder="Ej: hablé con RRHH, me piden referencias para el jueves…"
              className="field mt-2 !text-sm" />
            <p className="mt-1 text-xs font-medium text-stone-400">Se guarda solo al salir del campo.</p>
          </section>

          <section>
            <h3 className="text-xs font-bold uppercase tracking-widest text-stone-400">Historial</h3>
            {hist === null ? (
              <p className="mt-2 text-sm text-stone-400">Cargando…</p>
            ) : hist.length === 0 ? (
              <p className="mt-2 text-sm text-stone-400">Sin movimientos todavía.</p>
            ) : (
              <ol className="mt-2 space-y-2 border-l-2 border-[#e7e5e4] pl-4">
                {hist.map((e, i) => (
                  <li key={i} className="relative text-sm">
                    <span className={`absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full ring-2 ring-white ${STAGE[e.to_status]?.dot ?? "bg-stone-300"}`} />
                    <span className="font-semibold text-[#1c1917]">{STAGE[e.to_status]?.label ?? e.to_status}</span>
                    {e.from_status && <span className="text-stone-400"> desde {STAGE[e.from_status]?.label ?? e.from_status}</span>}
                    <span className="block text-xs text-stone-400">{new Date(e.created_at).toLocaleDateString("es-UY", { day: "numeric", month: "short", year: "numeric" })}</span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        <div className="mt-auto flex flex-wrap gap-2 border-t border-[#e7e5e4] p-5">
          <Link href={`/oferta/${a.oferta_id}`} className="btn-ghost flex-1 px-3 py-2 text-sm">Ver oferta</Link>
          <a href={a.url} target="_blank" rel="noopener noreferrer" className="btn-ghost flex-1 px-3 py-2 text-sm">
            Aviso en {fuenteLabel(a.fuente)} ↗
          </a>
          <div className="flex w-full items-center justify-between pt-1">
            {a.status !== "descartado" ? (
              <button type="button" onClick={() => moveTo("descartado")} className="text-xs font-bold text-stone-400 hover:text-stone-600">
                Archivar
              </button>
            ) : (
              <button type="button" onClick={() => moveTo("guardada")} className="text-xs font-bold text-[#0038a8] hover:underline">
                Restaurar a Guardadas
              </button>
            )}
            {confirmRemove ? (
              <span className="flex items-center gap-2 text-xs font-bold">
                <span className="text-stone-500">¿Quitar para siempre?</span>
                <button type="button" onClick={() => onRemove(a)} className="text-red-600 hover:underline">Sí, quitar</button>
                <button type="button" onClick={() => setConfirmRemove(false)} className="text-stone-500 hover:underline">No</button>
              </span>
            ) : (
              <button type="button" onClick={() => setConfirmRemove(true)} className="text-xs font-bold text-stone-400 hover:text-red-600">
                Quitar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
