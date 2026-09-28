import { CATEGORIAS, DEPARTAMENTOS } from "@/lib/supabase";

export const slugify = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-");

export const DEPTOS_BY_SLUG = Object.fromEntries(DEPARTAMENTOS.map((d) => [slugify(d), d]));
export const CATS_BY_SLUG = Object.fromEntries(CATEGORIAS.map((c) => [slugify(c), c]));
