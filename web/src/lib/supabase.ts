import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type Oferta = {
  id: number;
  fuente: string;
  oferta_id: string | null;
  titulo: string | null;
  empresa: string | null;
  ubicacion: string | null;
  salario: string | null;
  contrato: string | null;
  jornada: string | null;
  fecha_publicacion: string | null;
  url: string;
  descripcion: string | null;
  requisitos: string | null;
  fecha_scrapeo: string | null;
  categoria: string | null;
  tags: string | null;
  modalidad: string | null;
  seniority: string | null;
  salario_num: number | null;
  moneda: string | null;
};

let client: SupabaseClient | null = null;

export function supabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  if (!client) client = createClient(url, key);
  return client;
}

export const CATEGORIAS = [
  "tecnologia", "ventas", "administracion", "logistica", "atencion_cliente",
  "gerencia", "oficios", "operarios", "salud", "marketing",
  "hoteleria_turismo", "gastronomia", "educacion", "otros",
];

export const MODALIDADES = ["remoto", "hibrido"];
export const FUENTES = ["linkedin", "computrabajo", "buscojobs"];
