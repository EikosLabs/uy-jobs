"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

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

export default function NotificacionesClient() {
  const [items, setItems] = useState<Notif[]>([]);
  const [top, setTop] = useState<Top[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="flex items-center justify-between">
          <h1 className="font-[var(--font-display)] text-3xl font-bold">Avisos para vos</h1>
          {items.some((i) => !i.read_at) && (
            <button onClick={markAll} className="rounded-xl border-2 border-[#0a2156]/15 bg-white px-3 py-1.5 text-xs font-bold hover:bg-stone-100">
              Marcar leídas
            </button>
          )}
        </div>
        {loading ? (
          <p className="mt-6 text-sm font-medium text-stone-600">Cargando…</p>
        ) : (
          <>
            {top.length > 0 && (
              <section className="mt-6">
                <h2 className="font-[var(--font-display)] text-lg font-bold">
                  Top matches de tu perfil <span className="text-sm font-bold text-stone-400">· en vivo</span>
                </h2>
                <div className="mt-3 space-y-3">
                  {top.map((n) => (
                    <Link key={`top-${n.id}`} href={`/oferta/${n.id}`}
                      className="block rounded-3xl border border-stone-200 bg-white p-5 shadow-sm transition hover:border-[#0038a8]">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border-2 border-[#0a2156] bg-[#fcd116] px-2.5 py-0.5 text-xs font-bold">
                          {n.score}% match
                        </span>
                        <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-bold text-stone-600">
                          {(n.categoria ?? "otros").replace(/_/g, " ")}
                        </span>
                        {n.modalidad && (
                          <span className="rounded-full bg-[#dbeafe] px-2.5 py-0.5 text-xs font-bold text-[#0038a8]">
                            {n.modalidad}
                          </span>
                        )}
                      </div>
                      <p className="mt-2 font-[var(--font-display)] font-bold">{n.titulo || "(sin título)"}</p>
                      <p className="text-sm font-medium text-stone-600">
                        {[n.empresa, n.ubicacion].filter(Boolean).join(" · ")}
                      </p>
                      {n.detail && <p className="mt-1 text-xs font-medium text-stone-500">Coincide: {n.detail}</p>}
                    </Link>
                  ))}
                </div>
              </section>
            )}
            <section className="mt-8">
              <h2 className="font-[var(--font-display)] text-lg font-bold">Avisos guardados</h2>
              {items.length === 0 ? (
                <div className="mt-3 rounded-3xl border border-stone-200 bg-white p-8 text-center shadow-sm">
                  <p className="font-[var(--font-display)] text-xl font-bold">Sin avisos todavía</p>
                  <p className="mt-1 text-sm font-medium text-stone-600">
                    Cada mañana generamos avisos con tus mejores matches. Subí tu CV en{" "}
                    <Link href="/perfil" className="font-bold text-[#0038a8]">tu perfil</Link>.
                  </p>
                </div>
              ) : (
                <div className="mt-3 space-y-3">
                  {items.map((n) => (
                    <Link key={n.id} href={`/oferta/${n.oferta_id}`}
                      className={`block rounded-3xl border border-stone-200 bg-white p-5 shadow-sm transition hover:border-[#0038a8] ${n.read_at ? "opacity-70" : ""}`}>
                      <div className="flex items-center gap-2">
                        {!n.read_at && <span className="h-2.5 w-2.5 rounded-full bg-[#0038a8]" />}
                        <span className="rounded-full border-2 border-[#0a2156] bg-[#fcd116] px-2.5 py-0.5 text-xs font-bold">
                          {n.score}% match
                        </span>
                        <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-bold text-stone-600">
                          {(n.categoria ?? "otros").replace(/_/g, " ")}
                        </span>
                        {n.modalidad && (
                          <span className="rounded-full bg-[#dbeafe] px-2.5 py-0.5 text-xs font-bold text-[#0038a8]">
                            {n.modalidad}
                          </span>
                        )}
                      </div>
                      <p className="mt-2 font-[var(--font-display)] font-bold">{n.titulo || "(sin título)"}</p>
                      <p className="text-sm font-medium text-stone-600">
                        {[n.empresa, n.ubicacion].filter(Boolean).join(" · ")}
                      </p>
                      {n.detail && <p className="mt-1 text-xs font-medium text-stone-500">Coincide: {n.detail}</p>}
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
    </div>
  );
}
