# coincidir

App web para coordinar reuniones entre zonas horarias **sin votación**: cada participante marca cuándo puede, y la app encuentra automáticamente los mejores horarios donde más gente coincide.

- Sin cuentas: el organizador crea un evento, comparte un link.
- Cada uno entra, pone su nombre + zona horaria, y marca con click+drag los slots donde **sí puede**.
- La app muestra los mejores bloques continuos donde todos (o casi todos) pueden, ranked.

## Setup local

### 1) Crear proyecto de Supabase

1. Andá a [supabase.com](https://supabase.com) → New project (gratis, sin tarjeta).
2. Elegí región, anotá la password del DB (no la necesitás para esta app).
3. Esperá ~1 min a que termine de provisionar.

### 2) Cargar el esquema

1. Abrí el **SQL Editor** en tu proyecto.
2. Pegá el contenido de [`supabase/schema.sql`](supabase/schema.sql) y corré.

### 3) Conectar la app

1. En Supabase: **Project Settings → API**. Copiá:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
2. Copiá el archivo de ejemplo:
   ```bash
   cp .env.local.example .env.local
   ```
3. Pegá los valores en `.env.local`.

### 4) Correr

```bash
npm install
npm run dev
```

Abrí `http://localhost:3000`.

## Deploy en Vercel

1. Subí el repo a GitHub.
2. En [vercel.com](https://vercel.com) → New Project → elegí el repo.
3. En **Environment Variables** pegá:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy. Listo, ya tenés URL pública para compartir.

## Modelo

- Toda la disponibilidad se guarda como timestamps **UTC**. Cada participante ve la grilla traducida a **su** zona horaria.
- La ventana del evento (rango de fechas + horas del día) se define en la zona del **organizador**: si vos creás un evento "lunes 8-22 hora Argentina", un participante en Madrid verá esa misma franja convertida a su horario local (probablemente cruzando medianoche).
- El "mejor horario" es un bloque continuo de slots que cubre la duración pedida y suma la mayor cantidad de participantes disponibles.

## Stack

- Next.js 16 (App Router, Turbopack)
- React 19
- Supabase (Postgres + auto-generated REST API)
- Tailwind CSS v4

## Limitaciones conocidas

- No hay autenticación: cualquiera con el link puede sumarse o sobrescribir su propia disponibilidad. Para grupos privados, no compartas el link públicamente.
- El refresco entre participantes es por polling cada 8s (no realtime). Si querés realtime, podés activar Postgres Replication en Supabase para las tablas `participants` y `availability` y suscribirte con `supabase.channel(...)`.
- Las transiciones de DST en la timezone del organizador pueden producir un slot ligeramente desplazado en la frontera exacta del cambio horario.
