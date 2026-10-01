"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { signup } from "@/actions/auth";
import { CATEGORIAS, DEPARTAMENTOS } from "@/lib/supabase";
import { AuthShell } from "@/components/ui";
import { GoogleButton } from "@/components/GoogleButton";
import { catLabel } from "@/lib/format";
import { safeNext } from "@/lib/next";

export default function RegisterPage() {
  const router = useRouter();
  const [state, action, pending] = useActionState(signup, undefined);
  const [ofertas, setOfertas] = useState<number | null>(null);
  const [loginHref, setLoginHref] = useState("/login");

  useEffect(() => {
    const next = safeNext(new URLSearchParams(window.location.search).get("next"));
    if (next) setLoginHref(`/login?next=${encodeURIComponent(next)}`);
    fetch("/api/public/stats")
      .then((r) => r.json())
      .then((d) => setOfertas(typeof d.total === "number" ? d.total : null))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (state?.ok) {
      const next = safeNext(new URLSearchParams(window.location.search).get("next"));
      router.push(next || "/bienvenida");
      router.refresh();
    }
  }, [state, router]);

  return (
    <AuthShell title="Creá tu cuenta gratis" subtitle="Y accedé a todas las ofertas de Uruguay.">
      <form action={action} className="space-y-4">
        <GoogleButton text="Registrarme con Google" />
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="nombre" className="text-sm font-medium text-stone-600">Nombre completo *</label>
            <input id="nombre" name="nombre" required autoComplete="name" placeholder="Juan Pérez" className="field mt-1.5" />
          </div>
          <div>
            <label htmlFor="telefono" className="text-sm font-medium text-stone-600">Teléfono / WhatsApp *</label>
            <input id="telefono" name="telefono" required autoComplete="tel" placeholder="099 123 456" className="field mt-1.5" />
          </div>
        </div>
        <div>
          <label htmlFor="email" className="text-sm font-medium text-stone-600">Email *</label>
          <input id="email" name="email" type="email" required autoComplete="email" placeholder="vos@email.com" className="field mt-1.5" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="password" className="text-sm font-medium text-stone-600">Contraseña *</label>
            <input id="password" name="password" type="password" required autoComplete="new-password"
              placeholder="Mínimo 8 caracteres" className="field mt-1.5" />
          </div>
          <div>
            <label htmlFor="departamento" className="text-sm font-medium text-stone-600">Departamento</label>
            <select id="departamento" name="departamento" defaultValue="" className="field mt-1.5">
              <option value="">Seleccionar…</option>
              {DEPARTAMENTOS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <span className="text-sm font-medium text-stone-600">¿Qué rubros te interesan?</span>
          <div className="mt-2 flex flex-wrap gap-2">
            {CATEGORIAS.map((c) => (
              <label key={c} className="cursor-pointer rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-bold text-stone-600 transition hover:border-[#0038a8] hover:text-[#0038a8] has-checked:border-[#0038a8] has-checked:bg-[#0038a8] has-checked:text-white has-focus-visible:outline-2 has-focus-visible:outline-[#0038a8]">
                <input type="checkbox" name={`int_${c}`} className="sr-only" />
                {catLabel(c)}
              </label>
            ))}
          </div>
        </div>
        {state?.message && <p role="alert" className="notice notice-error text-sm font-semibold">{state.message}</p>}
        <button disabled={pending} type="submit" className="btn-primary w-full py-3">
          {pending ? "Creando cuenta…" : "Crear cuenta y ver ofertas"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-stone-500">
        {ofertas !== null && ofertas > 0 ? (
          <><strong>{ofertas.toLocaleString("es-UY")}</strong> ofertas activas te esperan. </>
        ) : null}
        ¿Ya tenés cuenta?{" "}
        <Link href={loginHref} className="font-semibold text-[#0038a8] hover:text-[#0038a8]">
          Entrá
        </Link>
      </p>
    </AuthShell>
  );
}
