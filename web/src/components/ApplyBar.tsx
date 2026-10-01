"use client";

import { useState } from "react";
import { track } from "@/lib/track";

/** Acciones del aviso fijas abajo en el celular: guardar y postularse, siempre a mano. */
export function ApplyBar({ ofertaId, initialStatus, url, fuente }: { ofertaId: number; initialStatus: string | null; url: string; fuente: string }) {
  const [status, setStatus] = useState(initialStatus);
  const [saving, setSaving] = useState(false);
  const saved = !!status && status !== "descartado";

  async function save() {
    if (saved || saving) return;
    setSaving(true);
    navigator.vibrate?.(10);
    const r = await fetch("/api/postulaciones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ oferta_id: ofertaId, status: "guardada" }),
    }).catch(() => null);
    setSaving(false);
    if (r?.ok) {
      setStatus("guardada");
      track("application_saved", { status: "guardada", from: "bar" });
    }
  }

  return (
    <div className="glass-bar fixed inset-x-0 bottom-[calc(3.6rem+env(safe-area-inset-bottom))] z-30 flex gap-2 border-t px-4 py-3 lg:hidden">
      <button type="button" onClick={save} disabled={saving} aria-pressed={saved}
        className={`flex h-12 shrink-0 items-center gap-1.5 rounded-xl border px-4 text-sm font-bold transition active:scale-95 ${
          saved ? "border-green-200 bg-green-50 text-green-700" : "border-[#e7e5e4] bg-white text-[#1c1917]"
        }`}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.2" aria-hidden>
          <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" strokeLinejoin="round" />
        </svg>
        {saving ? "…" : saved ? "Guardada" : "Guardar"}
      </button>
      <a href={url} target="_blank" rel="noopener noreferrer" className="btn-accent h-12 min-w-0 flex-1 text-sm">
        <span className="truncate">Postularme en {fuente}</span> ↗
      </a>
    </div>
  );
}
