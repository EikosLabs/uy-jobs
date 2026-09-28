"use client";

import { useState } from "react";

/** Genera la carta de presentación con IA para este aviso. */
export function CoverLetterWidget({ ofertaId }: { ofertaId: number }) {
  const [letter, setLetter] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  async function generate() {
    setLoading(true);
    setError("");
    setCopied(false);
    try {
      const r = await fetch("/api/ai/cover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ofertaId }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Falló la generación.");
      setLetter(d.letter ?? "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falló la generación.");
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(letter);
      setCopied(true);
    } catch {
      setError("No pudimos copiar, seleccionala a mano.");
    }
  }

  return (
    <div>
      {!letter ? (
        <button onClick={generate} disabled={loading} className="btn-accent w-full py-3 disabled:opacity-60">
          {loading ? "Escribiendo…" : "✨ Generar carta con IA"}
        </button>
      ) : (
        <>
          <p className="whitespace-pre-line rounded-2xl border border-[#e7e5e4] bg-[#f6f9ff] p-4 text-sm leading-6 text-stone-700">
            {letter}
          </p>
          <div className="mt-2 flex gap-2">
            <button onClick={copy} className="flex-1 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm font-bold hover:bg-stone-50">
              {copied ? "¡Copiada!" : "Copiar"}
            </button>
            <button onClick={generate} disabled={loading} className="flex-1 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm font-bold hover:bg-stone-50 disabled:opacity-60">
              {loading ? "…" : "Otra versión"}
            </button>
          </div>
        </>
      )}
      {error && <p className="mt-2 text-xs font-bold text-red-700">{error}</p>}
      {!error && !letter && (
        <p className="mt-2 text-center text-xs font-semibold text-stone-400">Usa tu CV y este aviso · máx 10 por día</p>
      )}
    </div>
  );
}
