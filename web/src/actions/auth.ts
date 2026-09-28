"use server";

import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { getPool } from "@/lib/db";
import { createSession, deleteSession } from "@/lib/session";
import { isAdminEmail } from "@/lib/dal";
import { CATEGORIAS } from "@/lib/supabase";

export type AuthState = { message?: string; ok?: boolean } | undefined;

function clean(v: FormDataEntryValue | null) {
  return (typeof v === "string" ? v : "").trim();
}

const CODE_CHARS = "abcdefghjkmnpqrstuvwxyz23456789";

async function newReferralCode(pool: { query: (q: string, v?: unknown[]) => Promise<{ rowCount: number | null }> }) {
  for (let i = 0; i < 5; i++) {
    let code = "";
    for (let j = 0; j < 8; j++) code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
    const r = await pool.query("SELECT id FROM users WHERE referral_code = $1", [code]);
    if (!r.rowCount) return code;
  }
  return `u${Date.now().toString(36)}`;
}

async function referredById(pool: {
  query: (q: string, v?: unknown[]) => Promise<{ rows: { id: number }[] }>;
}) {
  try {
    const ref = (await cookies()).get("ref")?.value?.toLowerCase() ?? "";
    if (!/^[a-z0-9]{4,16}$/.test(ref)) return null;
    const r = await pool.query("SELECT id FROM users WHERE referral_code = $1", [ref]);
    return r.rows[0]?.id ?? null;
  } catch {
    return null;
  }
}

export async function signup(_state: AuthState, formData: FormData): Promise<AuthState> {
  const nombre = clean(formData.get("nombre")).slice(0, 120);
  const email = clean(formData.get("email")).toLowerCase().slice(0, 160);
  const telefono = clean(formData.get("telefono")).slice(0, 40);
  const password = clean(formData.get("password"));
  const departamento = clean(formData.get("departamento")).slice(0, 60);
  const intereses = CATEGORIAS.filter((c) => formData.get(`int_${c}`) === "on");

  if (nombre.length < 2) return { message: "Contanos tu nombre (mínimo 2 letras)." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { message: "Ese email no parece válido." };
  if (telefono.replace(/\D/g, "").length < 8) return { message: "Dejanos un teléfono válido (mínimo 8 dígitos)." };
  if (password.length < 8) return { message: "La contraseña debe tener al menos 8 caracteres." };

  const pool = getPool();
  if (!pool) return { message: "Base de datos no configurada. Probá más tarde." };

  const exists = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
  if (exists.rowCount) return { message: "Ese email ya está registrado. Iniciá sesión." };

  const hash = await bcrypt.hash(password, 10);
  const code = await newReferralCode(pool);
  const refId = await referredById(pool);
  const r = await pool.query(
    `INSERT INTO users (nombre, email, telefono, password_hash, departamento, intereses, referral_code, referred_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id, nombre, email`,
    [nombre, email, telefono, hash, departamento || null, intereses.join(","), code, refId]
  );
  const user = r.rows[0];
  await createSession({
    userId: user.id,
    email: user.email,
    nombre: user.nombre,
    isAdmin: isAdminEmail(user.email),
  });
  try {
    await pool.query("INSERT INTO events (event, user_id, path) VALUES ('signup_completed', $1, '/register')", [user.id]);
  } catch {
    /* analytics nunca rompe auth */
  }
  // El redirect lo hace el cliente (evita host interno 0.0.0.0 tras el proxy).
  return { ok: true };
}

export async function login(_state: AuthState, formData: FormData): Promise<AuthState> {
  const email = clean(formData.get("email")).toLowerCase();
  const password = clean(formData.get("password"));

  if (!email || !password) return { message: "Completá email y contraseña." };

  const pool = getPool();
  if (!pool) return { message: "Base de datos no configurada. Probá más tarde." };

  const r = await pool.query("SELECT id, nombre, email, password_hash FROM users WHERE email = $1", [email]);
  const user = r.rows[0];
  if (!user) return { message: "Email o contraseña incorrectos." };
  if (!user.password_hash) return { message: "Esa cuenta usa Google. Tocá «Continuar con Google»." };
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return { message: "Email o contraseña incorrectos." };

  await createSession({
    userId: user.id,
    email: user.email,
    nombre: user.nombre,
    isAdmin: isAdminEmail(user.email),
  });
  return { ok: true };
}

export async function logout() {
  await deleteSession();
}
