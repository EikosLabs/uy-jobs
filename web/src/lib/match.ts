import { extractSkills } from "@/lib/skills";

export type Profile = {
  user_id: number;
  cv_text: string;
  titulo: string;
  skills: string;
  experiencia: string;
};

export type Scored = { score: number; shared: string[]; missing: string[]; catMatch: boolean };

const SENIOR_KEYS = ["senior", "junior", "lead"];

/** Umbral (motor v2) para mostrar "match" en tarjetas y radiografía; las alertas usan 55.
 *  Calibrado en web/eval: ≥45 incluye 61% de los avisos relevantes y 6% de ruido. */
export const MATCH_DISPLAY = 45;

/** Habilidades compartidas (sin señales de seniority). */
export function sharedSkills(ofertaText: string, skills: string[]): string[] {
  return extractSkills(ofertaText).filter((s) => skills.includes(s) && !SENIOR_KEYS.includes(s));
}

/** Intereses implícitos: top categorías por afinidad de skills, normalizada por
 *  volumen (para que los rubros grandes no tapen al rubro real del usuario). */
export function implicitIntereses(
  ofertas: { categoria: string | null; titulo: string | null; descripcion: string | null }[],
  skills: string[],
  topN = 3
): string[] {
  const shared = new Map<string, number>();
  const total = new Map<string, number>();
  for (const o of ofertas) {
    const c = (o.categoria || "otros").toLowerCase();
    total.set(c, (total.get(c) ?? 0) + 1);
    const n = sharedSkills(`${o.titulo ?? ""} ${o.descripcion ?? ""}`, skills).length;
    if (n > 0) shared.set(c, (shared.get(c) ?? 0) + n);
  }
  const rows = [...shared.entries()].map(([c, n]) => ({ c, n, t: total.get(c) ?? 1 }));
  // con evidencia suficiente manda la precisión; si no, el conteo bruto
  const solid = rows.filter((r) => r.n >= 5).sort((a, b) => b.n / b.t - a.n / a.t);
  const pool = solid.length ? solid : rows.sort((a, b) => b.n - a.n);
  return pool.slice(0, topN).map((r) => r.c);
}

/** Usa los intereses explícitos, o los implícitos si no hay. */
export function resolveIntereses(
  explicit: string[],
  ofertas: { categoria: string | null; titulo: string | null; descripcion: string | null }[],
  skills: string[]
): string[] {
  return explicit.length ? explicit : implicitIntereses(ofertas, skills);
}

/* El puntaje vive en recommend.ts (motor v2). */

export function matchLabel(score: number) {
  if (score >= 70) return "Match alto";
  if (score >= MATCH_DISPLAY) return "Buen match";
  return "Match bajo";
}
