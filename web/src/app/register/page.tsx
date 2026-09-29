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

export default function RegisterPage() {
  const router = useRouter();
  const [state, action, pending] = useActionState(signup, undefined);
  const [ofertas, setOfertas] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/public/stats")
      .then((r) => r.json())
      .then((d) => setOfertas(typeof d.total === "number" ? d.total : null))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (state?.ok) {
      router.push("/ofertas");
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
              <label key={c} className="cursor-pointer rounded-full border border-[#0a2156]/15 bg-stone-100 px-3 py-1.5 text-xs text-stone-500 transition has-checked:border-[#0038a8] has-checked:bg-[#e3ecfd] has-checked:text-[#0038a8]">
                <input type="checkbox" name={`int_${c}`} className="sr-only" />
                {catLabel(c)}
              </label>
            ))}
          </div>
        </div>
        {state?.message && <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-sm text-red-300">{state.message}</p>}
        <button disabled={pending} type="submit" className="btn-primary w-full py-3">
          {pending ? "Creando cuenta…" : "Crear cuenta y ver ofertas"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-stone-500">
        {ofertas !== null && ofertas > 0 ? (
          <><strong>{ofertas.toLocaleString("es-UY")}</strong> ofertas activas te esperan. </>
        ) : null}
        ¿Ya tenés cuenta?{" "}
        <Link href="/login" className="font-semibold text-[#0038a8] hover:text-[#0038a8]">
          Entrá
        </Link>
      </p>
    </AuthShell>
  );
}
