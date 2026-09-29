import { verifySession } from "@/lib/dal";
import { getPool } from "@/lib/db";
import { AppNav } from "@/components/AppNav";
import { ShareButtons } from "@/components/ShareButtons";

export default async function Referidos() {
  const session = await verifySession();
  const pool = getPool();
  let code = "";
  let invited = 0;
  let board: { nombre: string; n: number }[] = [];
  if (pool) {
    const me = await pool.query("SELECT referral_code FROM users WHERE id = $1", [session.userId]);
    code = me.rows[0]?.referral_code ?? "";
    invited =
      (await pool.query("SELECT count(*)::int AS n FROM users WHERE referred_by = $1", [session.userId])).rows[0]?.n ?? 0;
    board = (
      await pool.query(
        `SELECT u.nombre, count(f.id)::int AS n FROM users u
         JOIN users f ON f.referred_by = u.id
         GROUP BY u.id, u.nombre ORDER BY n DESC LIMIT 5`
      )
    ).rows;
  }
  const appUrl = process.env.APP_URL ?? "https://trabajogpt.eikoslabs.com";
  const link = `${appUrl}/register?ref=${code}`;

  return (
    <main className="bg-scene-plain min-h-screen pb-24">
      <AppNav active="referidos" />
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="mt-6 rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-widest text-[#0038a8]">Invitá y crecé</p>
          <h1 className="mt-2 font-[var(--font-display)] text-3xl font-bold">Traé a tus amigos a Trabajogpt</h1>
          <p className="mt-2 text-sm font-medium text-stone-600">
            Compartí tu link: cada amigo que se registre con él queda asociado a vos y ve de dónde vino.
            Ya trajiste a <strong>{invited}</strong>.
          </p>
          <div className="mt-4 flex flex-col gap-2 rounded-2xl bg-stone-50 p-4 sm:flex-row sm:items-center">
            <code className="min-w-0 flex-1 truncate font-mono text-sm font-bold text-[#0038a8]">{link}</code>
            <ShareButtons link={link} />
          </div>
          {board.length > 0 && (
            <>
              <h2 className="mt-6 text-xs font-bold uppercase tracking-widest text-stone-400">Top invitadores</h2>
              <ol className="mt-2 space-y-1.5">
                {board.map((b, i) => (
                  <li key={b.nombre} className="flex items-center justify-between rounded-xl bg-stone-50 px-4 py-2 text-sm font-bold">
                    <span>{i + 1}. {b.nombre.split(" ")[0]}</span>
                    <span className="text-stone-500">{b.n} invitados</span>
                  </li>
                ))}
              </ol>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
