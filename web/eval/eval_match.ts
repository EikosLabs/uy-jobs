/* Evaluación offline del matching: v1 (baseline de git) vs v2 (recommend.ts).
 * Datos: eval/offers.json (1000 avisos reales de LinkedIn, sin datos de usuarios).
 * Relevancia: para cada perfil, una regla sobre el TÍTULO del aviso escrita a mano
 * e independiente de ambos algoritmos ("¿esta persona querría ver este aviso?").
 * Métricas: precisión en el top 10 y top 20, y MRR (qué tan arriba sale el primero bueno).
 * Uso: npm run eval:match
 */
import fs from "node:fs";
import path from "node:path";
import { extractSkills as extractV1 } from "./baseline/skills_v1";
import { implicitIntereses, scoreOferta } from "./baseline/match_v1";
import { CorpusIndex, prepareProfile, scoreMatch, type OfferLike } from "@/lib/recommend";
import { extractSkills } from "@/lib/skills";

type Offer = OfferLike & {
  id: number;
  titulo: string;
  empresa: string;
  categoria_v1: string;
  seniority_v1: string | null;
  modalidad_v1: string | null;
  categoria_v2: string;
  seniority_v2: string | null;
  modalidad_v2: string | null;
  departamento: string;
};

type Persona = {
  name: string;
  titulo: string;
  cv: string;
  intereses_v1: string[];
  intereses_v2: string[];
  departamento?: string;
  relevant: RegExp;
  exclude?: RegExp;
};

const offers: Offer[] = JSON.parse(fs.readFileSync(path.join(__dirname, "offers.json"), "utf8"));

const personas: Persona[] = [
  {
    name: "Desarrolladora frontend",
    titulo: "Desarrolladora Frontend",
    cv: "Desarrolladora frontend con 3 años de experiencia en React, TypeScript y JavaScript. Next.js, Redux, consumo de APIs REST, Git, testing con Cypress. Inglés intermedio. Trabajo en equipos ágiles con Scrum.",
    intereses_v1: ["tecnologia"],
    intereses_v2: ["tecnologia"],
    departamento: "Montevideo",
    relevant: /(front|react|javascript|typescript|full ?-?stack|web developer|software (engineer|developer)|desarrollador|developer|ui engineer)/i,
    exclude: /(sales|recruit|talent|manager|director|devops|data engineer|qa|test|mlops|machine learning|sre|elixir|java\b|\.net|golang|kernel)/i,
  },
  {
    name: "Vendedor B2B",
    titulo: "Ejecutivo comercial",
    cv: "Vendedor B2B con 4 años de experiencia en ventas de consumo masivo. Manejo de cartera de clientes, prospección, negociación y cierre de ventas. Uso de CRM (Salesforce), Excel. Libreta de conducir. Orientado a objetivos.",
    intereses_v1: ["ventas"],
    intereses_v2: ["ventas"],
    departamento: "Montevideo",
    relevant: /(vendedor|ventas|comercial|sales|account (executive|manager)|business development|preventa|ejecutivo de cuentas|bdr|sdr|territory|representative)/i,
    exclude: /(engineer|developer|operations analyst)/i,
  },
  {
    name: "Administrativa contable",
    titulo: "Administrativa contable",
    cv: "Administrativa contable con 5 años de experiencia. Contabilidad, conciliaciones bancarias, facturación, cuentas a pagar y a cobrar, liquidación de impuestos DGI y BPS. Excel avanzado, tablas dinámicas. Sistema Memory y SAP.",
    intereses_v1: ["administracion"],
    intereses_v2: ["finanzas", "administracion"],
    departamento: "Montevideo",
    relevant: /(contad|contab|account(ant|ing)|administrativ|facturaci|tesorer|treasury|invoic|cuentas a|finanz|finance|payable|receivable|billing|collections|cobranz|presupuesto|tax|impuest)/i,
    exclude: /(engineer|developer|account manager|account executive|sales)/i,
  },
  {
    name: "Chofer / logística",
    titulo: "Chofer repartidor",
    cv: "Chofer con libreta categoría A y G, 6 años de experiencia en reparto y distribución. Carga y descarga, manejo de autoelevador, control de inventario en depósito. Disponibilidad horaria.",
    intereses_v1: ["logistica"],
    intereses_v2: ["logistica"],
    departamento: "Canelones",
    relevant: /(chofer|conductor|driver|reparto|repartidor|log[ií]stic|dep[oó]sito|picker|almac|warehouse|delivery|autoelevador|supply chain|shift supervisor)/i,
  },
  {
    name: "Estudiante sin experiencia",
    titulo: "Estudiante de administración",
    cv: "Estudiante de Administración en la Udelar, cursando segundo año. Sin experiencia laboral formal, busco primer empleo o pasantía. Manejo de Excel y paquete Office, inglés intermedio. Buena atención al público, responsable.",
    intereses_v1: ["administracion", "atencion_cliente"],
    intereses_v2: ["administracion", "atencion_cliente"],
    departamento: "Montevideo",
    relevant: /(pasant|intern|trainee|junior|\bjr\b|estudiant|asistente|auxiliar|atenci[oó]n|cajer|recepcion|primer empleo|assistant|entry)/i,
    exclude: /(senior|\bsr\b|lead|manager|gerente|director|head|jefe|engineer|developer|architect)/i,
  },
  {
    name: "Enfermera",
    titulo: "Licenciada en enfermería",
    cv: "Licenciada en enfermería con 8 años de experiencia en sanatorio y emergencia. Cuidados intensivos, administración de medicación, atención de pacientes. Curso de RCP.",
    intereses_v1: ["salud"],
    intereses_v2: ["salud"],
    departamento: "Montevideo",
    relevant: /(enferm|nurse|salud|health|m[eé]dic|cl[ií]nic|cuidad|farmac|terapeut|psic|sanatorio|hospital)/i,
    exclude: /(engineer|developer|software|sales|data)/i,
  },
  {
    name: "Analista de datos",
    titulo: "Analista de datos",
    cv: "Analista de datos con 2 años de experiencia. SQL, Python (pandas), Power BI y Excel avanzado. Armado de dashboards, KPIs y reportes para áreas comerciales. Estadística. Inglés avanzado.",
    intereses_v1: ["tecnologia"],
    intereses_v2: ["tecnologia"],
    departamento: "Montevideo",
    relevant: /(data analyst|analista de datos|analytics|business intelligence|\bbi\b|data scientist|reporting|insights|people analytics|analista (de )?(datos|bi|informaci))/i,
    exclude: /(sales|recruit|engineer|developer)/i,
  },
  {
    name: "Cocinero",
    titulo: "Cocinero",
    cv: "Cocinero con 5 años de experiencia en restaurantes y catering. Parrilla, cocina fría y caliente, panadería básica. Manipulación de alimentos vigente, trabajo en equipo en cocina.",
    intereses_v1: ["gastronomia"],
    intereses_v2: ["gastronomia"],
    departamento: "Maldonado",
    relevant: /(cocin|cook|chef|gastronom|panad|pastel|parriller|restaurant|bacher|fiambr|carnic|f&b|food)/i,
  },
];

function isRelevant(p: Persona, o: Offer) {
  return p.relevant.test(o.titulo) && !(p.exclude && p.exclude.test(o.titulo));
}

function metrics(p: Persona, ranked: Offer[]) {
  const rel = ranked.map((o) => isRelevant(p, o));
  const p10 = rel.slice(0, 10).filter(Boolean).length / 10;
  const p20 = rel.slice(0, 20).filter(Boolean).length / 20;
  const first = rel.indexOf(true);
  return { p10, p20, mrr: first === -1 ? 0 : 1 / (first + 1) };
}

// v1 (lo que está en producción hoy)
function rankV1(p: Persona): Offer[] {
  const skills = extractV1(`${p.titulo} ${p.cv}`);
  const v1Offers = offers.map((o) => ({ ...o, categoria: o.categoria_v1, seniority: o.seniority_v1, modalidad: o.modalidad_v1 }));
  const intereses = p.intereses_v1.length ? p.intereses_v1 : implicitIntereses(v1Offers, skills);
  return v1Offers
    .map((o) => ({ o, s: scoreOferta(o, { skills, intereses, titulo: p.titulo }).score }))
    .sort((a, b) => b.s - a.s || b.o.id - a.o.id) // v1 empata por fecha (id)
    .map((x) => x.o);
}

// v2
const v2Offers = offers.map((o) => ({ ...o, categoria: o.categoria_v2, seniority: o.seniority_v2, modalidad: o.modalidad_v2 }));
const index = new CorpusIndex(v2Offers);
function rankV2(p: Persona, verbose = false): Offer[] {
  const skills = extractSkills(`${p.titulo} ${p.cv}`);
  const prof = prepareProfile(
    { skills, intereses: p.intereses_v2, titulo: p.titulo, cv_text: p.cv, departamento: p.departamento },
    index
  );
  const scored = v2Offers.map((o) => ({ o, r: scoreMatch(o, prof, index) })).sort((a, b) => b.r.score - a.r.score);
  if (verbose) {
    for (const { o, r } of scored.slice(0, 5)) {
      console.log(`     ${r.score}% ${isRelevant(p, o) ? "✓" : "✗"} ${o.titulo.slice(0, 60)}  — ${r.reasons.slice(0, 2).join(" · ")}`);
    }
  }
  return scored.map((x) => x.o);
}

const verbose = process.argv.includes("--verbose");
const agg = { v1: { p10: 0, p20: 0, mrr: 0 }, v2: { p10: 0, p20: 0, mrr: 0 } };
console.log("perfil                       relevantes |  P@10 v1 → v2 |  P@20 v1 → v2 |  MRR v1 → v2");
for (const p of personas) {
  const avail = offers.filter((o) => isRelevant(p, o)).length;
  const a = metrics(p, rankV1(p));
  const b = metrics(p, rankV2(p));
  for (const k of ["p10", "p20", "mrr"] as const) {
    agg.v1[k] += a[k] / personas.length;
    agg.v2[k] += b[k] / personas.length;
  }
  const f = (x: number) => x.toFixed(2);
  console.log(
    `${p.name.padEnd(28)} ${String(avail).padStart(10)} |  ${f(a.p10)} → ${f(b.p10)} |  ${f(a.p20)} → ${f(b.p20)} |  ${f(a.mrr)} → ${f(b.mrr)}`
  );
  if (verbose) rankV2(p, true);
}
const f = (x: number) => x.toFixed(2);
console.log(`${"PROMEDIO".padEnd(28)} ${"".padStart(10)} |  ${f(agg.v1.p10)} → ${f(agg.v2.p10)} |  ${f(agg.v1.p20)} → ${f(agg.v2.p20)} |  ${f(agg.v1.mrr)} → ${f(agg.v2.mrr)}`);
