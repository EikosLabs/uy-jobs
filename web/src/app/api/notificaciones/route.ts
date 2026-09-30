import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { getSession } from "@/lib/session";
import { MATCH_DISPLAY } from "@/lib/match";
import { getIndex, loadProfile } from "@/lib/reco-server";
import { label, scoreMatch } from "@/lib/recommend";

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
    const { index, offers } = await getIndex(pool);
    const prof = await loadProfile(pool, session.userId, index);
    if (prof && (prof.skillSet.size || prof.cv_text)) {
      const apps = await pool.query("SELECT oferta_id FROM applications WHERE user_id = $1", [session.userId]);
      const seen = new Set([...r.rows.map((x) => Number(x.oferta_id)), ...apps.rows.map((x) => Number(x.oferta_id))]);
      const best = [...offers.values()]
        .filter((o) => !seen.has(o.id!))
        .map((o) => ({ o, m: scoreMatch(o, prof, index) }))
        .filter((x) => x.m.score >= MATCH_DISPLAY)
        .sort((a, b) => b.m.score - a.m.score)
        .slice(0, 20);
      const rows = best.length
        ? (await pool.query("SELECT id, titulo, empresa, ubicacion, categoria, modalidad, fuente FROM ofertas WHERE id = ANY($1::bigint[])", [best.map((x) => x.o.id)])).rows
        : [];
      const byId = new Map(rows.map((x) => [Number(x.id), x]));
      top = best
        .filter((x) => byId.has(x.o.id!))
        .map((x) => ({ ...byId.get(x.o.id!), score: x.m.score, detail: x.m.shared.slice(0, 4).map(label).join(", ") }));
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
