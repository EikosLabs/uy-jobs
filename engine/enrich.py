#!/usr/bin/env python3
"""Enriquece ofertas.db: categoria, tags, modalidad, seniority, salario_num.

Clasificador por reglas (keywords ES/EN sobre titulo+descripcion).
Uso: python enrich.py [--db ofertas.db]
Idempotente: recalcula todo en cada corrida.
"""

import argparse
import re
import sqlite3

CATS = {
    "tecnologia": ["software", "developer", "programador", "sistemas", "datos",
                   "devops", "qa", "testing", "helpdesk", "redes", "infraestructura",
                   "backend", "frontend", "fullstack", "full-stack", "golang",
                   "python", "java ", ".net", "soporte tecnico", "tecnico en",
                   "tecnologia de la informacion", "it ", "data ", "cloud"],
    "ventas": ["vendedor", "ventas", "comercial", "ejecutivo", "cajero",
               "reponedor", "promotor", "vendedora", "televentas", "account executive",
               "key account", "sales"],
    "administracion": ["administrativo", "contable", "contador", "finanzas",
                       "controller", "tesoreria", "facturacion", "secretaria",
                       "recepcionista", "rrhh", "recursos humanos", "talento",
                       "nomina", "liquidacion de sueldos", "conciliacion"],
    "gastronomia": ["cocina", "cocinero", "ayudante de cocina", "mozo", "camarero",
                    "barista", "panadero", "pastelero", "gastronom"],
    "salud": ["enfermer", "medico", "salud", "farmacia", "odontolog", "clinica",
              "hospital", "cuidador", "acompanante terapeutico"],
    "logistica": ["chofer", "conductor", "deposito", "logistica", "repartidor",
                  "almacen", "camion", "libreta cat", "delivery", "cadete"],
    "atencion_cliente": ["atencion al cliente", "call center", "customer",
                         "mesa de ayuda", "soporte al cliente"],
    "marketing": ["marketing", "community manager", "diseno", "disenador",
                  "publicidad", "redes sociales", "trade marketing", "contenidos"],
    "operarios": ["operario", "produccion", "fabrica", "planta", "armado",
                  "empaque", "operador"],
    "hoteleria_turismo": ["hotel", "mucama", "turismo", "hostel", "viajes",
                          "hilton", "huesped"],
    "educacion": ["docente", "profesor", "maestro", "educador", "ensenanza"],
    "oficios": ["electricista", "plomero", "carpintero", "mecanico", "soldador",
                "albanil", "pintor", "tecnico", "mantenimiento", "seguridad electronica"],
    "gerencia": ["gerente", "jefe de", "director", "coordinador", "supervisor",
                 "encargado", "general manager"],
}

MODAL = {"remoto": ["teletrabajo", "remoto", "remote", "home office", "work from home", "desde casa"],
         "hibrido": ["hibrido", "híbrido", "hybrid"]}
SENIOR = {"senior": ["senior", " sr", "sr.", "semi-senior", "semisenior", "semi senior"],
          "junior": ["junior", " jr", "jr.", "trainee", "ssr"],
          "lead": ["lead", "jefe", "gerente", "lider", "head of", "director"],
          "pasantia": ["pasante", "pasantia", "pasantía", "intern "],
          "estudiante": ["estudiante", "estudiantil"]}

DEPTOS = ["Artigas", "Canelones", "Cerro Largo", "Colonia", "Durazno",
          "Flores", "Florida", "Lavalleja", "Maldonado", "Montevideo",
          "Paysandú", "Río Negro", "Rivera", "Rocha", "Salto",
          "San José", "Soriano", "Tacuarembó", "Treinta y Tres"]

# Capitales (para "cerca de mí"): nombre -> (lat, lng)
CAPITALES = {
    "Artigas": (-30.40, -56.47), "Salto": (-31.39, -57.96),
    "Paysandú": (-32.32, -58.08), "Río Negro": (-33.13, -58.30),
    "Soriano": (-33.25, -58.03), "Colonia": (-34.47, -57.84),
    "San José": (-34.34, -56.71), "Canelones": (-34.52, -56.28),
    "Montevideo": (-34.90, -56.16), "Maldonado": (-34.90, -54.95),
    "Rocha": (-34.48, -54.33), "Lavalleja": (-34.38, -55.24),
    "Florida": (-34.10, -56.21), "Durazno": (-33.38, -56.52),
    "Flores": (-33.54, -56.90), "Tacuarembó": (-31.73, -55.98),
    "Rivera": (-30.90, -55.55), "Cerro Largo": (-32.37, -54.19),
    "Treinta y Tres": (-33.23, -54.39),
}


def dept_of(ubicacion):
    """Normaliza ubicacion libre -> departamento (o '')."""
    import unicodedata
    u = unicodedata.normalize("NFD", ubicacion or "").encode("ascii", "ignore").decode().lower()
    for d in DEPTOS:
        dn = unicodedata.normalize("NFD", d).encode("ascii", "ignore").decode().lower()
        if dn in u:
            return d
    return ""


def classify(text):
    hits = {}
    for cat, kws in CATS.items():
        n = sum(1 for k in kws if k in text)
        if n:
            hits[cat] = n
    if not hits:
        return "otros"
    return sorted(hits.items(), key=lambda x: (-x[1], x[0]))[0][0]


def first_match(text, table):
    for label, kws in table.items():
        if any(k in text for k in kws):
            return label
    return ""


def parse_salary(s):
    if not s:
        return None, ""
    m = re.search(r"(us\$|\$u?|usd)\s*([\d\.\,]+)", s, re.I)
    if not m:
        return None, ""
    cur = "USD" if "us" in m.group(1).lower() else "UYU"
    raw = m.group(2)
    try:
        if "," in raw:
            num = float(raw.replace(".", "").replace(",", "."))
        elif raw.count(".") >= 1 and len(raw.split(".")[-1]) == 3:
            num = float(raw.replace(".", ""))
        else:
            num = float(raw)
        return num, cur
    except ValueError:
        return None, ""


SALARY_CTX = re.compile(
    r"(sueldo|salario|remuneraci[oó]n|ingreso|pago|ofrecemos|base)\b"
    r"[^.\n]{0,60}?((?:us\$|\$u?|usd)\s*[\d\.\,]{3,})", re.I)


def mine_salary(descripcion):
    """Busca un monto de salario en el texto (para avisos sin salario)."""
    if not descripcion:
        return "", None, ""
    m = SALARY_CTX.search(descripcion)
    if not m:
        return "", None, ""
    raw = m.group(2)
    num, mon = parse_salary(raw)
    if not num:
        return "", None, ""
    return raw.strip(), num, mon


# Minería de horario/jornada desde el texto (horarios, carga, turnos, días)
HORARIO_PATTERNS = [
    # carga horaria semanal
    (re.compile(r"(\d{1,2})\s*(?:hs|hrs|horas)\s*semanales", re.I), "hs semanales"),
    (re.compile(r"(\d{1,2})\s*(?:hs|hrs|horas)\s*(?:por|a la|/)\s*semana", re.I), "hs/semana"),
    (re.compile(r"jornada\s*completa", re.I), "jornada completa"),
    (re.compile(r"(?:jornada\s*parcial|medio\s*tiempo|part[-\s]?time|half[-\s]?time)", re.I), "medio tiempo"),
    (re.compile(r"full[-\s]?time|tiempo\s*completo", re.I), "tiempo completo"),
    (re.compile(r"turnos?\s*rotativos?", re.I), "turnos rotativos"),
    (re.compile(r"turno\s*(mañana|matutino)", re.I), "turno mañana"),
    (re.compile(r"turno\s*(tarde|vespertino)", re.I), "turno tarde"),
    (re.compile(r"turno\s*(noche|nocturno)", re.I), "turno noche"),
    (re.compile(r"lunes\s*a\s*(viernes|s[aá]bado)s?", re.I), "lun a vie"),
    (re.compile(r"lunes\s*a\s*viernes", re.I), "lun a vie"),
    (re.compile(r"fines?\s*de\s*semana|fin\s*de\s*semana|sabados?\s*y\s*domingos?", re.I), "fin de semana"),
    (re.compile(r"teletrabajo|trabajo\s*remoto|100%\s*remoto", re.I), "remoto"),
    (re.compile(r"h[ií]brido|hybrid", re.I), "híbrido"),
    (re.compile(r"presencial", re.I), "presencial"),
]

HORARIO_HORAS = re.compile(
    r"(?:de\s*)?(\d{1,2})(?::(\d{2}))?\s*(?:a|al|-)\s*(\d{1,2})(?::(\d{2}))?\s*(hs|hrs|horas)?", re.I)


def mine_jornada(*texts):
    """Extrae señales de horario/jornada y las compacta (para avisos sin jornada)."""
    t = " ".join(x or "" for x in texts)
    tl = t.lower()
    found = []
    for rx, label in HORARIO_PATTERNS:
        if rx.search(t) and label not in found:
            found.append(label)
    m = HORARIO_HORAS.search(t)
    if m:
        h1, m1, h2, m2 = m.group(1), m.group(2) or "00", m.group(3), m.group(4) or "00"
        try:
            if 0 <= int(h1) <= 23 and 0 <= int(h2) <= 23:
                found.append(f"{int(h1):02d}:{m1}-{int(h2):02d}:{m2}")
        except ValueError:
            pass
    # días sueltos si no hay rango
    if not any("lun" in f or "fin de semana" in f for f in found):
        if re.search(r"\bs[aá]bados?\b", tl):
            found.append("sábados")
    return " | ".join(found[:4])


EXP_YEARS = re.compile(
    r"(\d{1,2})\s*(?:años?|anos?)\s*(?:de\s*)?(?:experiencia|trayectoria|experi[eê]ncia)", re.I)


def mine_experiencia(*texts):
    """Extrae años mínimos de experiencia pedidos (entero o None)."""
    best = None
    for t in texts:
        if not t:
            continue
        for m in EXP_YEARS.finditer(t):
            try:
                n = int(m.group(1))
            except ValueError:
                continue
            if 0 <= n <= 30 and (best is None or n < best):
                best = n
    return best


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--db", default="ofertas.db")
    a = ap.parse_args()
    con = sqlite3.connect(a.db)
    for col in ("categoria TEXT", "tags TEXT", "modalidad TEXT",
                "seniority TEXT", "salario_num REAL", "moneda TEXT"):
        try:
            con.execute(f"ALTER TABLE ofertas ADD COLUMN {col}")
        except sqlite3.OperationalError:
            pass
    try:
        con.execute("ALTER TABLE ofertas ADD COLUMN experiencia_min INTEGER")
    except sqlite3.OperationalError:
        pass
    rows = con.execute(
        "SELECT id, titulo, descripcion, requisitos, contrato, salario, jornada FROM ofertas").fetchall()
    n = sal = jor = 0
    for oid, tit, desc, req, cont, sal_field, jor_field in rows:
        text = " ".join(x or "" for x in (tit, desc, req, cont)).lower()
        cat = classify(text)
        modal = first_match(text, MODAL)
        sen = first_match(text, SENIOR)
        tags = [cat]
        if modal:
            tags.append(modal)
        if sen:
            tags.append(sen)
        if any(k in text for k in ("ingles", "inglés", "english", "bilingue")):
            tags.append("ingles")
        if any(k in text for k in ("portugues", "portugués", "portuguese")):
            tags.append("portugues")
        if any(k in text for k in ("primer empleo", "sin experiencia")):
            tags.append("primer-empleo")
        if any(k in text for k in ("estudiante", "estudiantes", "cursando", "facultad", "universidad", "utec", "udelar")):
            tags.append("estudiantes")
        if any(k in text for k in ("joven", "jovenes", "jóvenes", "joven profesional")):
            tags.append("joven")
        if any(k in text for k in ("horario flexible", "flexibilidad horaria", "flexible")):
            tags.append("flexible")
        if any(k in text for k in ("part time", "part-time", "medio tiempo")):
            tags.append("part-time")
        if any(k in text for k in ("universitario", "terciario", "grado", "licenciatura", "tecnicatura")):
            tags.append("estudios")
        num, mon = parse_salary(sal_field or "")
        sal_text = sal_field or ""
        if num is None and desc:
            mined, num, mon = mine_salary(desc)
            if num is not None:
                sal_text = mined
                sal += 1
        jor_text = jor_field or ""
        if not jor_text.strip() and (desc or cont):
            mined_j = mine_jornada(desc, cont, tit)
            if mined_j:
                jor_text = mined_j
                jor += 1
        exp_min = mine_experiencia(desc, req, tit)
        con.execute(
            "UPDATE ofertas SET categoria=?, tags=?, modalidad=?, seniority=?,"
            " salario=?, salario_num=?, moneda=?, jornada=?, experiencia_min=? WHERE id=?",
            (cat, ",".join(tags), modal, sen, sal_text, num, mon, jor_text, exp_min, oid))
        n += 1
    con.commit()
    print(f"enriquecidos: {n} | salarios minados: {sal} | jornadas minadas: {jor}")
    print("categorias:", con.execute(
        "SELECT categoria, COUNT(*) FROM ofertas GROUP BY categoria ORDER BY 2 DESC").fetchall())
    print("modalidad:", con.execute(
        "SELECT modalidad, COUNT(*) FROM ofertas GROUP BY modalidad").fetchall())
    print("con salario_num:", con.execute(
        "SELECT COUNT(*) FROM ofertas WHERE salario_num IS NOT NULL").fetchone()[0])
    con.close()


if __name__ == "__main__":
    main()
