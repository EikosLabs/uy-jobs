import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { getSession } from "@/lib/session";
import { extractSkills } from "@/lib/skills";
import { MATCH_DISPLAY } from "@/lib/match";
import { getIndex, loadProfile } from "@/lib/reco-server";
import { scoreMatch } from "@/lib/recommend";
import { ocrImage, ocrPdf, pdfToText } from "@/lib/cv";
import { s3, s3Put } from "@/lib/s3";
import { DEPARTAMENTOS } from "@/lib/supabase";

const MAX_BYTES = 6 * 1024 * 1024;
const ETAPAS = ["estudiante", "primer_empleo", "con_experiencia"] as const;
const JORNADAS = ["part", "full"] as const;
const GAP_IGNORE = new Set(["senior", "junior", "lead", "estudiante", "sin_experiencia"]);

export async function GET() {
  const session = await getSession();
  if (!session?.userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const pool = getPool();
  if (!pool) return NextResponse.json({ error: "DB no configurada" }, { status: 500 });
  const r = await pool.query("SELECT user_id, cv_text, titulo, skills, experiencia, cv_file FROM profiles WHERE user_id = $1", [
    session.userId,
  ]);
  const p = r.rows[0] ?? null;
  let matches = 0;
  let gaps: { skill: string; n: number }[] = [];
  let suggested: { categoria: string; n: number }[] = [];
  const user0 = await pool.query("SELECT intereses, etapa, jornada FROM users WHERE id = $1", [session.userId]);
  const intereses: string[] = String(user0.rows[0]?.intereses || "").split(",").filter(Boolean);
  if (p && (p.skills || p.cv_text)) {
    const { index, offers } = await getIndex(pool);
    const prof = await loadProfile(pool, session.userId, index);
    if (prof) {
      const scored = [...offers.values()].map((of) => ({ of, s: scoreMatch(of, prof, index) }));
      const good = scored.filter((x) => x.s.score >= MATCH_DISPLAY);
      matches = good.length;
      // rubros donde más encajás
      const byCat = new Map<string, number>();
      for (const x of good) {
        const c = (x.of.categoria || "otros").toLowerCase();
        byCat.set(c, (byCat.get(c) ?? 0) + 1);
      }
      suggested = [...byCat.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([categoria, n]) => ({ categoria, n }));
      // brechas: lo que más piden los avisos que casi encajan con vos y no tenés
      const near = scored.filter((x) => x.s.score >= 30);
      const demand = new Map<string, number>();
      for (const x of near) {
        for (const sk of x.s.missing) {
          if (GAP_IGNORE.has(sk)) continue;
          demand.set(sk, (demand.get(sk) ?? 0) + 1);
        }
      }
      gaps = [...demand.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([skill, n]) => ({ skill, n }));
    }
  }
  return NextResponse.json({
    profile: p, matches, gaps, suggested, intereses,
    etapa: user0.rows[0]?.etapa ?? "", jornada: user0.rows[0]?.jornada ?? "",
  });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const pool = getPool();
  if (!pool) return NextResponse.json({ error: "DB no configurada" }, { status: 500 });

  const form = await req.formData();
  const titulo = String(form.get("titulo") ?? "").slice(0, 160);
  const experiencia = String(form.get("experiencia") ?? "").slice(0, 4000);
  let skillsCsv = String(form.get("skills") ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 40);
  const interesesForm = String(form.get("intereses") ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase().replace(/\s+/g, "_"))
    .filter(Boolean)
    .slice(0, 10);
  let cvText = "";

  const file = form.get("cv");
  let cvKey = "";
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_BYTES) return NextResponse.json({ error: "Archivo muy grande (máx 6 MB)." }, { status: 400 });
    const buf = Buffer.from(await file.arrayBuffer());
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    // el original va a S3/MinIO en paralelo con la lectura (no suma tiempo de espera)
    const store = s3();
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
    const key = `cvs/${session.userId}/${Date.now()}-${safe || "cv"}`;
    const upload = store
      ? s3Put(key, buf, file.type || "application/octet-stream").then(
          () => key,
          (e) => (console.error("S3 upload:", e instanceof Error ? e.message : e), "")
        )
      : Promise.resolve("");
    try {
      cvText = isPdf ? await pdfToText(buf).catch(() => "") : "";
      // OCR si es imagen o el PDF no trae texto (escaneado)
      if (cvText.trim().length < 200) {
        const ext = (file.name.split(".").pop() || "png").toLowerCase();
        const ocr = isPdf ? await ocrPdf(buf) : await ocrImage(buf, ["png", "jpg", "jpeg", "tif", "tiff"].includes(ext) ? ext : "png");
        if (ocr.trim().length > cvText.trim().length) cvText = ocr;
      }
    } catch (e) {
      return NextResponse.json(
        { error: `No pudimos leer el archivo: ${e instanceof Error ? e.message : "error"}` },
        { status: 400 }
      );
    }
    if (cvText.trim().length < 50) {
      return NextResponse.json({ error: "No encontramos texto legible en el archivo." }, { status: 400 });
    }
    const auto = extractSkills(cvText);
    skillsCsv = [...new Set([...skillsCsv, ...auto])].slice(0, 40);

    // solo registra la llave si subió bien
    cvKey = await upload;
  }

  await pool.query(
    `INSERT INTO profiles (user_id, cv_text, titulo, skills, experiencia, cv_file, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6, now())
     ON CONFLICT (user_id) DO UPDATE SET
       cv_text = CASE WHEN EXCLUDED.cv_text <> '' THEN EXCLUDED.cv_text ELSE profiles.cv_text END,
       titulo = CASE WHEN EXCLUDED.titulo <> '' THEN EXCLUDED.titulo ELSE profiles.titulo END,
       skills = CASE WHEN EXCLUDED.skills <> '' THEN EXCLUDED.skills ELSE profiles.skills END,
       experiencia = CASE WHEN EXCLUDED.experiencia <> '' THEN EXCLUDED.experiencia ELSE profiles.experiencia END,
       cv_file = CASE WHEN EXCLUDED.cv_file <> '' THEN EXCLUDED.cv_file ELSE profiles.cv_file END,
       updated_at = now()`,
    [session.userId, cvText, titulo, skillsCsv.join(","), experiencia, cvKey]
  );
  // momento laboral y jornada: solo valores conocidos ("" borra)
  for (const [k, ok] of [["etapa", ETAPAS], ["jornada", JORNADAS]] as const) {
    if (!form.has(k)) continue;
    const v = String(form.get(k) ?? "");
    await pool.query(`UPDATE users SET ${k} = $2 WHERE id = $1`, [session.userId, (ok as readonly string[]).includes(v) ? v : null]);
  }
  if (form.has("departamento")) {
    const d = String(form.get("departamento") ?? "");
    await pool.query("UPDATE users SET departamento = $2 WHERE id = $1", [
      session.userId,
      (DEPARTAMENTOS as readonly string[]).includes(d) ? d : null,
    ]);
  }
  if (form.has("intereses")) {
    await pool.query("UPDATE users SET intereses = $2 WHERE id = $1", [session.userId, interesesForm.join(",")]);
  }
  const r = await pool.query("SELECT user_id, cv_text, titulo, skills, experiencia, cv_file FROM profiles WHERE user_id = $1", [
    session.userId,
  ]);
  const p = r.rows[0];
  return NextResponse.json({
    profile: { ...p, cv_text: (p.cv_text || "").slice(0, 2000) },
    skills: (p.skills || "").split(",").filter(Boolean),
  });
}
