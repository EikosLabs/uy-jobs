/** Destino interno seguro para volver tras login/registro: solo rutas propias. */
export function safeNext(v: string | null | undefined): string | null {
  if (!v) return null;
  let s = v;
  try {
    s = decodeURIComponent(v);
  } catch {
    return null;
  }
  if (!s.startsWith("/") || s.startsWith("//") || s.includes("\\") || s.length > 300) return null;
  if (/^\/(login|register|api)\b/.test(s)) return null;
  return s;
}
