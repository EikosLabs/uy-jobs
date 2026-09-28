#!/usr/bin/env python3
"""Prueba proxies.txt contra los 3 bloqueados: gallito, buscojobs, indeed."""
import re
import sys
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor

UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
TARGETS = {
    "gallito": ("https://www.gallito.com.uy/avisos/trabajo", lambda h: "Just a moment" not in h and ("aviso" in h.lower() or "trabajo" in h.lower()) and len(h) > 20000),
    "buscojobs": ("https://www.buscojobs.com.uy/ofertas", lambda h: "__NEXT_DATA__" in h and len(h) > 50000),
    "indeed": ("https://uy.indeed.com/jobs?q=trabajo&l=Uruguay&start=0", lambda h: "jobTitle" in h and "Security Check" not in h),
}


def test(args):
    px, name, url, okfn = args
    t0 = time.time()
    try:
        handler = urllib.request.ProxyHandler({"http": f"http://{px}", "https": f"http://{px}"})
        opener = urllib.request.build_opener(handler)
        req = urllib.request.Request(url, headers=UA)
        with opener.open(req, timeout=15) as r:
            h = r.read().decode("utf-8", errors="ignore")
            ok = r.status == 200 and okfn(h)
            return (name, px, ok, round(time.time() - t0, 1), len(h))
    except Exception as e:
        return (name, px, False, 0, str(e)[:60])


def main():
    pxs = [l.strip() for l in open("proxies.txt") if re.match(r"\d+\.\d+\.\d+\.\d+:\d+", l.strip())]
    print(f"probando {len(pxs)} proxies x {len(TARGETS)} sitios...")
    jobs = [(px, name, url, okfn) for px in pxs for name, (url, okfn) in TARGETS.items()]
    results = list(ThreadPoolExecutor(max_workers=20).map(test, jobs))
    by_target = {}
    for name, px, ok, dt, extra in results:
        by_target.setdefault(name, []).append((px, ok, dt, extra))
    for name, rows in by_target.items():
        good = [r for r in rows if r[1]]
        print(f"\n[{name}] {len(good)}/{len(rows)} pasan:")
        for px, _, dt, ln in good[:15]:
            print(f"  OK {px} {dt}s ({ln}b)")
        open(f"proxies-{name}.txt", "w").write("\n".join(p for p, _, _, _ in good))


if __name__ == "__main__":
    main()
