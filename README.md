# CPCodes

Plataforma interna para gestionar el **almacén y los repartidores** de una empresa de paquetería: códigos postales con su **zona en el mapa**, repartidores y los CP que cubren, y usuarios de acceso.

> Estado: **Fase 0 (cimientos)** completada. Ver el roadmap en `PLAN-ARQUITECTURA.md`.

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v4** (diseño minimalista)
- **Neon** (PostgreSQL serverless) + **Drizzle ORM**
- **Auth propia ligera**: JWT firmado con `jose` en cookie httpOnly + `bcryptjs`
- **Leaflet + OpenStreetMap** (mapa, tras la abstracción `MapView`)
- Gestor de paquetes: **pnpm** · Deploy en **Vercel**

Roles: un **super-admin fijo** (gestiona todo y crea usuarios) y **usuarios de solo lectura**.

## Requisitos

- **Node.js 24 LTS** (mínimo 20)
- **pnpm 11** — actívalo con Corepack (incluido en Node):

  ```bash
  corepack enable pnpm
  ```

- Una base de datos **Neon** (gratis) y, para desplegar, una cuenta **Vercel** (gratis)

## Puesta en marcha (local)

### 1. Instalar dependencias

```bash
pnpm install
```

### 2. Crear la base de datos en Neon

1. Entra en https://neon.tech y crea un proyecto (región de Europa, p. ej. Frankfurt).
2. Copia la **connection string** (formato `postgresql://...?sslmode=require`).

### 3. Configurar variables de entorno

Crea un archivo **`.env.local`** (copia de `.env.example`) y rellena:

```bash
cp .env.example .env.local
```

- `DATABASE_URL` — la cadena de conexión de Neon.
- `AUTH_SECRET` — genera uno con:

  ```bash
  openssl rand -base64 32
  ```

- `ADMIN_USERNAME` — el usuario del super-admin (p. ej. `admin`).
- `ADMIN_PASSWORD_HASH` — el hash de su contraseña. Genéralo con:

  ```bash
  pnpm hash "TuContraseñaSegura"
  ```

  Copia la línea `ADMIN_PASSWORD_HASH="..."` que imprime.

### 4. Crear las tablas

```bash
pnpm db:push
```

(usa Drizzle para crear el esquema en tu base de datos Neon)

### 5. Arrancar

```bash
pnpm dev
```

Abre http://localhost:3000 → te redirige a `/login`. Entra con el usuario y la
contraseña del super-admin.

## Comprobaciones de calidad

```bash
pnpm typecheck   # TypeScript sin emitir
pnpm lint        # ESLint
pnpm build       # build de producción
```

## Despliegue en Vercel

1. Sube el repo a GitHub (incluyendo `pnpm-lock.yaml`).
2. En https://vercel.com → **New Project** → importa el repo.
3. Vercel detecta **pnpm** por el lockfile y usa la versión de `packageManager`.
4. En **Settings → Environment Variables** añade las mismas variables que en
   `.env.local` (`DATABASE_URL`, `AUTH_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`).
5. Deploy. Vercel detecta Next.js automáticamente.

> Las tablas se crean una sola vez con `pnpm db:push` apuntando a tu Neon
> (puedes ejecutarlo en local con la `DATABASE_URL` de producción).

## Estructura

```
src/
  app/
    login/                  # inicio de sesión
    dashboard/              # zona protegida
      codigos-postales/     # mapa (Fase 1: buscador + polígono del CP)
      repartidores/         # Fase 1: CRUD + asignación de CP
      usuarios/             # Fase 1: gestión de usuarios (solo admin)
    api/auth/{login,logout} # endpoints de sesión
  components/
    map/                    # MapView (abstracción) + LeafletMap (implementación)
    LogoutButton.tsx
  db/                       # schema.ts (Drizzle) + index.ts (cliente Neon)
  lib/                      # jwt.ts (edge) + session.ts (servidor)
  proxy.ts                  # protege /dashboard (antes "middleware" en Next ≤ 15)
scripts/
  hash-password.mjs         # genera el hash del admin
  etl-codigos-postales.ts   # carga de geometrías de CP (Fase 1)
```

## Qué viene en la Fase 1

- ETL de geometrías de CP (fuente CNIG) y API que sirve el polígono por CP.
- CRUD de repartidores y asignación repartidor ↔ CP.
- Gestión de usuarios de solo lectura desde el panel del admin.

Detalle completo en `PLAN-ARQUITECTURA.md`.
