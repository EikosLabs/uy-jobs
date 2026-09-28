import type { MetadataRoute } from "next";
import { DEPARTAMENTOS, CATEGORIAS } from "@/lib/supabase";

const BASE = process.env.APP_URL ?? "https://trabajogpt.eikoslabs.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: ["/", "/mapa", "/empleos/", "/trabajos/", "/privacidad", "/terminos"], disallow: ["/api/", "/admin", "/ofertas", "/oferta/", "/perfil", "/postulaciones", "/notificaciones"] },
    ],
    sitemap: `${BASE}/sitemap.xml`,
  };
}
