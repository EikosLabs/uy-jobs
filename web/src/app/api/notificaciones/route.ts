import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { getSession } from "@/lib/session";

/** Lista notificaciones con datos de la oferta. */
export async function GET() {
  const session = await getSession();
  if (!session?.userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const pool = getPool();
  if (!pool) return NextResponse.json({ error: "DB no configurada" }, { status: 500 });
  const r = await pool.query(
    `SELECT n.id, n.score, n.detail, n.created_at, n.read_at,
            o.id AS oferta_id, o.titulo, o.empresa, o.ubicacion, o.categoria, o.modalidad, o.fuente
     FROM notifications n JOIN ofertas o ON o.id = n.oferta_id
     WHERE n.user_id = $1 ORDER BY n.read_at NULLS FIRST, n.score DESC, n.created_at DESC LIMIT 100`,
    [session.userId]
  );
  const unread = await pool.query(
    "SELECT count(*)::int AS n FROM notifications WHERE user_id = $1 AND read_at IS NULL",
    [session.userId]
  );
  // Top matches en vivo (el cron genera max 25/día; esto muestra el resto)
  let top: unknown[] = [];
  try {
    const prof = await pool.query("SELECT titulo, skills FROM profiles WHERE user_id = $1", [session.userId]);
    const skills = String(prof.rows[0]?.skills || "").split(",").filter(Boolean);
    if (skills.length) {
      const uu = await pool.query("SELECT intereses FROM users WHERE id = $1", [session.userId]);
      const intereses = String(uu.rows[0]?.intereses || "").split(",").filter(Boolean);
      const titulo = prof.rows[0]?.titulo || "";
      const { scoreOferta } = await import("@/lib/match");
      const o = await pool.query(
        "SELECT id, titulo, empresa, ubicacion, categoria, modalidad, fuente, descripcion, seniority FROM ofertas ORDER BY id DESC LIMIT 1500"
      );
      const seen = new Set(r.rows.map((x) => x.oferta_id));
      top = o.rows
        .map((of) => ({ of, s: scoreOferta(of, { skills, intereses, titulo }) }))
        .filter((x) => x.s.score >= 40 && !seen.has(x.of.id))
        .sort((a, b) => b.s.score - a.s.score)
        .slice(0, 20)
        .map((x) => ({ ...x.of, score: x.s.score, detail: x.s.shared.join(", ") }));
    }
  } catch {
    top = [];
  }
  return NextResponse.json({ notifications: r.rows, unread: unread.rows[0]?.n ?? 0, top });
}

/** Marca notificaciones como leídas (?ids=1,2 o todo). */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const pool = getPool();
  if (!pool) return NextResponse.json({ error: "DB no configurada" }, { status: 500 });
  const { ids } = (await req.json().catch(() => ({}))) as { ids?: number[] };
  if (ids?.length) {
    await pool.query("UPDATE notifications SET read_at = now() WHERE user_id = $1 AND id = ANY($2)", [
      session.userId,
      ids,
    ]);
  } else {
    await pool.query("UPDATE notifications SET read_at = now() WHERE user_id = $1 AND read_at IS NULL", [
      session.userId,
    ]);
  }
  return NextResponse.json({ ok: true });
}
