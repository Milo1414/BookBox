-- Progreso de lectura opcional (0-100). Null = no mostrar porcentaje.

alter table public.books
  add column if not exists progress smallint
  check (progress is null or (progress >= 0 and progress <= 100));

drop view if exists public.books_catalog;

create view public.books_catalog as
select
  id,
  slug,
  title,
  author,
  cover_url,
  ownership,
  reading_status,
  priority,
  categories,
  format,
  isbn,
  rating,
  progress,
  created_at,
  updated_at
from public.books;

grant select on public.books_catalog to anon, authenticated;

notify pgrst, 'reload schema';
