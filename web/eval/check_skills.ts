/* Casos concretos de extracción de habilidades (regresiones de v1). */
import { extractSkills } from "@/lib/skills";
const cases: [string, string[], string[]][] = [
  // [texto, debe incluir, NO debe incluir]
  ["Licenciada en enfermería. Administración de medicación.", ["enfermeria"], ["administracion"]],
  ["Atención al cliente en call center", ["atencion_cliente"], []],
  ["Node.js, C# y .NET, React Native", ["nodejs", "dotnet", "react_native"], []],
  ["Buscamos personas con capacitación continua", [], ["soporte_it"]],
  ["Programa de beneficios: cadastro de clientes", [], ["marketing_digital"]],
  ["Manejo de sistemas SAP y Excel avanzado", ["sap", "excel"], []],
  ["Mano de obra calificada", [], ["construccion"]],
  ["jsonb y postgres", ["sql"], ["javascript"]],
];
let fail = 0;
for (const [t, must, not] of cases) {
  const got = extractSkills(t);
  const bad = must.filter((m) => !got.includes(m)).map((m) => `falta ${m}`).concat(not.filter((n) => got.includes(n)).map((n) => `sobra ${n}`));
  console.log(bad.length ? "✗" : "✓", t.slice(0, 50).padEnd(50), JSON.stringify(got), bad.join(", "));
  fail += bad.length ? 1 : 0;
}
if (fail) process.exit(1);
