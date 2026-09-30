/** Habilidades (canónica -> variantes) ES/EN, v2.
 * Se buscan como palabras completas (sin "js " ni "ts " frágiles).
 * Las claves de nivel (estudiante, junior, senior, lead, sin_experiencia)
 * se conservan como señales para el match, no como habilidades. */
import { norm } from "@/lib/text";

export { norm };

export const SKILLS: Record<string, string[]> = {
  // lenguajes y plataformas
  python: ["python", "django", "flask", "fastapi", "pandas", "numpy"],
  javascript: ["javascript", "js", "ecmascript", "jquery"],
  typescript: ["typescript"],
  react: ["react", "reactjs", "react.js", "nextjs", "next.js", "redux"],
  react_native: ["react native"],
  angular: ["angular", "angularjs"],
  vue: ["vue", "vuejs", "vue.js", "nuxt"],
  nodejs: ["node", "nodejs", "node.js", "express", "nestjs"],
  java: ["java", "spring", "spring boot", "springboot", "jvm", "kotlin"],
  dotnet: [".net", "dotnet", "c#", "asp.net", "net core", "entity framework"],
  php: ["php", "laravel", "symfony", "wordpress"],
  ruby: ["ruby", "rails", "ruby on rails"],
  golang: ["golang", "go developer", "desarrollador go"],
  elixir: ["elixir", "phoenix"],
  cpp: ["c++", "cplusplus"],
  rust: ["rust"],
  scala: ["scala"],
  mobile: ["android", "ios", "swift", "flutter", "dart", "mobile developer", "desarrollo mobile"],
  genexus: ["genexus"],
  // datos e IA
  sql: ["sql", "mysql", "postgresql", "postgres", "oracle", "sql server", "t-sql", "pl/sql", "mariadb"],
  nosql: ["mongodb", "mongo", "redis", "cassandra", "dynamodb", "elasticsearch"],
  data_engineering: ["spark", "databricks", "airflow", "dbt", "snowflake", "etl", "data warehouse", "data lake", "kafka", "big data", "hadoop"],
  machine_learning: ["machine learning", "aprendizaje automatico", "deep learning", "tensorflow", "pytorch", "scikit-learn", "sklearn", "mlops", "ml engineer"],
  ia_generativa: ["llm", "llms", "genai", "ia generativa", "generative ai", "openai", "langchain", "prompt engineering", "rag", "agentic"],
  bi: ["power bi", "powerbi", "tableau", "qlik", "looker", "business intelligence", "data studio"],
  analitica: ["data analyst", "analista de datos", "analitica", "analytics", "estadistica", "statistics", "r studio", "spss"],
  // infraestructura y calidad
  cloud: ["aws", "amazon web services", "azure", "gcp", "google cloud", "cloud"],
  devops: ["devops", "docker", "kubernetes", "k8s", "terraform", "ansible", "ci/cd", "jenkins", "github actions", "gitlab ci", "helm"],
  linux: ["linux", "unix", "bash", "shell scripting", "sysadmin"],
  redes: ["redes", "networking", "cisco", "ccna", "tcp/ip", "firewall", "telefonia ip", "voip"],
  ciberseguridad: ["ciberseguridad", "cybersecurity", "seguridad informatica", "pentesting", "soc", "siem", "iso 27001"],
  testing: ["testing", "qa", "quality assurance", "selenium", "cypress", "playwright", "postman", "jmeter", "test automation", "automatizacion de pruebas"],
  git: ["git", "github", "gitlab", "bitbucket"],
  api: ["api", "apis", "rest", "restful", "graphql", "microservicios", "microservices", "soap"],
  soporte_it: ["soporte tecnico", "help desk", "helpdesk", "service desk", "mesa de ayuda", "soporte it", "itil"],
  // producto y gestión
  agile: ["scrum", "agile", "agil", "kanban", "jira", "sprint"],
  gestion_proyectos: ["gestion de proyectos", "project management", "project manager", "pmp", "pmo", "ms project"],
  producto: ["product manager", "product owner", "roadmap", "discovery", "product management"],
  ux_ui: ["ux", "ui", "ux/ui", "user experience", "figma", "sketch", "adobe xd", "prototipado", "wireframes"],
  // negocio
  excel: ["excel", "excel avanzado", "planilla", "planillas", "spreadsheet", "google sheets", "tablas dinamicas", "macros"],
  sap: ["sap", "sap fi", "sap mm", "sap sd", "s/4hana"],
  erp: ["erp", "netsuite", "odoo", "dynamics 365", "gns"],
  crm: ["crm", "salesforce", "hubspot", "zoho", "pipedrive"],
  ventas: ["ventas", "vendedor", "vendedora", "comercial", "sales", "prospeccion", "cartera de clientes", "cierre de ventas", "negociacion", "b2b", "b2c", "key account", "account management", "preventa"],
  atencion_cliente: ["atencion al cliente", "atencion a clientes", "call center", "contact center", "customer service", "customer support", "customer success", "servicio al cliente"],
  marketing_digital: ["marketing digital", "seo", "sem", "google ads", "meta ads", "facebook ads", "email marketing", "growth", "performance marketing", "google analytics", "paid media"],
  marketing: ["marketing", "trade marketing", "branding", "brand", "investigacion de mercado", "market research"],
  redes_sociales: ["redes sociales", "community manager", "social media", "instagram", "tiktok", "contenidos", "content"],
  diseno: ["photoshop", "illustrator", "indesign", "diseno grafico", "diseñador grafico", "graphic design", "canva", "after effects", "premiere", "motion graphics", "animacion"],
  administracion: ["administracion", "administrativo", "administrativa", "back office", "gestion administrativa", "data entry", "secretaria"],
  contabilidad: ["contabilidad", "contable", "contador", "contadora", "balance", "balances", "asientos", "conciliacion bancaria", "conciliaciones", "accounting", "cuentas a pagar", "cuentas a cobrar"],
  finanzas: ["finanzas", "finance", "financiero", "tesoreria", "treasury", "presupuesto", "budget", "flujo de caja", "cash flow", "fp&a", "analisis financiero"],
  impuestos: ["impuestos", "tributario", "tax", "dgi", "bps", "iva", "irpf", "irae", "transfer pricing"],
  auditoria: ["auditoria", "audit", "auditor", "control interno", "compliance"],
  facturacion: ["facturacion", "facturas", "invoicing", "billing", "cobranza", "cobranzas", "collections"],
  rrhh: ["rrhh", "recursos humanos", "human resources", "seleccion de personal", "reclutamiento", "recruiting", "talent acquisition", "onboarding"],
  liquidacion_sueldos: ["liquidacion de sueldos", "nomina", "payroll", "sueldos y jornales"],
  compras: ["compras", "procurement", "purchasing", "proveedores", "abastecimiento", "sourcing"],
  comercio_exterior: ["comercio exterior", "comex", "importaciones", "exportaciones", "aduana", "incoterms"],
  // operaciones y oficios
  logistica: ["logistica", "logistics", "deposito", "almacen", "warehouse", "inventario", "inventarios", "stock", "picking", "reparto", "distribucion", "supply chain", "cadena de suministro"],
  conducir: ["libreta", "libreta de conducir", "licencia de conducir", "chofer", "conductor", "driver", "camion", "libreta cat"],
  autoelevador: ["autoelevador", "montacargas", "zorra electrica", "forklift"],
  produccion: ["linea de produccion", "operario", "operaria", "planta industrial", "manufactura", "manufacturing", "bpm", "gmp"],
  calidad: ["control de calidad", "aseguramiento de calidad", "iso 9001", "haccp"],
  mantenimiento: ["mantenimiento", "maintenance", "mantenimiento preventivo", "mantenimiento correctivo"],
  electricidad: ["electricidad", "electricista", "electrico", "tableros electricos", "instalaciones electricas", "electronica", "electromecanica"],
  mecanica: ["mecanica", "mecanico", "motores", "diesel", "hidraulica", "neumatica", "soldadura", "soldador", "torneria"],
  construccion: ["construccion", "obra civil", "albanileria", "albanil", "pintura", "carpinteria", "plomeria", "sanitaria", "autocad", "revit"],
  seguridad_laboral: ["seguridad laboral", "seguridad e higiene", "prevencionista", "hse", "higiene y seguridad"],
  seguridad: ["guardia de seguridad", "seguridad fisica", "vigilancia", "vigilante", "guardia", "porteria", "custodia"],
  limpieza: ["limpieza", "cleaning", "mucama", "domestica", "housekeeping"],
  // servicios
  cocina: ["cocina", "cocinero", "cocinera", "chef", "ayudante de cocina", "parrillero", "panaderia", "pasteleria", "reposteria"],
  salon: ["mozo", "moza", "camarero", "camarera", "barista", "bartender", "barman", "atencion en salon"],
  caja: ["cajero", "cajera", "manejo de caja", "arqueo de caja"],
  reposicion: ["reposicion", "reponedor", "reponedora", "gondola", "merchandising", "merchandiser"],
  hoteleria: ["hotel", "hoteleria", "recepcion", "front desk", "reservas", "huespedes", "turismo", "tourism", "concierge"],
  enfermeria: ["enfermeria", "enfermero", "enfermera", "auxiliar de enfermeria", "licenciada en enfermeria", "cuidados intensivos", "administracion de medicacion", "rcp", "triage"],
  medicina: ["medico", "medica", "medicina", "doctor", "odontologia", "odontologo", "pediatra"],
  farmacia: ["farmacia", "farmaceutico", "quimico farmaceutico", "visitador medico"],
  cuidados: ["cuidador", "cuidadora", "acompanante terapeutico", "cuidado de adultos mayores", "residencial"],
  psicologia: ["psicologia", "psicologo", "psicologa", "terapia ocupacional", "fisioterapia", "fisioterapeuta", "fonoaudiologia"],
  laboratorio: ["laboratorio", "analisis clinicos", "tecnico de laboratorio"],
  veterinaria: ["veterinaria", "veterinario", "veterinaria"],
  educacion: ["docente", "profesor", "profesora", "maestro", "maestra", "educacion", "ensenanza", "tutor", "capacitador"],
  // idiomas
  ingles: ["ingles", "english", "bilingue", "bilingual", "ingles avanzado", "fluent english"],
  portugues: ["portugues", "portuguese", "portugues avanzado"],
  // soft skills que los avisos piden explícitamente
  liderazgo: ["liderazgo", "leadership", "gestion de equipos", "manejo de equipos", "team management", "people management", "coordinacion de equipos"],
  comunicacion: ["comunicacion efectiva", "oratoria", "presentaciones efectivas"],
  // señales de nivel (no son habilidades; ver LEVEL_KEYS)
  estudiante: ["estudiante", "cursando", "facultad", "universidad", "utec", "udelar", "student"],
  sin_experiencia: ["sin experiencia", "primer empleo", "primer-empleo"],
  senior: ["senior", "semi-senior", "semisenior", "semi senior"],
  junior: ["junior", "trainee", "pasante", "pasantia"],
  lead: ["lead", "lider", "head of", "gerente", "supervisor", "encargado", "jefe", "jefa"],
};

/** Claves que describen nivel/situación, no habilidades compartibles. */
export const LEVEL_KEYS = ["estudiante", "sin_experiencia", "senior", "junior", "lead"];

function escapeRx(v: string): string {
  return v.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
}

// Una sola regex con todas las variantes, de la más larga a la más corta:
// un solo recorrido del texto, y en cada posición gana la frase más larga
// ("administracion de medicacion" no cuenta además como "administracion").
const NEEDLE_TO_SKILL = new Map<string, string>();
for (const [skill, vs] of Object.entries(SKILLS)) {
  for (const v of vs) {
    const n = norm(v);
    if (!NEEDLE_TO_SKILL.has(n)) NEEDLE_TO_SKILL.set(n, skill);
  }
}
const ALL_RX = new RegExp(
  `(?<![a-z0-9])(?:${[...NEEDLE_TO_SKILL.keys()].sort((a, b) => b.length - a.length).map(escapeRx).join("|")})(?![a-z0-9])`,
  "g"
);
const ORDER = Object.keys(SKILLS);

/** Habilidades canónicas presentes en el texto (palabras completas). */
export function extractSkills(text: string | null | undefined): string[] {
  const t = ` ${norm(text)} `;
  const found = new Set<string>();
  for (const m of t.matchAll(ALL_RX)) {
    const skill = NEEDLE_TO_SKILL.get(m[0]);
    if (skill) found.add(skill);
  }
  return ORDER.filter((k) => found.has(k));
}
