/** Diccionario de habilidades (canonico -> variantes) ES/EN. */
export const SKILLS: Record<string, string[]> = {
  python: ["python"],
  javascript: ["javascript", "js ", "ecmascript"],
  typescript: ["typescript", "ts "],
  react: ["react", "reactjs", "next.js", "nextjs"],
  nodejs: ["node", "nodejs", "node.js", "express"],
  java: ["java ", "spring", "spring boot"],
  dotnet: [".net", "dotnet", "c#", "asp.net"],
  php: ["php", "laravel", "symfony"],
  ruby: ["ruby", "rails"],
  golang: ["golang", "go developer", "desarrollador go"],
  sql: ["sql", "mysql", "postgresql", "postgres", "oracle", "sql server"],
  excel: ["excel", "planilla", "spreadsheet"],
  sap: ["sap"],
  powerbi: ["power bi", "powerbi", "tableau", "qlik"],
  testing: ["testing", "qa ", "selenium", "cypress", "postman"],
  devops: ["devops", "docker", "kubernetes", "aws", "azure", "gcp", "ci/cd", "jenkins", "terraform"],
  diseno: ["photoshop", "illustrator", "figma", "diseño", "diseno", "community manager", "redes sociales"],
  marketing: ["marketing", "seo", "sem ", "ads", "google ads", "meta ads", "email marketing"],
  ventas: ["ventas", "vendedor", "comercial", "crm", "prospeccion", "cartera de clientes"],
  atencion_cliente: ["atencion al cliente", "call center", "customer", "mesa de ayuda"],
  administracion: ["administracion", "administrativo", "contable", "facturacion", "tesoreria", "rrhh", "recursos humanos", "liquidacion de sueldos", "nomina"],
  contabilidad: ["contador", "contadora", "balance", "auditoria", "impuestos", "dgi"],
  logistica: ["logistica", "deposito", "inventario", "stock", "reparto", "cadeteria"],
  conducir: ["libreta", "licencia de conducir", "chofer", "conductor", "camion"],
  autoelevador: ["autoelevador", "montacargas", "zorra"],
  cocina: ["cocina", "cocinero", "mozo", "camarero", "barista", "panaderia", "pasteleria"],
  salud: ["enfermeria", "medico", "farmacia", "odontologia", "cuidador", "salud"],
  educacion: ["docente", "profesor", "maestro", "educacion"],
  oficios: ["electricidad", "electricista", "plomeria", "plomero", "carpinteria", "mecanica", "soldadura", "albanileria", "pintura", "mantenimiento"],
  seguridad: ["seguridad", "vigilancia", "guardia", "porteria"],
  limpieza: ["limpieza", "domestica", "mucama"],
  hoteleria: ["hotel", "turismo", "recepcion", "huespedes"],
  gerencia: ["gerencia", "liderazgo", "gestion de equipos", "coordinacion", "jefatura"],
  ingles: ["ingles", "english", "bilingue", "bilingual"],
  portugues: ["portugues", "portugués"],
  estudiante: ["estudiante", "cursando", "facultad", "universidad", "utec", "udelar"],
  sin_experiencia: ["sin experiencia", "primer empleo", "primer-empleo"],
  // seniority como señales
  senior: ["senior", "semi-senior", "semisenior"],
  junior: ["junior", "trainee", "pasante", "primer empleo", "sin experiencia"],
  lead: ["lead", "lider", "head of", "gerente", "supervisor", "encargado"],
};

export function norm(s: string) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/** Devuelve las habilidades canonicas presentes en el texto. */
export function extractSkills(text: string): string[] {
  const t = ` ${norm(text)} `;
  const found: string[] = [];
  for (const [skill, variants] of Object.entries(SKILLS)) {
    if (variants.some((v) => t.includes(norm(v)))) found.push(skill);
  }
  return found;
}
