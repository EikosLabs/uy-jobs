import { NextResponse } from "next/server";
import { SignJWT } from "jose";
import { safeNext } from "@/lib/next";

/** Inicia el flujo OAuth2 con Google. */
export async function GET(req: Request) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.redirect(new URL("/login?error=google-no-configurado", req.url));
  }
  const appUrl = process.env.APP_URL ?? new URL(req.url).origin;
  const state = new SignJWT({ nonce: crypto.randomUUID() })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("10m");

  const secret = process.env.AUTH_SECRET;
  if (!secret) return NextResponse.json({ error: "AUTH_SECRET missing" }, { status: 500 });
  const stateToken = await state.sign(new TextEncoder().encode(secret));

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${appUrl}/api/auth/google/callback`,
    response_type: "code",
    scope: "openid email profile",
    state: stateToken,
    prompt: "select_account",
  });

  const res = NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
  res.cookies.set("g_state", stateToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  const next = safeNext(new URL(req.url).searchParams.get("next"));
  if (next) {
    res.cookies.set("g_next", next, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 600,
    });
  }
  return res;
}
