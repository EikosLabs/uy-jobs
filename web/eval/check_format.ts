/* paragraphs(): descripciones en un solo bloque se cortan en secciones y viñetas. */
import assert from "node:assert/strict";
import { paragraphs } from "@/lib/format";

const blob = "Somos una empresa líder. Requisitos: inglés avanzado y React. Beneficios: home office. • Seguro médico • Bono anual";
const p = paragraphs(blob);
assert.equal(p[0], "Somos una empresa líder.");
assert.ok(p.some((x) => x.startsWith("Requisitos:")), "corta antes de Requisitos");
assert.ok(p.some((x) => x.startsWith("Beneficios:")), "corta antes de Beneficios");
assert.ok(p.includes("• Seguro médico") && p.includes("• Bono anual"), "viñetas en líneas propias");
// si ya trae saltos de línea, se respetan
assert.deepEqual(paragraphs("Hola\n\nChau"), ["Hola", "Chau"]);
assert.deepEqual(paragraphs(""), []);
// un bloque largo sin secciones se parte por oraciones, sin cortar ninguna
const long = Array.from({ length: 12 }, (_, i) => `Esta es la oración número ${i} del aviso, bastante larga.`).join(" ");
const lp = paragraphs(long);
assert.ok(lp.length >= 2, "bloque largo en varios párrafos");
assert.equal(lp.join(" "), long, "no se pierde ni corta texto");
console.log("✓ paragraphs");
