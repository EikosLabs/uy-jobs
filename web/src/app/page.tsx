import Link from "next/link";
import { CATEGORIAS, FUENTES, MODALIDADES, supabase, type Oferta } from "@/lib/supabase";

const PAGE_SIZE = 50;

type Params = { [k: string]: string | string[] | undefined };

function str(p: Params, k: string): string {
  const v = p[k];
  return Array.isArray(v) ? (v[0] ?? "") : (v ?? "");
}

function href(base: Params, overrides: Record<string, string>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...base, ...overrides })) {
    if (typeof v === "string" && v) q.set(k, v);
  }
  const s = q.toString();
  return s ? `/?${s}` : "/";
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const p = await searchParams;
  const q = str(p, "q").slice(0, 120);
  const categoria = str(p, "categoria");
  const modalidad = str(p, "modalidad");
  const fuente = str(p, "fuente");
  const page = Math.max(1, parseInt(str(p, "page") || "1", 10) || 1);

  const sb = supabase();
  if (!sb) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-24 text-center">
        <h1 className="text-3xl font-bold">uy-jobs</h1>
        <p className="mt-4 text-zinc-400">
          Falta configurar Supabase. Copiá <code>.env.example</code> a{" "}
          <code>.env.local</code> con <code>NEXT_PUBLIC_SUPABASE_URL</code> y{" "}
          <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>, corré{" "}
          <code>supabase/schema.sql</code> y el seed{" "}
          <code>python engine/seed_supabase.py</code>.
        </p>
      </main>
    );
  }

  let query = sb.from("ofertas").select("*", { count: "exact" });
  if (q) {
    const esc = q.replace(/[%_]/g, "");
    query = query.or(
      `titulo.ilike.%${esc}%,empresa.ilike.%${esc}%,descripcion.ilike.%${esc}%`
    );
  }
  if (categoria) query = query.eq("categoria", categoria);
  if (modalidad) query = query.eq("modalidad", modalidad);
  if (fuente) query = query.eq("fuente", fuente);

  const from = (page - 1) * PAGE_SIZE;
  const { data, count, error } = await query
    .order("fecha_scrapeo", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  const ofertas = (data ?? []) as Oferta[];
  const total = count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const counts: Record<string, number> = { todas: total };
  for (const f of FUENTES) {
    const r = await sb.from("ofertas").select("id", { count: "exact", head: true }).eq("fuente", f);
    counts[f] = r.count ?? 0;
  }

  const flat: Params = { q, categoria, modalidad, fuente };

  return (
    <main className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
      <header className="sticky top-0 z-10 -mx-4 border-b border-zinc-800 bg-zinc-950/90 px-4 py-4 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4">
          <Link href="/" className="text-xl font-bold tracking-tight">
            uy-jobs <span className="text-sm font-normal text-zinc-500">UY</span>
          </Link>
          <form action="/" method="get" className="flex flex-1 flex-wrap gap-2">
            <input
              name="q"
              defaultValue={q}
              placeholder="Buscar: python, vendedor, remoto…"
              className="min-w-40 flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm outline-none placeholder:text-zinc-500 focus:border-emerald-500"
            />
            <select name="categoria" defaultValue={categoria} className="rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-2 text-sm">
              <option value="">Todas las categorías</option>
              {CATEGORIAS.map((c) => (
                <option key={c} value={c}>{c.replace(/_/g, " ")}</option>
              ))}
            </select>
            <select name="modalidad" defaultValue={modalidad} className="rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-2 text-sm">
              <option value="">Toda modalidad</option>
              {MODALIDADES.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <select name="fuente" defaultValue={fuente} className="rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-2 text-sm">
              <option value="">Toda fuente</option>
              {FUENTES.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
            <button type="submit" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold hover:bg-emerald-500">
              Buscar
            </button>
          </form>
        </div>
        <div className="mx-auto mt-2 flex max-w-6xl gap-2 text-xs text-zinc-400">
          <span className="rounded-full bg-zinc-800 px-3 py-1">total: {total}</span>
          {FUENTES.map((f) => (
            <Link key={f} href={href(flat, { fuente: f, page: "" })} className="rounded-full bg-zinc-800 px-3 py-1 hover:bg-zinc-700">
              {f}: {counts[f] ?? "…"}
            </Link>
          ))}
        </div>
      </header>

      {error && <p className="mt-8 text-red-400">Error: {error.message}</p>}

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {ofertas.map((o) => (
          <article key={o.id} className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <div className="flex flex-wrap gap-1 text-[11px]">
              <span className="rounded-full bg-emerald-900 px-2 py-0.5 text-emerald-300">{o.categoria ?? "otros"}</span>
              {o.modalidad && <span className="rounded-full bg-sky-900 px-2 py-0.5 text-sky-300">{o.modalidad}</span>}
              <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-zinc-400">{o.fuente}</span>
              {o.seniority && <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-zinc-400">{o.seniority}</span>}
            </div>
            <h2 className="mt-2 font-semibold leading-snug">
              <a href={o.url} target="_blank" rel="noopener noreferrer" className="hover:text-emerald-400">
                {o.titulo || "(sin título)"}
              </a>
            </h2>
            <p className="mt-1 text-sm text-zinc-400">
              {[o.empresa, o.ubicacion].filter(Boolean).join(" · ")}
              {o.salario_num ? ` · ${o.moneda} ${Number(o.salario_num).toLocaleString("es-UY")}` : o.salario ? ` · ${o.salario}` : ""}
            </p>
            {o.descripcion && <p className="mt-2 line-clamp-3 text-sm text-zinc-500">{o.descripcion.slice(0, 280)}</p>}
          </article>
        ))}
      </div>

      {ofertas.length === 0 && !error && (
        <p className="mt-12 text-center text-zinc-500">Sin resultados. Probá con otra búsqueda.</p>
      )}

      {pages > 1 && (
        <nav className="mt-8 flex items-center justify-center gap-3 text-sm">
          {page > 1 && <Link href={href(flat, { page: String(page - 1) })} className="rounded-lg border border-zinc-700 px-3 py-1.5 hover:bg-zinc-800">← anterior</Link>}
          <span className="text-zinc-400">{page} / {pages}</span>
          {page < pages && <Link href={href(flat, { page: String(page + 1) })} className="rounded-lg border border-zinc-700 px-3 py-1.5 hover:bg-zinc-800">siguiente →</Link>}
        </nav>
      )}
    </main>
  );
}
