import Link from "next/link";
import { Logo } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#faf9f7] px-4">
      <div className="w-full max-w-md rounded-2xl border border-[#e7e5e4] bg-white p-10 text-center shadow-[0_24px_60px_-32px_rgba(28,25,23,0.35)]">
        <div className="mx-auto w-fit">
          <Logo />
        </div>
        <p className="mt-6 font-mono text-sm font-semibold text-stone-400">404</p>
        <h1 className="mt-2 text-2xl font-bold">Esta oferta ya no está por acá</h1>
        <p className="mt-2 text-sm leading-6 text-stone-600">
          La página que buscás no existe o se movió. Hay miles de avisos esperándote.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Link href="/ofertas" className="btn btn-accent">
            Ver ofertas
          </Link>
          <Link href="/" className="btn border border-[#e7e5e4] bg-white hover:bg-stone-50">
            Inicio
          </Link>
        </div>
      </div>
    </main>
  );
}
