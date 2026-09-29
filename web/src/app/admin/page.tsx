import Link from "next/link";
import { redirect } from "next/navigation";
import { getPool } from "@/lib/db";
import { verifySession } from "@/lib/dal";
import { AppNav } from "@/components/AppNav";
import type { SafeUser } from "@/lib/dal";

export default async function Admin() {
  const session = await verifySession();
  if (!session.isAdmin) redirect("/ofertas");

  const pool = getPool();
  let users: SafeUser[] = [];
  let totalOfertas = 0;
  if (pool) {
    const u = await pool.query(
      "SELECT id, nombre, email, telefono, departamento, intereses, created_at FROM users ORDER BY created_at DESC LIMIT 500"
    );
    users = u.rows as SafeUser[];
    const t = await pool.query("SELECT count(*)::int AS n FROM ofertas");
    totalOfertas = t.rows[0]?.n ?? 0;
  }

  const stats: [React.ReactNode, string][] = [
    [users.length, "usuarios registrados"],
    [totalOfertas, "ofertas activas"],
    [users.filter((u) => u.telefono).length, "con teléfono"],
    [users.filter((u) => u.departamento).length, "con departamento"],
  ];

  return (
    <main className="bg-scene-plain min-h-screen pb-24">
      <AppNav active="admin" />

      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map(([n, label], i) => (
            <div key={label} className={`card-pop rounded-2xl px-4 py-6 text-center ${["bg-[#dbeafe]", "bg-[#bae6fd]", "bg-[#fde68a]", "bg-[#fcd116]"][i % 4]}`}>
              <div className="font-[var(--font-display)] text-3xl font-bold">{n}</div>
              <div className="mt-1 text-xs font-bold uppercase tracking-widest">{label}</div>
            </div>
          ))}
        </div>

        <div className="mt-8 flex items-center justify-between">
          <h1 className="font-[var(--font-display)] text-2xl font-bold">Usuarios</h1>
          <div className="flex gap-2">
            <Link href="/admin/metricas" className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm font-bold hover:bg-stone-50">
              Métricas
            </Link>
            <a href="/api/admin/users?format=csv" className="btn-accent px-4 py-2 text-sm">
              Descargar CSV
            </a>
          </div>
        </div>

        <div className="card-pop mt-4 overflow-x-auto rounded-2xl bg-white">
          <table className="w-full min-w-180 text-left text-sm">
            <thead>
              <tr className="border-b-2 border-[#0a2156]/10 text-xs uppercase tracking-widest text-stone-500">
                <th className="px-5 py-3.5">Nombre</th>
                <th className="px-5 py-3.5">Email</th>
                <th className="px-5 py-3.5">Teléfono</th>
                <th className="px-5 py-3.5">Depto</th>
                <th className="px-5 py-3.5">Intereses</th>
                <th className="px-5 py-3.5">Registro</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-stone-100 transition last:border-0 hover:bg-[#dbeafe]/60">
                  <td className="px-5 py-3 font-bold">{u.nombre}</td>
                  <td className="px-5 py-3 font-medium text-stone-600">{u.email}</td>
                  <td className="px-5 py-3 font-medium text-stone-600">{u.telefono || "—"}</td>
                  <td className="px-5 py-3 font-medium text-stone-600">{u.departamento || "—"}</td>
                  <td className="max-w-48 truncate px-5 py-3 text-xs font-medium text-stone-500" title={(u.intereses || "").replace(/,/g, ", ")}>
                    {(u.intereses || "").replace(/,/g, ", ") || "—"}
                  </td>
                  <td className="px-5 py-3 text-xs font-medium text-stone-500">
                    {u.created_at ? new Date(u.created_at).toLocaleDateString("es-UY") : "—"}
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-10 text-center font-medium text-stone-500">Todavía no hay registros.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
