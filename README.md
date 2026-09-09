# BookBox

Biblioteca personal visual (React + TypeScript + Supabase).

La primera iteración funciona con `localStorage`. Esta versión agrega autenticación, Postgres, archivos EPUB privados, portadas, PWA y backup.

## Instalación

```bash
npm install
cp .env.example .env
```

Completá las variables en `.env` y después:

```bash
npm run dev
```

## Variables de entorno

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Nunca uses la `service_role` key en el frontend. No commitees `.env`.

Sin estas variables la app sigue abriendo en modo local (`localStorage` + seed), para no perder la biblioteca actual.

## Configurar Supabase desde cero

1. Creá un proyecto en [Supabase](https://supabase.com).
2. En **Project Settings → API** copiá `Project URL` y `anon public` al `.env`.
3. En **Authentication → Providers** dejá Email habilitado.
4. En **Authentication → Users** creá el único usuario administrador (correo + contraseña).
5. En **SQL Editor** ejecutá las migraciones, en orden:

`supabase/migrations/001_init.sql`
`supabase/migrations/002_reading_progress.sql`
`supabase/migrations/003_page_count.sql`

Eso crea:

- tabla `books` + índices + `updated_at`
- vista pública `books_catalog` (sin notas ni rutas de EPUB)
- RLS
- buckets `book-covers` (público) y `book-files` (privado)
- policies de Storage

Detalle de políticas: `supabase/POLICIES.md`.

### Auth

- Un único administrador inicia sesión con correo y contraseña.
- Los visitantes ven el catálogo en solo lectura.
- Si la sesión vence, la app vuelve a modo visitante.

### Storage

Rutas:

```
book-covers/{user_id}/{book_id}/cover.webp
book-files/{user_id}/{book_id}/libro.epub
```

La descarga de EPUB usa signed URL temporal. Los visitantes no pueden leer `book-files`.

## Desarrollo local

```bash
npm run dev
```

Abrí `http://localhost:5173/`.

### Migración desde localStorage

Si el administrador entra y Supabase está vacío, pero hay libros locales:

1. Aparece **Encontré tu biblioteca local**
2. Confirmá **Importar a Supabase**
3. Se conservan títulos, autores, prioridades, categorías, estados y wishlist
4. `localStorage` queda como backup; Supabase pasa a ser la fuente de verdad

Orden de datos:

1. Supabase si ya hay biblioteca
2. localStorage si todavía no se migró
3. `milo_library_seed.json` solo si no existe nada

## Build

```bash
npm run build
npm run preview
```

## PWA

El build genera un service worker (vite-plugin-pwa).

- Se puede instalar desde Chrome / Safari / Edge
- El shell de la UI queda cacheado
- Las portadas ya vistas se cachean con límite
- Los EPUB **no** se cachean
- Sin internet muestra **Sin conexión**; el CRUD necesita red

## Backup

Desde **Administración** (sesión iniciada):

- **Exportar biblioteca** descarga `library-backup.json` (metadata, sin binarios)
- **Importar biblioteca** hace merge: no borra lo existente; salta duplicados

## Restauración

1. Iniciá sesión
2. Importar JSON, o
3. Si nunca migraste, usá **Importar a Supabase** con la biblioteca local

## Deploy

Cualquier host estático sirve: Vercel, Netlify, Cloudflare Pages, GitHub Pages (con SPA fallback).

Checklist:

1. Build de producción
2. Variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`
3. SQL ejecutado en el proyecto de Supabase
4. Redirect de todas las rutas a `index.html`
5. HTTPS (necesario para PWA)

Ejemplo Netlify `_redirects`:

```
/*    /index.html   200
```

Ejemplo Vercel `vercel.json`:

```json
{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
```

## Seguridad

- RLS en `books`: el autenticado solo modifica sus filas
- Visitantes leen `books_catalog` (sin notas, learnings, ni paths)
- EPUB privados + signed URL
- `.env` y `*.epub` están en `.gitignore`

## Scripts

| Comando | Uso |
| --- | --- |
| `npm run dev` | desarrollo |
| `npm run build` | typecheck + build |
| `npm run preview` | servir `dist/` |
