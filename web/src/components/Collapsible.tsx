"use client";

import { useState } from "react";

/** Texto largo plegado con degradé y «Leer más». */
export function Collapsible({ children, long }: { children: React.ReactNode; long: boolean }) {
  const [open, setOpen] = useState(!long);
  return (
    <div>
      <div className={`relative ${open ? "" : "max-h-72 overflow-hidden"}`}>
        {children}
        {!open && <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white to-transparent" />}
      </div>
      {long && (
        <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open}
          className="mt-2 inline-flex items-center gap-1 rounded-full bg-[#eff6ff] px-3.5 py-1.5 text-sm font-bold text-[#0038a8] transition active:scale-95">
          {open ? "Leer menos ↑" : "Leer más ↓"}
        </button>
      )}
    </div>
  );
}
