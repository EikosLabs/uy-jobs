/* Lado servidor del recomendador: índice del corpus en memoria + perfil del usuario. */
import "server-only";
import type { Pool } from "pg";
import { CorpusIndex, prepareProfile, type OfferLike, type PreparedProfile } from "@/lib/recommend";
import { extractSkills } from "@/lib/skills";
import { DUP_KEY } from "@/lib/db";

const TTL_MS = 10 * 60 * 1000;

/** canon: id -> id del aviso que representa a su grupo de duplicados (el más viejo). */
type Cached = { at: number; index: CorpusIndex; offers: Map<number, OfferLike>; canon: Map<number, number> };
let cache: Cached | null = null;
let building: Promise<Cached> | null = null;

/** Un aviso por grupo de duplicados: para recorrer el corpus sin repetir. */
export function uniqueOffers({ offers, canon }: Cached): OfferLike[] {
  return [...offers.values()].filter((o) => canon.get(o.id!) === o.id);
}

/** Índice TF-IDF de todos los avisos (se reconstruye cada 10 min o a pedido). */
export async function getIndex(pool: Pool, fresh = false): Promise<Cached> {
  if (!fresh && cache && Date.now() - cache.at < TTL_MS) return cache;
  // vencido: se reconstruye en segundo plano y mientras tanto se usa el anterior
  if (!fresh && cache) {
    if (!building) void rebuild(pool).catch(() => {});
    return cache;
  }
  return rebuild(pool);
}

function rebuild(pool: Pool): Promise<Cached> {
  if (building) return building;
  building = (async () => {
    const r = await pool.query(
      `SELECT id, titulo, descripcion, requisitos, categoria, seniority, modalidad, departamento, experiencia_min, tags,
              min(id) OVER (PARTITION BY ${DUP_KEY}) AS canon
       FROM ofertas`
    );
    // pg devuelve bigint como texto: normalizamos a número una sola vez acá
    const rows = (r.rows as OfferLike[]).map((o) => ({ ...o, id: Number(o.id) }));
    const index = new CorpusIndex(rows);
    // en memoria guardamos lo necesario para puntuar, sin la descripción completa
    const offers = new Map<number, OfferLike>();
    const canon = new Map<number, number>();
    for (const o of rows) {
      offers.set(o.id, { ...o, descripcion: null, requisitos: null });
      canon.set(o.id, Number((o as { canon?: unknown }).canon ?? o.id));
    }
    cache = { at: Date.now(), index, offers, canon };
    return cache;
  })().finally(() => {
    building = null;
  });
  return building;
}

const LIKED = ["guardada", "postulado", "respuesta", "entrevista", "oferta"];

/** Perfil listo para puntuar: CV, rubros, zona e historial de swipe/postulaciones. */
export async function loadProfile(pool: Pool, userId: number, index: CorpusIndex): Promise<PreparedProfile | null> {
  const [p, u, apps] = await Promise.all([
    pool.query("SELECT titulo, skills, cv_text, experiencia FROM profiles WHERE user_id = $1", [userId]),
    pool.query("SELECT intereses, departamento, etapa, jornada FROM users WHERE id = $1", [userId]),
    pool.query("SELECT oferta_id, status FROM applications WHERE user_id = $1 ORDER BY updated_at DESC LIMIT 300", [userId]),
  ]);
  const prof = p.rows[0];
  const user = u.rows[0];
  const intereses: string[] = String(user?.intereses || "").split(",").filter(Boolean);
  const liked = apps.rows.filter((a) => LIKED.includes(a.status)).map((a) => Number(a.oferta_id));
  const disliked = apps.rows.filter((a) => a.status === "descartado").map((a) => Number(a.oferta_id));
  const cv = String(prof?.cv_text || "");
  const stored = String(prof?.skills || "").split(",").filter(Boolean);
  // habilidades: las guardadas + las que el extractor v2 encuentra hoy en el CV
  const skills = [...new Set([...stored, ...(cv ? extractSkills(cv) : [])])];
  const titulo = String(prof?.titulo || "");
  if (!skills.length && !titulo && !intereses.length && !liked.length && !user?.etapa) return null;
  return prepareProfile(
    {
      skills, intereses, titulo, cv_text: cv, experiencia: prof?.experiencia ?? "", departamento: user?.departamento ?? null,
      etapa: user?.etapa ?? null, jornada: user?.jornada ?? null,
    },
    index,
    { liked, disliked }
  );
}
