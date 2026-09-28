import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { getSession } from "@/lib/session";
import { implicitIntereses, scoreOferta } from "@/lib/match";
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
  try {
    const c = await pool.query(`SELECT count(*)::int AS n FROM ofertas ${whereSql}`, vals);
    const total = c.rows[0]?.n ?? 0;
    const data = await pool.query(
      `SELECT * FROM ofertas ${whereSql} ORDER BY fecha_scrapeo DESC NULLS LAST, id DESC LIMIT $${vals.length + 1} OFFSET $${vals.length + 2}`,
      [...vals, limit, (page - 1) * limit]
    );
    // perfil para matches + facets en una sola respuesta (SPA)
    let profSkills: string[] = [];
    let profIntereses: string[] = [];
    let profTitulo = "";
    const prof = await pool.query("SELECT titulo, skills FROM profiles WHERE user_id = $1", [session.userId]);
    if (prof.rows[0]) {
      profSkills = String(prof.rows[0].skills || "").split(",").filter(Boolean);
      profTitulo = prof.rows[0].titulo || "";
      const uu = await pool.query("SELECT intereses FROM users WHERE id = $1", [session.userId]);
      profIntereses = String(uu.rows[0]?.intereses || "").split(",").filter(Boolean);
    }
    let implicit: string[] = [];
    if (profSkills.length && !profIntereses.length) {
      const sample = await pool.query("SELECT categoria, titulo, descripcion FROM ofertas ORDER BY id DESC LIMIT 2000");
      implicit = implicitIntereses(sample.rows, profSkills);
    }
    const rows = data.rows.map((o) => {
      if (!profSkills.length) return o;
      const effIntereses = profIntereses.length ? profIntereses : implicit;
      const s = scoreOferta(o, { skills: profSkills, intereses: effIntereses, titulo: profTitulo });
      return { ...o, match: s.score, matchShared: s.shared, matchMissing: s.missing };
    });
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
    const hasProfile = prof.rows[0] ? true : false;
    return NextResponse.json({
      total,
      page,
      limit,
      pages: Math.max(1, Math.ceil(total / limit)),
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
