import { Logo, SiteFooter } from "@/components/ui";

export default function Terminos() {
  return (
    <main className="bg-scene-plain min-h-screen">
      <nav className="mx-auto flex max-w-3xl items-center justify-between px-4 py-5 sm:px-6">
        <Logo />
      </nav>
      <article className="mx-auto max-w-3xl px-4 pb-16 sm:px-6">
        <div className="card-pop rounded-[2rem] bg-white p-8 sm:p-10">
          <p className="text-xs font-bold uppercase tracking-widest text-[#0038a8]">Legal</p>
          <h1 className="mt-2 font-[var(--font-display)] text-3xl font-bold">Términos de Servicio</h1>
          <p className="mt-1 text-sm font-medium text-stone-500">Última actualización: 25 de setiembre de 2026</p>
          <div className="mt-6 space-y-5 text-sm leading-relaxed text-stone-600">
            <section>
              <h2 className="font-[var(--font-display)] text-lg font-bold text-[#0a2156]">1. El servicio</h2>
              <p className="mt-2">Trabajogpt es un agregador gratuito de ofertas laborales de Uruguay. Reunimos avisos públicos de terceros y los ordenamos para que los explores. El servicio es gratuito.</p>
            </section>
            <section>
              <h2 className="font-[var(--font-display)] text-lg font-bold text-[#0a2156]">2. Tu cuenta</h2>
              <p className="mt-2">Para ver las ofertas necesitás una cuenta con datos reales. Sos responsable de mantener tu contraseña en secreto y de la actividad de tu cuenta. Podés cerrar tu cuenta cuando quieras.</p>
            </section>
            <section>
              <h2 className="font-[var(--font-display)] text-lg font-bold text-[#0a2156]">3. Uso aceptable</h2>
              <p className="mt-2">No podés usar el sitio para spam, scraping masivo, revender los datos ni nada ilegal. Podemos suspender cuentas que abusen del servicio.</p>
            </section>
            <section>
              <h2 className="font-[var(--font-display)] text-lg font-bold text-[#0a2156]">4. Sin garantías sobre las ofertas</h2>
              <p className="mt-2">Los avisos pertenecen a sus publicadores y pueden estar desactualizados o contener errores. La postulación se hace siempre en el sitio original. No garantizamos conseguir empleo.</p>
            </section>
            <section>
              <h2 className="font-[var(--font-display)] text-lg font-bold text-[#0a2156]">5. Contacto</h2>
              <p className="mt-2">Por dudas o reclamos escribinos a <strong>hola@trabajogpt.eikoslabs.com</strong>.</p>
            </section>
          </div>
        </div>
      </article>
      <SiteFooter />
    </main>
  );
}
