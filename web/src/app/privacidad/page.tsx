import { Logo, SiteFooter } from "@/components/ui";

export default function Privacidad() {
  return (
    <main className="bg-scene-plain min-h-screen">
      <nav className="mx-auto flex max-w-3xl items-center justify-between px-4 py-5 sm:px-6">
        <Logo />
      </nav>
      <article className="mx-auto max-w-3xl px-4 pb-16 sm:px-6">
        <div className="card-pop rounded-[2rem] bg-white p-8 sm:p-10">
          <p className="text-xs font-bold uppercase tracking-widest text-[#0038a8]">Legal</p>
          <h1 className="mt-2 font-[var(--font-display)] text-3xl font-bold">Política de Privacidad</h1>
          <p className="mt-1 text-sm font-medium text-stone-500">Última actualización: 25 de setiembre de 2026</p>
          <div className="mt-6 space-y-5 text-sm leading-relaxed text-stone-600">
            <section>
              <h2 className="font-[var(--font-display)] text-lg font-bold text-[#0a2156]">1. Qué datos juntamos</h2>
              <p className="mt-2">Al crear tu cuenta nos das: nombre, email, teléfono/WhatsApp, departamento e intereses laborales. Si entrás con Google, recibimos tu nombre, email y foto de perfil de tu cuenta de Google. Además guardamos tu sesión de login en una cookie segura.</p>
            </section>
            <section>
              <h2 className="font-[var(--font-display)] text-lg font-bold text-[#0a2156]">2. Para qué los usamos</h2>
              <p className="mt-2">Solo para darte el servicio: tu cuenta, mostrarte ofertas acordes a tus intereses y, si nos das permiso, avisarte de novedades. Nunca vendemos tus datos ni los compartimos con terceros con fines publicitarios.</p>
            </section>
            <section>
              <h2 className="font-[var(--font-display)] text-lg font-bold text-[#0a2156]">3. Contraseñas y seguridad</h2>
              <p className="mt-2">Las contraseñas se guardan con hash irreversible (bcrypt): nadie en Trabajogpt puede verlas. La sesión viaja en cookie httpOnly y todo el sitio usa HTTPS.</p>
            </section>
            <section>
              <h2 className="font-[var(--font-display)] text-lg font-bold text-[#0a2156]">4. Tus derechos</h2>
              <p className="mt-2">Según la Ley 18.331 de Protección de Datos del Uruguay podés pedir acceso, rectificación o eliminación de tus datos escribiendo a <strong>hola@trabajogpt.eikoslabs.com</strong>. Si eliminás tu cuenta, borramos tus datos personales.</p>
            </section>
            <section>
              <h2 className="font-[var(--font-display)] text-lg font-bold text-[#0a2156]">5. Ofertas de terceros</h2>
              <p className="mt-2">Las ofertas se agregan de Computrabajo, BuscoJobs, LinkedIn e Indeed y enlazan al aviso original. No somos responsables del contenido de esos sitios.</p>
            </section>
          </div>
        </div>
      </article>
      <SiteFooter />
    </main>
  );
}
