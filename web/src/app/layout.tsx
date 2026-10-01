import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Manrope } from "next/font/google";
import { RevealInit } from "@/components/RevealInit";
import { PwaInit } from "@/components/Pwa";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});
// títulos: misma tipografía que la landing
const bricolage = Bricolage_Grotesque({ variable: "--font-bricolage", subsets: ["latin"], weight: ["600", "700", "800"] });

export const metadata: Metadata = {
  title: "Trabajogpt · Todos los trabajos de Uruguay en un lugar",
  description:
    "Miles de ofertas de Computrabajo, BuscoJobs y LinkedIn reunidas, categorizadas y actualizadas a diario. Creá tu cuenta gratis.",
  appleWebApp: { capable: true, title: "Trabajogpt", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${manrope.variable} ${bricolage.variable} h-full antialiased`}>
      <body className="grain flex min-h-full flex-col font-[var(--font-sans)] text-[#1c1917]">
        <a
          href="#contenido"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[70] focus:rounded-lg focus:bg-[#0038a8] focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-white"
        >
          Saltar al contenido
        </a>
        <div id="contenido" className="flex min-h-full flex-1 flex-col">
          {children}
        </div>
        <a href="https://eikoslabs.com" target="_blank" rel="noopener" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '14px 16px', fontSize: 12, color: 'inherit', opacity: 0.7, textDecoration: 'none' }}>Powered by <img src="/eikoslabs.svg" alt="" width={16} height={17} /> <b>Eikos Labs</b></a>
        <RevealInit />
        <PwaInit />
      </body>
    </html>
  );
}
