-- Fechas de lectura en el catálogo público, para estadísticas del perfil.

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
  page_count,
  publisher,
  published,
  started_at,
  finished_at,
  created_at,
  updated_at
from public.books;

grant select on public.books_catalog to anon, authenticated;

notify pgrst, 'reload schema';
