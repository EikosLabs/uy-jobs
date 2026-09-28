"use client";

import { useEffect } from "react";

/** Activa .reveal al entrar en viewport (una vez). */
export function RevealInit() {
  useEffect(() => {
    const els = () => Array.from(document.querySelectorAll<HTMLElement>(".reveal:not(.in)"));
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            const el = e.target as HTMLElement;
            const d = parseInt(el.dataset.reveal || "0", 10);
            setTimeout(() => el.classList.add("in"), Number.isFinite(d) ? d : 0);
            io.unobserve(el);
          }
        }
      },
      { threshold: 0.12 }
    );
    const watch = () => els().forEach((el) => io.observe(el));
    watch();
    const mo = new MutationObserver(watch);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, []);
  return null;
}
