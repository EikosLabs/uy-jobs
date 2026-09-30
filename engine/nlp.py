#!/usr/bin/env python3
"""Procesamiento de texto de ofertas (v2): rubro, nivel y modalidad.

Diferencias con el clasificador por substrings de enrich.py (v1):
- normaliza (minúsculas, sin tildes) y busca PALABRAS completas, no
  fragmentos ("it" ya no coincide dentro de "capacitación");
- el título manda: pesa 4x frente a la descripción, y de la descripción
  solo se lee el comienzo (el resto suele ser texto institucional);
- vocabulario ES + EN (LinkedIn/Indeed publican mucho en inglés);
- "manager"/"gerente" es un nivel, no un rubro: "Sales Manager" es ventas.

Se evalúa con web/eval (ver web/eval/README.md).
"""

import re
import unicodedata

TITLE_W = 4
BODY_CHARS = 1500


def norm(s):
    s = unicodedata.normalize("NFD", s or "").encode("ascii", "ignore").decode().lower()
    return re.sub(r"\s+", " ", s)


def _rx(words):
    """Palabras/frases -> regex con límites de palabra. 'enfermer*' = prefijo."""
    parts = []
    for w in words:
        w = norm(w).strip()
        if not w.rstrip("*"):
            continue  # palabra que se vacía al normalizar (p. ej. otro alfabeto)
        if w.endswith("*"):
            parts.append(re.escape(w[:-1]) + r"[a-z]*")
        else:
            parts.append(re.escape(w))
    return re.compile(r"(?<![a-z0-9])(?:" + "|".join(parts) + r")(?![a-z0-9])")


# Rubro -> vocabulario. El orden no importa: decide el puntaje.
CATS_V2 = {
    "tecnologia": [
        "software", "developer", "desarrollador*", "programador*", "engineer", "ingeniero de software",
        "backend", "back-end", "frontend", "front-end", "fullstack", "full stack", "full-stack",
        "devops", "sre", "site reliability", "qa", "tester", "testing", "test automation", "automation engineer",
        "data engineer", "data scientist", "data analyst", "analista de datos", "cientifico de datos", "data",
        "machine learning", "ml", "mlops", "ai engineer", "inteligencia artificial", "llm",
        "cloud", "aws", "azure", "gcp", "kubernetes", "linux", "sysadmin", "administrador de sistemas",
        "sistemas", "it", "helpdesk", "help desk", "service desk", "soporte tecnico", "soporte it", "redes",
        "infraestructura", "ciberseguridad", "cybersecurity", "security engineer", "seguridad informatica",
        "java", "python", "javascript", "typescript", "react", "angular", "vue", "node", "nodejs", ".net", "c#",
        "golang", "elixir", "php", "ruby", "flutter", "ios", "android", "mobile", "genexus", "sap", "salesforce",
        "product manager", "product owner", "scrum master", "ux", "ui", "ux/ui", "architect", "arquitecto de software",
        "tech lead", "technical", "tecnico informatico", "analista programador", "analista funcional", "business analyst",
        "integration", "api", "erp", "servidores", "servers", "big data", "computos", "centro de computos", "telecomunicaciones", "telecom*", "technical project manager", "it project manager", "crm developer", "netsuite", "database", "base de datos", "dba", "bi", "power bi",
    ],
    "ventas": [
        "vendedor*", "ventas", "venta", "comercial", "sales", "account executive", "account manager",
        "key account", "kam", "business development", "bdr", "sdr", "preventa", "pre-venta", "presales",
        "televentas", "telemarketing", "cajero*", "reponedor*", "promotor*", "merchandiser", "relevador*",
        "vendas", "agente de vendas", "retail", "store manager", "tienda", "local comercial", "asesor comercial",
        "ejecutivo comercial", "ejecutivo de cuentas", "ejecutivo de ventas", "alliances", "partnerships",
        "revenue", "closer", "inside sales", "field sales", "territory manager", "client partner", "client advisor", "expansion manager", "business developer", "desarrollo de negocios", "desarrollo comercial",
    ],
    "administracion": [
        "administrativ*", "administrative", "asistente", "assistant", "virtual assistant", "secretari*",
        "recepcionista", "receptionist", "back office", "backoffice", "data entry", "operaciones",
        "operations", "office", "oficina", "coordinador administrativo", "auxiliar administrativo",
        "compras", "procurement", "planning analyst", "planificacion", "planificador*", "project coordinator", "coordinacion de proyectos", "purchasing", "sourcing", "abastecimiento", "gestion documental",
    ],
    "finanzas": [
        "contador*", "contable", "contabilidad", "accounting", "accountant", "finanzas", "finance", "financial",
        "tesoreria", "treasury", "facturacion", "invoicing", "billing", "cuentas a cobrar", "cuentas a pagar",
        "accounts payable", "accounts receivable", "collections", "cobranza*", "auditor*", "audit",
        "impuestos", "tax", "transfer pricing", "controller", "controlling", "fp&a", "credito*", "banca",
        "banking", "riesgo*", "risk", "payments", "pagos", "presupuesto*", "budget", "fraude", "fraud", "suscriptor*", "underwriter", "seguros", "insurance", "actuari*", "compliance", "conciliacion*", "liquidacion de sueldos",
    ],
    "rrhh": [
        "rrhh", "recursos humanos", "human resources", "hr", "talent acquisition", "recruiter", "reclutador*",
        "reclutamiento", "seleccion de personal", "hiring", "staffing", "people", "people analytics",
        "compensations", "compensation", "benefits", "beneficios", "nomina", "payroll", "capacitacion",
        "desarrollo organizacional", "talento", "clima laboral",
    ],
    "logistica": [
        "logistica", "logistics", "deposito", "almacen*", "warehouse", "picker", "picking", "packing",
        "chofer*", "conductor*", "driver", "repartidor*", "reparto", "delivery", "cadete", "cadeteria",
        "camion*", "libreta", "autoelevador*", "montacargas", "forklift", "inventario*", "stock", "supply chain",
        "cadena de suministro", "distribucion", "transporte", "shipping", "despacho", "expedicion",
        "shift supervisor", "flota", "comex", "comercio exterior", "importaciones", "exportaciones", "aduana*", "supply", "supply development",
    ],
    "atencion_cliente": [
        "atencion al cliente", "atencion a clientes", "customer service", "customer support", "customer success",
        "customer experience", "customer retention", "retencion de clientes", "call center", "contact center", "mesa de ayuda", "soporte al cliente",
        "servicio al cliente", "agente telefonico", "operador telefonico", "teleoperador*", "cx",
    ],
    "marketing": [
        "marketing", "mercadeo", "community manager", "redes sociales", "social media", "content", "contenido*",
        "copywriter", "seo", "sem", "growth", "publicidad", "advertising", "brand", "marca", "trade marketing",
        "diseñador grafico", "disenador grafico", "graphic designer", "designer", "diseno grafico", "animator",
        "animador", "2d", "3d", "motion", "audiovisual", "fotograf*", "comunicacion", "prensa", "crm manager",
        "market analyst", "market research", "investigacion de mercado", "production", "campaign manager", "campaign*", "paid media",
    ],
    "operarios": [
        "operario*", "operator", "operador de maquina*", "produccion", "production operator", "planta",
        "fabrica", "manufactura", "manufacturing", "armado", "ensamblado", "empaque", "packaging",
        "linea de produccion", "supervisor de produccion", "peon*", "ayudante general", "calidad",
        "quality inspector", "control de calidad",
    ],
    "oficios": [
        "electricista", "electricidad", "electronica", "electromecanic*", "plomer*", "sanitari*", "carpinter*",
        "mecanic*", "mechanic", "soldador*", "welder", "albanil*", "pintor*", "tecnico electricista",
        "mantenimiento", "maintenance", "refrigeracion", "aire acondicionado", "herrer*", "tornero",
        "oficial", "motores", "diesel", "tapicer*", "jardiner*",
    ],
    "salud": [
        "enfermer*", "nurse", "medic*", "doctor", "farmac*", "pharmac*", "odontolog*", "dentist*", "clinica",
        "clinical", "hospital", "sanatorio", "salud", "health", "healthcare", "cuidador*", "caregiver",
        "acompanante terapeutico", "psicolog*", "psycholog*", "fisioterapeut*", "fisiatra", "kinesiolog*",
        "nutricionista", "laboratorio", "terapia ocupacional", "cuidado de personas", "referente de cuidado", "gmp", "masajista", "terapeuta", "therapist", "partera", "veterinari*",
    ],
    "hoteleria_turismo": [
        "hotel*", "hostel", "turismo", "tourism", "travel", "viajes", "recepcion de hotel", "front desk",
        "conserje", "concierge", "mucama", "housekeeping", "huesped*", "guest", "resort", "f&b",
        "food and beverage", "agencia de viajes", "guia turistic*",
    ],
    "gastronomia": [
        "cocin*", "cook", "chef", "sous chef", "ayudante de cocina", "mozo", "moza", "camarer*", "waiter",
        "barista", "bartender", "barman", "panader*", "pasteler*", "reposter*", "bakery", "gastronom*",
        "restaurant*", "parrillero", "pizzero", "sushiman", "carniceria", "carnicer*", "fiambreria", "rotiseria",
        "catering", "bacher*", "lavaplatos",
    ],
    "educacion": [
        "docente", "profesor*", "teacher", "maestr*", "educador*", "educacion", "education", "ensenanza",
        "tutor*", "instructor*", "capacitador*", "pedagog*", "educativo", "colegio", "escuela", "liceo",
        "universidad", "caif",
    ],
    "ingenieria": [
        "ingenier*", "engineering", "electrical engineer", "mechanical engineer", "civil engineer",
        "ingeniero civil", "ingeniero electrico", "ingeniero mecanico", "ingeniero industrial",
        "ingeniero quimico", "hidrolog*", "hidraulic*", "geotecni*", "estructural", "obra", "construccion",
        "construction", "arquitect*", "revit", "autocad", "modelador*", "bim", "project engineer", "field engineer", "prevencionista", "seguridad industrial",
        "safety", "hse", "medio ambiente", "environmental", "agronom*", "topograf*",
    ],
    "servicios": [
        "limpieza", "cleaning", "cleaner", "portero", "porteria", "conserjeria", "vigilante", "vigilancia",
        "guardia", "guardia de seguridad", "security guard", "seguridad fisica", "personal de seguridad",
        "domestica", "empleada domestica", "niñera", "ninera", "cuidado de ninos", "lavanderia", "marinero*",
        "capitan", "tripulante*", "surveillance",
    ],
    "gerencia": [
        "gerente general", "general manager", "director general", "ceo", "coo", "country manager",
        "managing director", "gerencia general", "administrador de empresa", "gerente", "subgerente", "gerente de sucursal", "strategy",
    ],
}

# Palabras que en el título casi nunca son el rubro por sí solas: se descuentan.
WEAK_IN_TITLE = {"data", "it", "production", "technical", "operations", "calidad", "people", "obra", "safety"}

_CAT_RX = {cat: [(w, _rx([w])) for w in words] for cat, words in CATS_V2.items()}

SENIOR_V2 = [
    ("pasantia", ["pasante", "pasantia", "intern", "internship", "practicante"]),
    ("estudiante", ["estudiante", "estudiantes", "student"]),
    ("junior", ["junior", "jr", "trainee", "entry level", "sin experiencia", "primer empleo", "aprendiz"]),
    ("lead", ["lead", "leader", "lider", "head of", "jefe", "jefa", "gerente", "engineering manager", "director", "directora",
              "principal", "staff", "encargad*", "supervisor*", "coordinador*"]),
    ("senior", ["senior", "sr", "semi senior", "semi-senior", "semisenior", "ssr", "expert"]),
]
_SEN_RX = [(label, _rx(words)) for label, words in SENIOR_V2]

REMOTE_RX = _rx(["remoto", "remote", "teletrabajo", "home office", "work from home", "trabajo a distancia", "100% remoto"])
HYBRID_RX = _rx(["hibrido", "hybrid", "semipresencial", "semi presencial"])
NOT_REMOTE_RX = re.compile(r"(no es|no|sin posibilidad de)\s+(remoto|teletrabajo|home office)|100% presencial|solo presencial")


def _hits(text, pairs):
    return [w for w, rx in pairs if rx.search(text)]


def classify_offer(titulo, descripcion="", requisitos=""):
    """Rubro de una oferta. Devuelve (categoria, confianza 0-1)."""
    t = norm(titulo)
    body = norm(" ".join(x or "" for x in (descripcion, requisitos)))[:BODY_CHARS]
    scores = {}
    title_hit = {}
    for cat, pairs in _CAT_RX.items():
        th = [w for w in _hits(t, pairs) if norm(w) not in WEAK_IN_TITLE]
        weak = [w for w in _hits(t, pairs) if norm(w) in WEAK_IN_TITLE]
        bh = _hits(body, pairs)
        s = TITLE_W * len(th) + 1.5 * len(weak) + min(len(bh), 6)
        if s:
            scores[cat] = s
            title_hit[cat] = bool(th)
    if not scores:
        return "otros", 0.0
    ranked = sorted(scores.items(), key=lambda kv: (-kv[1], not title_hit.get(kv[0]), kv[0]))
    best, s1 = ranked[0]
    s2 = ranked[1][1] if len(ranked) > 1 else 0
    # sin señal en el título y poca evidencia en el texto: mejor "otros" que adivinar
    if not title_hit.get(best) and s1 < 2:
        return "otros", 0.2
    conf = min(1.0, (s1 - s2 + 1) / (s1 + 1))
    return best, round(conf, 2)


def seniority_of(titulo, descripcion=""):
    """Nivel: primero el título; en la descripción solo pasantía/estudiante/junior explícitos."""
    t = norm(titulo)
    for label, rx in _SEN_RX:
        if rx.search(t):
            return label
    body = norm(descripcion)[:BODY_CHARS]
    for label, rx in _SEN_RX[:3]:
        if rx.search(body):
            return label
    return ""


def modalidad_of(titulo, descripcion=""):
    t = norm(f"{titulo} {descripcion}")
    if NOT_REMOTE_RX.search(t):
        return ""
    if HYBRID_RX.search(t):
        return "hibrido"
    if REMOTE_RX.search(t):
        return "remoto"
    return ""
