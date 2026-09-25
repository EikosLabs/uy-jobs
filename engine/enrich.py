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

MODAL = {"remoto": ["teletrabajo", "remoto", "remote", "home office", "work from home"],
         "hibrido": ["hibrido", "híbrido", "hybrid"]}
SENIOR = {"senior": ["senior", " sr", "sr.", "semi-senior", "semisenior"],
          "junior": ["junior", " jr", "jr.", "trainee"],
          "lead": ["lead", "jefe", "gerente", "lider", "head of", "director"],
          "pasantia": ["pasante", "pasantia", "pasantía", "intern "]}


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
    rows = con.execute(
        "SELECT id, titulo, descripcion, requisitos, contrato, salario FROM ofertas").fetchall()
    n = 0
    for oid, tit, desc, req, cont, sal in rows:
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
        if any(k in text for k in ("primer empleo", "sin experiencia")):
            tags.append("primer-empleo")
        if any(k in text for k in ("part time", "part-time", "medio tiempo")):
            tags.append("part-time")
        num, mon = parse_salary(sal or "")
        con.execute(
            "UPDATE ofertas SET categoria=?, tags=?, modalidad=?, seniority=?,"
            " salario_num=?, moneda=? WHERE id=?",
            (cat, ",".join(tags), modal, sen, num, mon, oid))
        n += 1
    con.commit()
    print(f"enriquecidos: {n}")
    print("categorias:", con.execute(
        "SELECT categoria, COUNT(*) FROM ofertas GROUP BY categoria ORDER BY 2 DESC").fetchall())
    print("modalidad:", con.execute(
        "SELECT modalidad, COUNT(*) FROM ofertas GROUP BY modalidad").fetchall())
    print("con salario_num:", con.execute(
        "SELECT COUNT(*) FROM ofertas WHERE salario_num IS NOT NULL").fetchone()[0])
    con.close()


if __name__ == "__main__":
    main()
