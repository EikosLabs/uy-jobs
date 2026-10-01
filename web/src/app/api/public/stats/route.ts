import { NextResponse } from "next/server";
import { DUP_KEY, getPool } from "@/lib/db";

/** Stats públicas para la landing (sin auth). */
export async function GET() {
  const pool = getPool();
  if (!pool) return NextResponse.json({ total: 0, remotos: 0, topCats: [] });
  try {
    const total = (await pool.query(`SELECT count(DISTINCT ${DUP_KEY})::int AS n FROM ofertas`)).rows[0]?.n ?? 0;
    const remotos = (await pool.query(`SELECT count(DISTINCT ${DUP_KEY})::int AS n FROM ofertas WHERE modalidad = 'remoto'`)).rows[0]?.n ?? 0;
    const topCats = (
      await pool.query(`SELECT categoria, count(DISTINCT ${DUP_KEY})::int AS n FROM ofertas GROUP BY 1 ORDER BY 2 DESC LIMIT 8`)
    ).rows;
    const deptCounts = (
      await pool.query("SELECT departamento, count(*)::int AS n FROM ofertas WHERE departamento <> '' GROUP BY 1 ORDER BY 2 DESC")
    ).rows;
    const users = (await pool.query("SELECT count(*)::int AS n FROM users")).rows[0]?.n ?? 0;
    const latest = (
      await pool.query(
        "SELECT id, titulo, empresa, ubicacion, categoria, modalidad, fuente, fecha_scrapeo FROM ofertas ORDER BY fecha_scrapeo DESC NULLS LAST, id DESC LIMIT 6"
      )
    ).rows;
    return NextResponse.json(
      { total, remotos, fuentes: 3, topCats, deptCounts, users, latest },
      { headers: { "Cache-Control": "public, max-age=300" } }
    );
  } catch {
    return NextResponse.json({ total: 0, remotos: 0, topCats: [] });
  }
}
