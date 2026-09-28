import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import { RevealInit } from "@/components/RevealInit";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Trabajogpt · Todos los trabajos de Uruguay en un lugar",
  description:
    "Miles de ofertas de Computrabajo, BuscoJobs y LinkedIn reunidas, categorizadas y actualizadas a diario. Creá tu cuenta gratis.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${manrope.variable} h-full antialiased`}>
      <body className="grain flex min-h-full flex-col bg-[#faf9f7] font-[var(--font-sans)] text-[#1c1917]">
        <a
          href="#contenido"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[70] focus:rounded-lg focus:bg-[#0038a8] focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-white"
        >
          Saltar al contenido
        </a>
        <div id="contenido" className="flex min-h-full flex-1 flex-col">
          {children}
        </div>
        <RevealInit />
      </body>
    </html>
  );
}
