import Link from "next/link";
import { AuthShell } from "@/components/ui";
import { LoginForm } from "@/components/LoginForm";
import { GoogleButton, googleError } from "@/components/GoogleButton";
import { safeNext } from "@/lib/next";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next: rawNext } = await searchParams;
  const next = safeNext(rawNext);
  const q = next ? `?next=${encodeURIComponent(next)}` : "";
  const gErr = googleError(error);

  return (
    <AuthShell title="Bienvenido de vuelta" subtitle="Entrá para ver las ofertas de hoy.">
      <div className="space-y-4">
        <GoogleButton next={next} />
        {gErr && <p role="alert" className="notice notice-error text-sm font-semibold">{gErr}</p>}
        <LoginForm next={next} />
      </div>
      <p className="mt-6 text-center text-sm text-stone-500">
        ¿No tenés cuenta?{" "}
        <Link href={`/register${q}`} className="font-semibold text-[#0038a8] hover:text-[#0038a8]">
          Registrate gratis
        </Link>
      </p>
    </AuthShell>
  );
}
