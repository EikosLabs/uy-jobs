#!/usr/bin/env python3
"""Seed Supabase desde ofertas.db (upsert por url, en tandas).

Env: SUPABASE_URL + SUPABASE_SERVICE_KEY (nunca commitear).
Uso: python seed_supabase.py [--db ofertas.db] [--batch 100]
"""

import argparse
import json
import os
import sqlite3
import urllib.request

COLS = ["fuente", "oferta_id", "titulo", "empresa", "ubicacion", "salario",
        "contrato", "jornada", "fecha_publicacion", "url", "descripcion",
        "requisitos", "fecha_scrapeo", "categoria", "tags", "modalidad",
        "seniority", "salario_num", "moneda"]


def post(url, key, rows):
    req = urllib.request.Request(
        f"{url}/rest/v1/ofertas?on_conflict=url",
        data=json.dumps(rows).encode(),
        headers={"apikey": key, "Authorization": f"Bearer {key}",
                 "Content-Type": "application/json",
                 "Prefer": "resolution=merge-duplicates"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=60) as r:
        r.read()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--db", default="ofertas.db")
    ap.add_argument("--batch", type=int, default=100)
    a = ap.parse_args()
    url = os.environ["SUPABASE_URL"].rstrip("/")
    key = os.environ["SUPABASE_SERVICE_KEY"]
    con = sqlite3.connect(a.db)
    con.row_factory = sqlite3.Row
    rows = [dict(r) for r in con.execute(
        f"SELECT {','.join(COLS)} FROM ofertas")]
    con.close()
    # descripcion muy larga: recorta a 20k para el POST
    for r in rows:
        if r["descripcion"] and len(r["descripcion"]) > 20000:
            r["descripcion"] = r["descripcion"][:20000]
    for i in range(0, len(rows), a.batch):
        post(url, key, rows[i:i + a.batch])
        print(f"  {min(i + a.batch, len(rows))}/{len(rows)}", flush=True)
    print(f"seed OK: {len(rows)} filas")


if __name__ == "__main__":
    main()
