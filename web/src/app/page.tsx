import Link from "next/link";
import { getPool } from "@/lib/db";
import { CATEGORIAS } from "@/lib/supabase";
import { Logo, SiteFooter } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function Landing() {
  const pool = getPool();
  let total = 0;
  let remotos = 0;
  let topCats: { categoria: string; n: number }[] = [];
  try {
    if (pool) {
      total = (await pool.query("SELECT count(*)::int AS n FROM ofertas")).rows[0]?.n ?? 0;
      remotos = (await pool.query("SELECT count(*)::int AS n FROM ofertas WHERE modalidad = 'remoto'")).rows[0]?.n ?? 0;
      topCats = (await pool.query("SELECT categoria, count(*)::int AS n FROM ofertas GROUP BY 1 ORDER BY 2 DESC LIMIT 6")).rows;
    }
  } catch {
    /* la landing vive sin DB */
  }

  const fmt = (n: number) => (n > 0 ? n.toLocaleString("es-UY") : "…");
  const cats = topCats.length ? topCats : CATEGORIAS.slice(0, 6).map((c) => ({ categoria: c, n: 0 }));
  const marquee = ["tecnología", "ventas", "remoto", "administración", "logística", "oficios", "salud", "marketing"];

  return (
    <main className="bg-scene min-h-screen">
      {/* NAV */}
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Logo />
        <div className="flex gap-2 text-sm font-bold">
          <Link href="/login" className="rounded-xl border-2 border-[#0a2156] bg-white px-4 py-2 transition hover:bg-stone-100">
            Entrar
          </Link>
          <Link href="/register" className="btn-accent px-4 py-2">
            Crear cuenta
          </Link>
        </div>
      </nav>

      {/* POSTER HERO */}
      <section className="mx-auto max-w-4xl px-4 pt-10 text-center sm:px-6 sm:pt-16">
        <p className="inline-flex rotate-[-1deg] items-center gap-2 rounded-full border-2 border-[#0a2156] bg-[#fcd116] px-4 py-1.5 text-xs font-bold uppercase tracking-wide">
          {fmt(total)} ofertas activas · se actualiza a diario
        </p>
        <h1 className="mx-auto mt-6 max-w-3xl font-[var(--font-display)] text-5xl font-bold leading-[1.02] tracking-tight sm:text-7xl">
          El trabajo que buscás{" "}
          <span className="relative inline-block">
            <span className="relative z-10">está acá</span>
            <svg className="absolute -bottom-2 left-0 z-0 w-full" height="14" viewBox="0 0 200 14" preserveAspectRatio="none" aria-hidden>
              <path d="M2 10 C 60 2, 140 2, 198 8" stroke="#0038a8" strokeWidth="7" fill="none" strokeLinecap="round" />
            </svg>
          </span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg font-medium leading-relaxed text-stone-600">
          Juntamos Computrabajo, BuscoJobs y LinkedIn en un solo lugar, los
          ordenamos por rubro y te avisamos lo nuevo cada día.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/register" className="btn-primary px-8 py-3.5 text-base">
            Ver ofertas gratis →
          </Link>
          <Link href="/login" className="rounded-2xl border-2 border-[#0a2156] bg-white px-8 py-3.5 font-bold transition hover:bg-stone-100">
            Ya tengo cuenta
          </Link>
        </div>
      </section>

      {/* MARQUEE */}
      <div className="mt-14 rotate-[-1deg] border-y-2 border-[#0a2156] bg-[#0a2156] py-3" aria-hidden>
        <div className="marquee-track gap-8 text-sm font-bold uppercase tracking-widest text-white">
          {[...marquee, ...marquee].map((m, i) => (
            <span key={i} className="flex items-center gap-8 whitespace-nowrap">
              {m} <span className="text-[#0038a8]">✦</span>
            </span>
          ))}
        </div>
      </div>

      {/* STATS */}
      <section className="mx-auto grid max-w-6xl grid-cols-3 gap-3 px-4 pt-12 sm:gap-4 sm:px-6">
        {[
          [fmt(total), "ofertas activas", "bg-[#dbeafe]"],
          [fmt(remotos), "remotas", "bg-[#bae6fd]"],
          ["3", "fuentes", "bg-[#fde68a]"],
        ].map(([n, label, bg]) => (
          <div key={label} className={`card-pop rounded-3xl px-4 py-6 text-center sm:py-8 ${bg}`}>
            <div className="font-[var(--font-display)] text-3xl font-bold sm:text-5xl">{n}</div>
            <div className="mt-1 text-xs font-bold uppercase tracking-widest">{label}</div>
          </div>
        ))}
      </section>

      {/* MURO DE RUBROS */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <p className="text-center text-xs font-bold uppercase tracking-widest text-[#0038a8]">Explorá por rubro</p>
        <h2 className="mx-auto mt-2 max-w-xl text-center font-[var(--font-display)] text-3xl font-bold sm:text-4xl">
          ¿En qué querés trabajar?
        </h2>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {cats.map((t, i) => (
            <Link key={t.categoria} href="/register"
              className={`card-pop rounded-full px-6 py-3.5 font-[var(--font-display)] font-bold ${i % 2 ? "rotate-1" : "-rotate-1"}`}>
              {(t.categoria || "otros").replace(/_/g, " ")}{" "}
              <span className="text-sm font-bold text-[#0a2156]/60">{t.n > 0 ? t.n.toLocaleString("es-UY") : ""}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* PASOS */}
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <div className="card-pop rounded-[2rem] bg-[#0a2156] p-8 text-white sm:p-12" style={{ borderColor: "#0a2156" }}>
          <p className="text-xs font-bold uppercase tracking-widest text-[#fcd116]">Cómo funciona</p>
          <h2 className="mt-2 max-w-xl font-[var(--font-display)] text-3xl font-bold">
            Del caos de portales a tu próxima entrevista
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              ["01", "Creá tu cuenta", "Gratis en 30 segundos. Solo nombre, email y teléfono.", "bg-[#fcd116] text-[#0a2156]"],
              ["02", "Filtrá a tu medida", "Por rubro, modalidad, fuente y palabra clave.", "bg-[#7dd3fc] text-[#0c4a6e]"],
              ["03", "Postulate directo", "Te llevamos al aviso original en un clic.", "bg-[#fcd116] text-[#0a2156]"],
            ].map(([n, t, d, badge]) => (
              <div key={n} className="rounded-3xl border-2 border-white/15 bg-white/5 p-6">
                <span className={`inline-block rounded-xl px-3 py-1 font-[var(--font-display)] text-sm font-bold ${badge}`}>{n}</span>
                <p className="mt-3 font-[var(--font-display)] text-lg font-bold">{t}</p>
                <p className="mt-1 text-sm leading-relaxed text-stone-300">{d}</p>
              </div>
            ))}
          </div>
          <Link href="/register" className="mt-8 inline-block rounded-2xl bg-[#0038a8] px-8 py-3.5 font-bold text-white transition hover:bg-[#2f6fed]">
            Empezar ahora →
          </Link>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
