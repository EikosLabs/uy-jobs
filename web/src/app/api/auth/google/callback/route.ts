import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { getPool } from "@/lib/db";
import { createSession } from "@/lib/session";
import { isAdminEmail } from "@/lib/dal";
import { safeNext } from "@/lib/next";

type GoogleUser = {
  sub: string;
  email: string;
  email_verified: boolean;
  name: string;
  picture?: string;
};

export async function GET(req: Request) {
  const u = new URL(req.url);
  // Base absoluta desde APP_URL: tras el proxy, req.url trae el host interno.
  const base = process.env.APP_URL ?? u.origin;
  const fail = (code: string) => NextResponse.redirect(new URL(`/login?error=${code}`, base));
  const code = u.searchParams.get("code");
  const state = u.searchParams.get("state");
  const secret = process.env.AUTH_SECRET;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!secret || !clientId || !clientSecret) return fail("google-no-configurado");
  if (!code || !state) return fail("google-cancelado");

  // CSRF: el state debe coincidir con la cookie firmada
  const cookieState = req.headers.get("cookie")?.match(/(?:^|;\s*)g_state=([^;]+)/)?.[1];
  if (!cookieState || cookieState !== state) return fail("google-estado");
  try {
    await jwtVerify(state, new TextEncoder().encode(secret), { algorithms: ["HS256"] });
  } catch {
    return fail("google-estado");
  }

  const appUrl = process.env.APP_URL ?? u.origin;

  // code -> tokens
  const tok = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: `${appUrl}/api/auth/google/callback`,
      grant_type: "authorization_code",
    }),
  });
  if (!tok.ok) return fail("google-token");
  const { access_token } = (await tok.json()) as { access_token?: string };
  if (!access_token) return fail("google-token");

  // tokens -> perfil
  const me = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  if (!me.ok) return fail("google-perfil");
  const g = (await me.json()) as GoogleUser;
  if (!g.email_verified || !g.email) return fail("google-email");

  const pool = getPool();
  if (!pool) return fail("db");
  const email = g.email.toLowerCase();
  const nombre = (g.name || email.split("@")[0]).slice(0, 120);

  // find-or-create: por google_id, sino por email (linkea la cuenta)
  let row = (await pool.query("SELECT id, nombre, email FROM users WHERE google_id = $1", [g.sub])).rows[0];
  const refCode = req.headers.get("cookie")?.match(/(?:^|;\s*)ref=([a-z0-9]{4,16})/i)?.[1]?.toLowerCase() ?? null;
  const mkCode = () =>
    Array.from({ length: 8 }, () => "abcdefghjkmnpqrstuvwxyz23456789"[Math.floor(Math.random() * 31)]).join("");
  if (!row) {
    const byEmail = (await pool.query("SELECT id, nombre, email FROM users WHERE email = $1", [email])).rows[0];
    if (byEmail) {
      await pool.query("UPDATE users SET google_id = $1, avatar_url = COALESCE(avatar_url, $2) WHERE id = $3", [
        g.sub,
        g.picture ?? null,
        byEmail.id,
      ]);
      row = byEmail;
    } else {
      let refId: number | null = null;
      if (refCode) {
        const rr = await pool.query("SELECT id FROM users WHERE referral_code = $1", [refCode]);
        refId = rr.rows[0]?.id ?? null;
      }
      row = (
        await pool.query(
          "INSERT INTO users (nombre, email, google_id, avatar_url, referral_code, referred_by) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, nombre, email",
          [nombre, email, g.sub, g.picture ?? null, mkCode(), refId]
        )
      ).rows[0];
    }
  }

  await createSession({
    userId: row.id,
    email: row.email,
    nombre: row.nombre,
    isAdmin: isAdminEmail(row.email),
  });
  try {
    const pool2 = getPool();
    if (pool2) await pool2.query("INSERT INTO events (event, user_id, path) VALUES ('login_completed', $1, '/google')", [row.id]);
  } catch {
    /* analytics nunca rompe auth */
  }
  const next = safeNext(/(?:^|;\s*)g_next=([^;]+)/.exec(req.headers.get("cookie") ?? "")?.[1]);
  const res = NextResponse.redirect(new URL(next || "/ofertas", base));
  res.cookies.delete("g_state");
  res.cookies.delete("g_next");
  return res;
}
