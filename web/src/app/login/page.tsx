import Link from "next/link";
import { AuthShell } from "@/components/ui";
import { LoginForm } from "@/components/LoginForm";
import { GoogleButton, googleError } from "@/components/GoogleButton";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const gErr = googleError(error);

  return (
    <AuthShell title="Bienvenido de vuelta" subtitle="Entrá para ver las ofertas de hoy.">
      <div className="space-y-4">
        <GoogleButton />
        {gErr && <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-200">{gErr}</p>}
        <LoginForm />
      </div>
      <p className="mt-6 text-center text-sm text-stone-500">
        ¿No tenés cuenta?{" "}
        <Link href="/register" className="font-semibold text-[#0038a8] hover:text-[#0038a8]">
          Registrate gratis
        </Link>
      </p>
    </AuthShell>
  );
}
