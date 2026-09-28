import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { getSession } from "@/lib/session";
import { STATUSES } from "@/lib/applications";

/** Lista las postulaciones del usuario con datos de la oferta.
 *  Con ?history=<applicationId> devuelve el historial de esa postulación. */
export async function GET(req: Request) {
  const session = await getSession();
  if (!session?.userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const pool = getPool();
  if (!pool) return NextResponse.json({ error: "DB no configurada" }, { status: 500 });
  const u = new URL(req.url);
  const historyId = parseInt(u.searchParams.get("history") ?? "", 10);
  if (historyId) {
    const own = await pool.query("SELECT id FROM applications WHERE id = $1 AND user_id = $2", [historyId, session.userId]);
    if (!own.rows[0]) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
    const ev = await pool.query(
      "SELECT from_status, to_status, created_at FROM application_events WHERE application_id = $1 ORDER BY created_at DESC LIMIT 50",
      [historyId]
    );
    return NextResponse.json({ events: ev.rows });
  }
  const r = await pool.query(
    `SELECT a.id, a.status, a.notes, a.applied_at, a.updated_at,
            o.id AS oferta_id, o.titulo, o.empresa, o.ubicacion, o.categoria, o.modalidad, o.fuente, o.url
     FROM applications a JOIN ofertas o ON o.id = a.oferta_id
     WHERE a.user_id = $1 ORDER BY a.updated_at DESC`,
    [session.userId]
  );
  return NextResponse.json({ applications: r.rows });
}

/** Crea o actualiza postulación. */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const pool = getPool();
  if (!pool) return NextResponse.json({ error: "DB no configurada" }, { status: 500 });
  const body = (await req.json().catch(() => ({}))) as { oferta_id?: number; status?: string; notes?: string };
  if (!body.oferta_id) return NextResponse.json({ error: "Falta oferta_id" }, { status: 400 });
  const status = STATUSES.includes(body.status as (typeof STATUSES)[number]) ? body.status! : "guardada";
  const notes = String(body.notes ?? "").slice(0, 2000);
  const prev = await pool.query("SELECT id, status FROM applications WHERE user_id = $1 AND oferta_id = $2", [
    session.userId,
    body.oferta_id,
  ]);
  const applied = status === "postulado" ? ", applied_at = COALESCE(applications.applied_at, now())" : "";
  const r = await pool.query(
    `INSERT INTO applications (user_id, oferta_id, status, notes${status === "postulado" ? ", applied_at" : ""})
     VALUES ($1,$2,$3,$4${status === "postulado" ? ", now()" : ""})
     ON CONFLICT (user_id, oferta_id) DO UPDATE SET status = EXCLUDED.status, notes = EXCLUDED.notes, updated_at = now()${applied}
     RETURNING id, status`,
    [session.userId, body.oferta_id, status, notes]
  );
  const appId = r.rows[0]?.id as number | undefined;
  const oldStatus = prev.rows[0]?.status as string | undefined;
  if (appId && oldStatus && oldStatus !== status) {
    await pool.query("INSERT INTO application_events (application_id, from_status, to_status) VALUES ($1,$2,$3)", [
      appId,
      oldStatus,
      status,
    ]);
  }
  return NextResponse.json({ ok: true, application: r.rows[0] });
}

/** Borra una postulación. */
export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session?.userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const pool = getPool();
  if (!pool) return NextResponse.json({ error: "DB no configurada" }, { status: 500 });
  const u = new URL(req.url);
  const id = parseInt(u.searchParams.get("id") ?? "", 10);
  if (!id) return NextResponse.json({ error: "Falta id" }, { status: 400 });
  await pool.query("DELETE FROM applications WHERE id = $1 AND user_id = $2", [id, session.userId]);
  return NextResponse.json({ ok: true });
}
