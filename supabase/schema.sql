create table if not exists ofertas (
  id bigint generated always as identity primary key,
  fuente text not null,
  oferta_id text,
  titulo text,
  empresa text,
  ubicacion text,
  salario text,
  contrato text,
  jornada text,
  fecha_publicacion text,
  url text unique not null,
  descripcion text,
  requisitos text,
  fecha_scrapeo timestamptz default now(),
  categoria text,
  tags text,
  modalidad text,
  seniority text,
  salario_num numeric,
  moneda text
);

create index if not exists idx_ofertas_fuente on ofertas (fuente);
create index if not exists idx_ofertas_categoria on ofertas (categoria);
create index if not exists idx_ofertas_modalidad on ofertas (modalidad);
create index if not exists idx_ofertas_titulo_trgm on ofertas using gin (titulo gin_trgm_ops);

alter table ofertas enable row level security;

drop policy if exists "lectura publica" on ofertas;
create policy "lectura publica" on ofertas for select using (true);
