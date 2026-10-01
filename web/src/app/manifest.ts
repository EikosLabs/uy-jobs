import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/ofertas",
    name: "Trabajogpt · Trabajos en Uruguay",
    short_name: "Trabajogpt",
    description: "Todos los trabajos de Uruguay en un lugar, con matches a tu perfil.",
    lang: "es-UY",
    start_url: "/ofertas?source=pwa",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#faf9f7",
    theme_color: "#ffffff",
    categories: ["business", "productivity"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Ofertas", url: "/ofertas", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
      { name: "Matches", url: "/notificaciones", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
      { name: "Postulaciones", url: "/postulaciones", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
