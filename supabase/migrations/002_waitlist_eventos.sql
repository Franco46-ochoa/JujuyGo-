-- Waitlist + eventos de uso para métricas de tracción (hackathon).
-- Regla: cualquiera puede INSERTAR, NADIE puede leer (salvo service_role).

create table public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  created_at timestamptz not null default now(),
  constraint waitlist_email_key unique (email)
);

create table public.eventos (
  id bigint generated always as identity primary key,
  tipo text not null,
  datos jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.waitlist enable row level security;
alter table public.eventos enable row level security;

grant insert on public.waitlist to anon, authenticated;
grant insert on public.eventos to anon, authenticated;

-- Sin policies de select/update/delete: RLS deniega todo lo demás.
-- El service_role bypasea RLS y es la única vía de lectura.

create policy "Cualquiera puede anotarse en la waitlist"
  on public.waitlist for insert
  to anon, authenticated
  with check (char_length(email) between 5 and 254 and email like '%@%');

create policy "Cualquiera puede registrar un evento"
  on public.eventos for insert
  to anon, authenticated
  with check (char_length(tipo) between 1 and 60);

create index eventos_tipo_idx on public.eventos (tipo, created_at desc);
create index waitlist_created_at_idx on public.waitlist (created_at desc);
