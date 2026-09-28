import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { getSession } from "@/lib/session";
import { AiNotConfigured, aiChat } from "@/lib/ai";

const DAILY_LIMIT = 10;

function clean(s: unknown, n: number) {
  return String(s ?? "").replace(/\s+/g, " ").trim().slice(0, n);
}

/** POST { ofertaId } -> { letter } Carta generada con el CV del usuario + el aviso. */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const pool = getPool();
  if (!pool) return NextResponse.json({ error: "DB no configurada" }, { status: 500 });

  let ofertaId = 0;
  try {
    ofertaId = Number((await req.json())?.ofertaId) || 0;
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }
  if (!ofertaId) return NextResponse.json({ error: "Falta el aviso." }, { status: 400 });

  // límite diario por usuario (cuida la cuota)
  const used = await pool.query(
    "SELECT count(*)::int AS n FROM events WHERE event = 'ai_cover' AND user_id = $1 AND created_at > now() - interval '1 day'",
    [session.userId]
  );
  if ((used.rows[0]?.n ?? 0) >= DAILY_LIMIT) {
    return NextResponse.json({ error: `Llegaste al límite diario (${DAILY_LIMIT} cartas). Volvé mañana.` }, { status: 429 });
  }

  const pr = await pool.query("SELECT titulo, skills, experiencia, cv_text FROM profiles WHERE user_id = $1", [
    session.userId,
  ]);
  const p = pr.rows[0];
  if (!p || (!p.cv_text && !p.skills)) {
    return NextResponse.json({ error: "Subí tu CV primero para generar la carta." }, { status: 400 });
  }
  const or = await pool.query("SELECT titulo, empresa, descripcion, requisitos FROM ofertas WHERE id = $1", [ofertaId]);
  const o = or.rows[0];
  if (!o) return NextResponse.json({ error: "Aviso no encontrado." }, { status: 404 });

  try {
    const letter = await aiChat(
      [
        {
          role: "system",
          content:
            "Sos un asistente de carrera uruguayo. Escribís cartas de presentación breves, cálidas y en rioplatense neutro (tratá de vos, sin lunfardo). Regla de oro: nada de humo ni datos inventados, solo lo que dice el CV. Unas 120-180 palabras.",
        },
        {
          role: "user",
          content: [
            `CV del candidato (título: ${clean(p.titulo, 120)}; habilidades: ${clean(p.skills, 400)}):`,
            clean(p.cv_text || p.experiencia, 3000),
            "",
            `Aviso al que se postula (${clean(o.titulo, 160)} en ${clean(o.empresa, 120)}):`,
            clean(o.descripcion, 1500),
            o.requisitos ? `Requisitos: ${clean(o.requisitos, 800)}` : "",
            "",
            "Escribí la carta lista para enviar, sin placeholders entre corchetes.",
          ].join("\n"),
        },
      ],
      { maxTokens: 2048, temperature: 0.7, session: `uyjobs-cover-${session.userId}` }
    );
    await pool.query("INSERT INTO events (event, user_id, path, props) VALUES ('ai_cover', $1, '/oferta', $2)", [
      session.userId,
      JSON.stringify({ ofertaId }),
    ]);
    return NextResponse.json({ letter });
  } catch (e) {
    if (e instanceof AiNotConfigured) return NextResponse.json({ error: e.message }, { status: 503 });
    return NextResponse.json({ error: e instanceof Error ? e.message : "Falló la IA." }, { status: 502 });
  }
}
