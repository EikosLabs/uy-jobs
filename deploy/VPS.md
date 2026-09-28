# uy-jobs — plataforma full en VPS (Postgres compartido)

App Next.js `web/` + engine Python, todo contra `glyphium-postgres`, DB+user `uyjobs`
(sin Supabase ni SQLite).

## Estado

| Pieza | Detalle |
|---|---|
| Web | `uyjobs-production-web-1` healthy, `127.0.0.1:5182` → 3000, red `glyphium-network` |
| Rutas | `/` búsqueda + stats, `/oferta/[id]` detalle, `/api/ofertas` JSON, `/api/health` |
| DB | `uyjobs` en `glyphium-postgres:5432`, 1567 ofertas (1001 linkedin / 339 computrabajo / 227 buscojobs) |
| Engine | `engine/scrape_pg.py` (scrape + upsert por url + enrich) directo a PG |
| Cron | `30 6 * * * .../engine/run_daily.sh` (todas, 5 págs, detalle 100) → `~/backups/logs/uyjobs-scrape.log` |
| Backup | `pg-backup-all.sh` incluye `uyjobs` (cron 03:00, retiene 7) + dump manual en `~/backups/uyjobs-*.dump` |
| Env real (600) | `/home/ubuntu/.config/uyjobs/production.env` (`DATABASE_URL=...@glyphium-postgres:5432/uyjobs`) |
| Nginx | `/` → landing Astro `127.0.0.1:5183`, app/API → Next `127.0.0.1:5182`, HTTPS con Certbot |
| Dominio | `https://trabajogpt.eikoslabs.com` (A → 149.56.97.199, HTTP→HTTPS activo) |
| Landing | Astro SSG (`landing/`, contenedor `uyjobs-production-landing-1`); stats por CSR a `/api/public/stats` |
| App | Next SPA: `/ofertas` CSR contra `/api/ofertas` (filtros, facets, matches, skeletons) |
| Auth | Registro/login con sesión JWT (cookie httpOnly, 7 días). Ofertas, detalle y API solo para registrados. |
| Admin | `/admin`: tabla de usuarios + CSV. Acceso según `ADMIN_EMAIL` en `production.env`. |

## Redesplegar web

```bash
cd ~/projects/uy-jobs
git pull --ff-only
docker compose --env-file /home/ubuntu/.config/uyjobs/production.env \
  -f compose.production.yml build web
docker compose --env-file /home/ubuntu/.config/uyjobs/production.env \
  -f compose.production.yml up -d
curl -s http://127.0.0.1:5182/api/health
```

## Engine manual

```bash
cd ~/projects/uy-jobs/engine
export DATABASE_URL=$(grep DATABASE_URL /home/ubuntu/.config/uyjobs/production.env | cut -d= -f2- | sed 's/@glyphium-postgres:/@127.0.0.1:/')
python3 scrape_pg.py --fuente computrabajo --paginas 2 --detalle 20 --delay 1.5
python3 scrape_pg.py --enrich-only
```

Notas: BuscoJobs da 403 desde el VPS (se tolera, sigue con las demás
fuentes). LinkedIn guest tiene rate limit (~10 págs); hay soporte de
proxies (`--proxy-file`) y `linkedin_auth.py` para modo autenticado.

## Dominio + SSL (activo)

`https://trabajogpt.eikoslabs.com` → nginx → `127.0.0.1:5182`, TLS de Certbot
con redirect HTTP→HTTPS. Verificar:

```bash
curl -s https://trabajogpt.eikoslabs.com/api/health
sudo certbot renew --dry-run
```

## Fuentes del scraper

`engine/scraper.py`: computrabajo, buscojobs, linkedin (guest), indeed,
gallito. Indeed y Gallito están tras Cloudflare/anti-bot: desde el VPS
suelen dar 403/0 avisos sin romper la corrida (warn + sigue). Para volumen
usar `--proxy-file` o IP residencial. Jornada/horario: `mine_jornada()`
(hs semanales, turnos, días, rangos `09:00-18:00`) + salario minado de la
descripción. `run_daily.sh` usa `--fuente todas` (incluye las 5).

**Anti-bot que sí funciona:** FlareSolverr en `127.0.0.1:8191`
(contenedor `flaresolverr`, red `glyphium-network`, restart unless-stopped).
Resuelve Indeed (~80s el primer challenge por sesión, después rápido con
sesión persistente). Gallito mata el TLS del navegador (JA3-block):
infetchable desde este VPS sin proxy residencial. cloudscraper probado y
descartado (no pasa Turnstile).

## Estudiantes y seniority (semántica full)

Tags `estudiantes`, `joven`, `flexible`, `primer-empleo`, `estudios`;
seniority con `estudiante` + variantes (`semi senior`, `ssr`);
`ofertas.experiencia_min` (años pedidos, minado de la descripción).
Match con bonus estudiante↔estudiante. Filtro `seniority` en API y toolbar
(estudiante/junior/pasantía/senior/lead); experiencia visible en el detalle.

## Engine semántico (CV + match + avisos)

Tablas `profiles` (user_id, cv_text, titulo, skills, experiencia, cv_file) y
`notifications` (user_id, oferta_id, score, detail, read_at) —
`deploy/schema.semantic.sql`.

- `/perfil`: sube CV (PDF/PNG/JPG ≤ 6 MB) → texto con `pdf-parse`, OCR con
  tesseract del sistema (spa+eng, viene en la imagen Docker), archivo
  original en MinIO `s3://uyjobs-cvs/cvs/<user>/<ts>-<nombre>`
  (usuario `uyjobs`, endpoint interno `glyphium-minio:9000`).
  Habilidades por diccionario (`src/lib/skills.ts`).
- Match 0-100: skills compartidas (60) + categoría de interés (25) +
  seniority (15) + título (10). Umbral de aviso: ≥ 40 (`src/lib/match.ts`).
- `/ofertas` muestra badge `% match` y campanita 🔔 con no-leídas;
  `/notificaciones` lista y marca leídas.
- Cron: `run_daily.sh` llama `POST /api/internal/rematch` (Bearer
  `CRON_SECRET`, máx 25 avisos/usuario/día). Sin secreto → 401.

## Ubicación y mapa

Columna `ofertas.departamento` normalizada por `dept_of()` (`engine/enrich.py`,
también en upsert y enrich diario). Sin dato = "Uruguay" genérico.

- Filtro `departamento` en `/api/ofertas` y toolbar + botón "📍 Cerca"
  (geolocalización → capital más cercana por haversine, `src/lib/geo.ts`).
- `/mapa` (pública): coropletas SVG con `public/uy-deptos.json` (GeoJSON
  simplificado 25 KB, fuente alotropico/uruguay.geo), punto de tu ubicación,
  top departamentos y click → ofertas filtradas.
- `/api/public/stats` incluye `deptCounts`.

## Marketing (marketingskills aplicadas)

Base: `.agents/product-marketing.md` (posicionamiento, audiencia, voz).

- **SEO programático**: `/empleos/[depto]` (19) + `/trabajos/[categoria]` (14)
  públicas con datos reales, JSON-LD JobPosting/ItemList, sitemap (39 URLs),
  robots (app tras login en noindex). `/sitemap.xml` y `/robots.txt` servidos
  por Next tras el proxy nginx.
- **Analytics propio**: tabla `events` + `POST /api/track` (eventos
  `signup_completed`, `login_completed`, `cta_hero_clicked`, `cv_uploaded`,
  `application_saved`, `share_referral_clicked`; sin PII). Dashboard en
  `/admin/metricas` (funnel 30d + tabla diaria).
- **Referidos**: `users.referral_code/referred_by`, cookie `ref` (?ref=,
  30d, vía proxy), atribución en registro email y Google, página
  `/referidos` (link + WhatsApp + ranking).

## Seguimiento de postulaciones (tipo Excel)
- **CRO registro/onboarding**: prueba social con n° real de usuarios en
  `/register`, banner "subí tu CV" en ofertas si no hay perfil. FAQ + FAQPage
  JSON-LD en la landing (ai-seo).

Tabla `applications` (user_id, oferta_id, status, notes, applied_at) —
estados: guardada, postulado, respuesta, entrevista, oferta, rechazado,
descartado. API `/api/postulaciones` (GET lista, POST crea/actualiza,
DELETE borra). Página `/postulaciones`: filtros por estado, cambio de
estado inline, exportar CSV, link al aviso. Widget en `/oferta/[id]`
para guardar/cambiar estado sin salir del aviso.

## Usuarios y admin

Tabla `users` (`deploy/schema.users.sql` + `schema.google.sql`): nombre,
email único, teléfono (opcional si entra con Google), password hash bcrypt
(opcional si entra con Google), `google_id`, `avatar_url`, departamento,
intereses, fecha.

- Registro: `/register` (nombre, teléfono, email, contraseña, departamento,
  intereses) o botón Google. Login: `/login` (email+clave o Google).
  Sesión JWT en cookie `session` firmada con `AUTH_SECRET`
  (`src/proxy.ts` + `src/lib/dal.ts`).
- Google OAuth: rutas `/api/auth/google` + `/api/auth/google/callback`
  (`GOOGLE_CLIENT_ID/SECRET`, `APP_URL` en `production.env` — configurado
  2026-09-25). Cuentas linkeadas por email si ya existían.
- `/admin` y `/api/admin/users` (JSON + `?format=csv`) solo si el email
  coincide con `ADMIN_EMAIL` de `/home/ubuntu/.config/uyjobs/production.env`.
  Tras cambiarlo, redesplegar la web.

## Base de datos

```bash
docker cp deploy/schema.pg.sql glyphium-postgres:/tmp/schema.pg.sql
docker exec glyphium-postgres psql -U glyphium -d uyjobs -f /tmp/schema.pg.sql
docker exec glyphium-postgres pg_dump -U uyjobs uyjobs > ~/backups/uyjobs-$(date +%F).dump
```

Credencial `uyjobs`: solo en `/home/ubuntu/.config/uyjobs/production.env`, no se commitea.
