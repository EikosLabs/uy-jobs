/* elaya redesign · Manrope única · sin ultra-bold · iconos SVG · reveal */
import Image from "next/image";
import Link from "next/link";
import type { Oferta } from "@/lib/supabase";
import { MATCH_DISPLAY } from "@/lib/match";

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
      <span className={`font-bold tracking-tight ${cls}`}>
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
      <path d="M200,224H150.54A266.56,266.56,0,0,0,174,200c0-34.93-25.5-63.42-59.67-68.2V96a8,8,0,0,1,16,0v8h24a8,8,0,0,1,0,16H96a8,8,0,0,1-8-8V96a8,8,0,0,1,16,0v35.8C70.37,136.58,44,165.07,44,200a8,8,0,0,0,8,8H56A52,52,0,0,1,108,160a52,52,0,0,1,52,48h40a8,8,0,0,0,0-16Z" />
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

export function salaryLine(o: Oferta) {
  if (o.salario_num) return `${o.moneda} ${Number(o.salario_num).toLocaleString("es-UY")}`;
  return o.salario || "";
}

export function OfertaCard({ o, match, shared }: { o: Oferta; match?: number; shared?: string[] }) {
  return (
    <article className="fluid-fast flex flex-col rounded-2xl border border-[#e7e5e4] bg-white p-6 shadow-[0_18px_40px_-28px_rgba(28,25,23,0.35)] hover:-transtone-y-1 hover:shadow-[0_24px_50px_-24px_rgba(0,56,168,0.35)]">
      <div className="flex items-start gap-4">
        <CompanyAvatar name={o.empresa} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-1.5">
            {match !== undefined && match >= MATCH_DISPLAY && (
              <span className="inline-flex items-center rounded-md bg-[#fcd116] px-2 py-0.5 text-xs font-bold text-[#0a2156]">
                {match}% match
              </span>
            )}
            <Chip tone="mint">{(o.categoria ?? "otros").replace(/_/g, " ")}</Chip>
            {o.modalidad && <Chip tone="sky">{o.modalidad}</Chip>}
            {o.seniority && <Chip tone="grape">{o.seniority}</Chip>}
          </div>
          <h2 className="mt-2.5 text-lg font-bold leading-snug">
            <Link href={`/oferta/${o.id}`} className="transition-colors hover:text-[#0038a8]">
              {o.titulo || "(sin título)"}
            </Link>
          </h2>
          <p className="mt-1 truncate text-sm font-medium text-[#57534e]">
            {[o.empresa, o.ubicacion].filter(Boolean).join(" · ")}
          </p>
          {match !== undefined && match >= MATCH_DISPLAY && !!shared?.length && (
            <p className="mt-1.5 text-xs font-bold text-[#0038a8]">
              ✓ Coincidís en {shared.map((s) => s.replace(/_/g, " ")).join(" · ")}
            </p>
          )}
        </div>
      </div>
      {o.descripcion && (
        <p className="mt-3 line-clamp-2 text-sm leading-6 text-[#57534e]">
          {o.descripcion.slice(0, 220)}
        </p>
      )}
      <div className="mt-4 flex items-center justify-between border-t border-[#e7e5e4] pt-4 mt-auto">
        <span className="tnum text-sm font-bold text-[#1c1917]">{salaryLine(o) || <span className="font-medium text-[#78716c]">Salario a convenir</span>}</span>
        <span className="flex items-center gap-2 text-xs font-semibold text-[#78716c]">
          {o.fuente}
          <Link href={`/oferta/${o.id}`} className="fluid-fast inline-flex items-center gap-1 font-bold text-[#0038a8] hover:gap-2">
            Ver <IconArrow />
          </Link>
        </span>
      </div>
    </article>
  );
}

export function SiteFooter() {  return (
    <footer className="border-t border-[#e7e5e4] bg-white py-10">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 sm:grid-cols-[1.2fr_1fr_1fr] sm:px-6">
        <div>
          <Logo />
          <p className="mt-3 max-w-xs text-sm leading-6 text-[#57534e]">
            El agregador de empleo de Uruguay: ofertas, match con tu CV y seguimiento de postulaciones.
          </p>
        </div>
        <nav aria-label="Explorar">
          <p className="text-xs font-bold uppercase tracking-widest text-[#78716c]">Explorar</p>
          <div className="mt-2 flex flex-col items-start gap-1 text-sm font-semibold">
            <Link href="/ofertas" className="text-[#57534e] hover:text-[#0038a8]">Ofertas</Link>
            <Link href="/mapa" className="text-[#57534e] hover:text-[#0038a8]">Mapa</Link>
            <Link href="/postulaciones" className="text-[#57534e] hover:text-[#0038a8]">Postulaciones</Link>
          </div>
        </nav>
        <nav aria-label="Legal">
          <p className="text-xs font-bold uppercase tracking-widest text-[#78716c]">Legal</p>
          <div className="mt-2 flex flex-col items-start gap-1 text-sm font-semibold">
            <Link href="/privacidad" className="text-[#57534e] hover:text-[#0038a8]">Privacidad</Link>
            <Link href="/terminos" className="text-[#57534e] hover:text-[#0038a8]">Términos</Link>
          </div>
        </nav>
      </div>
      <p className="mx-auto mt-8 max-w-6xl px-4 text-xs text-[#78716c] sm:px-6">
        Datos actualizados a diario.
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
    <main className="flex min-h-screen items-center justify-center bg-[#faf9f7] px-4 py-10">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-2xl border border-[#e7e5e4] bg-white shadow-[0_24px_60px_-32px_rgba(28,25,23,0.35)] md:grid-cols-[1fr_1.15fr]">
        <div className="relative hidden flex-col justify-between overflow-hidden bg-[#0038a8] p-8 md:flex">
          <span className="relative flex items-center gap-2.5">
            <Image src="/logo.png" alt="Trabajogpt" width={36} height={36}
              className="h-9 w-9 rounded-xl border border-white/30 object-cover" />
            <span className="text-xl font-bold text-white">Trabajogpt</span>
          </span>
          <div className="relative">
            <p className="text-3xl font-bold leading-10 text-white">
              Tu próximo trabajo está acá.
            </p>
            <div className="mt-6 space-y-2.5 text-sm font-semibold text-white">
              {["Miles de ofertas en un solo lugar", "Filtros por rubro y modalidad", "Nuevos avisos todos los días"].map((t) => (
                <p key={t} className="flex items-center gap-2.5">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#fcd116] text-xs font-bold text-[#0a2156]">✓</span>{t}
                </p>
              ))}
            </div>
          </div>
          <p className="relative text-xs font-semibold text-white/70">Gratis, para siempre.</p>
        </div>
        <div className="p-8 sm:p-10">
          <div className="md:hidden"><Logo /></div>
          <h1 className="mt-4 text-2xl font-bold md:mt-0">{title}</h1>
          <p className="mt-1.5 text-sm font-medium text-stone-600">{subtitle}</p>
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </main>
  );
}
