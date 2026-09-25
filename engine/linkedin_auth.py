#!/usr/bin/env python3
"""LinkedIn autenticado (cookies li_at + JSESSIONID) — paginacion profunda.

Lee li_at.txt y jsessionid.txt (nunca loguea sus valores).
Reusa parseo/guardado de scraper.py. Guarda progreso cada 100 avisos.

Uso:
    python linkedin_auth.py --delay 0.6 --db ofertas.db --csv ofertas.csv
"""

import argparse
import re
import ssl
import time
import urllib.request

from scraper import clean, export_csv, li_list, save

UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/126.0 Safari/537.36")
LI_LIST = ("https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings"
           "/search?location=Uruguay&start={s}")
LI_DETAIL = "https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/{jid}"


def load_cookie():
    li = open("li_at.txt", encoding="utf-8").read().strip()
    js = open("jsessionid.txt", encoding="utf-8").read().strip().strip('"')
    return f"li_at={li}; JSESSIONID={js}"


COOKIE = load_cookie()


def afetch(url, timeout=30):
    req = urllib.request.Request(url, headers={
        "User-Agent": UA,
        "Accept-Language": "es-UY,es;q=0.9",
        "Cookie": COOKIE,
    })
    ctx = ssl.create_default_context()
    with urllib.request.urlopen(req, timeout=timeout, context=ctx) as r:
        return r.read().decode("utf-8", errors="ignore")


def li_detail_auth(oferta):
    try:
        h = afetch(LI_DETAIL.format(jid=oferta["oferta_id"]))
    except Exception as e:  # noqa: BLE001
        print(f"  [WARN] detalle {oferta['oferta_id']}: {type(e).__name__}")
        return oferta
    m = re.search(r"show-more-less-html__markup[^>]*>(.*?)</div>", h, re.S)
    if m:
        desc = clean(m.group(1))
    else:
        txt = clean(h)
        i = txt.find("Job description:")
        desc = txt[i:i + 6000] if i > 0 else txt[:6000]
    desc = re.sub(r"^Job Descriptions?:\s*", "", desc, flags=re.I)
    oferta["descripcion"] = desc[:6000]
    return oferta


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--delay", type=float, default=0.6)
    ap.add_argument("--db", default="ofertas.db")
    ap.add_argument("--csv", default="ofertas.csv")
    ap.add_argument("--max-start", type=int, default=2000)
    a = ap.parse_args()

    print("[linkedin-auth] paginando listados...")
    todo, seen, empty = [], set(), 0
    start = 0
    while start <= a.max_start:
        try:
            h = afetch(LI_LIST.format(s=start))
        except Exception as e:  # noqa: BLE001
            print(f"  start={start} ERROR {type(e).__name__}: {str(e)[:100]}")
            time.sleep(30)
            try:
                h = afetch(LI_LIST.format(s=start))
            except Exception as e2:  # noqa: BLE001
                print(f"  reintento fallido ({type(e2).__name__}), corto.")
                break
        rows = li_list(h) if h else []
        new = [o for o in rows if o["url"] not in seen]
        for o in new:
            seen.add(o["url"])
        todo.extend(new)
        print(f"  start={start}: {len(rows)} avisos, {len(new)} nuevos, acum={len(todo)}",
              flush=True)
        empty = empty + 1 if not rows else 0
        if empty >= 3:
            break
        start += 10
        time.sleep(a.delay)

    print(f"[linkedin-auth] detalles de {len(todo)} avisos...")
    done = 0
    for i, o in enumerate(todo, 1):
        li_detail_auth(o)
        done += 1
        if i % 50 == 0:
            print(f"  {i}/{len(todo)}", flush=True)
        if i % 100 == 0:
            ins, total = save(a.db, todo[:i])
            print(f"  [checkpoint] total en DB: {total}", flush=True)
        time.sleep(a.delay)
    ins, total = save(a.db, todo)
    n = export_csv(a.db, a.csv)
    print(f"nuevos: {ins} | total en DB: {total} | CSV: {n} filas -> {a.csv}")


if __name__ == "__main__":
    main()
