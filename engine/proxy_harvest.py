"""Refresca el pool de proxies gratuitos y verifica cada uno contra LinkedIn.

Fuentes (repos/APIs gratuitas, actualizadas a diario):
  - ProxyScrape API v2
  - github.com/TheSpeedX/PROXY-List (http.txt)
  - github.com/monosans/proxy-list (proxies/http.txt)
  - Geonode API (proxylist.geonode.com)

Uso:
    python proxy_harvest.py [--max-test 160]

Genera proxies.txt (funcionales, ordenados por latencia) y
proxies_raw.txt (todos los candidatos). Solo stdlib.
"""

import argparse
import json
import re
import ssl
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor

ctx = ssl.create_default_context()
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
TARGET = ("https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings"
          "/search?location=Uruguay&start=0")
SOURCES = {
    "proxyscrape": "https://api.proxyscrape.com/v2/?request=displayproxies&protocol=http&timeout=10000&country=all&ssl=all&anonymity=all",
    "speedx": "https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/http.txt",
    "monosans": "https://raw.githubusercontent.com/monosans/proxy-list/main/proxies/http.txt",
    "geonode1": "https://proxylist.geonode.com/api/proxy-list?limit=200&page=1&sort_by=lastChecked&sort_type=desc",
    "geonode2": "https://proxylist.geonode.com/api/proxy-list?limit=200&page=2&sort_by=lastChecked&sort_type=desc",
    "openproxylist": "https://api.openproxylist.xyz/http.txt",
    "spysme": "http://spys.me/proxy.txt",
    "mmpx12": "https://raw.githubusercontent.com/mmpx12/proxy-list/master/http.txt",
    "clarketm": "https://raw.githubusercontent.com/clarketm/proxy-list/master/proxy-list-raw.txt",
    "proxifly": "https://raw.githubusercontent.com/proxifly/free-proxy-list/main/proxies/protocols/http/data.txt",
    "pubproxy": "http://pubproxy.com/api/proxy?limit=20&format=txt&type=http",
}


def dl(url):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=30, context=ctx) as r:
        return r.read().decode("utf-8", errors="ignore")


def test(px):
    t0 = time.time()
    try:
        handler = urllib.request.ProxyHandler(
            {"http": f"http://{px}", "https": f"http://{px}"})
        opener = urllib.request.build_opener(handler)
        req = urllib.request.Request(TARGET, headers=UA)
        with opener.open(req, timeout=12) as r:
            ok = r.status == 200 and b"jobPosting" in r.read(4000)
            return (px, ok, round(time.time() - t0, 1))
    except Exception:  # noqa: BLE001
        return (px, False, 0)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--max-test", type=int, default=160)
    a = ap.parse_args()
    pool = set()
    for name, url in SOURCES.items():
        try:
            raw = dl(url)
            if name.startswith("geonode"):
                d = json.loads(raw)
                got = [f"{x['ip']}:{x['port']}" for x in d.get("data", [])
                       if x.get("port") and x.get("ip")]
            else:
                got = re.findall(r"\d+\.\d+\.\d+\.\d+:\d+", raw)
            print(f"{name}: {len(got)} candidatos")
            pool.update(got)
        except Exception as e:  # noqa: BLE001
            print(f"{name}: FAIL {str(e)[:100]}")
    print("unicos:", len(pool))
    open("proxies_raw.txt", "w").write("\n".join(sorted(pool)))
    cands = sorted(pool)[:a.max_test]
    print(f"testeando {len(cands)} contra LinkedIn...")
    good = [r for r in ThreadPoolExecutor(max_workers=30).map(test, cands) if r[1]]
    for px, _, dt in good:
        print(f"  OK {px} {dt}s")
    print(f"funcionales: {len(good)}/{len(cands)}")
    good.sort(key=lambda x: x[2])
    open("proxies.txt", "w").write("\n".join(p for p, _, _ in good))


if __name__ == "__main__":
    main()
