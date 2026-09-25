#!/usr/bin/env python3
"""Probe: verifica cookie li_at contra LinkedIn jobs search (Uruguay)."""
import re
import urllib.request

li_at = open("li_at.txt", encoding="utf-8").read().strip()
url = "https://www.linkedin.com/jobs/search/?location=Uruguay&start=0"
req = urllib.request.Request(url, headers={
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
    "Accept-Language": "es-UY,es;q=0.9,en;q=0.8",
    "Cookie": f"li_at={li_at}",
})
try:
    res = urllib.request.urlopen(req, timeout=30)
    html = res.read().decode("utf-8", "replace")
    print("HTTP:", res.status, "| final URL:", res.url[:120])
    print("login-wall:", ("authwall" in res.url) or ("login" in res.url and "jobs/search" not in res.url))
    ids = sorted(set(re.findall(r"/jobs/view/(\d+)", html)))
    print("job ids en pagina:", len(ids), ids[:10])
except Exception as e:
    print("ERROR:", type(e).__name__, str(e)[:300])
