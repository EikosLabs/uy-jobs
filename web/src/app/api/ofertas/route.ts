import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getIndex, loadProfile } from "@/lib/reco-server";
import { label, scoreMatch, type MatchResult } from "@/lib/recommend";
import { FUENTES } from "@/lib/supabase";

const PAGE_SIZE_MAX = 100;
const PAGE_SIZE_DEFAULT = 50;

export async function GET(req: Request) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const pool = getPool();
  if (!pool) {
    return NextResponse.json({ error: "DATABASE_URL missing" }, { status: 500 });
  }
  const u = new URL(req.url);
  const q = (u.searchParams.get("q") ?? "").slice(0, 120);
  const categoria = u.searchParams.get("categoria") ?? "";
  const modalidad = u.searchParams.get("modalidad") ?? "";
  const fuente = u.searchParams.get("fuente") ?? "";
  const departamento = u.searchParams.get("departamento") ?? "";
  const seniority = u.searchParams.get("seniority") ?? "";
  const page = Math.max(1, parseInt(u.searchParams.get("page") ?? "1", 10) || 1);
  const limit = Math.min(
    PAGE_SIZE_MAX,
    Math.max(1, parseInt(u.searchParams.get("limit") ?? String(PAGE_SIZE_DEFAULT), 10) || PAGE_SIZE_DEFAULT)
  );

  const where: string[] = [];
  const vals: unknown[] = [];
  if (q) {
    vals.push(`%${q.replace(/[%_]/g, "")}%`);
    where.push(`(titulo ILIKE $${vals.length} OR empresa ILIKE $${vals.length} OR descripcion ILIKE $${vals.length})`);
  }
  if (categoria) {
    vals.push(categoria);
    where.push(`categoria = $${vals.length}`);
  }
  if (modalidad) {
    vals.push(modalidad);
    where.push(`modalidad = $${vals.length}`);
  }
  if (fuente) {
    vals.push(fuente);
    where.push(`fuente = $${vals.length}`);
  }
  if (departamento) {
    vals.push(departamento);
    where.push(`departamento = $${vals.length}`);
  }
  if (seniority) {
    vals.push(seniority);
    where.push(`seniority = $${vals.length}`);
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const ordenParam = u.searchParams.get("orden");
  try {
    const { index, offers } = await getIndex(pool);
    const prof = await loadProfile(pool, session.userId, index);
    // por defecto, si hay perfil: relevancia sobre TODO el resultado (no solo la página)
    const orden = ordenParam === "recientes" || !prof ? "recientes" : "relevancia";
    const attach = (o: Record<string, unknown>, m: MatchResult | null) =>
      m ? { ...o, match: m.score, matchShared: m.shared.map(label), matchMissing: m.missing.map(label), matchReasons: m.reasons } : o;

    let total = 0;
    let rows: Record<string, unknown>[] = [];
    if (orden === "relevancia" && prof) {
      const ids = await pool.query(`SELECT id, fecha_scrapeo FROM ofertas ${whereSql}`, vals);
      total = ids.rowCount ?? 0;
      const ranked = ids.rows
        .map((r) => {
          const o = offers.get(Number(r.id));
          const m = o ? scoreMatch(o, prof, index) : null;
          return { id: Number(r.id), m, s: m?.score ?? -1, t: r.fecha_scrapeo ? new Date(r.fecha_scrapeo).getTime() : 0 };
        })
        .sort((a, b) => b.s - a.s || b.t - a.t || b.id - a.id);
      const pageItems = ranked.slice((page - 1) * limit, page * limit);
      const full = await pool.query("SELECT * FROM ofertas WHERE id = ANY($1::bigint[])", [pageItems.map((x) => x.id)]);
      const byId = new Map(full.rows.map((o) => [Number(o.id), o]));
      rows = pageItems.filter((x) => byId.has(x.id)).map((x) => attach(byId.get(x.id)!, x.m));
    } else {
      const c = await pool.query(`SELECT count(*)::int AS n FROM ofertas ${whereSql}`, vals);
      total = c.rows[0]?.n ?? 0;
      const data = await pool.query(
        `SELECT * FROM ofertas ${whereSql} ORDER BY fecha_scrapeo DESC NULLS LAST, id DESC LIMIT $${vals.length + 1} OFFSET $${vals.length + 2}`,
        [...vals, limit, (page - 1) * limit]
      );
      rows = data.rows.map((o) => attach(o, prof ? scoreMatch(o, prof, index) : null));
    }
    const prof0 = await pool.query("SELECT 1 FROM profiles WHERE user_id = $1", [session.userId]);
    const counts: Record<string, number> = {};
    for (const f of FUENTES) {
      const r = await pool.query("SELECT count(*)::int AS n FROM ofertas WHERE fuente = $1", [f]);
      counts[f] = r.rows[0]?.n ?? 0;
    }
    const remotos = (await pool.query("SELECT count(*)::int AS n FROM ofertas WHERE modalidad = 'remoto'")).rows[0]?.n ?? 0;
    const topCats = (
      await pool.query("SELECT categoria, count(*)::int AS n FROM ofertas GROUP BY 1 ORDER BY 2 DESC LIMIT 8")
    ).rows;
    const deptCounts = (
      await pool.query("SELECT departamento, count(*)::int AS n FROM ofertas WHERE departamento <> '' GROUP BY 1 ORDER BY 2 DESC")
    ).rows;
    const seniorityCounts = (
      await pool.query("SELECT seniority, count(*)::int AS n FROM ofertas WHERE seniority IS NOT NULL AND seniority <> '' GROUP BY 1 ORDER BY 2 DESC")
    ).rows;
    const unread = (
      await pool.query("SELECT count(*)::int AS n FROM notifications WHERE user_id = $1 AND read_at IS NULL", [
        session.userId,
      ])
    ).rows[0]?.n ?? 0;
    const hasProfile = !!prof0.rows[0];
    return NextResponse.json({
      total,
      page,
      limit,
      pages: Math.max(1, Math.ceil(total / limit)),
      orden,
      data: rows,
      facets: { counts, remotos, topCats, deptCounts, seniorityCounts, unread, hasProfile },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
