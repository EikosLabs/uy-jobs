# uy-jobs — plataforma laboral Uruguay

Tres bloques:

| Bloque | Carpeta | Qué es |
|---|---|---|
| Engine | `engine/` | Motor de búsqueda: scrapers (Computrabajo, BuscoJobs, LinkedIn guest + autenticado), `enrich.py` (categorías/tags/modalidad/salario) y `dashboard.py` (HTML estático legacy). Solo stdlib. |
| Backend + Frontend | `web/` | App Next.js unificada: API Routes + UI con búsqueda, filtros y stats. Lee de Supabase. |
| Datos | `supabase/` | `schema.sql` para la tabla `ofertas` + seed desde el engine. |

## Engine (rápido)

```bash
cd engine
python scraper.py --fuente todas --paginas 8 --delay 1.0
python enrich.py
python dashboard.py
# LinkedIn profundo (requiere li_at.txt + jsessionid.txt, nunca se commitean):
python linkedin_auth.py
```

## Web

```bash
cd web
cp .env.example .env.local   # NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY
npm install
npm run dev
```

## Supabase

1. Crear proyecto en supabase.com
2. SQL Editor → pegar `supabase/schema.sql`
3. Seed: `python engine/seed_supabase.py` (usa `SUPABASE_URL` + `SUPABASE_SERVICE_KEY`)
