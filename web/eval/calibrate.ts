/* Distribución de puntajes v2 para relevantes vs no relevantes: fija umbrales. */
import fs from "node:fs";
import path from "node:path";
import { CorpusIndex, prepareProfile, scoreMatch } from "@/lib/recommend";
import { extractSkills } from "@/lib/skills";
const src = fs.readFileSync(path.join(__dirname, "eval_match.ts"), "utf8");
void src;
type O = { id: number; titulo: string; categoria_v2: string; seniority_v2: string | null; modalidad_v2: string | null; descripcion: string; departamento: string };
const offers: O[] = JSON.parse(fs.readFileSync(path.join(__dirname, "offers.json"), "utf8"));
const v2 = offers.map((o) => ({ ...o, categoria: o.categoria_v2, seniority: o.seniority_v2, modalidad: o.modalidad_v2 }));
const index = new CorpusIndex(v2);
const P: [string, string, string[], RegExp][] = [
  ["Desarrolladora Frontend", "React TypeScript JavaScript Next.js APIs REST Git Cypress Scrum 3 años de experiencia", ["tecnologia"], /(front|react|javascript|typescript|full ?-?stack|developer|desarrollador)/i],
  ["Ejecutivo comercial", "ventas B2B cartera de clientes prospeccion negociacion CRM Salesforce 4 años de experiencia", ["ventas"], /(vendedor|ventas|comercial|sales|account|business development)/i],
  ["Administrativa contable", "contabilidad conciliaciones facturacion cuentas a pagar impuestos DGI Excel SAP 5 años de experiencia", ["finanzas", "administracion"], /(contad|contab|administrativ|factur|tesorer|finanz|finance|account(ant|ing))/i],
  ["Analista de datos", "SQL Python pandas Power BI Excel dashboards KPIs estadistica 2 años de experiencia", ["tecnologia"], /(data|datos|analytics|\bbi\b)/i],
];
const rel: number[] = [], non: number[] = [];
for (const [titulo, cv, intereses, rx] of P) {
  const prof = prepareProfile({ skills: extractSkills(`${titulo} ${cv}`), intereses, titulo, cv_text: cv, departamento: "Montevideo" }, index);
  for (const o of v2) (rx.test(o.titulo) ? rel : non).push(scoreMatch(o, prof, index).score);
}
const pct = (a: number[], t: number) => ((a.filter((x) => x >= t).length / a.length) * 100).toFixed(1) + "%";
for (const t of [35, 45, 50, 55, 60, 65, 70]) console.log(`umbral ${t}: relevantes ≥ ${pct(rel, t).padStart(6)} | no relevantes ≥ ${pct(non, t).padStart(6)}`);
