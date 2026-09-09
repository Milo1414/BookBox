# Políticas de seguridad (RLS y Storage)

Este archivo documenta las políticas que crea `supabase/migrations/001_init.sql`.
No hace falta configurarlas a mano si ejecutás esa migración.

## Tabla `books`

RLS está **activado**.

| Rol | Operación | Qué puede hacer |
| --- | --- | --- |
| `anon` (visitante) | SELECT en `books` | Nada. No hay GRANT ni policy sobre la tabla. |
| `anon` | SELECT en `books_catalog` | Metadata pública de todos los libros. |
| `authenticated` | SELECT/INSERT/UPDATE/DELETE en `books` | Solo filas con `user_id = auth.uid()`. |

La vista `books_catalog` **no incluye**:

- `notes`, `learnings`, `why_read`
- `cover_path`, `epub_path`, `epub_file_name`, `epub_size_bytes`
- `user_id`

Los visitantes nunca reciben rutas de EPUB ni notas.

## Storage `book-covers`

Bucket **público** (las portadas se muestran en `<img>`).

- SELECT: cualquiera
- INSERT/UPDATE/DELETE: autenticado, y solo en `{user_id}/...`

Ruta: `book-covers/{user_id}/{book_id}/cover.webp`

## Storage `book-files`

Bucket **privado**. Sin acceso anónimo.

- SELECT/INSERT/UPDATE/DELETE: autenticado, solo `{user_id}/...`

Ruta: `book-files/{user_id}/{book_id}/libro.epub`

La descarga usa una **signed URL** temporal (`createSignedUrl`). No hay URLs permanentes ni el bucket es listable por visitantes.
