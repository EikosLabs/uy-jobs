# Evaluación offline del matching y la clasificación

Datos: 1.000 avisos reales (LinkedIn) de `engine/ofertas.csv`. **Sin datos de usuarios.**
`offers.json` no se versiona: se regenera con `python3 eval/build_dataset.py`.

| Comando (desde `web/`) | Qué mide |
|---|---|
| `python3 eval/eval_cats.py` | Precisión del rubro contra 100 avisos etiquetados a mano (`gold_categories.json`). |
| `holdout_categories.json` | 50 avisos etiquetados que NO se usaron para ajustar (medición honesta). |
| `npm run eval:match` | P@10, P@20 y MRR de v1 (baseline de git en `baseline/`) vs v2 para 8 perfiles. |
| `npm run eval:skills` | Casos de regresión de la extracción de habilidades. |
| `node eval/run.cjs eval/calibrate.ts` | Distribución de puntajes → umbrales (45 tarjetas, 55 alertas). |
| `node eval/run.cjs eval/bench.ts` | Tiempos de índice y puntaje. |

## Resultados (2026-09-30)

| | v1 | v2 |
|---|---|---|
| Rubro correcto (100 etiquetados) | 56% | 92% |
| Rubro correcto (50 no vistos) | 60% | 86% |
| "Otros" sobre 1.000 | 3% (pero 55% en tecnología) | 4% |
| Nivel "lead" sobre 1.000 | 43% (ruido) | 14% |
| P@10 promedio 8 perfiles | 0,48 | 0,63 |
| P@20 | 0,36 | 0,52 |
| MRR | 0,75 | 0,92 |

La relevancia de cada perfil es una regla sobre el título escrita a mano,
independiente de ambos algoritmos; es aproximada, sirve para comparar.
