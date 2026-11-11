create table public.travesias (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  titulo text not null,
  datos jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.travesias enable row level security;

comment on table public.travesias is 'Travesías que cada persona guarda en su cuenta.';
comment on column public.travesias.datos is 'Plan serializado y metadatos de los lugares elegidos.';

create index travesias_user_id_idx on public.travesias (user_id);
create index travesias_user_updated_at_idx on public.travesias (user_id, updated_at desc);

grant select, insert, update, delete on public.travesias to authenticated;

create policy "Cada persona puede leer sus travesías"
  on public.travesias for select
  using (auth.uid() = user_id);

create policy "Cada persona puede guardar sus travesías"
  on public.travesias for insert
  with check (auth.uid() = user_id);

create policy "Cada persona puede actualizar sus travesías"
  on public.travesias for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Cada persona puede borrar sus travesías"
  on public.travesias for delete
  using (auth.uid() = user_id);
