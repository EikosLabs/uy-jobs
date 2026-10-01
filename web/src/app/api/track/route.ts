import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { getSession } from "@/lib/session";

// Eventos permitidos (analytics skill: naming object_action, sin PII en props)
const ALLOWED = new Set([
  "signup_completed",
  "login_completed",
  "cta_hero_clicked",
  "cta_register_clicked",
  "cv_uploaded",
  "application_saved",
  "filter_used",
  "share_referral_clicked",
  "onboarding_step",
  "onboarding_skip",
  "onboarding_done",
]);

export async function POST(req: Request) {
  const pool = getPool();
  if (!pool) return NextResponse.json({ ok: false }, { status: 500 });
  const body = (await req.json().catch(() => ({}))) as {
    event?: string;
    path?: string;
    props?: Record<string, string | number | boolean>;
  };
  if (!body.event || !ALLOWED.has(body.event)) return NextResponse.json({ ok: false }, { status: 400 });
  const session = await getSession().catch(() => null);
  // sin PII: solo props planas cortas
  const props: Record<string, string> = {};
  for (const [k, v] of Object.entries(body.props ?? {})) {
    if (/^[a-z_]{1,30}$/.test(k)) props[k] = String(v).slice(0, 80);
  }
  await pool.query("INSERT INTO events (event, user_id, path, props) VALUES ($1,$2,$3,$4)", [
    body.event,
    session?.userId ?? null,
    String(body.path ?? "").slice(0, 200),
    JSON.stringify(props),
  ]);
  return NextResponse.json({ ok: true });
}
