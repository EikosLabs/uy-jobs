import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session?.userId || !session.isAdmin) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const pool = getPool();
  if (!pool) return NextResponse.json({ error: "DB no configurada" }, { status: 500 });

  const r = await pool.query(
    "SELECT id, nombre, email, telefono, departamento, intereses, created_at FROM users ORDER BY created_at DESC LIMIT 2000"
  );
  const u = new URL(req.url);
  if (u.searchParams.get("format") === "csv") {
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = ["id,nombre,email,telefono,departamento,intereses,created_at"];
    for (const row of r.rows) {
      lines.push(
        [row.id, row.nombre, row.email, row.telefono, row.departamento, row.intereses, row.created_at]
          .map(esc)
          .join(",")
      );
    }
    return new NextResponse(lines.join("\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": "attachment; filename=usuarios-trabajogpt.csv",
      },
    });
  }
  return NextResponse.json({ total: r.rowCount, users: r.rows });
}
