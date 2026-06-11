-- Migración 002: email por participante + reunión confirmada por el admin.
-- Correr en el SQL Editor de Supabase.

alter table participants add column if not exists email text;
alter table events add column if not exists confirmed_slot timestamptz;
alter table events add column if not exists confirmed_at timestamptz;
