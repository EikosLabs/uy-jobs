"""Precisión del clasificador de rubros contra etiquetas manuales (gold_categories.json)."""
import json, sys, collections, os
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "..", "engine"))
from nlp import classify_offer

gold = json.load(open(os.path.join(HERE, "gold_categories.json")))
offers = {str(x["id"]): x for x in json.load(open(os.path.join(HERE, "offers.json")))}
ok, errs = 0, []
for k, v in gold.items():
    x = offers[k]
    c, _ = classify_offer(x["titulo"], x["descripcion"], x["requisitos"] or "")
    if c == v:
        ok += 1
    else:
        errs.append((x["titulo"][:55], v, c))
print(f"clasificador v2: {ok}/{len(gold)} = {ok / len(gold):.0%}")
for e in errs:
    print("  x", e)
dist = collections.Counter(classify_offer(x["titulo"], x["descripcion"], x["requisitos"] or "")[0] for x in offers.values())
print(dist.most_common())
