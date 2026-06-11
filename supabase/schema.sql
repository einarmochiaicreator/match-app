-- Esquema de Coincidir (modelo semanal recurrente)
-- Ejecutar en el SQL Editor de Supabase

create extension if not exists "pgcrypto";

create table if not exists events (
  id text primary key,
  title text not null,
  organizer_name text not null,
  organizer_timezone text not null,
  -- Lunes de la semana de referencia. Ancla todos los slots a timestamps concretos.
  week_anchor date not null,
  day_start_hour int not null default 0 check (day_start_hour between 0 and 23),
  day_end_hour int not null default 24 check (day_end_hour between 1 and 24),
  created_at timestamptz not null default now(),
  -- Reunión confirmada por el admin (instante UTC concreto) + cuándo.
  confirmed_slot timestamptz,
  confirmed_at timestamptz,
  check (day_end_hour > day_start_hour)
);

create table if not exists participants (
  id uuid primary key default gen_random_uuid(),
  event_id text not null references events(id) on delete cascade,
  name text not null,
  timezone text not null,
  email text,
  created_at timestamptz not null default now(),
  unique (event_id, name)
);

create table if not exists availability (
  participant_id uuid not null references participants(id) on delete cascade,
  slot_start timestamptz not null,
  primary key (participant_id, slot_start)
);

create index if not exists availability_slot_idx on availability(slot_start);
create index if not exists participants_event_idx on participants(event_id);

alter table events enable row level security;
alter table participants enable row level security;
alter table availability enable row level security;

drop policy if exists "events_all" on events;
create policy "events_all" on events for all using (true) with check (true);

drop policy if exists "participants_all" on participants;
create policy "participants_all" on participants for all using (true) with check (true);

drop policy if exists "availability_all" on availability;
create policy "availability_all" on availability for all using (true) with check (true);
