import type { MetadataRoute } from "next";
import { DEPARTAMENTOS, CATEGORIAS } from "@/lib/supabase";

const BASE = process.env.APP_URL ?? "https://trabajogpt.eikoslabs.com";
const slug = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-");

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const staticPages = ["/", "/mapa", "/login", "/register", "/privacidad", "/terminos"].map((p) => ({
    url: `${BASE}${p}`,
    lastModified: now,
    changeFrequency: "daily" as const,
    priority: p === "/" ? 1 : 0.6,
  }));
  const deptos = DEPARTAMENTOS.map((d) => ({
    url: `${BASE}/empleos/${slug(d)}`,
    lastModified: now,
    changeFrequency: "daily" as const,
    priority: 0.8,
  }));
  const cats = CATEGORIAS.map((c) => ({
    url: `${BASE}/trabajos/${slug(c)}`,
    lastModified: now,
    changeFrequency: "daily" as const,
    priority: 0.8,
  }));
  return [...staticPages, ...deptos, ...cats];
}
