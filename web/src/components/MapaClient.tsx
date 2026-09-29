"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import UyMap from "@/components/UyMap";
import { CAPITALES, nearestDepartamento } from "@/lib/geo";
import { IconPin } from "@/components/ui";
import { slugify } from "@/lib/seo";

export default function MapaClient() {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState("");
  const [user, setUser] = useState<{ lat: number; lng: number } | null>(null);
  const [near, setNear] = useState("");
  const [locError, setLocError] = useState("");

  useEffect(() => {
    fetch("/api/public/stats")
      .then((r) => r.json())
      .then((d) => {
        const m: Record<string, number> = {};
        for (const row of d.deptCounts ?? []) m[row.departamento] = row.n;
        setCounts(m);
        setTotal(d.total ?? 0);
      })
      .catch(() => {});
  }, []);

  function locate() {
    setLocError("");
    if (!navigator.geolocation) {
      setLocError("Tu navegador no soporta ubicación.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setUser({ lat: latitude, lng: longitude });
        const n = nearestDepartamento(latitude, longitude);
        setNear(`${n.departamento} · a ~${n.km} km`);
        setSelected(n.departamento);
      },
      () => setLocError("No pudimos obtener tu ubicación."),
      { timeout: 10000 }
    );
  }

  const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3 pt-6">
        <div>
          <h1 className="font-[var(--font-display)] text-2xl font-bold sm:text-3xl">Mapa de ofertas</h1>
          <p className="mt-1 text-sm font-medium text-stone-600">
            {total.toLocaleString("es-UY")} ofertas ubicadas por departamento
          </p>
        </div>
        <button onClick={locate} className="inline-flex items-center gap-2 rounded-xl bg-[#0a2156] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#0038a8]">
          <IconPin /> Usar mi ubicación
        </button>
      </div>
      {locError && <p className="mt-2 text-sm font-bold text-red-600">{locError}</p>}
      {near && (
        <p className="mt-2 text-sm font-bold text-[#0038a8]">
          Estás cerca de {near}.{" "}
          <Link href={`/ofertas?departamento=${encodeURIComponent(near.split(" · ")[0])}`} className="underline">
            Ver ofertas ahí →
          </Link>
        </p>
      )}

      <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-6">
          <UyMap counts={counts} selected={selected} onSelect={setSelected} user={user} />
        </div>
        <aside className="space-y-3">
          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <h2 className="text-xs font-bold uppercase tracking-widest text-stone-400">Top departamentos</h2>
            <ol className="mt-3 space-y-2">
              {top.map(([name, n]) => (
                <li key={name}>
                  <button onClick={() => setSelected(selected === name ? "" : name)}
                    className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-sm font-bold transition ${
                      selected === name ? "border-[#0a2156] bg-[#fcd116]" : "border-stone-200 hover:border-[#0a2156]"
                    }`}>
                    <span>{name}</span>
                    <span className="text-stone-500">{n.toLocaleString("es-UY")}</span>
                  </button>
                </li>
              ))}
            </ol>
          </div>
          {selected && (
            <Link href={`/ofertas?departamento=${encodeURIComponent(selected)}`}
              className="btn-accent block py-3 text-center">
              Ver ofertas en {selected} →
            </Link>
          )}
          <Link href="/ofertas" className="block rounded-2xl border border-stone-200 bg-white px-4 py-3 text-center text-sm font-bold text-stone-600 hover:bg-stone-50">
            Todas las ofertas
          </Link>
        </aside>
      </div>

      <div className="mt-6 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="text-xs font-bold uppercase tracking-widest text-stone-400">Empleos por departamento</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {Object.entries(CAPITALES).map(([name, c]) => (
            <Link key={name} href={`/empleos/${slugify(name)}`}
              className="rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-bold text-stone-600 transition hover:border-[#0038a8] hover:text-[#0038a8]">
              {name}
              {c.capital !== name && <span className="font-medium text-stone-400"> · {c.capital}</span>}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
