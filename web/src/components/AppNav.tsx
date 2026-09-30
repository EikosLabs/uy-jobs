import Link from "next/link";
import { getPool } from "@/lib/db";
import { getSession } from "@/lib/session";
import { IconBell, Logo, firstName } from "@/components/ui";
import { LogoutButton } from "@/components/LogoutButton";
import { MobileMenu, type NavLink } from "@/components/MobileMenu";

/** Barra superior de la app: marca, secciones, cuenta. */
export async function AppNav({ active }: { active?: "ofertas" | "mapa" | "postulaciones" | "avisos" | "perfil" | "admin" | "referidos" }) {
  const session = await getSession();
  const pool = getPool();
  let unread = 0;
  if (session && pool) {
    const r = await pool.query("SELECT count(*)::int AS n FROM notifications WHERE user_id = $1 AND read_at IS NULL", [
      session.userId,
    ]);
    unread = r.rows[0]?.n ?? 0;
  }
  const links: NavLink[] = session
    ? [
        { href: "/ofertas", label: "Ofertas", current: active === "ofertas" },
        { href: "/mapa", label: "Mapa", current: active === "mapa" },
        { href: "/postulaciones", label: "Postulaciones", current: active === "postulaciones" },
        { href: "/notificaciones", label: "Matches", badge: unread, current: active === "avisos" },
        { href: "/referidos", label: "Invitar", current: active === "referidos" },
        { href: "/perfil", label: "Mi perfil", current: active === "perfil" },
        ...(session.isAdmin ? [{ href: "/admin", label: "Admin", current: active === "admin" } as NavLink] : []),
      ]
    : [];
  const link = (href: string, label: string, key: string, badge?: number) => (
    <Link key={href} href={href} aria-current={active === key ? "page" : undefined}
      className={`relative rounded-lg px-3 py-2 text-sm font-semibold transition ${
        active === key ? "bg-[#0038a8]/10 text-[#0038a8]" : "text-stone-600 hover:bg-stone-100 hover:text-[#0a2156]"
      }`}>
      {label}
      {!!badge && (
        <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-[#fcd116] px-1 text-[10px] font-bold text-[#0a2156]">
          {badge}
        </span>
      )}
    </Link>
  );
  return (
    <header className="sticky top-0 z-40 border-b border-[#e7e5e4] bg-white">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-1 px-4 sm:gap-2 sm:px-6">
        <Logo />
        {session && (
          <nav className="ml-4 hidden items-center gap-1 md:flex" aria-label="Secciones">
            {link("/ofertas", "Ofertas", "ofertas")}
            {link("/mapa", "Mapa", "mapa")}
            {link("/postulaciones", "Postulaciones", "postulaciones")}
            {link("/notificaciones", "Matches", "avisos", unread)}
            {link("/referidos", "Invitar", "referidos")}
            {link("/perfil", "Mi perfil", "perfil")}
            {session.isAdmin && link("/admin", "Admin", "admin")}
          </nav>
        )}
        <div className="ml-auto flex items-center gap-2">
          {session ? (
            <>
              <Link href="/notificaciones" title="Matches" aria-label="Matches"
                className="relative rounded-lg border border-stone-200 bg-white px-2.5 py-2 text-sm font-bold text-[#0a2156] hover:bg-stone-50 md:hidden">
                <IconBell />
                {unread > 0 && (
                  <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-[#fcd116] px-1 text-[10px] font-bold text-[#0a2156]">
                    {unread}
                  </span>
                )}
              </Link>
              <span className="hidden rounded-full bg-[#0038a8]/10 px-3 py-1.5 text-xs font-bold text-[#0038a8] sm:block">
                {firstName(session.nombre)}
              </span>
              <span className="hidden sm:block">
                <LogoutButton />
              </span>
            </>
          ) : (
            <>
              <Link href="/login" className="rounded-lg px-3 py-2 text-sm font-semibold text-stone-600 hover:bg-stone-100">
                Entrar
              </Link>
              <Link href="/register" className="rounded-lg bg-[#0038a8] px-4 py-2 text-sm font-bold text-white hover:bg-[#2f6fed]">
                Crear cuenta
              </Link>
            </>
          )}
          {session && (
            <div className="relative z-40 md:hidden">
              <MobileMenu links={links} nombre={firstName(session.nombre)} />
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

