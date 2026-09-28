import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";

export async function GET() {
  const pool = getPool();
  if (!pool) {
    return NextResponse.json({ status: "error", error: "DATABASE_URL missing" }, { status: 500 });
  }
  try {
    const r = await pool.query("SELECT count(*)::int AS n FROM ofertas");
    return NextResponse.json({ status: "ok", ofertas: r.rows[0]?.n ?? 0 });
  } catch (e) {
    return NextResponse.json(
      { status: "error", error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
