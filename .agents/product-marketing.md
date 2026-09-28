# Product Marketing Context — trabajogpt

**Document version:** v1
**Last updated:** 2026-09-26

## Product Overview
**One-liner:** Todos los trabajos de Uruguay en un solo lugar.
**What it does:** Agrega ofertas de Computrabajo, BuscoJobs, LinkedIn e Indeed, las categoriza y enriquece (rubro, modalidad, seniority, salario, departamento, jornada), calcula match con el CV del usuario y avisa de nuevas coincidencias. Incluye seguimiento de postulaciones tipo Excel.
**Product category:** Agregador de empleo / bolsa de trabajo.
**Product type:** Web app con registro (Next.js + Astro).
**Business model:** Gratis para buscadores. Sin monetización aún.

## Target Audience
**Target companies:** N/A (B2C).
**Decision-makers:** El propio buscador de empleo.
**Primary use case:** Encontrar trabajo en Uruguay sin revisar 5 portales.
**Jobs to be done:**
- Ver todas las ofertas relevantes en un solo lugar con buenos filtros.
- Saber cuáles encajan con mi perfil (match + avisos).
- Llevar el control de a qué me postulé y en qué estado está.
**Use cases:**
- Estudiantes / primer empleo que buscan pasantías y juniors.
- Profesionales que filtran por rubro, modalidad (remoto) y departamento.
- Gente que quiere aviso temprano de matches con su CV.

## Personas
B2C — sin matriz de stakeholders.

## Problems & Pain Points
**Core problem:** Las ofertas están dispersas en portales lentos, con buscadores malos y sin filtros útiles (rubro, remoto, departamento).
**Why alternatives fall short:**
- Computrabajo/BuscoJobs: buscador pobre, sin match, sin seguimiento.
- LinkedIn: ruido global, poco foco UY, rate limits.
- Gallito/Indeed: bloqueos y UX dispersa.
**What it costs them:** Horas por semana revisando portales; avisos buenos que se pierden; postulaciones sin seguimiento.
**Emotional tension:** Ansiedad de quedarse sin trabajo / perderse la oportunidad; frustración con portales toscos.

## Competitive Landscape
**Direct:** Computrabajo UY, BuscoJobs — caen en buscador, categorización y seguimiento.
**Secondary:** LinkedIn empleos, Indeed UY, Gallito — caen en foco local y ruido.
**Indirect:** Grupos de Facebook/WhatsApp de empleos, consultoras — caen en desorden y falta de trazabilidad.

## Differentiation
**Key differentiators:**
- Agregación multi-fuente con dedup y enrich semántico propio (categoría, seniority, salario minado, jornada, departamento).
- Match CV↔oferta con avisos + seguimiento de postulaciones (nadie local lo hace).
- Filtros que sí sirven: rubro, nivel (estudiante/junior), modalidad, departamento, mapa.
**Why customers choose us:** Ahorro de tiempo + no perderse matches + control de postulaciones, gratis.

## Objections
| Objection | Response |
|-----------|----------|
| ¿Por qué registrarme para ver ofertas? | El registro habilita match, avisos y seguimiento; la cuenta es gratis en 30 segundos. |
| ¿Mis datos están seguros? | Hash bcrypt, cookies httpOnly, HTTPS; política pública; Ley 18.331. |
| ¿Están actualizadas? | Scrapeo diario incremental + sello de fecha en cada aviso. |

**Anti-persona:** Empleadores buscando publicar (aún no hay posting); fuera de Uruguay.

## Switching Dynamics
**Push:** Portales lentos, sin filtros, sin avisos.
**Pull:** Todo junto, match automático, tracking de postulaciones.
**Habit:** Revisar Computrabajo de memoria cada día.
**Anxiety:** Dar datos (email/teléfono) a un sitio nuevo.

## Customer Language
**How they describe the problem:**
- "tengo que mirar en todos lados"
- "nunca me entero a tiempo"
**How they describe us:** (pendiente — capturar de usuarios reales, no inventar)
**Words to use:** ofertas, avisos, match, postulación, rubro, gratis.
**Words to avoid:** "	databases", jerga SaaS (pipeline, funnel) de cara al usuario.
**Glossary:**
| Term | Meaning |
|------|---------|
| match | % de encaje CV↔oferta |
| aviso | notificación de match |
| postulación | seguimiento.guardada/postulado/entrevista… |

## Brand Voice
**Tone:** Cálido, directo, uruguayo (voseo rioplatense).
**Style:** Corto y útil; sin humo.
**Personality:** Canchero, confiable, local, simple.

## Proof Points
**Metrics:** 1800+ ofertas activas; 5 fuentes; scrapeo diario. (No inventar más.)
**Customers:** — (pendiente)
**Testimonials:** — (pendiente, no inventar)
**Value themes:**
| Theme | Proof |
|-------|-------|
| Ahorro de tiempo | 5 portales en 1 + filtros |
| No perderse nada | match + avisos diarios |
| Control | tracking de postulaciones |

## Goals
**Business goal:** Crecer base de usuarios registrados en Uruguay.
**Conversion action:** Registro (email o Google).
**Current metrics:** 2 usuarios (2026-09-26). Funnel sin instrumentar → ver tracking plan.

## Changelog
- v1 (2026-09-26) — Initial context.
