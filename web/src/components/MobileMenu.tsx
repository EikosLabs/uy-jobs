"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { LogoutButton } from "@/components/LogoutButton";
import { InstallButton } from "@/components/Pwa";
import { IconArrow, IconBell, IconBrief, IconCheck, IconPin, IconSparkle, IconUser } from "@/components/ui";

// ícono y una línea de qué hay en cada sección
const META: Record<string, [React.ReactNode, string]> = {
  "/ofertas": [<IconBrief key="o" />, "Buscá y deslizá avisos"],
  "/mapa": [<IconPin key="m" />, "Trabajos por departamento"],
  "/postulaciones": [<IconCheck key="p" />, "Tu tablero de búsqueda"],
  "/notificaciones": [<IconBell key="n" />, "Ofertas que encajan con vos"],
  "/referidos": [<IconArrow key="r" />, "Compartí Trabajogpt"],
  "/perfil": [<IconUser key="u" />, "Tu CV y preferencias"],
  "/bienvenida": [<IconSparkle key="b" />, "Guía paso a paso"],
};

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
            <span className="font-[var(--font-display)] tracking-tight">Trabajo<span className="text-[#0038a8]">gpt</span></span>
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
              className={`flex items-center gap-3.5 rounded-2xl px-3 py-2.5 transition-all duration-500 active:scale-[0.98] ${
                open ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
              } ${l.current ? "bg-[#0038a8]/8 text-[#0038a8]" : "text-[#1c1917] hover:bg-stone-100"}`}
            >
              <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl [&_svg]:h-5 [&_svg]:w-5 ${l.current ? "bg-[#0038a8] text-white" : "bg-[#f3f1ed] text-[#0a2156]"}`}>
                {META[l.href]?.[0] ?? <IconSparkle />}
              </span>
              <span className="min-w-0">
                <span className="block font-[var(--font-display)] text-lg font-bold leading-tight tracking-tight">{l.label}</span>
                {META[l.href] && <span className="block truncate text-xs font-medium text-stone-500">{META[l.href][1]}</span>}
              </span>
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
