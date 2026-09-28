"use client";

import Link from "next/link";
import { useState } from "react";
import { LogoutButton } from "@/components/LogoutButton";

export type NavLink = { href: string; label: string; badge?: number; current?: boolean };

/** Hamburguesa con morph a X + overlay pantalla completa. */
export function MobileMenu({ links }: { links: NavLink[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="md:hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Cerrar menú" : "Abrir menú"}
        aria-expanded={open}
        className="relative grid h-10 w-10 place-items-center rounded-lg hover:bg-stone-100"
      >
        <span
          className="absolute h-0.5 w-5 rounded bg-[#1c1917] transition-all duration-300"
          style={open ? { top: "50%", transform: "translateY(-50%) rotate(45deg)" } : { top: "35%" }}
        />
        <span
          className="absolute h-0.5 w-5 rounded bg-[#1c1917] transition-all duration-300"
          style={open ? { top: "50%", transform: "translateY(-50%) rotate(-45deg)" } : { top: "60%" }}
        />
      </button>
      <div
        className={`fixed inset-0 z-50 flex flex-col bg-white transition-opacity duration-300 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex h-16 items-center justify-between px-4">
          <span className="text-lg font-bold">
            Trabajo<span className="text-[#0038a8]">gpt</span>
          </span>
          <button
            onClick={() => setOpen(false)}
            aria-label="Cerrar menú"
            className="grid h-10 w-10 place-items-center rounded-lg text-3xl font-bold leading-none hover:bg-stone-100"
          >
            ×
          </button>
        </div>
        <nav className="flex flex-col gap-1 px-6 pt-24" aria-label="Secciones">
          {links.map((l, i) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              aria-current={l.current ? "page" : undefined}
              style={{ transitionDelay: open ? `${100 + i * 50}ms` : "0ms" }}
              className={`rounded-xl px-4 py-3 text-2xl font-bold transition-all duration-500 ${
                open ? "translate-y-0 opacity-100" : "translate-y-12 opacity-0"
              } ${l.current ? "bg-[#0038a8]/10 text-[#0038a8]" : "text-[#1c1917] hover:bg-stone-100"}`}
            >
              {l.label}
              {!!l.badge && (
                <span className="ml-2 rounded-full bg-[#fcd116] px-2 py-0.5 align-middle text-xs font-bold text-[#0a2156]">
                  {l.badge}
                </span>
              )}
            </Link>
          ))}
          <div className="px-6 pt-6" onClick={() => setOpen(false)}>
            <LogoutButton />
          </div>
        </nav>
      </div>
    </div>
  );
}
