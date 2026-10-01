"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { LogoutButton } from "@/components/LogoutButton";
import { InstallButton } from "@/components/Pwa";

export type NavLink = { href: string; label: string; badge?: number; current?: boolean };

/** Hamburguesa con morph a X + overlay pantalla completa. */
export function MobileMenu({ links, nombre }: { links: NavLink[]; nombre?: string }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    document.documentElement.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.documentElement.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);
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
          <span className="flex items-center gap-2 text-lg font-bold">
            <Image src="/logo.png" alt="" width={32} height={32} className="h-8 w-8 rounded-lg border border-[#e7e5e4]" />
            <span>Trabajo<span className="text-[#0038a8]">gpt</span></span>
          </span>
          <button
            onClick={() => setOpen(false)}
            aria-label="Cerrar menú"
            className="grid h-10 w-10 place-items-center rounded-lg text-3xl font-bold leading-none hover:bg-stone-100"
          >
            ×
          </button>
        </div>
        {nombre && (
          <p className="px-6 pt-6 text-sm font-semibold text-stone-500">
            Hola, <span className="text-[#0a2156]">{nombre}</span>
          </p>
        )}
        <nav className="flex flex-col gap-1 px-4 pt-3" aria-label="Secciones">
          {links.map((l, i) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              aria-current={l.current ? "page" : undefined}
              style={{ transitionDelay: open ? `${100 + i * 50}ms` : "0ms" }}
              className={`flex items-center rounded-xl px-4 py-3 text-xl font-bold transition-all duration-500 ${
                open ? "translate-y-0 opacity-100" : "translate-y-12 opacity-0"
              } ${l.current ? "bg-[#0038a8]/10 text-[#0038a8]" : "text-[#1c1917] hover:bg-stone-100"}`}
            >
              {l.label}
              {!!l.badge && (
                <span className="ml-auto rounded-full bg-[#fcd116] px-2 py-0.5 text-xs font-bold text-[#0a2156]">
                  {l.badge} {l.badge === 1 ? "nuevo" : "nuevos"}
                </span>
              )}
            </Link>
          ))}
        </nav>
        <div className="mt-auto px-6 pb-3">
          <InstallButton />
        </div>
        <div className="border-t border-[#e7e5e4] px-6 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] [&_button]:w-full" onClick={() => setOpen(false)}>
          <LogoutButton />
        </div>
      </div>
    </div>
  );
}
