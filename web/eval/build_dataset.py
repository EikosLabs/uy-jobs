"""Genera eval/offers.json desde engine/ofertas.csv con los clasificadores v1 y v2.
Uso (desde web/): python3 eval/build_dataset.py"""
import csv, json, sys, os
HERE = os.path.dirname(os.path.abspath(__file__))
ENGINE = os.path.join(HERE, "..", "..", "engine")
sys.path.insert(0, ENGINE)
csv.field_size_limit(sys.maxsize)
from enrich import classify, first_match, MODAL, SENIOR, dept_of, mine_experiencia  # v1
from nlp import classify_offer, seniority_of, modalidad_of  # v2

rows = list(csv.DictReader(open(os.path.join(ENGINE, "ofertas.csv"), encoding="utf-8")))
out = []
for r in rows:
    text = " ".join(r[k] or "" for k in ("titulo", "descripcion", "requisitos", "contrato")).lower()
    out.append({
        "id": int(r["id"]), "fuente": r["fuente"], "titulo": r["titulo"], "empresa": r["empresa"],
        "ubicacion": r["ubicacion"], "descripcion": r["descripcion"], "requisitos": r["requisitos"] or None,
        "departamento": dept_of(r["ubicacion"]), "tags": "",
        "experiencia_min": mine_experiencia(r["descripcion"], r["requisitos"], r["titulo"]),
        "categoria": classify(text), "categoria_v1": classify(text),
        "seniority_v1": first_match(text, SENIOR) or None, "modalidad_v1": first_match(text, MODAL) or None,
        "categoria_v2": classify_offer(r["titulo"], r["descripcion"], r["requisitos"] or "")[0],
        "seniority_v2": seniority_of(r["titulo"], r["descripcion"]) or None,
        "modalidad_v2": modalidad_of(r["titulo"], r["descripcion"]) or None,
    })
json.dump(out, open(os.path.join(HERE, "offers.json"), "w"), ensure_ascii=False)
print(f"offers.json: {len(out)} avisos")
