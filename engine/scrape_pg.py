#!/usr/bin/env python3
"""Scraper uy-jobs directo a Postgres (glyphium-postgres, DB uyjobs).

Reusa scrapeo de scraper.py y clasificacion de enrich.py, pero guarda en
Postgres con upsert por url (sin SQLite intermedio).

Uso:
    export DATABASE_URL=postgresql://uyjobs:PASS@glyphium-postgres:5432/uyjobs
    python scrape_pg.py --fuente todas --paginas 5 --detalle 100 --delay 1.0
    python scrape_pg.py --enrich-only   # solo reclasifica todo
"""

import argparse
import os
import re
import sys
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from scraper import load_proxies, scrape  # noqa: E402
from enrich import CATS, MODAL, SENIOR, classify, dept_of, first_match, mine_experiencia, mine_jornada, mine_salary, parse_salary  # noqa: E402
from nlp import classify_offer, modalidad_of, seniority_of  # noqa: E402

UPSERT = """
INSERT INTO ofertas
  (fuente, oferta_id, titulo, empresa, ubicacion, departamento, salario,
   contrato, jornada, fecha_publicacion, url, descripcion,
   requisitos, fecha_scrapeo)
VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s, now())
ON CONFLICT (url) DO UPDATE SET
  descripcion = CASE WHEN EXCLUDED.descripcion <> '' THEN EXCLUDED.descripcion ELSE ofertas.descripcion END,
  requisitos = CASE WHEN EXCLUDED.requisitos <> '' THEN EXCLUDED.requisitos ELSE ofertas.requisitos END,
  contrato = CASE WHEN EXCLUDED.contrato <> '' THEN EXCLUDED.contrato ELSE ofertas.contrato END,
  jornada = CASE WHEN EXCLUDED.jornada <> '' THEN EXCLUDED.jornada ELSE ofertas.jornada END,
  salario = CASE WHEN EXCLUDED.salario <> '' THEN EXCLUDED.salario ELSE ofertas.salario END,
  titulo = CASE WHEN ofertas.titulo = '' OR ofertas.titulo IS NULL THEN EXCLUDED.titulo ELSE ofertas.titulo END,
  departamento = CASE WHEN EXCLUDED.departamento <> '' THEN EXCLUDED.departamento ELSE ofertas.departamento END,
  fecha_scrapeo = CASE WHEN EXCLUDED.descripcion <> '' THEN now() ELSE ofertas.fecha_scrapeo END
"""


def get_conn(dsn):
    import psycopg2
    return psycopg2.connect(dsn)


def upsert_rows(dsn, rows):
    import psycopg2.extras
    con = get_conn(dsn)
    cur = con.cursor()
    n_new = 0
    per = {}  # fuente -> [listados, nuevos]
    for o in rows:
        per.setdefault(o["fuente"], [0, 0])[0] += 1
        cur.execute("SELECT descripcion FROM ofertas WHERE url = %s", (o["url"],))
        existed = cur.fetchone()
        cur.execute(
            UPSERT,
            (o["fuente"], o["oferta_id"], o["titulo"], o["empresa"],
             o["ubicacion"], dept_of(o["ubicacion"]), o["salario"], o["contrato"], o["jornada"],
             o["fecha_publicacion"], o["url"], o["descripcion"],
             o["requisitos"]),
        )
        if not existed:
            n_new += 1
            per[o["fuente"]][1] += 1
    con.commit()
    cur.execute("SELECT COUNT(*) FROM ofertas")
    total = cur.fetchone()[0]
    con.close()
    return n_new, total, per


def enrich_all(dsn, full=False):
    con = get_conn(dsn)
    cur = con.cursor()
    if full:
        cur.execute(
            "SELECT id, titulo, descripcion, requisitos, contrato, salario, ubicacion, jornada FROM ofertas")
    else:
        # incremental: solo recientes o sin clasificar
        cur.execute(
            """SELECT id, titulo, descripcion, requisitos, contrato, salario, ubicacion, jornada FROM ofertas
               WHERE fecha_scrapeo > now() - interval '7 days'
                  OR COALESCE(categoria,'') = ''""")
    rows = cur.fetchall()
    print(f"enrich: {len(rows)} filas ({'full' if full else 'incremental'})")
    n = 0
    for oid, tit, desc, req, cont, sal, ubi, jor in rows:
        text = " ".join(x or "" for x in (tit, desc, req, cont, jor)).lower()
        # v2 (nlp.py): el título manda, palabras completas, ES + EN
        cat, _conf = classify_offer(tit, desc, req)
        modal = modalidad_of(tit, " ".join(x or "" for x in (desc, cont)))
        sen = seniority_of(tit, desc)
        tags = [cat]
        if modal:
            tags.append(modal)
        if sen:
            tags.append(sen)
        if any(k in text for k in ("ingles", "inglés", "english", "bilingue")):
            tags.append("ingles")
        if any(k in text for k in ("portugues", "portugués", "portuguese")):
            tags.append("portugues")
        if any(k in text for k in ("primer empleo", "primera experiencia", "sin experiencia", "no se requiere experiencia",
                                   "no requiere experiencia", "no excluyente la experiencia", "experiencia no excluyente")):
            tags.append("primer-empleo")
        if any(k in text for k in ("part time", "part-time", "medio tiempo", "media jornada", "medio horario", "4 horas diarias",
                                   "20 horas semanales", "jornada parcial")):
            tags.append("part-time")
        # estricto: que el aviso hable de estudiantes, no que pida un título universitario
        if any(k in text for k in ("estudiante", "cursando", "pasantia", "pasantía", "pasante", "becario", "trainee")) \
                or sen in ("estudiante", "pasantia"):
            tags.append("estudiantes")
        if any(k in text for k in ("joven", "jovenes", "jóvenes", "joven profesional")):
            tags.append("joven")
        if any(k in text for k in ("horario flexible", "flexibilidad horaria", "flexible")):
            tags.append("flexible")
        if any(k in text for k in ("universitario", "terciario", "grado", "licenciatura", "tecnicatura")):
            tags.append("estudios")
        num, mon = parse_salary(sal or "")
        sal_text = sal or ""
        if num is None and desc:
            mined, num, mon = mine_salary(desc)
            if num is not None:
                sal_text = mined
        jor_text = jor or ""
        if not jor_text.strip() and (desc or cont):
            mined_j = mine_jornada(desc, cont, tit)
            if mined_j:
                jor_text = mined_j
        cur.execute(
            "UPDATE ofertas SET categoria=%s, tags=%s, modalidad=%s,"
            " seniority=%s, salario=%s, salario_num=%s, moneda=%s, departamento=%s, jornada=%s, experiencia_min=%s WHERE id=%s",
            (cat, ",".join(tags), modal or None, sen or None, sal_text or None, num, mon or None, dept_of(ubi or ""), jor_text or None, mine_experiencia(desc, req, tit), oid))
        n += 1
    con.commit()
    cur.execute(
        "SELECT categoria, COUNT(*) FROM ofertas GROUP BY 1 ORDER BY 2 DESC")
    cats = cur.fetchall()
    con.close()
    return n, cats


def load_known(dsn):
    """{url: True si ya tiene descripcion completa} + asegura tabla de estado."""
    con = get_conn(dsn)
    cur = con.cursor()
    cur.execute("""CREATE TABLE IF NOT EXISTS scrape_state (
        fuente text primary key, last_run timestamptz, nuevos int default 0, total int default 0)""")
    cur.execute("SELECT url, (COALESCE(descripcion,'') <> '') AS full FROM ofertas")
    known = {url: full for url, full in cur.fetchall()}
    con.commit()
    con.close()
    return known


FUENTES = ("computrabajo", "buscojobs", "linkedin", "indeed", "gallito")


def record_state(dsn, fuente, per):
    con = get_conn(dsn)
    cur = con.cursor()
    for f in FUENTES if fuente == "todas" else (fuente,):
        listados, nuevos = per.get(f, (0, 0))
        if not listados:
            print(f"[ALERTA] {f}: 0 avisos (bloqueo o cambio en el sitio)")
        cur.execute("SELECT COUNT(*) FROM ofertas WHERE fuente = %s", (f,))
        cur.execute(
            """INSERT INTO scrape_state (fuente, last_run, nuevos, total)
               VALUES (%s, now(), %s, %s)
               ON CONFLICT (fuente) DO UPDATE SET last_run = now(), nuevos = EXCLUDED.nuevos, total = EXCLUDED.total""",
            (f, nuevos, cur.fetchone()[0]))
    con.commit()
    con.close()


def main():
    ap = argparse.ArgumentParser(description="Scraper uy-jobs a Postgres")
    ap.add_argument("--fuente", default="todas",
                    choices=["todas", "computrabajo", "buscojobs", "linkedin", "indeed", "gallito"])
    ap.add_argument("--paginas", type=int, default=5)
    ap.add_argument("--detalle", type=int, default=100,
                    help="max avisos con descripcion completa (0=todos)")
    ap.add_argument("--sin-detalle", action="store_true")
    ap.add_argument("--delay", type=float, default=1.0)
    ap.add_argument("--proxy-file", default="")
    ap.add_argument("--dsn", default=os.environ.get("DATABASE_URL", ""))
    ap.add_argument("--enrich-only", action="store_true")
    ap.add_argument("--full-enrich", action="store_true",
                    help="recalcula todas las filas (default: solo recientes/sin clasificar)")
    a = ap.parse_args()
    if not a.dsn:
        print("ERROR: falta DATABASE_URL (--dsn o env)", file=sys.stderr)
        sys.exit(1)
    if a.proxy_file:
        load_proxies(a.proxy_file)
    if not a.enrich_only:
        known = load_known(a.dsn)
        print(f"memoria: {len(known)} urls conocidas ({sum(known.values())} con detalle)")
        rows = scrape(a.fuente, a.paginas, a.detalle, a.sin_detalle, a.delay, known=known)
        nuevas, total, per = upsert_rows(a.dsn, rows)
        print(f"scrape: {len(rows)} avisos, nuevas: {nuevas}, total PG: {total}")
        for f, (n, nv) in sorted(per.items()):
            print(f"  {f}: {n} listados, {nv} nuevos")
        record_state(a.dsn, a.fuente, per)
    n, cats = enrich_all(a.dsn, full=a.full_enrich or a.enrich_only)
    print(f"enriquecidos: {n}")
    print("categorias:", cats)


if __name__ == "__main__":
    main()
