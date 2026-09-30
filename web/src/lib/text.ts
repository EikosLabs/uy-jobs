/* Procesamiento de texto para matching: normalizar, tokenizar, raíz y pesos.
 * Español + inglés (las fuentes publican en los dos). Sin dependencias. */

export function norm(s: string | null | undefined): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

// Palabras vacías: no aportan al parecido entre textos.
const STOP = new Set(
  (
    "a al algo algun alguna algunas alguno algunos ante antes aqui asi aun bajo bien cada como con contra cual cuales " +
    "cuando de del desde donde dos el ella ellas ellos en entre era es esa esas ese eso esos esta estan estar este esto " +
    "estos fue gran ha hace hacer han hasta hay la las le les lo los mas me mi mis mucho muy nada ni no nos nosotros " +
    "nuestra nuestro nuestros o otra otras otro otros para pero poco por porque que quien quienes se sea ser si sin " +
    "sobre solo son su sus tambien tanto te tener tiene tienen todo todos tu tus un una uno unos usted vos y ya " +
    "the and or of to in for with on at by from as is are be been this that these those an it its our your we you they " +
    "their will can may must not into about over more most such than then there which who whom what when where while " +
    // ruido típico de avisos: no distingue un puesto de otro
    "empresa empresas buscamos busca buscando importante requisitos requisito excluyente deseable " +
    "experiencia años ano anos trabajo puesto cargo posicion oportunidad equipo equipos ofrecemos ofrece beneficios " +
    "excelente ambiente persona personas perfil candidato candidata candidatos interesados enviar cv curriculum " +
    "uruguay montevideo lunes viernes horario zona nivel conocimiento conocimientos manejo capacidad " +
    "company team role job work working looking join opportunity position candidate requirements required preferred " +
    "years year experience strong ability skills skill plus including within across latin america remote latam"
  ).split(/\s+/)
);

/** Raíz liviana ES/EN: quita plurales y sufijos frecuentes (sin diccionario). */
export function stem(w: string): string {
  if (w.length <= 4) return w;
  const rules: [RegExp, string][] = [
    [/(aciones|iciones)$/, "acion"],
    [/(adoras|adores|adora|ador)$/, "ador"],
    [/(mente)$/, ""],
    [/(erias|eros|eras|eria|ero|era)$/, "er"],
    [/(ciones)$/, "cion"],
    [/(idades|idad)$/, "idad"],
    [/(istas|ista)$/, "ista"],
    [/(ings|ing)$/, ""],
    [/(ers)$/, "er"],
    [/(ies)$/, "y"],
    [/(es)$/, ""],
    [/(as|os)$/, ""],
    [/(a|o|s)$/, ""],
  ];
  for (const [rx, rep] of rules) {
    if (rx.test(w)) {
      const out = w.replace(rx, rep);
      return out.length >= 3 ? out : w;
    }
  }
  return w;
}

/** Tokens con raíz, sin palabras vacías ni números sueltos. */
export function tokens(text: string | null | undefined): string[] {
  const t = norm(text)
    .replace(/c\+\+/g, " cplusplus ")
    .replace(/c#/g, " csharp ")
    .replace(/\.net\b/g, " dotnet ")
    .replace(/node\.js/g, " nodejs ")
    .replace(/next\.js/g, " nextjs ");
  const out: string[] = [];
  for (const raw of t.split(/[^a-z0-9]+/)) {
    if (raw.length < 2 || STOP.has(raw) || /^\d+$/.test(raw)) continue;
    out.push(stem(raw));
  }
  return out;
}

export type Vec = Map<string, number>;

/** Frecuencias de términos; el título pesa más que el cuerpo. */
export function termFreq(parts: [string | null | undefined, number][], maxBody = 2500): Vec {
  const v: Vec = new Map();
  for (const [text, weight] of parts) {
    for (const tok of tokens((text || "").slice(0, maxBody))) v.set(tok, (v.get(tok) ?? 0) + weight);
  }
  return v;
}

/** TF-IDF (tf sublineal) normalizado a largo 1. */
export function tfidf(tf: Vec, idf: (t: string) => number): Vec {
  const v: Vec = new Map();
  let n = 0;
  for (const [t, f] of tf) {
    const w = (1 + Math.log(f)) * idf(t);
    if (w > 0) {
      v.set(t, w);
      n += w * w;
    }
  }
  n = Math.sqrt(n) || 1;
  for (const [t, w] of v) v.set(t, w / n);
  return v;
}

export function cosine(a: Vec, b: Vec): number {
  const [s, l] = a.size < b.size ? [a, b] : [b, a];
  let dot = 0;
  for (const [t, w] of s) {
    const o = l.get(t);
    if (o) dot += w * o;
  }
  return dot;
}

/** Suma normalizada de vectores (centroide), para preferencias por feedback. */
export function centroid(vs: Vec[]): Vec {
  const c: Vec = new Map();
  for (const v of vs) for (const [t, w] of v) c.set(t, (c.get(t) ?? 0) + w);
  let n = 0;
  for (const w of c.values()) n += w * w;
  n = Math.sqrt(n) || 1;
  for (const [t, w] of c) c.set(t, w / n);
  return c;
}

/** Años de experiencia declarados explícitamente en un CV ("5 años de experiencia"). */
export function yearsOfExperience(cv: string | null | undefined): number | null {
  const t = norm(cv);
  let best: number | null = null;
  for (const m of t.matchAll(/(\d{1,2})\+?\s*(?:anos?|years?)\s*(?:de\s*)?(?:experiencia|experience|trabajando)/g)) {
    const n = Number(m[1]);
    if (n <= 45) best = Math.max(best ?? 0, n);
  }
  return best;
}
