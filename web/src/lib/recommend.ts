/* Motor de recomendación v2: puntaje híbrido y explicable oferta <-> perfil.
 *
 * Señales (0..1) y su peso en el puntaje final:
 *   habilidades  .30  cobertura de lo que pide el aviso, pesada por rareza (IDF)
 *   texto        .22  parecido TF-IDF entre CV completo y aviso (título x3)
 *   título       .18  el puesto que buscás vs el título del aviso
 *   rubro        .12  rubros que elegiste (o deducidos del CV)
 *   nivel        .08  estudiante/junior/senior vs lo que pide; años vs experiencia mínima
 *   zona         .05  tu departamento, o remoto
 *   historial    .05  parecido con lo que guardaste menos lo que descartaste
 * Luego: penalización si el nivel no cierra (junior -> lead).
 * Evaluación offline: web/eval (npm run eval:match).
 */
import { extractSkills, LEVEL_KEYS } from "@/lib/skills";
import { centroid, cosine, norm, termFreq, tfidf, tokens, yearsOfExperience, type Vec } from "@/lib/text";

export type OfferLike = {
  id?: number;
  titulo: string | null;
  descripcion: string | null;
  requisitos?: string | null;
  categoria: string | null;
  seniority: string | null;
  modalidad: string | null;
  departamento?: string | null;
  experiencia_min?: number | null;
  tags?: string | null;
};

export type ProfileInput = {
  skills: string[];
  intereses: string[];
  titulo: string;
  cv_text?: string | null;
  experiencia?: string | null;
  departamento?: string | null;
};

export type MatchResult = {
  score: number;
  shared: string[];
  missing: string[];
  catMatch: boolean;
  reasons: string[];
  parts: Record<string, number>;
};

const W = { skills: 0.3, text: 0.22, title: 0.18, cat: 0.12, level: 0.08, loc: 0.05, hist: 0.05 };

// ---------------------------------------------------------------- índice

/** Estadísticas del corpus de avisos (IDF de palabras y de habilidades). */
export class CorpusIndex {
  private df = new Map<string, number>();
  private skillDf = new Map<string, number>();
  private vecs = new Map<number, Vec>();
  private offerSkills = new Map<number, string[]>();
  readonly n: number;

  constructor(offers: OfferLike[]) {
    this.n = Math.max(1, offers.length);
    const tfs: [number | undefined, Map<string, number>, string[]][] = [];
    for (const o of offers) {
      const tf = offerTf(o);
      const sk = offerSkillsOf(o);
      tfs.push([o.id, tf, sk]);
      for (const t of tf.keys()) this.df.set(t, (this.df.get(t) ?? 0) + 1);
      for (const s of sk) this.skillDf.set(s, (this.skillDf.get(s) ?? 0) + 1);
    }
    for (const [id, tf, sk] of tfs) {
      if (id === undefined) continue;
      this.vecs.set(id, tfidf(tf, this.idf));
      this.offerSkills.set(id, sk);
    }
  }

  idf = (t: string) => {
    const d = this.df.get(t) ?? 0;
    // palabras en más de la mitad de los avisos no distinguen nada
    if (d > this.n * 0.5) return 0;
    return Math.log((this.n + 1) / (d + 1)) + 1;
  };

  skillIdf = (s: string) => Math.log((this.n + 1) / ((this.skillDf.get(s) ?? 0) + 1)) + 1;

  vecOf(o: OfferLike): Vec {
    return (o.id !== undefined && this.vecs.get(o.id)) || tfidf(offerTf(o), this.idf);
  }

  skillsOf(o: OfferLike): string[] {
    return (o.id !== undefined && this.offerSkills.get(o.id)) || offerSkillsOf(o);
  }

  vecById(id: number): Vec | undefined {
    return this.vecs.get(id);
  }

  ids(): number[] {
    return [...this.vecs.keys()];
  }
}

function offerTf(o: OfferLike) {
  return termFreq([
    [o.titulo, 3],
    [o.descripcion, 1],
    [o.requisitos, 1],
  ]);
}

function offerSkillsOf(o: OfferLike): string[] {
  const text = `${o.titulo ?? ""} ${(o.descripcion ?? "").slice(0, 4000)} ${o.requisitos ?? ""}`;
  return extractSkills(text).filter((s) => !LEVEL_KEYS.includes(s));
}

// ---------------------------------------------------------------- perfil

export type PreparedProfile = ProfileInput & {
  vec: Vec;
  titleToks: Set<string>;
  skillSet: Set<string>;
  level: "estudiante" | "junior" | "semi" | "senior" | "lead" | null;
  years: number | null;
  likes?: Vec;
  dislikes?: Vec;
};

/** Precalcula lo que el perfil necesita para puntuar muchos avisos rápido. */
export function prepareProfile(p: ProfileInput, index: CorpusIndex, feedback?: { liked: number[]; disliked: number[] }): PreparedProfile {
  const cv = p.cv_text ?? "";
  const tf = termFreq([
    [p.titulo, 3],
    [p.skills.filter((s) => !LEVEL_KEYS.includes(s)).join(" ").replace(/_/g, " "), 2],
    [p.experiencia, 1],
    [cv, 1],
  ], 6000);
  const all = new Set(p.skills);
  const years = yearsOfExperience(`${p.experiencia ?? ""} ${cv}`);
  let level: PreparedProfile["level"] = null;
  if (all.has("lead")) level = "lead";
  else if (all.has("senior") || (years !== null && years >= 5)) level = "senior";
  else if (years !== null && years >= 2) level = "semi";
  else if (all.has("estudiante") || all.has("sin_experiencia")) level = "estudiante";
  else if (all.has("junior") || years === 0 || years === 1) level = "junior";

  const liked = (feedback?.liked ?? []).map((id) => index.vecById(id)).filter((v): v is Vec => !!v);
  const disliked = (feedback?.disliked ?? []).map((id) => index.vecById(id)).filter((v): v is Vec => !!v);
  return {
    ...p,
    vec: tfidf(tf, index.idf),
    titleToks: new Set(tokens(p.titulo)),
    skillSet: new Set(p.skills.filter((s) => !LEVEL_KEYS.includes(s))),
    level,
    years,
    likes: liked.length ? centroid(liked) : undefined,
    dislikes: disliked.length ? centroid(disliked) : undefined,
  };
}

// ---------------------------------------------------------------- puntaje

const LEVEL_RANK: Record<string, number> = { pasantia: 0, estudiante: 0, junior: 1, semi: 2, senior: 3, lead: 4 };

export function scoreMatch(o: OfferLike, p: PreparedProfile, index: CorpusIndex): MatchResult {
  const reasons: string[] = [];
  // 1. habilidades: qué parte de lo que pide el aviso tenés (lo raro pesa más)
  const oSkills = index.skillsOf(o);
  const shared = oSkills.filter((s) => p.skillSet.has(s));
  const missing = oSkills.filter((s) => !p.skillSet.has(s));
  const wAll = oSkills.reduce((a, s) => a + index.skillIdf(s), 0);
  const wHave = shared.reduce((a, s) => a + index.skillIdf(s), 0);
  let skills = wAll ? wHave / wAll : 0;
  // pocas habilidades detectadas en el aviso: no sobrevalorar una coincidencia suelta
  if (oSkills.length <= 2) skills *= 0.75;
  if (shared.length) reasons.push(`Coincidís en ${shared.slice(0, 4).map(label).join(", ")}`);

  // 2. texto completo
  const oVec = index.vecOf(o);
  const textRaw = cosine(p.vec, oVec);
  const text = Math.min(1, textRaw / 0.3);

  // 3. título del puesto
  const oTitle = new Set(tokens(o.titulo));
  let title = 0;
  if (p.titleToks.size && oTitle.size) {
    let hit = 0;
    let tot = 0;
    for (const t of p.titleToks) {
      const w = index.idf(t) || 0.5;
      tot += w;
      if (oTitle.has(t)) hit += w;
      // mismo comienzo de palabra (analista/analyst no, desarrollador/desarrolladora sí): medio crédito
      else if (t.length >= 6 && [...oTitle].some((u) => u.length >= 6 && u.slice(0, 6) === t.slice(0, 6))) hit += w * 0.5;
    }
    title = tot ? hit / tot : 0;
    if (title >= 0.5) reasons.push("El puesto se parece al que buscás");
  }

  // 4. rubro
  const cat = (o.categoria ?? "").toLowerCase();
  const catMatch = !!cat && p.intereses.map((i) => norm(i).trim()).includes(norm(cat).trim());
  const catScore = p.intereses.length ? (catMatch ? 1 : 0) : 0.4;
  if (catMatch) reasons.push("Es de un rubro que te interesa");

  // 5. nivel
  const oLevel = offerLevel(o);
  let level = 0.6;
  let levelGap = 0;
  if (p.level && oLevel !== null) {
    levelGap = LEVEL_RANK[oLevel] - LEVEL_RANK[p.level];
    level = levelGap === 0 ? 1 : levelGap === 1 || levelGap === -1 ? 0.6 : levelGap > 1 ? 0.1 : 0.4;
    if (levelGap === 0) reasons.push("Pide tu nivel de experiencia");
  }
  const expMin = o.experiencia_min ?? null;
  if (expMin !== null && p.years !== null) {
    if (p.years >= expMin) level = Math.max(level, 0.8);
    else level = Math.min(level, expMin - p.years >= 3 ? 0.1 : 0.4);
  }
  const studentFriendly = /estudiante|primer-empleo|joven|pasant/.test((o.tags ?? "").toLowerCase()) || oLevel === "estudiante" || oLevel === "pasantia";
  if ((p.level === "estudiante" || p.level === "junior") && studentFriendly) {
    level = 1;
    reasons.push("Pensado para estudiantes o primer empleo");
  }

  // 6. zona
  let loc = 0.6;
  if (o.modalidad === "remoto") {
    loc = 1;
    reasons.push("Remoto");
  } else if (p.departamento && o.departamento) {
    loc = p.departamento === o.departamento ? 1 : o.modalidad === "hibrido" ? 0.5 : 0.2;
    if (loc === 1) reasons.push(`En ${o.departamento}`);
  }

  // 7. historial (swipe y postulaciones)
  let hist = 0.5;
  if (p.likes || p.dislikes) {
    const like = p.likes ? cosine(p.likes, oVec) : 0;
    const dis = p.dislikes ? cosine(p.dislikes, oVec) : 0;
    hist = Math.max(0, Math.min(1, 0.5 + 1.5 * (like - dis)));
    if (like - dis > 0.15) reasons.push("Parecida a otras que guardaste");
  }

  let s =
    W.skills * skills + W.text * text + W.title * title + W.cat * catScore + W.level * level + W.loc * loc + W.hist * hist;
  // nivel incompatible (p. ej. estudiante -> gerencia): baja fuerte
  if (levelGap >= 2) s *= 0.6;
  // un aviso que no se parece en nada no debería llegar a "buen match" solo por rubro/zona
  if (skills === 0 && text < 0.15 && title === 0) s *= 0.5;

  const score = Math.round(Math.min(100, (s / 0.75) * 100));
  return {
    score,
    shared: shared.slice(0, 8),
    missing: missing.slice(0, 6),
    catMatch,
    reasons,
    parts: { skills, text, title, cat: catScore, level, loc, hist },
  };
}

function offerLevel(o: OfferLike): string | null {
  const s = (o.seniority ?? "").toLowerCase();
  if (s in LEVEL_RANK) return s;
  if (s === "semi senior" || s === "ssr") return "semi";
  return null;
}

const SKILL_LABEL: Record<string, string> = {
  dotnet: ".NET", nodejs: "Node.js", javascript: "JavaScript", typescript: "TypeScript", sql: "SQL", nosql: "NoSQL",
  react_native: "React Native", ux_ui: "UX/UI", bi: "BI", api: "APIs", cpp: "C++", ia_generativa: "IA generativa",
  machine_learning: "machine learning", data_engineering: "ingeniería de datos", soporte_it: "soporte IT",
  gestion_proyectos: "gestión de proyectos", atencion_cliente: "atención al cliente", marketing_digital: "marketing digital",
  redes_sociales: "redes sociales", liquidacion_sueldos: "liquidación de sueldos", comercio_exterior: "comercio exterior",
  seguridad_laboral: "seguridad laboral", ingles: "inglés", portugues: "portugués", logistica: "logística",
  contabilidad: "contabilidad", facturacion: "facturación", rrhh: "RRHH", sap: "SAP", erp: "ERP", crm: "CRM", excel: "Excel",
};
export function label(s: string): string {
  return SKILL_LABEL[s] ?? s.replace(/_/g, " ");
}

/** Avisos más parecidos a uno dado (para "ofertas parecidas"). */
export function similarTo(id: number, index: CorpusIndex, k = 6): { id: number; sim: number }[] {
  const v = index.vecById(id);
  if (!v) return [];
  const out: { id: number; sim: number }[] = [];
  for (const other of index.ids()) {
    if (other === id) continue;
    const sim = cosine(v, index.vecById(other)!);
    if (sim > 0.12) out.push({ id: other, sim });
  }
  return out.sort((a, b) => b.sim - a.sim).slice(0, k);
}
