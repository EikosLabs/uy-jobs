export function GoogleButton({ text = "Continuar con Google" }: { text?: string }) {
  // Si Google no está configurado, la ruta redirige a /login?error=... con aviso.
  return (
    <>
      <a href="/api/auth/google"
        className="flex w-full items-center justify-center gap-3 rounded-xl border border-white/15 bg-white py-3 font-semibold text-stone-900 transition hover:bg-stone-100">
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
          <path fill="#4285F4" d="M23.5 12.3c0-.9-.1-1.5-.3-2.3H12v4.5h6.5c-.1 1.1-.8 2.7-2.4 3.8l-.1.1 3.5 2.7.1.1c2.1-2 3.9-4.9 3.9-8.9z" />
          <path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.8-2.9c-1 .7-2.4 1.2-4.1 1.2-3.1 0-5.8-2.1-6.8-5l-.1.1-3.6 2.8v.1C3.5 21.3 7.5 24 12 24z" />
          <path fill="#FBBC05" d="M5.2 14.4c-.2-.7-.4-1.5-.4-2.4s.1-1.7.4-2.4l-.1-.1-3.5-2.7H1.5C.6 8.7 0 10.2 0 12s.6 3.3 1.5 4.8l3.7-2.4z" />
          <path fill="#EA4335" d="M12 4.7c1.8 0 3 .8 3.7 1.4l3.3-3.2C17.9 1.1 15.2 0 12 0 7.5 0 3.5 2.7 1.5 6.8l3.7 2.9c1-2.9 3.7-5 6.8-5z" />
        </svg>
        {text}
      </a>
      <div className="flex items-center gap-3 text-xs font-bold text-stone-500">
        <span className="h-0.5 flex-1 rounded bg-stone-200" />
        o con email
        <span className="h-0.5 flex-1 rounded bg-stone-200" />
      </div>
    </>
  );
}

const GOOGLE_ERRORS: Record<string, string> = {
  "google-no-configurado": "Login con Google aún no configurado.",
  "google-cancelado": "Cancelaste el login con Google.",
  "google-estado": "Sesión expirada. Probá de nuevo.",
  "google-token": "Google no respondió. Probá de nuevo.",
  "google-perfil": "No pudimos leer tu perfil de Google.",
  "google-email": "Necesitamos un email verificado de Google.",
  db: "Base de datos no disponible. Probá más tarde.",
};

export function googleError(code: string | undefined) {
  if (!code) return null;
  return GOOGLE_ERRORS[code] ?? "Error con Google. Probá de nuevo.";
}
