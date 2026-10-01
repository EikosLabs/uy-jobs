#!/usr/bin/env python3
"""Scraper de ofertas laborales Uruguay — Computrabajo + BuscoJobs + LinkedIn + Indeed + Gallito.

Solo stdlib. Guarda en SQLite (dedup por URL) y exporta a CSV.

Uso:
    python scraper.py --fuente todas --paginas 3 --detalle 0 --delay 1.0
    python scraper.py --fuente computrabajo --paginas 5 --detalle 20
    python scraper.py --fuente buscojobs --paginas 5 --sin-detalle

--detalle N: trae descripcion completa de hasta N avisos por fuente
             (0 = todos los listados).
--sin-detalle: solo datos del listado (mas rapido).
"""

import argparse
import csv
import html as htmlmod
import json
import os
import re
import sqlite3
import ssl
import time
import urllib.request
from datetime import datetime, timezone

UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}

FLARE_URL = os.environ.get("FLARE_URL", "http://127.0.0.1:8191/v1")
FLARE_SESSION = None
# Proxy residencial via tunel (ej: ssh -R desde tu PC): http://127.0.0.1:8888
UPSTREAM_PROXY = os.environ.get("UYJOBS_PROXY", "")
FLARE_PROXY = {"url": UPSTREAM_PROXY} if UPSTREAM_PROXY else None


def flare_cmd(payload, timeout=130):
    try:
        data = json.dumps(payload).encode()
        req = urllib.request.Request(FLARE_URL, data=data,
                                     headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return json.loads(r.read().decode("utf-8", errors="ignore"))
    except Exception as e:  # noqa: BLE001
        print(f"  [flare WARN] {str(e)[:100]}")
        return {}


def flare_session_create():
    global FLARE_SESSION
    d = flare_cmd({"cmd": "sessions.create"})
    sid = d.get("session")
    if sid:
        FLARE_SESSION = sid
        print(f"  [flare] sesion {sid[:8]}…")
    return sid


def flare_session_destroy():
    global FLARE_SESSION
    if FLARE_SESSION:
        flare_cmd({"cmd": "sessions.destroy", "session": FLARE_SESSION})
        FLARE_SESSION = None


def fetch_flare(url, timeout=200):
    """Pasa por FlareSolverr (resuelve Cloudflare/Turnstile). Devuelve HTML o ''."""
    payload = {"cmd": "request.get", "url": url, "maxTimeout": min(timeout, 240) * 1000}
    if FLARE_SESSION:
        payload["session"] = FLARE_SESSION
    if FLARE_PROXY:
        payload["proxy"] = FLARE_PROXY
    d = flare_cmd(payload, timeout=timeout + 25)
    sol = d.get("solution", {})
    if d.get("status") == "ok" and sol.get("status") == 200 and sol.get("response"):
        return sol["response"]
    print(f"  [flare] sin solucion para {url[:70]}")
    return ""

SCHEMA = """
CREATE TABLE IF NOT EXISTS ofertas (
  id INTEGER PRIMARY KEY,
  fuente TEXT NOT NULL,
  oferta_id TEXT,
  titulo TEXT,
  empresa TEXT,
  ubicacion TEXT,
  salario TEXT,
  contrato TEXT,
  jornada TEXT,
  fecha_publicacion TEXT,
  url TEXT UNIQUE,
  descripcion TEXT,
  requisitos TEXT,
  fecha_scrapeo TEXT
);
CREATE INDEX IF NOT EXISTS idx_fuente ON ofertas(fuente);
"""


def fetch(url, retries=3, timeout=25, via_proxy=False, all_proxy=False):
    if (via_proxy and PROXY_POOL) or (all_proxy and UPSTREAM_PROXY):
        hit = fetch_via_pool(url, timeout, force_all=all_proxy)
        if hit:
            return hit
        # si todos los proxies fallan, sigue directo abajo
    # tunel residencial: los 3 bloqueados salen siempre por ahi si esta configurado
    if UPSTREAM_PROXY and any(h in url for h in ("gallito", "buscojobs", "indeed")):
        hit = fetch_via_pool(url, timeout, force_all=True)
        if hit:
            return hit
    last = None
    for i in range(retries):
        try:
            req = urllib.request.Request(url, headers=UA)
            ctx = ssl.create_default_context()
            with urllib.request.urlopen(req, timeout=timeout, context=ctx) as r:
                return r.read().decode("utf-8", errors="ignore")
        except Exception as e:  # noqa: BLE001
            last = e
            time.sleep(1.5 * (i + 1))
    print(f"  [WARN] fallo {url}: {last}")
    return ""


PROXY_POOL = []
PROXY_I = 0
PROXY_BAD = set()


def load_proxies(path):
    global PROXY_POOL
    try:
        with open(path, encoding="utf-8") as f:
            PROXY_POOL = [l.strip() for l in f if re.match(r"\d+\.\d+\.\d+\.\d+:\d+", l.strip())]
        print(f"[proxies] {len(PROXY_POOL)} cargados de {path}")
    except FileNotFoundError:
        print(f"[proxies] no existe {path}, directo")


def next_proxy():
    global PROXY_I
    for _ in range(len(PROXY_POOL)):
        px = PROXY_POOL[PROXY_I % len(PROXY_POOL)]
        PROXY_I += 1
        if px not in PROXY_BAD:
            return px
    return None


def fetch_via_pool(url, timeout=25, tries=6, force_all=False):
    if force_all and UPSTREAM_PROXY:
        try:
            handler = urllib.request.ProxyHandler(
                {"http": UPSTREAM_PROXY, "https": UPSTREAM_PROXY})
            opener = urllib.request.build_opener(handler)
            req = urllib.request.Request(url, headers=UA)
            with opener.open(req, timeout=timeout) as r:
                return r.read().decode("utf-8", errors="ignore")
        except Exception as e:  # noqa: BLE001
            print(f"  [WARN] tunel {url[:60]}: {str(e)[:80]}")
            return ""
    for _ in range(min(tries, len(PROXY_POOL))):
        px = next_proxy()
        if not px:
            return ""
        try:
            handler = urllib.request.ProxyHandler(
                {"http": f"http://{px}", "https": f"http://{px}"})
            opener = urllib.request.build_opener(handler)
            req = urllib.request.Request(url, headers=UA)
            with opener.open(req, timeout=timeout) as r:
                return r.read().decode("utf-8", errors="ignore")
        except Exception:  # noqa: BLE001
            PROXY_BAD.add(px)
    print(f"  [WARN] pool agotado para {url[:80]}")
    return ""


def clean(s):
    if not s:
        return ""
    s = re.sub(r"<br\s*/?>", "\n", s, flags=re.I)
    s = re.sub(r"<[^>]+>", " ", s)
    s = htmlmod.unescape(s)
    return re.sub(r"\s+", " ", s).strip()


# ---------------- Computrabajo ----------------

CT_LIST = "https://uy.computrabajo.com/ofertas-de-trabajo/?q=&p={p}"
CT_BASE = "https://uy.computrabajo.com"


def ct_list(html):
    out = []
    for m in re.finditer(r"<article\b(.*?)</article>", html, re.S | re.I):
        a = m.group(1)
        oid = re.search(r"data-id='([A-F0-9]+)'", a)
        h2 = re.search(r'<h2[^>]*>\s*<a[^>]+href="([^"]+)"[^>]*>(.*?)</a>', a, re.S)
        if not h2:
            continue
        url = h2.group(1).split("#")[0]
        if url.startswith("/"):
            url = CT_BASE + url
        titulo = clean(h2.group(2))
        emp = re.search(r'<p class="dFlex vm_fx fs16 fc_base mt5">\s*(.*?)\s*</p>', a, re.S)
        ubi = re.search(r'<span class="mr10">\s*(.*?)\s*</span>', a, re.S)
        sal = re.search(
            r'<span class="dIB mr10">\s*<span class="icon i_salary"></span>\s*(.*?)\s*</span>',
            a, re.S,
        )
        fec = re.search(r'<p class="fs13 fc_aux mt15">\s*(.*?)\s*</p>', a, re.S)
        out.append({
            "fuente": "computrabajo",
            "oferta_id": oid.group(1) if oid else "",
            "titulo": titulo,
            "empresa": clean(emp.group(1)) if emp else "",
            "ubicacion": clean(ubi.group(1)) if ubi else "",
            "salario": clean(sal.group(1)) if sal else "",
            "contrato": "", "jornada": "",
            "fecha_publicacion": clean(fec.group(1)) if fec else "",
            "url": url, "descripcion": "", "requisitos": "",
        })
    return out


def ct_detail(oferta):
    h = fetch(oferta["url"])
    if not h:
        return oferta
    tags = [clean(t) for t in re.findall(r'<span class="tag base mb10">(.*?)</span>', h, re.S)]
    contrato, jornada = [], []
    for t in tags:
        tl = t.lower()
        if re.search(r"\$\s*U?\s*[\d]", t) and not oferta["salario"]:
            oferta["salario"] = t
            continue
        elif any(k in tl for k in ("contrato", "indefinido", "temporal", "zafral", "pasant")):
            contrato.append(t)
        elif any(k in tl for k in ("tiempo", "part", "full", "horario", "jornada", "remoto", "hibrido", "híbrido")):
            jornada.append(t)
        else:
            contrato.append(t)
    oferta["contrato"] = " | ".join(contrato)
    oferta["jornada"] = " | ".join(jornada)
    d = re.search(r'<p class="mbB">(.*?)</p>', h, re.S)
    if d:
        oferta["descripcion"] = clean(d.group(1))
    r = re.search(r'<ul class="disc mbB">(.*?)</ul>', h, re.S)
    if r:
        lis = [clean(x) for x in re.findall(r"<li[^>]*>(.*?)</li>", r.group(1), re.S)]
        oferta["requisitos"] = " | ".join(x for x in lis if x)
    return oferta


# ---------------- BuscoJobs ----------------

BJ_LIST = "https://www.buscojobs.com.uy/ofertas{pg}"  # pg = "" | "/2" ...
BJ_BASE = "https://www.buscojobs.com.uy"


def bj_list(html):
    out = []
    nd = re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', html, re.S)
    if not nd:
        return out
    try:
        d = json.loads(nd.group(1))
        ofertas = d["props"]["pageProps"]["resultadosIniciales"]["ofertas"]
    except (KeyError, json.JSONDecodeError):
        return out
    # URLs desde JSON-LD ItemList: ...-ID-<n> (regex directo, robusto a @graph)
    url_by_id = {}
    for m in re.finditer(r"(https://www\.buscojobs\.com\.uy/[a-z0-9\-\u00e1\u00e9\u00ed\u00f3\u00fa\u00f1]+-ID-\d+)", html, re.I):
        mm = re.search(r"ID-(\d+)$", m.group(1))
        if mm:
            url_by_id[mm.group(1)] = m.group(1)
    for o in ofertas:
        oid = str(o.get("IdOferta", ""))
        dep = (o.get("Departamento") or {}).get("Nombre", "")
        ciu = (o.get("Ciudad") or {}).get("Nombre", "")
        ubi = ciu if ciu and ciu == dep else ", ".join(x for x in (ciu, dep) if x)
        flags = []
        if o.get("PermiteTeletrabajo"):
            flags.append("Teletrabajo")
        if o.get("PermiteTrabajoHibrido"):
            flags.append("Hibrido")
        if o.get("PrimerEmpleo"):
            flags.append("Primer empleo")
        if o.get("EsPasantia"):
            flags.append("Pasantia")
        out.append({
            "fuente": "buscojobs",
            "oferta_id": oid,
            "titulo": (o.get("CargoVacante") or "").strip(),
            "empresa": (o.get("NombreEmpresa") or "").strip(),
            "ubicacion": ubi,
            "salario": "",
            "contrato": " | ".join(flags),
            "jornada": "",
            "fecha_publicacion": (o.get("FechaInicio") or "")[:10],
            "url": url_by_id.get(oid, f"{BJ_BASE}/ofertas"),
            "descripcion": (o.get("Descripcion") or "").strip(),
            "requisitos": "",
        })
    return out


def bj_detail(oferta):
    if oferta["url"].endswith("/ofertas"):
        return oferta
    h = fetch(oferta["url"])
    if not h:
        return oferta
    for ld in re.findall(r'<script type="application/ld\+json">(.*?)</script>', h, re.S):
        try:
            j = json.loads(ld)
        except json.JSONDecodeError:
            continue
        if isinstance(j, dict) and j.get("@type") == "JobPosting":
            if j.get("description"):
                oferta["descripcion"] = clean(j["description"])
            if j.get("title") and not oferta["titulo"]:
                oferta["titulo"] = clean(j["title"])
            break
    return oferta


# ---------------- LinkedIn (guest API, sin login) ----------------
# Rate limit aprox: ~10 paginas por IP. Para volumen, proxies (ver README).

LI_LIST = ("https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings"
           "/search?location=Uruguay&sortBy=DD&f_TPR=r604800&start={s}")
LI_VIEW = "https://www.linkedin.com/jobs/view/{jid}"
LI_DETAIL = "https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/{jid}"


def li_list(html):
    out = []
    for m in re.finditer(r'data-entity-urn="urn:li:jobPosting:(\d+)"(.*?)</li>', html, re.S):
        jid, body = m.group(1), m.group(2)
        t = re.search(r'base-search-card__title[^>]*>\s*(.*?)\s*<', body, re.S)
        c = re.search(r'base-search-card__subtitle[^>]*>(.*?)</h4>', body, re.S)
        loc = re.search(r'job-search-card__location[^>]*>\s*(.*?)\s*<', body, re.S)
        dt = re.search(r'datetime="([^"]+)"', body)
        out.append({
            "fuente": "linkedin",
            "oferta_id": jid,
            "titulo": clean(t.group(1)) if t else "",
            "empresa": clean(c.group(1)) if c else "",
            "ubicacion": clean(loc.group(1)) if loc else "",
            "salario": "",
            "contrato": "", "jornada": "",
            "fecha_publicacion": dt.group(1) if dt else "",
            "url": LI_VIEW.format(jid=jid),
            "descripcion": "", "requisitos": "",
        })
    return out


# ---------------- Indeed UY ----------------
# Nota: Indeed/Yahoo protegen con Cloudflare; desde IPs de datacenter suele
# devolver challenge (0 avisos, warn) sin romper la corrida.

IN_QUERIES = ["trabajo", "empleo", "remoto", "vendedor", "administrativo"]
IN_LIST = "https://uy.indeed.com/jobs?q={q}&l=Uruguay&sort=date&start={s}"
IN_VIEW = "https://uy.indeed.com/viewjob?jk={jk}"


def _in_snippets(html):
    """{jobkey: resumen} desde el JSON embebido (mosaic-provider-jobcards)."""
    m = re.search(r'providerData\["mosaic-provider-jobcards"\]\s*=\s*', html)
    if not m:
        return {}
    try:
        d, _ = json.JSONDecoder().raw_decode(html[m.end():])
        res = d["metaData"]["mosaicProviderJobCardsModel"]["results"]
    except (ValueError, KeyError, TypeError):
        return {}
    return {r.get("jobkey", ""): clean(r.get("snippet") or "")[:3000] for r in res}


def in_list(html):
    out = []
    for m in re.finditer(r"<td[^>]*class=\"[^\"]*resultContent[^\"]*\"[^>]*>(.*?)</td>", html, re.S | re.I):
        b = m.group(1)
        t = re.search(r"<h[23][^>]*class=\"[^\"]*jobTitle[^\"]*\"[^>]*>\s*<a[^>]+href=\"([^\"]+)\"[^>]*>(.*?)</a>", b, re.S)
        if not t:
            continue
        href = t.group(1).replace("&amp;", "&")
        titulo = clean(re.sub(r"<[^>]+>", " ", t.group(2)))
        jkm = re.search(r"data-jk=\"([a-f0-9]{10,})\"", b) or re.search(r"[?&]jk=([a-f0-9]{10,})", href)
        jid = jkm.group(1) if jkm else ""
        url = IN_VIEW.format(jk=jid) if jid else (href if href.startswith("http") else "https://uy.indeed.com" + href)
        c = re.search(r"data-testid=\"company-name\"[^>]*>(.*?)</(?:span|a|div)>", b, re.S)
        loc = re.search(r"data-testid=\"text-location\"[^>]*>(.*?)</div>", b, re.S)
        meta = [clean(x) for x in re.findall(r"<li[^>]*>(.*?)</li>", b, re.S)]
        sal = next((x for x in meta if re.search(r"\$", x)), "")
        tipo = " | ".join(x for x in meta if x and x != sal)
        snip = re.search(r"<div[^>]*class=\"[^\"]*job-snippet[^\"]*\"[^>]*>(.*?)</div>", b, re.S)
        fec = re.search(r"data-testid=\"myJobsStateDate\"[^>]*>(.*?)</span>", b, re.S)
        out.append({
            "fuente": "indeed",
            "oferta_id": jid,
            "titulo": titulo,
            "empresa": clean(c.group(1)) if c else "",
            "ubicacion": clean(loc.group(1)) if loc else "",
            "salario": sal,
            "contrato": tipo, "jornada": "",
            "fecha_publicacion": clean(fec.group(1)) if fec else "",
            "url": url, "descripcion": clean(snip.group(1)) if snip else "", "requisitos": "",
        })
    snips = _in_snippets(html)
    for o in out:
        if not o["descripcion"]:
            o["descripcion"] = snips.get(o["oferta_id"], "")
    # fallback: enlaces /ver-oferta o viewjob sueltos
    if not out:
        for m in re.finditer(r"href=\"([^\"]*(?:viewjob\?jk=[a-f0-9]{10,}|/oferta[^\"]*))\"", html):
            href = m.group(1)
            jk = re.search(r"jk=([a-f0-9]{10,})", href)
            url = IN_VIEW.format(jk=jk.group(1)) if jk else href
            if url.startswith("/"):
                url = "https://uy.indeed.com" + url
            out.append({"fuente": "indeed", "oferta_id": jk.group(1) if jk else "",
                        "titulo": "", "empresa": "", "ubicacion": "", "salario": "",
                        "contrato": "", "jornada": "", "fecha_publicacion": "",
                        "url": url, "descripcion": "", "requisitos": ""})
    return out


def in_detail(oferta):
    h = fetch_flare(oferta["url"]) or fetch(oferta["url"])
    if not h or "Security Check" in h or "Just a moment" in h:
        return oferta
    d = re.search(r"<div[^>]*id=\"jobDescriptionText\"[^>]*>(.*?)</div>\s*</div>", h, re.S)
    if d:
        oferta["descripcion"] = clean(d.group(1))[:6000]
    if not oferta["titulo"]:
        t = re.search(r"<h2[^>]*class=\"[^\"]*jobsearch-JobInfoHeader-title[^\"]*\"[^>]*>(.*?)</", h, re.S)
        if t:
            oferta["titulo"] = clean(t.group(1))
    sal = re.search(r"<div[^>]*id=\"salaryInfoAndJobType\"[^>]*>(.*?)</div>", h, re.S)
    if sal:
        txt = clean(sal.group(1))
        if re.search(r"\$", txt) and not oferta["salario"]:
            oferta["salario"] = txt[:120]
    return oferta


# ---------------- Gallito (avisos clasificados UY) ----------------
# Best-effort: el sitio usa Cloudflare; si responde, parsea tarjetas y JSON-LD.

GA_LIST = "https://www.gallito.com.uy/avisos/trabajo{pg}"  # pg = "" | "?pag=N"
GA_BASE = "https://www.gallito.com.uy"


def ga_list(html):
    out = []
    if not html or "Just a moment" in html:
        return out
    for m in re.finditer(r"<article\b(.*?)</article>", html, re.S | re.I):
        a = m.group(1)
        link = re.search(r"<a[^>]+href=\"([^\"]+)\"[^>]*>(.*?)</a>", a, re.S)
        if not link:
            continue
        url, titulo = link.group(1), clean(link.group(2))
        if url.startswith("/"):
            url = GA_BASE + url
        if "trabajo" not in url.lower() and "aviso" not in url.lower():
            pass  # igual lo aceptamos: la seccion ya es trabajo
        emp = re.search(r"<(?:span|p)[^>]*class=\"[^\"]*(?:empresa|vendedor|seller)[^\"]*\"[^>]*>(.*?)</", a, re.S | re.I)
        ubi = re.search(r"<(?:span|p)[^>]*class=\"[^\"]*(?:ubicacion|zona|departamento|location)[^\"]*\"[^>]*>(.*?)</", a, re.S | re.I)
        pre = re.search(r"<(?:span|p|div)[^>]*class=\"[^\"]*(?:precio|salario|price)[^\"]*\"[^>]*>(.*?)</", a, re.S | re.I)
        oid = re.search(r"(\d{4,})", url)
        out.append({
            "fuente": "gallito",
            "oferta_id": oid.group(1) if oid else "",
            "titulo": titulo,
            "empresa": clean(emp.group(1)) if emp else "",
            "ubicacion": clean(ubi.group(1)) if ubi else "",
            "salario": clean(pre.group(1)) if pre else "",
            "contrato": "", "jornada": "",
            "fecha_publicacion": "",
            "url": url.split("#")[0], "descripcion": "", "requisitos": "",
        })
    # fallback JSON-LD ItemList
    if not out:
        for ld in re.findall(r"<script[^>]*type=\"application/ld\+json\"[^>]*>(.*?)</script>", html, re.S):
            try:
                j = json.loads(ld)
            except json.JSONDecodeError:
                continue
            items = []
            if isinstance(j, dict) and j.get("@type") == "ItemList":
                items = j.get("itemListElement", [])
            for it in items:
                it = it.get("item", it) if isinstance(it, dict) else it
                if not isinstance(it, dict) or not it.get("url"):
                    continue
                url = it["url"]
                if url.startswith("/"):
                    url = GA_BASE + url
                out.append({"fuente": "gallito", "oferta_id": "",
                            "titulo": clean(str(it.get("name", ""))), "empresa": "",
                            "ubicacion": "", "salario": "", "contrato": "", "jornada": "",
                            "fecha_publicacion": "", "url": url, "descripcion": "", "requisitos": ""})
    return out


def ga_detail(oferta):
    h = fetch_flare(oferta["url"]) or fetch(oferta["url"])
    if not h or "Just a moment" in h:
        return oferta
    for ld in re.findall(r"<script[^>]*type=\"application/ld\+json\"[^>]*>(.*?)</script>", h, re.S):
        try:
            j = json.loads(ld)
        except json.JSONDecodeError:
            continue
        if isinstance(j, dict) and j.get("@type") == "JobPosting":
            if j.get("description"):
                oferta["descripcion"] = clean(j["description"])[:6000]
            if j.get("title") and not oferta["titulo"]:
                oferta["titulo"] = clean(j["title"])
            org = j.get("hiringOrganization")
            if isinstance(org, dict) and org.get("name") and not oferta["empresa"]:
                oferta["empresa"] = clean(org["name"])
            loc = j.get("jobLocation")
            if isinstance(loc, dict):
                addr = loc.get("address", loc)
                if isinstance(addr, dict):
                    partes = [addr.get("addressLocality", ""), addr.get("addressRegion", "")]
                    if any(partes) and not oferta["ubicacion"]:
                        oferta["ubicacion"] = ", ".join(p for p in partes if p)
            break
    if not oferta["descripcion"]:
        d = re.search(r"<div[^>]*class=\"[^\"]*(?:descripcion|description|aviso-detalle)[^\"]*\"[^>]*>(.*?)</div>", h, re.S | re.I)
        if d:
            oferta["descripcion"] = clean(d.group(1))[:6000]
    return oferta


def li_detail(oferta):
    h = fetch(LI_DETAIL.format(jid=oferta["oferta_id"]), via_proxy=True)
    if not h:
        return oferta
    m = re.search(r'show-more-less-html__markup[^>]*>(.*?)</div>', h, re.S)
    if m:
        desc = clean(m.group(1))
    else:
        txt = clean(h)
        i = txt.find("Job description:")
        desc = txt[i:i + 6000] if i > 0 else txt[:6000]
    desc = re.sub(r"^Job Descriptions?:\s*", "", desc, flags=re.I)
    oferta["descripcion"] = desc[:6000]
    return oferta


# ---------------- DB ----------------

def save(db_path, rows):
    con = sqlite3.connect(db_path)
    con.executescript(SCHEMA)
    now = datetime.now(timezone.utc).isoformat(timespec="seconds")
    ins = ins_upd = 0
    for o in rows:
        o["fecha_scrapeo"] = now
        before = con.total_changes
        con.execute(
            """INSERT OR IGNORE INTO ofertas
                (fuente, oferta_id, titulo, empresa, ubicacion, salario,
                 contrato, jornada, fecha_publicacion, url, descripcion,
                 requisitos, fecha_scrapeo)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                (o["fuente"], o["oferta_id"], o["titulo"], o["empresa"],
                 o["ubicacion"], o["salario"], o["contrato"], o["jornada"],
                 o["fecha_publicacion"], o["url"], o["descripcion"],
                 o["requisitos"], o["fecha_scrapeo"]),
        )
        if con.total_changes > before:
            ins += 1
        elif o["descripcion"]:
            # backfill: completa detalle faltante en filas viejas
            con.execute(
                """UPDATE ofertas SET descripcion=?, requisitos=?,
                   contrato=?, jornada=?, salario=?, fecha_scrapeo=?
                   WHERE url=? AND descripcion=''""",
                (o["descripcion"], o["requisitos"], o["contrato"],
                 o["jornada"], o["salario"], now, o["url"]),
            )
    con.commit()
    total = con.execute("SELECT COUNT(*) FROM ofertas").fetchone()[0]
    con.close()
    return ins, total


def export_csv(db_path, csv_path):
    con = sqlite3.connect(db_path)
    cur = con.execute("SELECT * FROM ofertas ORDER BY fecha_scrapeo DESC")
    rows = cur.fetchall()
    cols = [d[0] for d in cur.description]
    con.close()
    with open(csv_path, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(cols)
        w.writerows(rows)
    return len(rows)


def _is_known(url, seen, known):
    return url in seen or (known is not None and url in known)


def _page_new_count(rows, seen, known):
    return sum(1 for o in rows if not _is_known(o["url"], seen, known))


def scrape(fuente, paginas, detalle, sin_detalle, delay, use_flare=True, known=None):
    """Scrape incremental: known = {url: True si ya tiene descripcion}.
    Corta el paginado tras 2 paginas seguidas sin URLs nuevas y no
    re-descarga detalles ya guardados."""
    todo = []
    if use_flare and fuente in ("todas", "indeed", "gallito"):
        flare_session_create()
    if fuente in ("todas", "computrabajo"):
        print("[computrabajo] listados...")
        stale = 0
        for p in range(1, paginas + 1):
            h = fetch(CT_LIST.format(p=p))
            rows = ct_list(h) if h else []
            n_new = _page_new_count(rows, {o["url"] for o in todo}, known)
            print(f"  pag {p}: {len(rows)} avisos ({n_new} nuevos)")
            todo.extend(rows)
            stale = stale + 1 if n_new == 0 and rows else 0
            if stale >= 2:
                print("  (corte temprano: sin novedades)")
                break
            time.sleep(delay)
    if fuente in ("todas", "buscojobs"):
        print("[buscojobs] listados...")
        stale = 0
        for p in range(1, paginas + 1):
            pg = "" if p == 1 else f"/{p}"
            h = fetch(BJ_LIST.format(pg=pg))
            rows = bj_list(h) if h else []
            n_new = _page_new_count(rows, {o["url"] for o in todo}, known)
            print(f"  pag {p}: {len(rows)} avisos ({n_new} nuevos)")
            if not rows:
                print("  (corte: sin resultados o bloqueo)")
                break
            todo.extend(rows)
            stale = stale + 1 if n_new == 0 and rows else 0
            if stale >= 2:
                print("  (corte temprano: sin novedades)")
                break
            time.sleep(delay)
    if fuente in ("todas", "linkedin"):
        print("[linkedin] listados...")
        stale = 0
        for p in range(1, paginas + 1):
            h = fetch(LI_LIST.format(s=(p - 1) * 10), via_proxy=True)
            rows = li_list(h) if h else []
            if not rows:
                print("  (corte: posible rate limit)")
                break
            n_new = _page_new_count(rows, {o["url"] for o in todo}, known)
            print(f"  pag {p}: {len(rows)} avisos ({n_new} nuevos)")
            todo.extend(rows)
            stale = stale + 1 if n_new == 0 else 0
            if stale >= 2:
                print("  (corte temprano: sin novedades)")
                break
            time.sleep(delay)
    if fuente in ("todas", "indeed"):
        print("[indeed] listados (via FlareSolverr)...")
        for q in IN_QUERIES if fuente == "todas" else ["trabajo"]:
            stale = 0
            for p in range(1, min(paginas, 4) + 1):
                h = fetch_flare(IN_LIST.format(q=q, s=(p - 1) * 10)) or fetch(IN_LIST.format(q=q, s=(p - 1) * 10))
                rows = in_list(h) if h else []
                n_new = _page_new_count(rows, {o["url"] for o in todo}, known)
                print(f"  q={q} pag {p}: {len(rows)} avisos ({n_new} nuevos)")
                if not rows:
                    break
                todo.extend(rows)
                stale = stale + 1 if n_new == 0 else 0
                if stale >= 2:
                    print("  (corte temprano: sin novedades)")
                    break
                time.sleep(delay)
    if fuente in ("todas", "gallito"):
        print("[gallito] listados (via FlareSolverr)...")
        stale = 0
        for p in range(1, paginas + 1):
            pg = "" if p == 1 else f"?pag={p}"
            h = fetch_flare(GA_LIST.format(pg=pg)) or fetch(GA_LIST.format(pg=pg))
            rows = ga_list(h) if h else []
            n_new = _page_new_count(rows, {o["url"] for o in todo}, known)
            print(f"  pag {p}: {len(rows)} avisos ({n_new} nuevos)")
            if not rows:
                print("  (corte: sin resultados o bloqueo)")
                break
            todo.extend(rows)
            stale = stale + 1 if n_new == 0 else 0
            if stale >= 2:
                print("  (corte temprano: sin novedades)")
                break
            time.sleep(delay)
    # dedup en memoria por url; fuera los avisos en cirílico (spam de LinkedIn geolocalizado en UY)
    seen, uniq = set(), []
    for o in todo:
        if re.search(r"[\u0400-\u04FF]", o["titulo"]):
            continue
        if o["url"] not in seen:
            seen.add(o["url"])
            uniq.append(o)
    print(f"total listados: {len(todo)} -> unicos: {len(uniq)}")
    if not sin_detalle:
        # solo pendientes: nuevas o conocidas sin descripcion (las completas se saltean)
        pendientes = [o for o in uniq if not o["descripcion"] and not (known and known.get(o["url"], False))]
        ya = len(uniq) - len(pendientes)
        n = len(pendientes) if detalle <= 0 else min(detalle, len(pendientes))
        print(f"[detalle] {n} pendientes ({ya} ya guardados, se saltean)...")
        for i, o in enumerate(pendientes[:n], 1):
            if o["fuente"] == "computrabajo":
                ct_detail(o)
            elif o["fuente"] == "linkedin":
                li_detail(o)
            elif o["fuente"] == "indeed":
                in_detail(o)
            elif o["fuente"] == "gallito":
                ga_detail(o)
            else:
                bj_detail(o)
            if i % 10 == 0:
                print(f"  {i}/{n}")
            time.sleep(delay)
    flare_session_destroy()
    return uniq


def main():
    ap = argparse.ArgumentParser(description="Scraper ofertas laborales Uruguay")
    ap.add_argument("--fuente", default="todas",
                    choices=["todas", "computrabajo", "buscojobs", "linkedin", "indeed", "gallito"])
    ap.add_argument("--paginas", type=int, default=3)
    ap.add_argument("--detalle", type=int, default=0,
                    help="max avisos con descripcion completa por corrida (0=todos)")
    ap.add_argument("--sin-detalle", action="store_true")
    ap.add_argument("--delay", type=float, default=1.0)
    ap.add_argument("--db", default="ofertas.db")
    ap.add_argument("--csv", default="ofertas.csv")
    ap.add_argument("--proxy-file", default="",
                    help="archivo con proxies ip:puerto (round-robin en LinkedIn)")
    a = ap.parse_args()
    if a.proxy_file:
        load_proxies(a.proxy_file)
    rows = scrape(a.fuente, a.paginas, a.detalle, a.sin_detalle, a.delay)
    ins, total = save(a.db, rows)
    n = export_csv(a.db, a.csv)
    print(f"nuevos: {ins} | total en DB: {total} | CSV: {n} filas -> {a.csv}")


if __name__ == "__main__":
    main()
