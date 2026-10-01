import Link from "next/link";
import { getPool } from "@/lib/db";
import { getSession } from "@/lib/session";
import { IconBell, IconBrief, IconCheck, IconPin, IconUser, Logo, firstName } from "@/components/ui";
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
        { href: "/bienvenida", label: "Cómo funciona" },
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
  const tab = (href: string, label: string, key: string, icon: React.ReactNode, badge?: number) => (
    <Link key={href} href={href} aria-current={active === key ? "page" : undefined}
      className={`relative flex flex-1 flex-col items-center gap-0.5 pb-1.5 pt-1.5 text-[11px] font-semibold transition active:scale-90 [&_svg]:h-[22px] [&_svg]:w-[22px] ${
        active === key ? "text-[#0038a8]" : "text-stone-500"
      }`}>
      {/* indicador de sección activa (pastilla detrás del ícono, como en apps nativas) */}
      <span className={`grid h-7 w-14 place-items-center rounded-full transition-all duration-300 ${active === key ? "bg-[#0038a8]/12 [&_svg]:stroke-[22]" : "bg-transparent"}`}>
        {icon}
      </span>
      {label}
      {!!badge && (
        <span className="absolute left-1/2 top-1 ml-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-[#fcd116] px-1 text-[10px] font-bold text-[#0a2156]">
          {badge}
        </span>
      )}
    </Link>
  );
  return (
    <>
    <header className="glass-bar sticky top-0 z-40 border-b">
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
              <span className="hidden rounded-full bg-[#0038a8]/10 px-3 py-1.5 text-xs font-bold text-[#0038a8] sm:block">
                {firstName(session.nombre)}
              </span>
              <Link href="/bienvenida" className="hidden rounded-lg px-2 py-2 text-sm font-semibold text-stone-500 hover:bg-stone-100 md:block">
                Cómo funciona
              </Link>
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
    {session && (
      <nav aria-label="Secciones principales"
        className="tabbar glass-bar fixed inset-x-0 bottom-0 z-30 flex border-t pb-[env(safe-area-inset-bottom)] md:hidden">
        {tab("/ofertas", "Ofertas", "ofertas", <IconBrief />)}
        {tab("/mapa", "Mapa", "mapa", <IconPin />)}
        {tab("/postulaciones", "Postulaciones", "postulaciones", <IconCheck />)}
        {tab("/notificaciones", "Matches", "avisos", <IconBell />, unread)}
        {tab("/perfil", "Perfil", "perfil", <IconUser />)}
      </nav>
    )}
    </>
  );
}

