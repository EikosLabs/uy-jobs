/* Presentación de datos del scraper: los valores internos (slugs, fuentes en
 * minúscula, ubicaciones crudas) nunca se muestran tal cual. */
import type { Oferta } from "@/lib/supabase";

const CATEGORIA_LABEL: Record<string, string> = {
  tecnologia: "Tecnología",
  ventas: "Ventas",
  administracion: "Administración",
  finanzas: "Finanzas y contabilidad",
  rrhh: "Recursos humanos",
  ingenieria: "Ingeniería",
  servicios: "Limpieza y seguridad",
  logistica: "Logística",
  atencion_cliente: "Atención al cliente",
  gerencia: "Gerencia",
  oficios: "Oficios",
  operarios: "Operarios",
  salud: "Salud",
  marketing: "Marketing",
  hoteleria_turismo: "Hotelería y turismo",
  gastronomia: "Gastronomía",
  educacion: "Educación",
  otros: "Otros rubros",
};

const FUENTE_LABEL: Record<string, string> = {
  linkedin: "LinkedIn",
  computrabajo: "Computrabajo",
  buscojobs: "BuscoJobs",
  indeed: "Indeed",
  gallito: "Gallito",
};

const MODALIDAD_LABEL: Record<string, string> = {
  remoto: "Remoto",
  hibrido: "Híbrido",
  presencial: "Presencial",
};

const SENIORITY_LABEL: Record<string, string> = {
  estudiante: "Estudiante",
  junior: "Junior",
  pasantia: "Pasantía",
  senior: "Senior",
  lead: "Lead",
  "semi senior": "Semi senior",
};

function titleCase(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function catLabel(slug: string | null | undefined): string {
  const k = (slug || "otros").trim();
  return CATEGORIA_LABEL[k] ?? titleCase(k.replace(/_/g, " "));
}

export function fuenteLabel(f: string | null | undefined): string {
  const k = (f || "").trim().toLowerCase();
  return FUENTE_LABEL[k] ?? titleCase(k);
}

export function modalidadLabel(m: string | null | undefined): string {
  const k = (m || "").trim().toLowerCase();
  return MODALIDAD_LABEL[k] ?? titleCase(k);
}

export function seniorityLabel(s: string | null | undefined): string {
  const k = (s || "").trim().toLowerCase();
  return SENIORITY_LABEL[k] ?? titleCase(k);
}

/** Etiqueta de tag/habilidad: "atencion_cliente" → "Atención al cliente". */
// etiquetas que agrega el engine (enrich)
const TAG_LABEL: Record<string, string> = {
  ingles: "Inglés", portugues: "Portugués", "part-time": "Part time", estudiantes: "Para estudiantes",
  "primer-empleo": "Sin experiencia", flexible: "Horario flexible", estudios: "Pide estudios", joven: "Jóvenes",
};

export function tagLabel(t: string): string {
  return CATEGORIA_LABEL[t] ?? MODALIDAD_LABEL[t] ?? SENIORITY_LABEL[t] ?? TAG_LABEL[t] ?? t.replace(/_/g, " ");
}

/** "Montevideo, Departamento de Montevideo" → "Montevideo";
 *  "Montevideo, Montevideo" → "Montevideo"; "11300 Montevideo" se respeta. */
export function ubicacionLabel(u: string | null | undefined): string {
  if (!u) return "";
  const parts = u
    .split(",")
    .map((p) => p.replace(/^\s*Departamento de\s+/i, "").trim())
    .filter(Boolean);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of parts) {
    const key = p.toLowerCase();
    if (seen.has(key)) continue;
    // "Barra de Carrasco, Canelones" se mantiene; "Canelones, Canelones" no.
    seen.add(key);
    out.push(p);
  }
  return out.join(", ");
}

/** Descarta cifras de relleno (111.111, 999.999, 1) y rangos absurdos. */
function plausibleSalary(n: number, moneda: string | null): boolean {
  if (!Number.isFinite(n) || n <= 0) return false;
  const digits = String(Math.round(n));
  if (digits.length >= 4 && /^(\d)\1+$/.test(digits)) return false;
  if (/^(12345|123456)/.test(digits)) return false;
  const cur = (moneda || "UYU").toUpperCase();
  if (cur === "USD") return n >= 300 && n <= 30000;
  return n >= 8000 && n <= 1500000;
}

export function salaryLine(o: Pick<Oferta, "salario_num" | "moneda" | "salario">): string {
  if (o.salario_num && plausibleSalary(Number(o.salario_num), o.moneda)) {
    return `${o.moneda || "UYU"} ${Number(o.salario_num).toLocaleString("es-UY", { maximumFractionDigits: 0 })}`;
  }
  const raw = (o.salario || "").trim();
  if (!raw || /convenir/i.test(raw)) return "";
  const n = Number(raw.replace(/[^\d]/g, ""));
  if (n && !plausibleSalary(n, o.moneda)) return "";
  return raw;
}

const SECTION_RX =
  /\s(?=(?:Requisitos|Responsabilidades|Beneficios|Ofrecemos|Qué ofrecemos|Qué buscamos|Buscamos|Perfil buscado|Perfil requerido|Funciones|Tareas|Principales tareas|Sobre (?:nosotros|el puesto|la empresa)|Requirements|Responsibilities|Qualifications|Benefits|What you(?:'ll| will)|About (?:us|the role|the company)|Minimum Qualifications|Preferred Qualifications|Job Overview|Company Overview|Essential Duties|Nice to have|We offer)\b\s*:?)/g;

/**
 * Descripción de un aviso en párrafos legibles. Muchas fuentes la mandan en un solo
 * bloque: cortamos antes de títulos de sección conocidos y de viñetas.
 */
export function paragraphs(text: string | null | undefined): string[] {
  const t = (text ?? "").trim();
  if (!t) return [];
  const withBreaks = /\n/.test(t)
    ? t
    : t.replace(SECTION_RX, "\n\n").replace(/\s+(?=[•▪●◦·]\s)/g, "\n").replace(/([.!?])\s+(?=-\s+[A-ZÁÉÍÓÚÑ])/g, "$1\n");
  return withBreaks
    .split(/\n{2,}|\n(?=[•▪●◦·-]\s)|\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .flatMap((p) => (p.length > 450 ? bySentences(p) : [p]));
}

/** Párrafo muy largo → bloques de ~300 caracteres cortando en fin de oración. */
function bySentences(p: string): string[] {
  const out: string[] = [];
  let cur = "";
  for (const s of p.split(/(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÑ¿¡])/)) {
    cur = cur ? `${cur} ${s}` : s;
    if (cur.length >= 300) {
      out.push(cur);
      cur = "";
    }
  }
  if (cur) out.push(cur);
  return out;
}
