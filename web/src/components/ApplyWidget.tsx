"use client";

import Link from "next/link";
import { useState } from "react";
import { STATUSES } from "@/lib/applications";
import { StatusPill } from "@/components/ui";
import { track } from "@/lib/track";

const LABELS: Record<string, string> = {
  guardada: "Guardar",
  postulado: "Ya me postulé",
  respuesta: "Me respondieron",
  entrevista: "Tengo entrevista",
  oferta: "Me ofrecieron",
  rechazado: "Rechazado",
  descartado: "Descartar",
};

/** Widget de seguimiento en el detalle de la oferta. */
export function ApplyWidget({ ofertaId, initialStatus }: { ofertaId: number; initialStatus: string | null }) {
  const [status, setStatus] = useState(initialStatus);
  const [saving, setSaving] = useState(false);

  async function save(s: string) {
    setSaving(true);
    const r = await fetch("/api/postulaciones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ oferta_id: ofertaId, status: s }),
    });
    setSaving(false);
    if (r.ok) {
      setStatus(s);
      track("application_saved", { status: s });
    }
  }

  if (!status) {
    return (
      <button disabled={saving} onClick={() => save("guardada")}
        className="w-full rounded-xl border-2 border-dashed border-stone-300 py-2.5 text-sm font-bold text-stone-600 hover:border-[#0038a8] hover:text-[#0038a8] disabled:opacity-60">
        {saving ? "Guardando…" : "+ Guardar en mis postulaciones"}
      </button>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold text-stone-500">Mi seguimiento</span>
        <StatusPill status={status} />
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {STATUSES.filter((s) => s !== status).map((s) => (
          <button key={s} disabled={saving} onClick={() => save(s)}
            className="rounded-lg bg-stone-100 px-2.5 py-1 text-xs font-bold text-stone-600 hover:bg-[#dbeafe] hover:text-[#0038a8] disabled:opacity-60">
            {LABELS[s]}
          </button>
        ))}
      </div>
      <Link href="/postulaciones" className="mt-2.5 block text-center text-xs font-bold text-[#0038a8] hover:underline">
        Ver mis postulaciones →
      </Link>
    </div>
  );
}
