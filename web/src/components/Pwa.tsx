"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
let deferred: InstallEvent | null = null;

/** Registra el service worker y guarda el evento de instalación de Android/Chrome. */
export function PwaInit() {
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {});
    }
    const onPrompt = (e: Event) => {
      e.preventDefault();
      deferred = e as InstallEvent;
      window.dispatchEvent(new Event("pwa-installable"));
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);
  return null;
}

const onInstallable = (cb: () => void) => {
  window.addEventListener("pwa-installable", cb);
  return () => window.removeEventListener("pwa-installable", cb);
};
const installMode = () =>
  matchMedia("(display-mode: standalone)").matches ? "none"
  : /iphone|ipad|ipod/i.test(navigator.userAgent) ? "ios"
  : deferred ? "prompt" : "none";

/** "Instalar app": prompt nativo en Android; instrucciones en iPhone. Oculto si ya está instalada. */
export function InstallButton() {
  const mode = useSyncExternalStore(onInstallable, installMode, () => "none");
  const [showIosHelp, setShowIosHelp] = useState(false);
  if (mode === "none") return null;
  const install = async () => {
    if (mode === "ios") return setShowIosHelp((v) => !v);
    await deferred?.prompt();
    deferred = null;
    window.dispatchEvent(new Event("pwa-installable"));
  };
  return (
    <div>
      <button onClick={install} className="btn-ghost w-full px-4 py-3 text-base">
        Instalar app en el teléfono
      </button>
      {showIosHelp && (
        <p className="mt-2 text-sm text-stone-600">
          En Safari tocá <b>Compartir</b> y después <b>Agregar a pantalla de inicio</b>.
        </p>
      )}
    </div>
  );
}
