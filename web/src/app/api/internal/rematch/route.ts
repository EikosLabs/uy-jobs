import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { getIndex, loadProfile, uniqueOffers } from "@/lib/reco-server";
import { label, scoreMatch } from "@/lib/recommend";

/** Umbral de alerta (motor v2). Calibrado en web/eval: ≥55 deja pasar ~1,6% de avisos no relevantes. */
const MIN_SCORE = 55;
const MAX_PER_USER = 25;

/** Recalcula matches y crea notificaciones. Solo cron interno (CRON_SECRET). */
export async function POST(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const pool = getPool();
  if (!pool) return NextResponse.json({ error: "DB no configurada" }, { status: 500 });

  // corre después del scrape: índice nuevo con los avisos de hoy
  const idx = await getIndex(pool, true);
  const { index } = idx;
  const users = await pool.query(
    `SELECT u.id FROM users u JOIN profiles p ON p.user_id = u.id
     WHERE COALESCE(p.skills, '') <> '' OR COALESCE(p.cv_text, '') <> ''`
  );

  let notified = 0;
  const perUser: Record<number, number> = {};
  for (const u of users.rows) {
    const prof = await loadProfile(pool, u.id, index);
    if (!prof) continue;
    const done = await pool.query(
      `SELECT oferta_id FROM notifications WHERE user_id = $1
       UNION SELECT oferta_id FROM applications WHERE user_id = $1`,
      [u.id]
    );
    // si ya vio o guardó una copia del aviso (otra ciudad), el grupo entero cuenta como visto
    const seen = new Set(done.rows.map((r) => idx.canon.get(Number(r.oferta_id)) ?? Number(r.oferta_id)));
    const best = uniqueOffers(idx)
      .filter((o) => !seen.has(o.id!))
      .map((o) => ({ o, m: scoreMatch(o, prof, index) }))
      .filter((x) => x.m.score >= MIN_SCORE)
      .sort((a, b) => b.m.score - a.m.score)
      .slice(0, MAX_PER_USER);
    for (const { o, m } of best) {
      const detail = m.shared.slice(0, 4).map(label).join(", ");
      await pool.query(
        "INSERT INTO notifications (user_id, oferta_id, score, detail) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING",
        [u.id, o.id, m.score, detail]
      );
    }
    notified += best.length;
    perUser[u.id] = best.length;
  }
  return NextResponse.json({ users: users.rowCount, notified, perUser });
}
