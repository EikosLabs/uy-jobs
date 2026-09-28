"use client";

import { track } from "@/lib/track";

export function ShareButtons({ link }: { link: string }) {
  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      /* noop */
    }
    track("share_referral_clicked", { channel: "copy" });
  }
  const wa = `https://wa.me/?text=${encodeURIComponent("Buscá trabajo en Uruguay conmigo: " + link)}`;
  return (
    <div className="flex shrink-0 gap-2">
      <button onClick={copy} className="rounded-xl bg-[#0a2156] px-4 py-2 text-sm font-bold text-white hover:bg-[#0038a8]">
        Copiar
      </button>
      <a href={wa} target="_blank" rel="noopener noreferrer" onClick={() => track("share_referral_clicked", { channel: "whatsapp" })}
        className="rounded-xl bg-[#22c55e] px-4 py-2 text-sm font-bold text-white hover:brightness-95">
        WhatsApp
      </a>
    </div>
  );
}
