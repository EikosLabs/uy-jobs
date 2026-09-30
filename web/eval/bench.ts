/* Tiempo de construir el índice y puntuar todo el corpus (x2.5 para simular producción). */
import fs from "node:fs";
import path from "node:path";
import { CorpusIndex, prepareProfile, scoreMatch } from "@/lib/recommend";
import { extractSkills } from "@/lib/skills";
const base = JSON.parse(fs.readFileSync(path.join(__dirname, "offers.json"), "utf8"));
const offers = [0, 1, 2].flatMap((k) => base.map((o: { id: number }) => ({ ...o, id: o.id + k * 10000, categoria: o.categoria_v2 }))).slice(0, 2500);
let t = performance.now();
const index = new CorpusIndex(offers);
console.log(`índice de ${offers.length} avisos: ${(performance.now() - t).toFixed(0)} ms`);
const cv = "Desarrolladora frontend con 3 años de experiencia en React, TypeScript y JavaScript.";
t = performance.now();
const prof = prepareProfile({ skills: extractSkills(cv), intereses: ["tecnologia"], titulo: "Desarrolladora frontend", cv_text: cv }, index);
for (const o of offers) scoreMatch(o, prof, index);
console.log(`puntuar ${offers.length} avisos para un perfil: ${(performance.now() - t).toFixed(0)} ms`);
