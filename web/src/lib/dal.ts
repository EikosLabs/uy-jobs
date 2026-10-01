import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { getSession, type SessionPayload } from "@/lib/session";
import { getPool } from "@/lib/db";

export type SafeUser = {
  id: number;
  nombre: string;
  email: string;
  telefono: string | null;
  departamento: string | null;
  intereses: string;
  etapa: string | null;
  jornada: string | null;
  avatar_url: string | null;
  created_at: string | null;
};

export const verifySession = cache(async (): Promise<SessionPayload> => {
  const session = await getSession();
  if (!session?.userId) redirect("/login");
  return session;
});

export const getUser = cache(async (): Promise<SafeUser | null> => {
  const session = await getSession();
  if (!session?.userId) return null;
  const pool = getPool();
  if (!pool) return null;
  const r = await pool.query(
    "SELECT id, nombre, email, telefono, departamento, intereses, etapa, jornada, avatar_url, created_at FROM users WHERE id = $1",
    [session.userId]
  );
  return (r.rows[0] as SafeUser | undefined) ?? null;
});

export function isAdminEmail(email: string) {
  const admin = process.env.ADMIN_EMAIL ?? "";
  return !!admin && email.toLowerCase() === admin.toLowerCase();
}
