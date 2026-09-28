import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { implicitIntereses, scoreOferta } from "@/lib/match";

const MIN_SCORE = 40;
const MAX_PER_USER = 25;

/** Recalcula matches y crea notificaciones. Solo cron interno (CRON_SECRET). */
export async function POST(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const pool = getPool();
  if (!pool) return NextResponse.json({ error: "DB no configurada" }, { status: 500 });

  const users = await pool.query(
    `SELECT u.id, u.intereses, p.titulo, p.skills
     FROM users u JOIN profiles p ON p.user_id = u.id
     WHERE COALESCE(p.skills, '') <> ''`
  );
  const ofertas = await pool.query(
    "SELECT id, titulo, descripcion, categoria, seniority, modalidad FROM ofertas ORDER BY id DESC LIMIT 3000"
  );

  let notified = 0;
  const perUser: Record<number, number> = {};
  for (const u of users.rows) {
    const skills: string[] = String(u.skills).split(",").filter(Boolean);
    const explicit: string[] = String(u.intereses || "").split(",").filter(Boolean);
    const intereses = explicit.length ? explicit : implicitIntereses(ofertas.rows, skills);
    const done = await pool.query("SELECT oferta_id FROM notifications WHERE user_id = $1", [u.id]);
    const seen = new Set(done.rows.map((r) => r.oferta_id));
    let n = 0;
    for (const o of ofertas.rows) {
      if (n >= MAX_PER_USER) break;
      if (seen.has(o.id)) continue;
      const s = scoreOferta(o, { skills, intereses, titulo: u.titulo || "" });
      if (s.score >= MIN_SCORE) {
        const detail = [...(s.catMatch && o.categoria ? [o.categoria] : []), ...s.shared].join(", ");
        await pool.query(
          "INSERT INTO notifications (user_id, oferta_id, score, detail) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING",
          [u.id, o.id, s.score, detail]
        );
        n++;
        notified++;
      }
    }
    perUser[u.id] = n;
  }
  return NextResponse.json({ users: users.rowCount, notified, perUser });
}
