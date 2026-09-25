#!/usr/bin/env python3
"""Genera dashboard.html estatico y pulido desde ofertas.db.
Uso: python dashboard.py
"""

import json
import sqlite3

con = sqlite3.connect("ofertas.db")
cols = [d[1] for d in con.execute("PRAGMA table_info(ofertas)").fetchall()]
rows = [dict(zip(cols, r)) for r in
        con.execute("SELECT * FROM ofertas ORDER BY fecha_scrapeo DESC").fetchall()]
con.close()

for r in rows:
    for k in ("titulo", "empresa", "ubicacion", "descripcion", "salario",
              "fuente", "categoria", "modalidad", "seniority", "url"):
        r[k] = r[k] or ""
    r["tags"] = (r.get("tags") or "").split(",") if r.get("tags") else []
    r["desc_full"] = r["descripcion"][:4000]
    r["desc_short"] = r["descripcion"][:220]
    del r["descripcion"]

data = json.dumps(rows, ensure_ascii=False).replace("</", "<\\/")
n = len(rows)

page = """<!DOCTYPE html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Ofertas UY · NROWS avisos</title>
<style>
:root{--bg:#0f141b;--card:#171e28;--line:#26303d;--txt:#e8edf3;--mut:#8b96a5;
--acc:#22c55e;--ct:#f26a21;--bj:#3b82f6;--li:#0a66c2}
*{box-sizing:border-box;margin:0;padding:0}
body{background:var(--bg);color:var(--txt);font-family:"Segoe UI",system-ui,sans-serif;padding:0 0 40px;font-size:15px}
header{background:linear-gradient(135deg,#0f141b 0%,#16202e 60%,#123323 100%);padding:28px 22px 20px;border-bottom:1px solid var(--line)}
header h1{font-size:1.5rem;letter-spacing:.5px}
header h1 .dot{color:var(--acc)}
header p{color:var(--mut);font-size:.85rem;margin-top:4px}
.wrap{max-width:1080px;margin:0 auto;padding:0 18px}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;margin:16px 0}
.stat{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:12px 14px}
.stat b{font-size:1.45rem;display:block}
.stat span{font-size:.72rem;color:var(--mut);text-transform:uppercase;letter-spacing:.6px}
.toolbar{position:sticky;top:0;z-index:5;background:rgba(15,20,27,.95);padding:10px 0;border-bottom:1px solid var(--line);display:flex;gap:8px;flex-wrap:wrap}
.toolbar input,.toolbar select{background:var(--card);color:var(--txt);border:1px solid var(--line);border-radius:8px;padding:8px 10px;font-size:.86rem;outline:none}
.toolbar input{flex:1;min-width:200px}
.toolbar input:focus,.toolbar select:focus{border-color:var(--acc)}
.secttl{font-size:.78rem;color:var(--mut);text-transform:uppercase;letter-spacing:1px;margin:16px 0 8px}
.cats{display:flex;gap:6px;flex-wrap:wrap}
.cat{border:1px solid var(--line);background:var(--card);color:var(--txt);border-radius:20px;padding:5px 12px;font-size:.8rem;cursor:pointer}
.cat:hover{border-color:var(--acc)}
.cat.on{background:var(--acc);border-color:var(--acc);color:#06130c;font-weight:700}
.cat small{opacity:.7;margin-left:4px}
#count{font-size:.82rem;color:var(--mut);margin:12px 0}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:10px}
.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:14px;border-left:4px solid var(--mut);display:flex;flex-direction:column;gap:6px}
.card:hover{border-color:#3a4657}
.card.f-computrabajo{border-left-color:var(--ct)}
.card.f-buscojobs{border-left-color:var(--bj)}
.card.f-linkedin{border-left-color:var(--li)}
.card h3{font-size:.95rem;line-height:1.3}
.card h3 a{color:var(--txt);text-decoration:none}
.card h3 a:hover{color:var(--acc)}
.emp{font-size:.82rem;color:var(--mut)}
.sal{color:var(--acc);font-weight:700;font-size:.9rem}
.desc{font-size:.83rem;color:#c4ccd6;line-height:1.45}
.more{color:var(--acc);cursor:pointer;font-size:.78rem;white-space:nowrap}
.chips{display:flex;gap:5px;flex-wrap:wrap;margin-top:auto;padding-top:4px}
.chip{font-size:.68rem;border-radius:20px;padding:2px 9px;background:#222c3a;color:#aeb8c6}
.chip.src{font-weight:700;color:#fff}
.chip.src.s-computrabajo{background:var(--ct)}
.chip.src.s-buscojobs{background:var(--bj)}
.chip.src.s-linkedin{background:var(--li)}
.chip.hl{background:rgba(34,197,94,.15);color:var(--acc);border:1px solid rgba(34,197,94,.4)}
.empty{color:var(--mut);padding:30px 0;text-align:center;grid-column:1/-1}
mark{background:rgba(34,197,94,.35);color:inherit;border-radius:3px;padding:0 1px}
</style></head><body>
<header><div class="wrap">
<h1>Ofertas laborales <span class="dot">Uruguay</span></h1>
<p>Computrabajo · BuscoJobs · LinkedIn — NROWS avisos scrapeados y categorizados</p>
</div></header>
<div class="wrap">
<div class="stats" id="stats"></div>
<div class="toolbar">
<input id="q" placeholder="Buscar por titulo, empresa o descripcion...">
<select id="fFuente"><option value="">Todas las fuentes</option></select>
<select id="fMod"><option value="">Toda modalidad</option><option value="remoto">Remoto</option><option value="hibrido">Hibrido</option></select>
<select id="fSal"><option value="">Con y sin salario</option><option value="1">Solo con salario</option></select>
<select id="fSort"><option value="rec">Mas recientes</option><option value="sal">Mayor salario</option><option value="az">A-Z</option></select>
</div>
<div class="secttl">Categorias</div>
<div class="cats" id="cats"></div>
<div id="count"></div>
<div class="grid" id="list"></div>
</div>
<script>
const DATA = JSONDATA;
const FULL = DATA.map(o => o.desc_full);
const $ = id => document.getElementById(id);
const esc = s => (s || "").replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const uniq = k => [...new Set(DATA.map(o => o[k]).filter(Boolean))].sort();
let activeCat = "";
uniq("fuente").forEach(v => $("fFuente").add(new Option(v + " (" + DATA.filter(o => o.fuente === v).length + ")", v)));
(function stats() {
  const byF = {};
  DATA.forEach(o => byF[o.fuente] = (byF[o.fuente] || 0) + 1);
  const sals = DATA.map(o => o.salario_num).filter(Boolean).sort((a, b) => a - b);
  const med = sals.length ? Math.round(sals[Math.floor(sals.length / 2)]).toLocaleString("es-UY") : "—";
  $("stats").innerHTML =
    `<div class="stat"><b>${DATA.length}</b><span>avisos</span></div>` +
    Object.entries(byF).map(([k, v]) => `<div class="stat"><b>${v}</b><span>${esc(k)}</span></div>`).join("") +
    `<div class="stat"><b>${DATA.filter(o => o.modalidad === "remoto").length}</b><span>remotos</span></div>` +
    `<div class="stat"><b>$U ${med}</b><span>salario mediano</span></div>`;
  const byC = {};
  DATA.forEach(o => byC[o.categoria || "otros"] = (byC[o.categoria || "otros"] || 0) + 1);
  $("cats").innerHTML = Object.entries(byC).sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `<button class="cat" data-cat="${esc(k)}">${esc(k)}<small>${v}</small></button>`).join("");
  document.querySelectorAll(".cat").forEach(b => b.onclick = () => {
    activeCat = activeCat === b.dataset.cat ? "" : b.dataset.cat;
    document.querySelectorAll(".cat").forEach(x => x.classList.toggle("on", x.dataset.cat === activeCat));
    render();
  });
})();
function hi(text, q) {
  text = esc(text);
  if (!q) return text;
  try { return text.replace(new RegExp("(" + q.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&") + ")", "ig"), "<mark>$1</mark>"); }
  catch (e) { return text; }
}
function toggle(i) {
  const el = $("d" + i), full = el.dataset.open === "1";
  el.dataset.open = full ? "0" : "1";
  el.innerHTML = full ? esc(FULL[i]).slice(0, 220) + '... <span class="more">[ver mas]</span>'
                     : esc(FULL[i]) + ' <span class="more">[ver menos]</span>';
}
function render() {
  const q = $("q").value.trim().toLowerCase(), f = $("fFuente").value,
        m = $("fMod").value, sal = $("fSal").value;
  let idx = DATA.map((o, i) => i).filter(i => {
    const o = DATA[i];
    return (!f || o.fuente === f) && (!activeCat || o.categoria === activeCat) &&
      (!m || o.modalidad === m) && (!sal || o.salario_num) &&
      (!q || ((o.titulo + " " + o.empresa + " " + o.desc_full).toLowerCase().includes(q)));
  });
  if ($("fSort").value === "sal") idx.sort((a, b) => (DATA[b].salario_num || 0) - (DATA[a].salario_num || 0));
  if ($("fSort").value === "az") idx.sort((a, b) => (DATA[a].titulo || "").localeCompare(DATA[b].titulo || ""));
  $("count").textContent = idx.length + " de " + DATA.length + " avisos";
  $("list").innerHTML = idx.slice(0, 400).map(i => {
    const o = DATA[i];
    const hlTags = (o.tags || []).filter(t => t && t !== o.categoria)
      .map(t => `<span class="chip${["remoto", "hibrido", "ingles"].includes(t) ? " hl" : ""}">${esc(t)}</span>`).join("");
    return `<div class="card f-${esc(o.fuente)}">
      <h3><a href="${esc(o.url)}" target="_blank" rel="noopener">${hi(o.titulo || "(sin titulo)", q)}</a></h3>
      <div class="emp">${hi(o.empresa, q)} · ${esc(o.ubicacion)}${o.salario ? ` · <span class="sal">${esc(o.salario)}</span>` : ""}</div>
      <div class="desc" id="d${i}" data-open="0" onclick="toggle(${i})">${hi(o.desc_short, q)}... <span class="more">[ver mas]</span></div>
      <div class="chips"><span class="chip src s-${esc(o.fuente)}">${esc(o.fuente)}</span>${o.categoria ? `<span class="chip">${esc(o.categoria)}</span>` : ""}${hlTags}</div>
    </div>`;
  }).join("") || `<div class="empty">Sin resultados con esos filtros.</div>`;
}
["q", "fFuente", "fMod", "fSal", "fSort"].forEach(id => $(id).addEventListener("input", render));
render();
</script></body></html>"""

page = page.replace("NROWS", str(n)).replace("JSONDATA", data)
open("dashboard.html", "w", encoding="utf-8").write(page)
print(f"dashboard.html: {n} avisos")
