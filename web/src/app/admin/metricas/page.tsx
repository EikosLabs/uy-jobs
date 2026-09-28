import Link from "next/link";
import { redirect } from "next/navigation";
import { getPool } from "@/lib/db";
import { verifySession } from "@/lib/dal";
import { AppNav } from "@/components/AppNav";

export default async function Metricas() {
  const session = await verifySession();
  if (!session.isAdmin) redirect("/ofertas");
  const pool = getPool();

  let byDay: { d: string; event: string; n: number }[] = [];
  let funnel: Record<string, number> = {};
  let cvs = 0;
  let postulaciones = 0;
  let referidos = 0;
  if (pool) {
    byDay = (
      await pool.query(
        `SELECT to_char(created_at, 'YYYY-MM-DD') AS d, event, count(*)::int AS n
         FROM events WHERE created_at > now() - interval '30 days'
         GROUP BY 1, 2 ORDER BY 1 DESC LIMIT 200`
      )
    ).rows;
    const f = await pool.query(
      `SELECT event, count(DISTINCT user_id)::int AS n FROM events
       WHERE event IN ('signup_completed','login_completed','cv_uploaded','application_saved')
         AND created_at > now() - interval '30 days' GROUP BY 1`
    );
    funnel = Object.fromEntries(f.rows.map((r) => [r.event, r.n]));
    cvs = (await pool.query("SELECT count(*)::int AS n FROM profiles WHERE COALESCE(cv_text,'') <> ''")).rows[0]?.n ?? 0;
    postulaciones = (await pool.query("SELECT count(*)::int AS n FROM applications")).rows[0]?.n ?? 0;
    referidos = (await pool.query("SELECT count(*)::int AS n FROM users WHERE referred_by IS NOT NULL")).rows[0]?.n ?? 0;
  }

  const days = [...new Set(byDay.map((r) => r.d))].slice(0, 14);
  const events = [...new Set(byDay.map((r) => r.event))];

  return (
    <main className="bg-scene-plain min-h-screen pb-24">
      <AppNav active="admin" />
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mt-6 flex items-center justify-between">
          <h1 className="font-[var(--font-display)] text-2xl font-bold sm:text-3xl">Métricas</h1>
          <Link href="/admin" className="text-sm font-bold text-[#0038a8] hover:underline">← usuarios</Link>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {[
            [funnel.signup_completed ?? 0, "registros (30d)"],
            [funnel.login_completed ?? 0, "logins (30d)"],
            [cvs, "CVs cargados"],
            [postulaciones, "postulaciones"],
            [referidos, "por referido"],
          ].map(([n, label]) => (
            <div key={label} className="rounded-2xl border border-stone-200 bg-white px-4 py-5 text-center shadow-sm">
              <div className="font-[var(--font-display)] text-3xl font-bold text-[#0038a8]">{n}</div>
              <div className="mt-1 text-xs font-bold uppercase tracking-widest text-stone-400">{label}</div>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="text-xs font-bold uppercase tracking-widest text-stone-400">Eventos por día (30d)</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-widest text-stone-400">
                  <th className="py-2 pr-4">Día</th>
                  {events.map((e) => (
                    <th key={e} className="px-2 py-2">{e.replace(/_/g, " ")}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {days.map((d) => (
                  <tr key={d} className="border-t border-stone-100 font-bold">
                    <td className="py-2 pr-4">{d}</td>
                    {events.map((e) => (
                      <td key={e} className="px-2 py-2 text-stone-600">
                        {byDay.find((r) => r.d === d && r.event === e)?.n ?? "—"}
                      </td>
                    ))}
                  </tr>
                ))}
                {days.length === 0 && (
                  <tr><td className="py-6 text-center text-stone-400" colSpan={events.length + 1}>Sin eventos todavía.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
