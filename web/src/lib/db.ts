import { Pool } from "pg";

let pool: Pool | null = null;

export function getPool(): Pool | null {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  if (!pool) {
    pool = new Pool({
      connectionString: url,
      max: 5,
      idleTimeoutMillis: 30000,
    });
  }
  return pool;
}

/**
 * Mismo aviso publicado varias veces (otra ciudad, otra fuente): mismo título + misma empresa.
 * Sin empresa no agrupamos, para no juntar avisos distintos con título genérico.
 */
export const DUP_KEY = `CASE WHEN COALESCE(TRIM(empresa), '') = '' THEN id::text
  ELSE LOWER(TRIM(titulo)) || '|' || LOWER(TRIM(empresa)) END`;
