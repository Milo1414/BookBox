-- Ficha pública del libro: páginas, editorial y año/fecha de publicación.

alter table public.books
  add column if not exists page_count integer
  check (page_count is null or (page_count >= 1 and page_count <= 20000));

alter table public.books
  add column if not exists publisher text;

alter table public.books
  add column if not exists published text;

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
  created_at,
  updated_at
from public.books;

grant select on public.books_catalog to anon, authenticated;

notify pgrst, 'reload schema';
