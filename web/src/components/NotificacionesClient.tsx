"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { catLabel, modalidadLabel, ubicacionLabel } from "@/lib/format";
import { IconSparkle } from "@/components/ui";

type Notif = {
  id: number;
  score: number;
  detail: string;
  created_at: string;
  read_at: string | null;
  oferta_id: number;
  titulo: string | null;
  empresa: string | null;
  ubicacion: string | null;
  categoria: string | null;
  modalidad: string | null;
  fuente: string;
};

type Top = {
  id: number;
  titulo: string | null;
  empresa: string | null;
  ubicacion: string | null;
  categoria: string | null;
  modalidad: string | null;
  fuente: string;
  score: number;
  detail: string;
};

const TOP_FIRST = 6; // los mejores primero; el resto a un toque

export default function NotificacionesClient() {
  const [items, setItems] = useState<Notif[]>([]);
  const [top, setTop] = useState<Top[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    fetch("/api/notificaciones")
      .then((r) => r.json())
      .then((d) => {
        setItems(d.notifications ?? []);
        setTop(d.top ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  async function markAll() {
    await fetch("/api/notificaciones", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    setItems((xs) => xs.map((x) => ({ ...x, read_at: x.read_at ?? new Date().toISOString() })));
  }

  const unread = items.filter((i) => !i.read_at).length;

  return (
    <div className="mx-auto max-w-3xl px-4 pt-6 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-[var(--font-display)] text-2xl font-bold sm:text-3xl">Tus matches</h1>
          <p className="mt-1 text-sm font-medium text-stone-600">
            Ofertas que encajan con tu CV, de mayor a menor coincidencia.
          </p>
        </div>
        {unread > 0 && (
          <button onClick={markAll} className="btn-ghost px-3 py-1.5 text-xs">
            Marcar {unread} como {unread === 1 ? "leída" : "leídas"}
          </button>
        )}
      </div>

      {loading ? (
        <div className="mt-6 space-y-3">
          {[0, 1, 2].map((i) => <div key={i} className="card h-24 animate-pulse" />)}
        </div>
      ) : top.length === 0 && items.length === 0 ? (
        <div className="card mt-6 p-8 text-center sm:p-10">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#fcd116] text-[#0a2156]"><IconSparkle /></span>
          <p className="mt-4 text-xl font-bold">Todavía no tenemos tu CV</p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-stone-600">
            Subilo una vez y cada mañana te traemos las ofertas nuevas que más encajan con vos,
            con el porcentaje de coincidencia y qué te faltaría.
          </p>
          <Link href="/perfil" className="btn-accent mt-6 px-5 py-2.5 text-sm">Subir mi CV →</Link>
        </div>
      ) : (
        <>
          {top.length > 0 && (
            <section className="mt-6">
              <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-stone-400">
                Mejores matches ahora
                <span className="rounded-md bg-green-50 px-1.5 py-0.5 text-[10px] tracking-wider text-green-700">En vivo</span>
              </h2>
              <div className="mt-3 space-y-2.5">
                {(showAll ? top : top.slice(0, TOP_FIRST)).map((n) => (
                  <MatchRow key={`top-${n.id}`} href={`/oferta/${n.id}`} score={n.score} titulo={n.titulo} empresa={n.empresa}
                    ubicacion={n.ubicacion} categoria={n.categoria} modalidad={n.modalidad} detail={n.detail} />
                ))}
              </div>
              {!showAll && top.length > TOP_FIRST && (
                <button onClick={() => setShowAll(true)} className="btn-ghost mt-3 w-full py-2.5 text-sm">
                  Ver {top.length - TOP_FIRST} matches más
                </button>
              )}
            </section>
          )}
          <section className="mt-8">
            <h2 className="text-sm font-bold uppercase tracking-widest text-stone-400">Alertas diarias</h2>
            {items.length === 0 ? (
              <p className="notice mt-3 text-sm font-medium">
                Cada mañana te dejamos acá las ofertas nuevas con buen match. La primera tanda llega mañana.
              </p>
            ) : (
              <div className="mt-3 space-y-2.5">
                {items.map((n) => (
                  <MatchRow key={n.id} href={`/oferta/${n.oferta_id}`} score={n.score} titulo={n.titulo} empresa={n.empresa}
                    ubicacion={n.ubicacion} categoria={n.categoria} modalidad={n.modalidad} detail={n.detail}
                    unread={!n.read_at} when={n.created_at} />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function when(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  return d <= 0 ? "hoy" : d === 1 ? "ayer" : `hace ${d} días`;
}

function MatchRow(props: {
  href: string; score: number; titulo: string | null; empresa: string | null; ubicacion: string | null;
  categoria: string | null; modalidad: string | null; detail: string; unread?: boolean; when?: string;
}) {
  const { href, score, titulo, empresa, ubicacion, categoria, modalidad, detail, unread, when: at } = props;
  return (
    <Link href={href}
      className={`group flex items-start gap-4 rounded-2xl border bg-white p-4 shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:border-[#bfdbfe] sm:p-5 ${
        unread ? "border-[#bfdbfe]" : "border-[#e7e5e4]"
      }`}>
      <span className="tnum grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#fcd116] text-sm font-bold text-[#0a2156]">
        {score}%
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          {unread && <span className="h-2 w-2 shrink-0 rounded-full bg-[#0038a8]" aria-label="Nuevo" />}
          <span className="truncate font-bold group-hover:text-[#0038a8]">{titulo || "(sin título)"}</span>
        </span>
        <span className="mt-0.5 block truncate text-sm font-medium text-stone-600">
          {[empresa, ubicacionLabel(ubicacion)].filter(Boolean).join(" · ")}
        </span>
        <span className="mt-2 flex flex-wrap items-center gap-1.5 text-xs font-semibold">
          <span className="rounded-md border border-[#bfdbfe] bg-[#eff6ff] px-1.5 py-0.5 text-[#0038a8]">{catLabel(categoria)}</span>
          {modalidad && <span className="rounded-md border border-[#e7e5e4] px-1.5 py-0.5 text-stone-600">{modalidadLabel(modalidad)}</span>}
          {detail && <span className="text-stone-500">Coincidís en {detail}</span>}
          {at && <span className="ml-auto text-stone-400">{when(at)}</span>}
        </span>
      </span>
    </Link>
  );
}
