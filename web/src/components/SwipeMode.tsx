"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, ViewTransition } from "react";
import type { Oferta } from "@/lib/supabase";
import { Chip, CompanyAvatar } from "@/components/ui";
import { catLabel, fuenteLabel, modalidadLabel, salaryLine, seniorityLabel, tagLabel, ubicacionLabel } from "@/lib/format";

export type DeckItem = Oferta & { match?: number; matchShared?: string[]; matchMissing?: string[] };

const SWIPE_PX = 110; // distancia que decide
const FLING_V = 0.5; // px/ms: un gesto rápido y corto también decide
const FLY_MS = 260;
const SPRING = "transform 420ms cubic-bezier(0.175, 0.885, 0.32, 1.275)"; // vuelve con un pequeño rebote
const TAP_PX = 8;
const PREFETCH_AT = 5; // tarjetas restantes para pedir la página siguiente
const HINT_KEY = "swipe-hint-v1";
/** Nombre compartido carta ↔ detalle (único por página: solo la carta de arriba lo lleva). */
const HERO = "oferta-hero";

type Last = { item: DeckItem; wasSave: boolean; appId: Promise<string | number | null> };

/** Modo swipe: deslizar para guardar (→) o descartar (←). Alimenta Postulaciones. */
export function SwipeMode({
  items,
  query,
  startPage = 1,
  pages,
  onExit,
  toolbar,
}: {
  items: DeckItem[];
  /** Filtros activos (querystring sin page/limit) para seguir cargando avisos. */
  query: string;
  startPage?: number;
  pages: number;
  onExit: () => void;
  /** Accesos rápidos (ej. «Cerca de mí») sobre el mazo. */
  toolbar?: React.ReactNode;
}) {
  const router = useRouter();
  const [seen, setSeen] = useState<Set<string> | null>(null);
  const [pool, setPool] = useState<DeckItem[]>(items);
  const [page, setPage] = useState(startPage);
  const [loadingMore, setLoadingMore] = useState(false);
  const [done, setDone] = useState<string[]>([]); // ids decididos, en orden (para deshacer)
  const [saved, setSaved] = useState(0);
  const [discarded, setDiscarded] = useState(0);
  const [last, setLast] = useState<Last | null>(null);
  const [leaving, setLeaving] = useState<"left" | "right" | null>(null);
  const [error, setError] = useState("");
  const [hint, setHint] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLElement>(null);
  const drag = useRef({ on: false, x0: 0, y0: 0, dx: 0, dy: 0, lx: 0, ly: 0, lt: 0, vx: 0, vy: 0, moved: false, armed: false });
  const comeBack = useRef(0); // deshacer: la carta vuelve desde el lado por el que se fue
  const recenter = useRef(false); // tras el vuelo: centrar la carta nueva antes de pintarla
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Tus postulaciones: no volver a mostrar lo que ya guardaste o descartaste.
  useEffect(() => {
    fetch("/api/postulaciones")
      .then((r) => r.json())
      .then((d) => setSeen(new Set(((d.applications ?? []) as { oferta_id: string | number }[]).map((a) => String(a.oferta_id)))))
      .catch(() => setSeen(new Set()));
    try {
      setHint(!localStorage.getItem(HINT_KEY));
    } catch {
      /* sin almacenamiento: sin guía */
    }
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const deck = useMemo(() => {
    if (!seen) return [];
    const ids = new Set<string>();
    return pool.filter((o) => {
      const k = String(o.id);
      if (seen.has(k) || ids.has(k)) return false;
      ids.add(k);
      return true;
    });
  }, [pool, seen]);

  const remaining = useMemo(() => {
    const d = new Set(done);
    return deck.filter((o) => !d.has(String(o.id)));
  }, [deck, done]);
  const current = remaining[0] ?? null;
  const next = remaining[1] ?? null;
  const hasMore = page < pages;

  // Pedir la página siguiente antes de quedarse sin tarjetas.
  useEffect(() => {
    if (!seen || loadingMore || !hasMore || remaining.length > PREFETCH_AT) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    fetch(`/api/ofertas?${query}${query ? "&" : ""}page=${nextPage}&limit=50`)
      .then((r) => r.json())
      .then((d) => {
        setPool((prev) => [...prev, ...((d.data ?? []) as DeckItem[])]);
        setPage(nextPage);
      })
      .catch(() => setError("No pudimos cargar más avisos."))
      .finally(() => setLoadingMore(false));
  }, [seen, loadingMore, hasMore, remaining.length, page, query]);

  const dismissHint = useCallback(() => {
    setHint(false);
    try {
      localStorage.setItem(HINT_KEY, "1");
    } catch {
      /* ignore */
    }
  }, []);

  // Optimista: la tarjeta se va ya; el guardado corre por detrás y se revierte si falla.
  /** Posición del arrastre → variables CSS (transform, sellos, carta de atrás, botones). */
  const paint = useCallback((dx: number, dy: number) => {
    const r = rootRef.current;
    if (!r) return;
    r.style.setProperty("--dx", String(dx));
    r.style.setProperty("--dy", String(dy));
    r.style.setProperty("--save", String(Math.min(1, Math.max(0, dx / SWIPE_PX))));
    r.style.setProperty("--drop", String(Math.min(1, Math.max(0, -dx / SWIPE_PX))));
    r.style.setProperty("--lift", String(Math.min(1, Math.abs(dx) / SWIPE_PX)));
  }, []);
  const setTransition = (t: string) => {
    if (cardRef.current) cardRef.current.style.transition = t;
  };

  const act = useCallback(
    (save: boolean) => {
      if (!current || leaving) return;
      dismissHint();
      const item = current;
      navigator.vibrate?.(12);
      // sale volando en la dirección y velocidad del gesto (o del botón)
      const d = drag.current;
      const w = window.innerWidth;
      const vy = Math.max(-2, Math.min(2, d.vy));
      setTransition(`transform ${FLY_MS}ms cubic-bezier(0.2, 0.7, 0.4, 1)`);
      rootRef.current?.style.setProperty("--lift", "1");
      paint((save ? 1 : -1) * (w + 200), d.dy + vy * FLY_MS);
      const appId = fetch("/api/postulaciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oferta_id: item.id, status: save ? "guardada" : "descartado" }),
      })
        .then(async (r) => {
          const d = await r.json().catch(() => ({}));
          if (!r.ok) throw new Error(d.error ?? "No se pudo guardar.");
          return (d.application?.id ?? null) as string | number | null;
        })
        .catch((e: unknown) => {
          setError(`${e instanceof Error ? e.message : "Falló la acción."} Te la volvemos a mostrar.`);
          // vuelve a aparecer exactamente esa tarjeta, aunque ya hayas pasado otras
          setDone((d) => d.filter((x) => x !== String(item.id)));
          if (save) setSaved((n) => Math.max(0, n - 1));
          else setDiscarded((n) => Math.max(0, n - 1));
          setLast((l) => (l?.item.id === item.id ? null : l));
          return null;
        });
      setError("");
      setLast({ item, wasSave: save, appId });
      if (save) setSaved((n) => n + 1);
      else setDiscarded((n) => n + 1);
      setLeaving(save ? "right" : "left");
      timer.current = setTimeout(() => {
        recenter.current = true;
        drag.current.dx = drag.current.dy = drag.current.vy = 0;
        setDone((d) => [...d, String(item.id)]);
        setLeaving(null);
      }, FLY_MS);
    },
    [current, leaving, dismissHint, paint]
  );

  const undo = useCallback(async () => {
    if (!last || leaving) return;
    const prev = last;
    setLast(null);
    comeBack.current = prev.wasSave ? 1 : -1;
    setDone((d) => d.filter((x) => x !== String(prev.item.id)));
    if (prev.wasSave) setSaved((n) => Math.max(0, n - 1));
    else setDiscarded((n) => Math.max(0, n - 1));
    const id = await prev.appId;
    if (id === null) return;
    const r = await fetch(`/api/postulaciones?id=${id}`, { method: "DELETE" }).catch(() => null);
    if (!r?.ok) setError("No se pudo deshacer del todo: revisalo en Postulaciones.");
  }, [last, leaving]);

  // deshacer: la carta entra desde el costado por el que se había ido
  useLayoutEffect(() => {
    if (recenter.current) {
      // la de atrás ya estaba en primer plano: el contenido cambia sin animar
      recenter.current = false;
      setTransition("none");
      paint(0, 0);
    }
    const side = comeBack.current;
    if (!side || !cardRef.current) return;
    comeBack.current = 0;
    setTransition("none");
    paint(side * (window.innerWidth + 200), 0);
    void cardRef.current.offsetWidth; // aplica la posición inicial antes de animar
    setTransition(SPRING);
    paint(0, 0);
  }, [current?.id, paint]);

  const open = useCallback(() => {
    if (current) router.push(`/oferta/${current.id}`, { transitionTypes: ["oferta-open"] });
  }, [current, router]);

  // Teclado: ← descartar, → guardar, ↑/Enter abrir, Z o Retroceso deshacer.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
      if (e.key === "ArrowRight") act(true);
      else if (e.key === "ArrowLeft") act(false);
      else if (e.key === "ArrowUp" || e.key === "Enter") open();
      else if (e.key === "z" || e.key === "Z" || e.key === "Backspace") undo();
      else return;
      e.preventDefault();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [act, open, undo]);

  function onDown(e: React.PointerEvent<HTMLElement>) {
    if (leaving || (e.target as HTMLElement).closest("a,button")) return;
    const box = e.currentTarget.getBoundingClientRect();
    // agarrada de arriba gira para un lado, de abajo para el otro (como una carta real)
    rootRef.current?.style.setProperty("--rs", e.clientY - box.top < box.height / 2 ? "1" : "-1");
    const t = performance.now();
    drag.current = { on: true, x0: e.clientX, y0: e.clientY, dx: 0, dy: 0, lx: e.clientX, ly: e.clientY, lt: t, vx: 0, vy: 0, moved: false, armed: false };
    setTransition("none");
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function onMove(e: React.PointerEvent<HTMLElement>) {
    const d = drag.current;
    if (!d.on || leaving) return;
    const t = performance.now();
    const dt = Math.max(1, t - d.lt);
    // velocidad suavizada para el vuelo final
    d.vx = 0.8 * ((e.clientX - d.lx) / dt) + 0.2 * d.vx;
    d.vy = 0.8 * ((e.clientY - d.ly) / dt) + 0.2 * d.vy;
    d.lx = e.clientX;
    d.ly = e.clientY;
    d.lt = t;
    d.dx = e.clientX - d.x0;
    d.dy = (e.clientY - d.y0) * 0.6; // en vertical se mueve, pero con resistencia
    if (Math.hypot(d.dx, d.dy) > TAP_PX) d.moved = true;
    // vibración corta al cruzar el punto de decisión
    const armed = Math.abs(d.dx) > SWIPE_PX;
    if (armed !== d.armed) {
      d.armed = armed;
      if (armed) navigator.vibrate?.(6);
    }
    paint(d.dx, d.dy);
  }
  function onUp() {
    const d = drag.current;
    if (!d.on) return;
    d.on = false;
    if (!d.moved) {
      paint(0, 0);
      open();
      return;
    }
    if (d.dx > SWIPE_PX || (d.dx > 40 && d.vx > FLING_V)) act(true);
    else if (d.dx < -SWIPE_PX || (d.dx < -40 && d.vx < -FLING_V)) act(false);
    else {
      setTransition(SPRING);
      paint(0, 0);
    }
  }
  function onCancel() {
    drag.current.on = false;
    setTransition(SPRING);
    paint(0, 0);
  }

  if (!seen) {
    return (
      <div className="mx-auto mt-6 max-w-md">
        <div className="card h-[480px] animate-pulse" />
      </div>
    );
  }

  if (!current) {
    if (loadingMore) {
      return (
        <div className="mx-auto mt-6 max-w-md">
          <div className="card grid h-[480px] place-items-center text-sm font-semibold text-stone-500">Buscando más avisos…</div>
        </div>
      );
    }
    return (
      <div className="card mx-auto mt-6 max-w-md p-8 text-center">
        <p className="text-2xl font-bold">Viste todos los avisos</p>
        <p className="mt-2 text-sm font-medium text-stone-500">
          {saved > 0 ? `Guardaste ${saved} y descartaste ${discarded} en esta tanda.` : "No quedan avisos nuevos con estos filtros."}
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Link href="/postulaciones" className="btn-accent flex-1 py-3 text-sm">
            Ver mis postulaciones →
          </Link>
          <button onClick={onExit} className="btn-ghost flex-1 py-3 text-sm">
            Volver a la lista
          </button>
        </div>
      </div>
    );
  }

  const seenCount = saved + discarded;

  return (
    <div ref={rootRef} className="mx-auto mt-3 max-w-md select-none sm:mt-6"
      style={{ "--dx": 0, "--dy": 0, "--save": 0, "--drop": 0, "--lift": 0, "--rs": 1 } as React.CSSProperties}>
      <div className="flex items-center justify-between gap-2 text-xs font-bold text-stone-500">
        {toolbar ?? <span>Ordenadas por match</span>}
        <span className="tnum shrink-0" aria-label={`${saved} guardadas, ${discarded} descartadas`}>
          <span className="text-[#15803d]">♥ {saved}</span> · ✕ {discarded}
        </span>
      </div>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-stone-200" aria-hidden>
        <div className="h-full rounded-full bg-[#0038a8] transition-[width] duration-300"
          style={{ width: `${Math.min(100, (seenCount / Math.max(1, seenCount + remaining.length)) * 100)}%` }} />
      </div>

      <div className="relative mt-3" style={{ height: "clamp(250px, calc(100svh - 425px - env(safe-area-inset-bottom)), 480px)" }}>
        {/* mazo: dos cartas asoman detrás y suben a medida que arrastrás la de arriba */}
        {remaining[2] && (
          <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl border border-[#e7e5e4] bg-white"
            style={{ transform: "translateY(calc(20px - 10px * var(--lift))) scale(calc(0.9 + 0.05 * var(--lift)))", opacity: 0.5, transition: "transform 150ms ease-out" }}>
            <CardBody o={remaining[2]} />
          </div>
        )}
        {next && (
          <div key={String(next.id)} aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl border border-[#e7e5e4] bg-white shadow-[var(--shadow-card)]"
            style={{ transform: "translateY(calc(10px - 10px * var(--lift))) scale(calc(0.95 + 0.05 * var(--lift)))", opacity: "calc(0.7 + 0.3 * var(--lift))", transition: "transform 150ms ease-out, opacity 150ms ease-out" }}>
            <CardBody o={next} />
          </div>
        )}
        {/* al abrir el aviso, esta carta se transforma en la tarjeta del detalle (View Transitions) */}
        <ViewTransition name={HERO} share="morph" default="none">
        <article
          ref={cardRef}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onCancel}
          style={{
            transform: "translate3d(calc(var(--dx) * 1px), calc(var(--dy) * 1px), 0) rotate(calc(var(--dx) * var(--rs) * 0.06deg))",
            touchAction: "none",
            willChange: "transform",
          }}
          aria-label={`${current.titulo ?? "Aviso"}. Flecha derecha para guardar, izquierda para descartar.`}
          className="absolute inset-0 flex cursor-grab flex-col overflow-hidden rounded-2xl border border-[#e7e5e4] bg-white shadow-[var(--shadow-lift)] active:cursor-grabbing"
        >
          <div aria-hidden className="pointer-events-none absolute inset-0 z-10 rounded-2xl"
            style={{ boxShadow: "inset 0 0 0 3px rgb(22 163 74 / var(--save)), inset 0 0 0 3px rgb(220 38 38 / var(--drop))", background: "rgb(22 163 74 / calc(var(--save) * 0.06))" }} />
          <span className="pointer-events-none absolute left-5 top-5 z-20 rounded-lg border-[3px] border-green-600 bg-white/90 px-2.5 py-0.5 text-base font-bold uppercase tracking-wide text-green-600"
            style={{ opacity: "var(--save)", transform: "rotate(-10deg) scale(calc(0.8 + 0.2 * var(--save)))" }}>
            Guardar
          </span>
          <span className="pointer-events-none absolute right-5 top-5 z-20 rounded-lg border-[3px] border-red-600 bg-white/90 px-2.5 py-0.5 text-base font-bold uppercase tracking-wide text-red-600"
            style={{ opacity: "var(--drop)", transform: "rotate(10deg) scale(calc(0.8 + 0.2 * var(--drop)))" }}>
            Paso
          </span>
          <CardBody o={current} />
          <div className="mt-auto flex items-center justify-between border-t border-[#e7e5e4] px-5 py-3">
            <span className="text-xs font-semibold text-[#a8a29e]">Tocá la tarjeta para ver el aviso</span>
            <Link href={`/oferta/${current.id}`} transitionTypes={["oferta-open"]} className="text-sm font-bold text-[#0038a8] hover:underline">
              Detalle →
            </Link>
          </div>
        </article>
        </ViewTransition>

        {hint && (
          <button type="button" onClick={dismissHint}
            className="absolute inset-x-6 bottom-20 z-20 rounded-2xl bg-[#0a2156]/95 px-4 py-3 text-left text-sm text-white shadow-lg">
            <span className="block font-bold">Deslizá para decidir</span>
            <span className="mt-0.5 block text-white/75">→ guardar · ← paso · tocá para abrir. En compu: flechas y Z para deshacer.</span>
            <span className="mt-1.5 block text-xs font-bold text-[#fcd116]">Entendido</span>
          </button>
        )}
      </div>

      {error && <p role="alert" className="notice notice-error mt-3 text-xs font-semibold">{error}</p>}

      <div className="mt-4 flex items-center justify-center gap-4">
        <button onClick={() => act(false)} disabled={!!leaving} aria-label="Paso (flecha izquierda)"
          className="grid h-16 w-16 place-items-center rounded-full border border-red-200 bg-white text-red-600 shadow-[var(--shadow-card)] transition hover:bg-red-50 active:scale-95 disabled:opacity-40"
          style={{ transform: "scale(calc(1 + var(--drop) * 0.15))", background: "color-mix(in srgb, #fee2e2 calc(var(--drop) * 100%), white)" }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
        <button onClick={undo} disabled={!last || !!leaving} aria-label="Deshacer (Z)"
          className="grid h-11 w-11 place-items-center rounded-full border border-stone-200 bg-white text-stone-500 shadow-[var(--shadow-card)] transition hover:bg-stone-50 active:scale-95 disabled:opacity-30">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M9 14L4 9l5-5" /><path d="M4 9h10.5a5.5 5.5 0 010 11H11" /></svg>
        </button>
        <button onClick={() => act(true)} disabled={!!leaving} aria-label="Guardar (flecha derecha)"
          className="grid h-16 w-16 place-items-center rounded-full border border-green-200 bg-white text-green-600 shadow-[var(--shadow-card)] transition hover:bg-green-50 active:scale-95 disabled:opacity-40"
          style={{ transform: "scale(calc(1 + var(--save) * 0.15))", background: "color-mix(in srgb, #dcfce7 calc(var(--save) * 100%), white)" }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" /></svg>
        </button>
      </div>
      <p className="mt-3 hidden text-center text-xs font-medium text-stone-400 sm:block">
        Atajos: ← paso · → guardar · ↑ abrir · Z deshacer
      </p>
    </div>
  );
}

/** Contenido de una tarjeta (la actual y la que asoma detrás). */
function CardBody({ o }: { o: DeckItem }) {
  const showMatch = o.match !== undefined && o.match >= 45;
  return (
    <>
      <div className="flex items-start gap-3 p-5 pb-0">
        <CompanyAvatar name={o.empresa} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-1.5">
            {showMatch && (
              <span className="inline-flex items-center rounded-md bg-[#fcd116] px-2 py-0.5 text-xs font-bold text-[#0a2156]">
                {o.match}% match
              </span>
            )}
            <Chip tone="mint">{catLabel(o.categoria)}</Chip>
            {o.modalidad && <Chip tone="sky">{modalidadLabel(o.modalidad)}</Chip>}
          </div>
          <h2 className="mt-2 line-clamp-3 text-xl font-bold leading-snug">{o.titulo || "(sin título)"}</h2>
          <p className="mt-1 truncate text-sm font-medium text-[#57534e]">
            {[o.empresa, ubicacionLabel(o.ubicacion)].filter(Boolean).join(" · ")}
          </p>
          {showMatch && !!o.matchShared?.length && (
            <p className="mt-1.5 text-xs font-bold text-[#0038a8]">
              Coincidís en {o.matchShared.map(tagLabel).join(" · ")}
            </p>
          )}
        </div>
      </div>
      {o.descripcion && (
        <p className="line-clamp-5 px-5 pt-3 text-sm leading-6 text-[#57534e]">{o.descripcion.slice(0, 360)}</p>
      )}
      <dl className="mx-5 mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-[#e7e5e4] bg-[#e7e5e4] text-sm">
        {[
          ["Rubro", catLabel(o.categoria)],
          ["Modalidad", o.modalidad ? modalidadLabel(o.modalidad) : "Presencial"],
          ["Nivel", o.seniority ? seniorityLabel(o.seniority) : "Sin especificar"],
          ["Zona", o.departamento || ubicacionLabel(o.ubicacion) || "Uruguay"],
          ["Salario", salaryLine(o) || "A convenir"],
          ["Fuente", fuenteLabel(o.fuente)],
        ].map(([k, v]) => (
          <div key={k} className="bg-white px-3 py-2.5">
            <dt className="text-[11px] font-bold uppercase tracking-wider text-[#a8a29e]">{k}</dt>
            <dd className="mt-0.5 truncate font-semibold text-[#1c1917]">{v}</dd>
          </div>
        ))}
      </dl>
    </>
  );
}
