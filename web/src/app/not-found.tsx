import Link from "next/link";
import { Logo } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#faf9f7] px-4">
      <div className="w-full max-w-md rounded-2xl border border-[#e7e5e4] bg-white p-10 text-center shadow-[var(--shadow-card)]">
        <div className="mx-auto w-fit">
          <Logo />
        </div>
        <p className="mt-6 font-mono text-sm font-semibold text-stone-400">404</p>
        <h1 className="mt-2 text-2xl font-bold">No encontramos esta página</h1>
        <p className="mt-2 text-sm leading-6 text-stone-600">
          Puede que el enlace esté mal o que la oferta ya haya cerrado. Mientras tanto, hay miles de avisos nuevos.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Link href="/ofertas" className="btn-accent px-4 py-2 text-sm">
            Ver ofertas
          </Link>
          <Link href="/" className="btn-ghost px-4 py-2 text-sm">
            Inicio
          </Link>
        </div>
      </div>
    </main>
  );
}
