"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Oferta } from "@/lib/supabase";
import { Chip, CompanyAvatar, salaryLine } from "@/components/ui";

export type DeckItem = Oferta & { match?: number; matchShared?: string[]; matchMissing?: string[] };

const SWIPE_PX = 110;

/** Modo swipe: deslizar para guardar (→) o descartar (←). Alimenta el kanban. */
export function SwipeMode({ items, onExit }: { items: DeckItem[]; onExit: () => void }) {
  const [seen, setSeen] = useState<Set<string> | null>(null);
  const [idx, setIdx] = useState(0);
  const [saved, setSaved] = useState(0);
  const [discarded, setDiscarded] = useState(0);
  const [last, setLast] = useState<{ item: DeckItem; appId: string | number; wasSave: boolean } | null>(null);
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [leaving, setLeaving] = useState<"left" | "right" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const startX = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch("/api/postulaciones")
      .then((r) => r.json())
      .then((d) => setSeen(new Set(((d.applications ?? []) as { oferta_id: string | number }[]).map((a) => String(a.oferta_id)))))
      .catch(() => setSeen(new Set()));
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  useEffect(() => {
    setIdx(0);
    setSaved(0);
    setDiscarded(0);
    setLast(null);
  }, [items]);

  const deck = useMemo(() => {
    const base = seen ? items.filter((o) => !seen.has(String(o.id))) : items;
    return [...base].sort((a, b) => (b.match ?? 0) - (a.match ?? 0));
  }, [items, seen]);

  const current = idx < deck.length ? deck[idx] : null;
  const next = idx + 1 < deck.length ? deck[idx + 1] : null;

  async function act(save: boolean) {
    if (!current || busy || leaving) return;
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/postulaciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oferta_id: current.id, status: save ? "guardada" : "descartado" }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error ?? "No se pudo guardar.");
      setLast({ item: current, appId: d.application?.id, wasSave: save });
      if (save) setSaved((n) => n + 1);
      else setDiscarded((n) => n + 1);
      setLeaving(save ? "right" : "left");
      timer.current = setTimeout(() => {
        setIdx((i) => i + 1);
        setDx(0);
        setLeaving(null);
        setBusy(false);
      }, 180);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falló la acción.");
      setDx(0);
      setBusy(false);
    }
  }

  async function undo() {
    if (!last || busy) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/postulaciones?id=${last.appId}`, { method: "DELETE" });
      if (!r.ok) throw new Error("No se pudo deshacer.");
      if (last.wasSave) setSaved((n) => Math.max(0, n - 1));
      else setDiscarded((n) => Math.max(0, n - 1));
      setLast(null);
      setIdx((i) => Math.max(0, i - 1));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falló deshacer.");
    } finally {
      setBusy(false);
    }
  }

  function onDown(e: React.PointerEvent) {
    if (busy || leaving) return;
    startX.current = e.clientX;
    setDragging(true);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }
  function onMove(e: React.PointerEvent) {
    if (!dragging || busy || leaving) return;
    setDx(e.clientX - startX.current);
  }
  function onUp() {
    if (!dragging) return;
    setDragging(false);
    if (dx > SWIPE_PX) act(true);
    else if (dx < -SWIPE_PX) act(false);
    else setDx(0);
  }

  if (!current) {
    return (
      <div className="mx-auto mt-6 max-w-md rounded-3xl border border-stone-200 bg-white p-8 text-center shadow-sm">
        <p className="font-[var(--font-display)] text-2xl font-bold">¡Viste todo! 🎉</p>
        <p className="mt-2 text-sm font-medium text-stone-500">
          Guardaste {saved} · descartaste {discarded}
        </p>
        <div className="mt-5 flex gap-2">
          <Link href="/postulaciones" className="btn-accent flex-1 py-3 text-center">
            Ver mi kanban →
          </Link>
          <button onClick={onExit} className="flex-1 rounded-xl border border-stone-200 bg-white px-3 py-3 text-sm font-bold hover:bg-stone-50">
            Volver a la lista
          </button>
        </div>
      </div>
    );
  }

  const style: React.CSSProperties = leaving
    ? { transform: `translateX(${leaving === "right" ? 420 : -420}px) rotate(${leaving === "right" ? 18 : -18}deg)`, transition: "transform .18s ease-in" }
    : { transform: `translateX(${dx}px) rotate(${dx / 18}deg)`, transition: dragging ? "none" : "transform .2s ease-out" };
  const saveOp = Math.min(1, Math.max(0, dx / SWIPE_PX));
  const dropOp = Math.min(1, Math.max(0, -dx / SWIPE_PX));

  return (
    <div className="mx-auto mt-6 max-w-md">
      <div className="flex items-center justify-between text-xs font-bold text-stone-500">
        <span>{idx + 1} de {deck.length} · ordenadas por match</span>
        <span>★ {saved} · ✕ {discarded}</span>
      </div>
      <div className="relative mt-2" style={{ minHeight: 460 }}>
        {next && (
          <div aria-hidden className="absolute inset-0 scale-[.97] rounded-3xl border border-stone-200 bg-stone-100" />
        )}
        <article
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          style={{ ...style, touchAction: "pan-y" }}
          className="absolute inset-0 flex cursor-grab flex-col overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-[0_24px_50px_-24px_rgba(0,56,168,0.35)] active:cursor-grabbing"
        >
          <span className="pointer-events-none absolute left-4 top-4 z-10 rounded-lg border-4 border-green-600 px-2 py-0.5 text-lg font-black uppercase text-green-600"
            style={{ opacity: saveOp, transform: "rotate(-12deg)" }}>
            Guardar
          </span>
          <span className="pointer-events-none absolute right-4 top-4 z-10 rounded-lg border-4 border-red-600 px-2 py-0.5 text-lg font-black uppercase text-red-600"
            style={{ opacity: dropOp, transform: "rotate(12deg)" }}>
            Fuera
          </span>
          <div className="flex items-start gap-3 p-5 pb-0">
            <CompanyAvatar name={current.empresa} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap gap-1.5">
                {current.match !== undefined && current.match >= 35 && (
                  <span className="inline-flex items-center rounded-md bg-[#fcd116] px-2 py-0.5 text-xs font-bold text-[#0a2156]">
                    {current.match}% match
                  </span>
                )}
                <Chip tone="mint">{(current.categoria ?? "otros").replace(/_/g, " ")}</Chip>
                {current.modalidad && <Chip tone="sky">{current.modalidad}</Chip>}
              </div>
              <h2 className="mt-2 text-xl font-bold leading-snug">{current.titulo || "(sin título)"}</h2>
              <p className="mt-1 truncate text-sm font-medium text-[#57534e]">
                {[current.empresa, current.ubicacion].filter(Boolean).join(" · ")}
              </p>
              {!!current.matchShared?.length && current.match !== undefined && current.match >= 35 && (
                <p className="mt-1.5 text-xs font-bold text-[#0038a8]">
                  ✓ Coincidís en {current.matchShared.map((s) => s.replace(/_/g, " ")).join(" · ")}
                </p>
              )}
            </div>
          </div>
          {current.descripcion && (
            <p className="line-clamp-6 px-5 pt-3 text-sm leading-6 text-[#57534e]">{current.descripcion.slice(0, 400)}</p>
          )}
          <div className="mt-auto flex items-center justify-between border-t border-[#e7e5e4] px-5 py-3">
            <span className="text-sm font-bold">{salaryLine(current) || <span className="font-medium text-[#78716c]">A convenir</span>}</span>
            <Link href={`/oferta/${current.id}`} className="text-sm font-bold text-[#0038a8] hover:underline">
              Detalle →
            </Link>
          </div>
        </article>
      </div>
      {error && <p className="mt-2 text-center text-xs font-bold text-red-700">{error}</p>}
      <div className="mt-3 flex items-center justify-center gap-3">
        <button onClick={() => act(false)} disabled={busy}
          aria-label="Descartar"
          className="grid h-14 w-14 place-items-center rounded-full border-2 border-red-200 bg-white text-2xl font-black text-red-600 shadow hover:bg-red-50 disabled:opacity-40">
          ✕
        </button>
        <button onClick={undo} disabled={busy || !last} aria-label="Deshacer"
          className="grid h-11 w-11 place-items-center rounded-full border border-stone-200 bg-white text-lg font-black text-stone-500 shadow hover:bg-stone-50 disabled:opacity-30">
          ↺
        </button>
        <button onClick={() => act(true)} disabled={busy}
          aria-label="Guardar"
          className="grid h-14 w-14 place-items-center rounded-full border-2 border-green-200 bg-white text-2xl font-black text-green-600 shadow hover:bg-green-50 disabled:opacity-40">
          ★
        </button>
      </div>
      <p className="mt-2 text-center text-xs font-medium text-stone-400">Deslizá → guardar · ← descartar</p>
    </div>
  );
}
