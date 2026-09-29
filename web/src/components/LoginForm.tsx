"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { login } from "@/actions/auth";
import { track } from "@/lib/track";

export function LoginForm() {
  const router = useRouter();
  const [state, action, pending] = useActionState(login, undefined);

  useEffect(() => {
    if (state?.ok) {
      track("login_completed", { method: "email" });
      router.push("/ofertas");
      router.refresh();
    }
  }, [state, router]);

  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="email" className="text-sm font-medium text-stone-600">Email</label>
        <input id="email" name="email" type="email" required autoComplete="email"
          placeholder="vos@email.com" className="field mt-1.5" />
      </div>
      <div>
        <label htmlFor="password" className="text-sm font-medium text-stone-600">Contraseña</label>
        <input id="password" name="password" type="password" required autoComplete="current-password"
          placeholder="••••••••" className="field mt-1.5" />
      </div>
      {state?.message && <p role="alert" className="notice notice-error text-sm font-semibold">{state.message}</p>}
      <button disabled={pending} type="submit" className="btn-primary w-full py-3">
        {pending ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
