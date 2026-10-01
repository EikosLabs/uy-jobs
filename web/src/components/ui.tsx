/* elaya redesign · Manrope única · sin ultra-bold · iconos SVG · reveal */
import Image from "next/image";
import Link from "next/link";
import type { Oferta } from "@/lib/supabase";
import { MATCH_DISPLAY } from "@/lib/match";
import { catLabel, fuenteLabel, modalidadLabel, salaryLine, seniorityLabel, tagLabel, ubicacionLabel } from "@/lib/format";

export function firstName(n: string | null | undefined) {
  return (n ?? "").trim().split(/\s+/)[0] || "Hola";
}

export function Logo({ href = "/", size = "md" }: { href?: string; size?: "md" | "lg" }) {
  const cls = size === "lg" ? "text-3xl" : "text-xl";
  const box = size === "lg" ? "h-11 w-11" : "h-9 w-9";
  return (
    <Link href={href} className="fluid-fast flex items-center gap-2" aria-label="Trabajogpt inicio">
      <Image src="/logo.png" alt="Trabajogpt" width={44} height={44}
        className={`${box} rounded-xl border border-[#e7e5e4] object-cover`} />
      <span className={`font-[var(--font-display)] font-bold tracking-tight ${cls}`}>
        Trabajo<span className="text-[#0038a8]">gpt</span>
      </span>
    </Link>
  );
}

/* Iconos SVG trazo consistente (estilo Phosphor) */
function Svg({ children }: { children: React.ReactNode }) {
  return (
    <svg width="18" height="18" viewBox="0 0 256 256" fill="none" stroke="currentColor"
      strokeWidth="18" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

export function IconBell() {
  return (
    <Svg>
      <path d="M221.8,175.94C216.49,160.38,204.22,140.4,204,96a84,84,0,0,0-168,0c-.22,44.4-12.49,64.38-17.8,79.94A16,16,0,0,0,32,200H224A16,16,0,0,0,221.8,175.94Z" />
      <path d="M128,216a24,24,0,0,1-22.62-16h45.24A24,24,0,0,1,128,216Z" />
    </Svg>
  );
}

export function IconPin() {
  return (
    <Svg>
      <path d="M128,232s-72-56-72-128a72,72,0,0,1,144,0C200,176,128,232,128,232Z" />
      <circle cx="128" cy="104" r="28" />
    </Svg>
  );
}

export function IconSparkle() {
  return (
    <Svg>
      <path d="M128,32l22,58a8,8,0,0,0,4.6,4.6L212,116l-57.4,21.4A8,8,0,0,0,150,142l-22,58-22-58a8,8,0,0,0-4.6-4.6L44,116l57.4-21.4A8,8,0,0,0,106,90Z" />
    </Svg>
  );
}

export function IconCheck() {
  return (
    <Svg>
      <polyline points="216 72 104 184 48 128" />
    </Svg>
  );
}

export function IconArrow() {
  return (
    <Svg>
      <line x1="40" y1="128" x2="216" y2="128" />
      <polyline points="144 56 216 128 144 200" />
    </Svg>
  );
}

export function IconSearch() {
  return (
    <Svg>
      <circle cx="116" cy="116" r="84" />
      <line x1="175.4" y1="175.4" x2="224" y2="224" />
    </Svg>
  );
}

export function IconUser() {
  return (
    <Svg>
      <circle cx="128" cy="96" r="64" />
      <path d="M32,216c19.37-33.47,54.55-56,96-56s76.63,22.53,96,56" />
    </Svg>
  );
}

export function IconBrief() {
  return (
    <Svg>
      <rect x="32" y="72" width="192" height="144" rx="16" />
      <path d="M88,72V56a24,24,0,0,1,24-24H144a24,24,0,0,1,24,24V72" />
      <line x1="32" y1="120" x2="224" y2="120" />
    </Svg>
  );
}

const AVATAR_BG = [
  "bg-[#dbeafe] text-[#0038a8]",
  "bg-[#fef9c3] text-[#854d0e]",
  "bg-[#0038a8] text-white",
  "bg-[#e0f2fe] text-[#0c4a6e]",
  "bg-[#fcd116] text-[#0a2156]",
  "bg-white text-[#0038a8]",
];

/** Avatar con iniciales, esquinas redondeadas (squircle). */
export function CompanyAvatar({ name, size = "md" }: { name: string | null; size?: "md" | "lg" }) {
  const clean = (name ?? "").trim();
  const initials = clean
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase() || "•";
  let h = 0;
  for (let i = 0; i < clean.length; i++) h = (h * 31 + clean.charCodeAt(i)) % AVATAR_BG.length;
  const cls = size === "lg" ? "h-14 w-14 text-xl" : "h-11 w-11 text-sm";
  return (
    <span aria-hidden
      className={`grid shrink-0 place-items-center rounded-lg border border-[#e7e5e4] font-bold ${cls} ${AVATAR_BG[h]}`}>
      {initials}
    </span>
  );
}

export function Chip({ children, tone = "zinc" }: { children: React.ReactNode; tone?: "mint" | "sky" | "zinc" | "amber" | "grape" }) {
  const tones: Record<string, string> = {
    mint: "border border-[#bfdbfe] bg-[#eff6ff] text-[#0038a8]",
    sky: "border border-[#bae6fd] bg-[#f0f9ff] text-[#0c4a6e]",
    zinc: "border border-[#e7e5e4] bg-white text-[#57534e]",
    amber: "border border-[#fcd116] bg-[#fefce8] text-[#713f12]",
    grape: "border border-[#0038a8] bg-[#0038a8] text-white",
  };
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${tones[tone]}`}>
      {children}
    </span>
  );
}

export { salaryLine } from "@/lib/format";

export function OfertaCard({ o, match, shared, reasons }: { o: Oferta; match?: number; shared?: string[]; reasons?: string[] }) {
  const salary = salaryLine(o);
  const showMatch = match !== undefined && match >= MATCH_DISPLAY;
  return (
    <article className="group relative flex flex-col rounded-2xl border border-[#e7e5e4] bg-white p-5 shadow-[var(--shadow-card)] transition duration-200 hover:-translate-y-0.5 hover:border-[#bfdbfe] hover:shadow-[var(--shadow-lift)] sm:p-6">
      <div className="flex items-start gap-3.5">
        <CompanyAvatar name={o.empresa} />
        <div className="min-w-0 flex-1">
          <h2 className="text-[17px] font-bold leading-snug text-[#1c1917]">
            <Link href={`/oferta/${o.id}`} className="after:absolute after:inset-0 after:rounded-2xl group-hover:text-[#0038a8]">
              {o.titulo || "(sin título)"}
            </Link>
          </h2>
          <p className="mt-0.5 truncate text-sm font-medium text-[#57534e]">
            {[o.empresa, ubicacionLabel(o.ubicacion)].filter(Boolean).join(" · ")}
          </p>
        </div>
        {showMatch && (
          <span className="shrink-0 rounded-lg bg-[#fcd116] px-2 py-1 text-xs font-bold text-[#0a2156]">
            {match}%
          </span>
        )}
      </div>
      <div className="mt-3.5 flex flex-wrap gap-1.5">
        <Chip tone="mint">{catLabel(o.categoria)}</Chip>
        {o.modalidad && <Chip tone="sky">{modalidadLabel(o.modalidad)}</Chip>}
        {o.seniority && <Chip tone="zinc">{seniorityLabel(o.seniority)}</Chip>}
      </div>
      {showMatch && (!!shared?.length || !!reasons?.length) && (
        <p className="mt-2.5 text-xs font-semibold text-[#0038a8]">
          {[shared?.length ? `Coincidís en ${shared.slice(0, 3).map(tagLabel).join(", ")}` : "", ...(reasons ?? []).filter((r) => !r.startsWith("Coincidís")).slice(0, 2)]
            .filter(Boolean)
            .join(" · ")}
        </p>
      )}
      {o.descripcion && (
        <p className="mt-3 line-clamp-2 text-sm leading-6 text-[#57534e]">
          {o.descripcion.slice(0, 220)}
        </p>
      )}
      <div className="mt-auto flex items-center justify-between gap-3 pt-4">
        {salary ? (
          <span className="tnum rounded-lg bg-[#f0fdf4] px-2 py-1 text-sm font-bold text-[#166534]">{salary}</span>
        ) : (
          <span className="text-xs font-semibold text-[#a8a29e]">vía {fuenteLabel(o.fuente)}</span>
        )}
        <span className="inline-flex items-center gap-1 text-sm font-bold text-[#0038a8] transition-[gap] group-hover:gap-2">
          {salary && <span className="mr-2 text-xs font-semibold text-[#a8a29e]">vía {fuenteLabel(o.fuente)}</span>}
          Ver <IconArrow />
        </span>
      </div>
    </article>
  );
}

/* Pie común: el mismo marcado vive en la landing (landing/src/pages/index.astro). */
export function SiteFooter() {
  const col = "mt-2 flex flex-col items-start gap-1.5 text-sm font-semibold";
  const lnk = "text-[#57534e] hover:text-[#0038a8]";
  return (
    <footer className="mt-16 border-t border-black/5 bg-white/60 py-10 backdrop-blur">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 sm:grid-cols-[1.4fr_1fr_1fr] sm:px-6">
        <div>
          <Logo />
          <p className="mt-3 max-w-xs text-sm leading-6 text-[#57534e]">
            Todas las ofertas de Uruguay en un lugar, ordenadas por cuánto encajan con tu CV.
          </p>
        </div>
        <nav aria-label="Explorar">
          <p className="text-xs font-bold uppercase tracking-widest text-[#78716c]">Explorar</p>
          <div className={col}>
            <Link href="/ofertas" className={lnk}>Ofertas</Link>
            <Link href="/mapa" className={lnk}>Empleos por departamento</Link>
            <a href="/#rubros" className={lnk}>Rubros</a>
            <a href="/#faq" className={lnk}>Preguntas frecuentes</a>
          </div>
        </nav>
        <nav aria-label="Legal">
          <p className="text-xs font-bold uppercase tracking-widest text-[#78716c]">Legal</p>
          <div className={col}>
            <Link href="/privacidad" className={lnk}>Privacidad</Link>
            <Link href="/terminos" className={lnk}>Términos</Link>
          </div>
        </nav>
      </div>
      <p className="mx-auto mt-8 max-w-6xl border-t border-[#f1efec] px-4 pt-6 text-xs font-medium text-[#78716c] sm:px-6">
        © 2026 Trabajogpt · Hecho en Uruguay · Ofertas actualizadas a diario
      </p>
    </footer>
  );
}

/** Reveal por scroll con IntersectionObserver. */
export function Reveal({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <span data-reveal={delay} className={`reveal block ${className}`}>
      {children}
    </span>
  );
}

/** Pastilla de estado de postulación. */
export function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    guardada: "bg-stone-100 text-stone-600",
    postulado: "bg-[#dbeafe] text-[#0038a8]",
    respuesta: "bg-[#fef9c3] text-[#854d0e]",
    entrevista: "bg-[#fcd116] text-[#0a2156]",
    oferta: "bg-[#bbf7d0] text-[#14532d]",
    rechazado: "bg-[#fecaca] text-[#7f1d1d]",
    descartado: "bg-stone-100 text-stone-400",
  };
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${map[status] ?? map.guardada}`}>
      {status}
    </span>
  );
}

/** Layout dividido para login/registro: panel marca + formulario. */
export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-[28px] border border-black/5 bg-white shadow-[var(--shadow-lift)] md:grid-cols-[1fr_1.15fr]">
        {/* panel «Sol de Mayo» nocturno, igual que el hero de la landing */}
        <div className="relative hidden flex-col justify-between overflow-hidden bg-[radial-gradient(26rem_18rem_at_100%_0%,rgba(252,209,22,0.28),transparent_60%),radial-gradient(24rem_18rem_at_0%_100%,rgba(47,111,237,0.45),transparent_65%),linear-gradient(160deg,#0a1d4a,#06122e)] p-9 md:flex">
          <span aria-hidden className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(252,209,22,0.45),transparent_60%)] blur-md" />
          <svg aria-hidden viewBox="0 0 200 200" className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 animate-[spin_140s_linear_infinite] text-[#fcd116] opacity-40 motion-reduce:animate-none">
            <circle cx="100" cy="100" r="30" fill="currentColor" opacity="0.6" />
            {Array.from({ length: 16 }).map((_, i) => (
              <path key={i} d={i % 2 ? "M98 66 L100 6 L102 66 Z" : "M96 66 Q99 40 97 18 L100 12 L103 18 Q101 40 104 66 Z"} fill="currentColor" opacity={i % 2 ? 0.55 : 0.9} transform={`rotate(${i * 22.5} 100 100)`} />
            ))}
          </svg>
          <span className="relative flex items-center gap-2.5">
            <Image src="/logo.png" alt="Trabajogpt" width={36} height={36}
              className="h-9 w-9 rounded-xl border border-white/30 object-cover" />
            <span className="font-[var(--font-display)] text-xl font-bold tracking-tight text-white">Trabajo<span className="text-[#fcd116]">gpt</span></span>
          </span>
          <div className="relative">
            <p className="font-[var(--font-display)] text-4xl font-bold leading-[1.05] tracking-tight text-white">
              Tu próximo trabajo{" "}
              <span className="bg-[linear-gradient(180deg,#ffe680,#fcd116_55%,#f5a524)] bg-clip-text text-transparent">está acá.</span>
            </p>
            <div className="mt-6 space-y-2.5 text-sm font-semibold text-white/90">
              {["Todas las ofertas de Uruguay en un lugar", "Ordenadas por cuánto encajan con tu CV", "Seguimiento de cada postulación"].map((t) => (
                <p key={t} className="flex items-center gap-2.5">
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#fcd116] text-[#0a2156]"><IconCheck /></span>{t}
                </p>
              ))}
            </div>
            <div aria-hidden className="mt-8 rotate-[-2deg] rounded-2xl bg-white p-4 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.6)]">
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#fef9c3] text-xs font-bold text-[#854d0e]">AD</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-[#1c1917]">Analista de datos junior</p>
                  <p className="truncate text-xs font-medium text-[#57534e]">Montevideo · Híbrido</p>
                </div>
                <span className="rounded-md bg-[#fcd116] px-1.5 py-0.5 text-xs font-bold text-[#0a2156]">86%</span>
              </div>
            </div>
          </div>
          <p className="relative text-xs font-semibold text-white/60">Gratis, para siempre.</p>
        </div>
        <div className="p-8 sm:p-10">
          <div className="md:hidden"><Logo /></div>
          <h1 className="mt-4 font-[var(--font-display)] text-3xl font-bold tracking-tight md:mt-0">{title}</h1>
          <p className="mt-1.5 text-sm font-medium text-stone-600">{subtitle}</p>
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </main>
  );
}
