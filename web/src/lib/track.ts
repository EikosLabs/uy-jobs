"use client";

/** Analytics propio minimalista (sin cookies de terceros, sin PII). */
export function track(event: string, props?: Record<string, string | number | boolean>) {
  try {
    const body = JSON.stringify({ event, path: window.location.pathname, props: props ?? {} });
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/track", new Blob([body], { type: "application/json" }));
    } else {
      fetch("/api/track", { method: "POST", headers: { "Content-Type": "application/json" }, body });
    }
  } catch {
    /* analytics nunca rompe la app */
  }
}
