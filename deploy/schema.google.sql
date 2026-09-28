-- uy-jobs: login con Google
-- password y telefono pasan a opcionales (usuarios de Google no tienen)
alter table users alter column password_hash drop not null;
alter table users alter column telefono drop not null;
alter table users add column if not exists google_id text unique;
alter table users add column if not exists avatar_url text;
create index if not exists idx_users_google on users (google_id);
