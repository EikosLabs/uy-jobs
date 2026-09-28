import { extractSkills, norm } from "@/lib/skills";

export type Profile = {
  user_id: number;
  cv_text: string;
  titulo: string;
  skills: string;
  experiencia: string;
};

export type Scored = { score: number; shared: string[]; missing: string[]; catMatch: boolean };

const SENIOR_KEYS = ["senior", "junior", "lead"];

/** Umbral para mostrar matches (badges, radiografía). Avisos push usan 40. */
export const MATCH_DISPLAY = 35;

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

/** Puntaje 0-100 de una oferta para un perfil. */
export function scoreOferta(
  oferta: { titulo: string | null; descripcion: string | null; categoria: string | null; seniority: string | null; modalidad: string | null },
  profile: { skills: string[]; intereses: string[]; titulo: string }
): Scored {
  const oText = `${oferta.titulo ?? ""} ${oferta.descripcion ?? ""}`;
  const oSkills = extractSkills(oText);
  const shared = sharedSkills(oText, profile.skills);
  const missing = oSkills.filter((s) => !profile.skills.includes(s) && !SENIOR_KEYS.includes(s));

  const cat = (oferta.categoria ?? "").toLowerCase();
  const catMatch = !!cat && profile.intereses.map((i) => norm(i).trim()).includes(norm(cat).trim());

  const cvSenior = profile.skills.filter((s) => SENIOR_KEYS.includes(s));
  const oSenior = oSkills.filter((s) => SENIOR_KEYS.includes(s));
  const seniorMatch = cvSenior.length > 0 && oSenior.length > 0 && cvSenior.some((s) => oSenior.includes(s));

  let score = Math.min(shared.length, 5) * 12;
  if (catMatch) score += 25;
  if (seniorMatch) score += 15;
  // alineación estudiante: CV junior/estudiante + aviso para estudiantes
  const oTags = `${oferta.categoria ?? ""} ${(oferta as { tags?: string }).tags ?? ""}`.toLowerCase();
  const cvStudent = profile.skills.some((s) => ["estudiante", "sin_experiencia", "junior"].includes(s));
  const ofStudent = /estudiante|primer-empleo|primer empleo|junior|pasant/.test(oTags);
  if (cvStudent && ofStudent) score += 15;
  // bonus: el titulo del perfil menciona algo del aviso
  const oTitle = norm(oferta.titulo ?? "");
  if (oTitle && norm(profile.titulo).split(/\s+/).some((w) => w.length > 4 && oTitle.includes(w))) score += 10;

  return { score: Math.min(100, score), shared: shared.slice(0, 8), missing: missing.slice(0, 6), catMatch };
}

export function matchLabel(score: number) {
  if (score >= 70) return "Match alto";
  if (score >= 40) return "Buen match";
  return "Match bajo";
}
