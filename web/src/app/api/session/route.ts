import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { firstName } from "@/components/ui";

/** Estado de sesión para la landing estática (mismo origen, sin datos sensibles). */
export async function GET() {
  const s = await getSession();
  return NextResponse.json(
    s ? { logged: true, nombre: firstName(s.nombre) } : { logged: false },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}
