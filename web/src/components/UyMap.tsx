"use client";

import { useEffect, useMemo, useState } from "react";

type Feature = { properties: { name: string }; geometry: { type: string; coordinates: number[][][] | number[][][][] } };

function project(lng: number, lat: number, bounds: { minX: number; minY: number; maxX: number; maxY: number }, w: number, h: number, pad: number) {
  const x = ((lng - bounds.minX) / (bounds.maxX - bounds.minX)) * (w - pad * 2) + pad;
  const merc = Math.log(Math.tan(Math.PI / 4 + ((lat * Math.PI) / 180) / 2));
  const minM = Math.log(Math.tan(Math.PI / 4 + ((bounds.minY * Math.PI) / 180) / 2));
  const maxM = Math.log(Math.tan(Math.PI / 4 + ((bounds.maxY * Math.PI) / 180) / 2));
  const y = h - pad - ((merc - minM) / (maxM - minM)) * (h - pad * 2);
  return [x, y] as const;
}

function ringPath(ring: number[][]) {
  return ring.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ") + " Z";
}

function colorFor(n: number, max: number) {
  if (!n) return "#eef2f7";
  const t = Math.log10(n + 1) / Math.log10(max + 1);
  // claro -> azul bandera
  const r = Math.round(238 - t * (238 - 0));
  const g = Math.round(242 - t * (242 - 56));
  const b = Math.round(247 - t * (247 - 168));
  return `rgb(${r},${g},${b})`;
}

export default function UyMap({
  counts,
  selected,
  onSelect,
  user,
}: {
  counts: Record<string, number>;
  selected: string;
  onSelect: (d: string) => void;
  user: { lat: number; lng: number } | null;
}) {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [hover, setHover] = useState("");

  useEffect(() => {
    fetch("/uy-deptos.json").then((r) => r.json()).then((d) => setFeatures(d.features ?? [])).catch(() => {});
  }, []);

  const W = 720;
  const H = 600;
  const PAD = 24;

  const { paths, bounds, max } = useMemo(() => {
    let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
    const polys: { name: string; rings: string }[] = [];
    let max = 0;
    for (const f of features) {
      const n = counts[f.properties.name] ?? 0;
      if (n > max) max = n;
      const geoms = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
      for (const g of geoms as number[][][][]) {
        for (const [lng, lat] of g.flat()) {
          if (lng < minX) minX = lng;
          if (lng > maxX) maxX = lng;
          if (lat < minY) minY = lat;
          if (lat > maxY) maxY = lat;
        }
      }
      polys.push({ name: f.properties.name, rings: JSON.stringify(geoms) });
    }
    const b = { minX, minY, maxX, maxY };
    const out = polys.map((p) => {
      const geoms = JSON.parse(p.rings) as number[][][][];
      const d = geoms
        .map((poly) =>
          poly
            .map((ring) => ringPath(ring.map(([lng, lat]) => [...project(lng, lat, b, W, H, PAD)] as number[])))
            .join(" ")
        )
        .join(" ");
      return { name: p.name, d };
    });
    return { paths: out, bounds: b, max };
  }, [features, counts]);

  const userXY = user && bounds.maxX > bounds.minX ? project(user.lng, user.lat, bounds, W, H, PAD) : null;
  const active = hover || selected;

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Mapa de ofertas por departamento">
        {paths.map((p) => {
          const n = counts[p.name] ?? 0;
          const isSel = selected === p.name;
          const isHov = hover === p.name;
          return (
            <path
              key={p.name}
              d={p.d}
              fill={isSel ? "#fcd116" : colorFor(n, max)}
              fillOpacity={isSel ? 1 : n ? 0.92 : 1}
              stroke={isSel || isHov ? "#0a2156" : "#ffffff"}
              strokeWidth={isSel || isHov ? 2.5 : 1.5}
              style={{ cursor: "pointer" }}
              onMouseEnter={() => setHover(p.name)}
              onMouseLeave={() => setHover("")}
              onClick={() => onSelect(selected === p.name ? "" : p.name)}
            >
              <title>{`${p.name}: ${n.toLocaleString("es-UY")} ofertas`}</title>
            </path>
          );
        })}
        {userXY && (
          <g>
            <circle cx={userXY[0]} cy={userXY[1]} r={14} fill="#0038a8" opacity={0.2} />
            <circle cx={userXY[0]} cy={userXY[1]} r={6} fill="#0038a8" stroke="#fff" strokeWidth={2.5} />
          </g>
        )}
      </svg>
      <div className="mt-1 flex h-6 items-center justify-center gap-2 text-xs font-bold text-stone-500" aria-live="polite">
        {active ? (
          <span>{active}: {(counts[active] ?? 0).toLocaleString("es-UY")} ofertas — tocá para filtrar</span>
        ) : (
          <span>Pasá el cursor o tocá un departamento</span>
        )}
      </div>
    </div>
  );
}
