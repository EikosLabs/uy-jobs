#!/usr/bin/env python3
"""Importa ofertas.db (linkedin_auth) a Postgres con upsert por url."""
import os
import sqlite3
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from scrape_pg import enrich_all, get_conn  # noqa: E402

UPSERT_SQLITE = """
INSERT INTO ofertas
  (fuente, oferta_id, titulo, empresa, ubicacion, salario,
   contrato, jornada, fecha_publicacion, url, descripcion,
   requisitos, fecha_scrapeo)
VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s, now())
ON CONFLICT (url) DO UPDATE SET
  descripcion = CASE WHEN EXCLUDED.descripcion <> '' THEN EXCLUDED.descripcion ELSE ofertas.descripcion END,
  requisitos = CASE WHEN EXCLUDED.requisitos <> '' THEN EXCLUDED.requisitos ELSE ofertas.requisitos END,
  titulo = CASE WHEN ofertas.titulo = '' OR ofertas.titulo IS NULL THEN EXCLUDED.titulo ELSE ofertas.titulo END,
  fecha_scrapeo = CASE WHEN EXCLUDED.descripcion <> '' THEN now() ELSE ofertas.fecha_scrapeo END
"""


def main():
    db = sys.argv[1] if len(sys.argv) > 1 else "ofertas.db"
    dsn = os.environ["DATABASE_URL"]
    lite = sqlite3.connect(db)
    lite.row_factory = sqlite3.Row
    rows = lite.execute(
        "SELECT fuente, oferta_id, titulo, empresa, ubicacion, salario, contrato,"
        " jornada, fecha_publicacion, url, descripcion, requisitos FROM ofertas").fetchall()
    lite.close()
    con = get_conn(dsn)
    cur = con.cursor()
    new = 0
    for r in rows:
        cur.execute("SELECT 1 FROM ofertas WHERE url = %s", (r["url"],))
        if not cur.fetchone():
            new += 1
        cur.execute(UPSERT_SQLITE, tuple(r))
    con.commit()
    cur.execute("SELECT COUNT(*) FROM ofertas")
    total = cur.fetchone()[0]
    con.close()
    print(f"importados: {len(rows)} filas, nuevas: ~{new}, total PG: {total}")
    n, cats = enrich_all(dsn)
    print(f"enriquecidos: {n}")


if __name__ == "__main__":
    main()
