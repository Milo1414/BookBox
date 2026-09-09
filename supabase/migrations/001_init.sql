-- BookBox — schema, indexes, RLS y Storage
-- Ejecutar en el SQL Editor de Supabase (o via CLI: supabase db push)

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Tabla books
-- ---------------------------------------------------------------------------
create table if not exists public.books (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  slug text not null,
  title text not null,
  author text not null,
  cover_url text,
  cover_path text,
  ownership text not null check (ownership in ('owned', 'wishlist')),
  reading_status text check (reading_status in ('pending', 'reading', 'read')),
  priority text check (priority in ('now', 'high', 'medium', 'low')),
  categories text[] not null default '{}',
  format text check (format in ('epub', 'physical', 'both')),
  isbn text,
  rating numeric check (rating is null or (rating >= 1 and rating <= 5)),
  why_read text,
  notes text,
  learnings text,
  started_at date,
  finished_at date,
  epub_file_name text,
  epub_path text,
  epub_size_bytes bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, slug)
);

create index if not exists books_user_id_idx on public.books (user_id);
create index if not exists books_ownership_idx on public.books (ownership);
create index if not exists books_reading_status_idx on public.books (reading_status);
create index if not exists books_priority_idx on public.books (priority);
create index if not exists books_isbn_idx on public.books (isbn);

-- updated_at
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists books_set_updated_at on public.books;
create trigger books_set_updated_at
before update on public.books
for each row
execute procedure public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Catálogo público (sin notas, aprendizajes ni rutas de archivos)
-- security definer: los visitantes ven metadata pública de todos los libros.
-- ---------------------------------------------------------------------------
create or replace view public.books_catalog as
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
  created_at,
  updated_at
from public.books;

grant select on public.books_catalog to anon, authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.books enable row level security;

revoke all on table public.books from anon, public;
grant select, insert, update, delete on table public.books to authenticated;

drop policy if exists books_select_own on public.books;
drop policy if exists books_insert_own on public.books;
drop policy if exists books_update_own on public.books;
drop policy if exists books_delete_own on public.books;

create policy books_select_own
  on public.books for select
  to authenticated
  using (user_id = auth.uid());

create policy books_insert_own
  on public.books for insert
  to authenticated
  with check (user_id = auth.uid());

create policy books_update_own
  on public.books for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy books_delete_own
  on public.books for delete
  to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Storage buckets
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('book-covers', 'book-covers', true)
on conflict (id) do update set public = true;

insert into storage.buckets (id, name, public)
values ('book-files', 'book-files', false)
on conflict (id) do update set public = false;

-- Portadas: lectura pública, escritura solo en la carpeta del usuario
drop policy if exists covers_public_read on storage.objects;
drop policy if exists covers_owner_write on storage.objects;
drop policy if exists covers_owner_update on storage.objects;
drop policy if exists covers_owner_delete on storage.objects;

create policy covers_public_read
  on storage.objects for select
  to public
  using (bucket_id = 'book-covers');

create policy covers_owner_write
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'book-covers'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy covers_owner_update
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'book-covers'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy covers_owner_delete
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'book-covers'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- EPUB: privado. Nadie anónimo. Solo el dueño de la carpeta {user_id}/...
drop policy if exists files_owner_read on storage.objects;
drop policy if exists files_owner_write on storage.objects;
drop policy if exists files_owner_update on storage.objects;
drop policy if exists files_owner_delete on storage.objects;

create policy files_owner_read
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'book-files'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy files_owner_write
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'book-files'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy files_owner_update
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'book-files'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy files_owner_delete
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'book-files'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
