-- PDF privado del mismo libro, en paralelo al EPUB.

alter table public.books
  add column if not exists pdf_file_name text;

alter table public.books
  add column if not exists pdf_path text;

alter table public.books
  add column if not exists pdf_size_bytes bigint;

notify pgrst, 'reload schema';
