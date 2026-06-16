# CPCodes

Plataforma interna para gestionar el **almacén y los repartidores** de una empresa de paquetería: códigos postales con su **zona en el mapa**, repartidores y los CP que cubren, y usuarios de acceso.

> Estado: **Fase 0 y Fase 1 completadas y desplegado en Vercel.** Roadmap y decisiones en `PLAN-ARQUITECTURA.md`.

## Funcionalidades

- **Códigos postales:** búsqueda por **CP, municipio o provincia** (en ambos sentidos). Vista de **mapa** que dibuja el polígono real del CP, y vista de **listado** paginado (CP · municipio · provincia) que enlaza al mapa.
- **Repartidores:** alta, edición y baja, y asignación N:M de los CP que cubre cada uno.
- **Usuarios:** el super-admin crea/activa/elimina usuarios de **solo lectura** (entran con usuario + contraseña).

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v4** (diseño minimalista)
- **Neon** (PostgreSQL serverless) + **Drizzle ORM**
- **Auth propia ligera**: JWT firmado con `jose` en cookie httpOnly; usuarios de DB con `bcryptjs`
- **Leaflet + OpenStreetMap** (mapa, tras la abstracción `MapView`)
- Gestor de paquetes: **pnpm 11** · Deploy en **Vercel**

Roles: un **super-admin fijo** (variables de entorno) que gestiona todo, y **usuarios de solo lectura** (en DB). Los permisos se validan **en el servidor**.

## Requisitos

- **Node.js 24 LTS** (mínimo 20)
- **pnpm 11** — actívalo con Corepack: `corepack enable pnpm`
- Una base de datos **Neon** (gratis) y, para desplegar, una cuenta **Vercel** (gratis)

## Puesta en marcha (local)

```bash
pnpm install
cp .env.example .env.local
```

Rellena `.env.local`:

- `DATABASE_URL` — connection string de Neon (`postgresql://...?sslmode=require`).
- `AUTH_SECRET` — genera uno: `openssl rand -base64 32`
- `ADMIN_USERNAME` — usuario del super-admin (p. ej. `admin`).
- `ADMIN_PASSWORD` — su contraseña, en **texto plano** (de momento; **evita el carácter `$`**, que Next se come al cargar `.env`).

Crea las tablas y arranca:

```bash
pnpm db:push     # crea/actualiza el esquema en Neon
pnpm dev         # http://localhost:3000  → login con el super-admin
```

## Datos (códigos postales + municipios)

Origen: datos abiertos del **CNIG** (geometrías) y del **INE** (nombres de municipio).

```bash
# 1) Geometrías de CP (CNIG) -> data/cp-geojson/*.geojson
git clone --depth 1 https://github.com/inigoflores/ds-codigos-postales /tmp/cp-cnig
mkdir -p data/cp-geojson && cp /tmp/cp-cnig/data/*.geojson data/cp-geojson/
pnpm etl:cp

# 2) Nombres de municipio (INE) -> rellena postal_codes.municipio por código INE
git clone --depth 1 https://github.com/codeforspain/ds-organizacion-administrativa /tmp/oa
pnpm etl:municipios /tmp/oa/data/municipios.csv
```

Ambos ETL son idempotentes. `data/` está en `.gitignore`.

## Comprobaciones de calidad

```bash
pnpm typecheck   # TypeScript sin emitir
pnpm lint        # ESLint
pnpm build       # build de producción
```

## Despliegue en Vercel

1. Sube el repo a GitHub (incluyendo `pnpm-lock.yaml` y `pnpm-workspace.yaml`).
2. En https://vercel.com → **New Project** → importa el repo (detecta pnpm por el lockfile).
3. En **Settings → Environment Variables** (Production) añade: `AUTH_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`. La `DATABASE_URL` la aporta la integración de Neon/Vercel Postgres.
4. Deploy. Las tablas se crean con `pnpm db:push` apuntando a esa misma DB (los ETL también).

## Estructura

```
src/
  app/
    login/                          # inicio de sesión
    dashboard/
      codigos-postales/             # mapa + buscador (polígono del CP)
        listado/                    # tabla paginada CP · municipio · provincia
      repartidores/                 # CRUD + asignación de CP (server actions)
      usuarios/                     # gestión de usuarios de solo lectura (admin)
    api/
      auth/{login,logout}/          # endpoints de sesión
      postal-codes/[code]/          # geometría de un CP
      postal-codes/search/          # búsqueda CP/municipio/provincia
  components/
    map/                            # MapView (abstracción) + LeafletMap (impl)
    CodigoPostalExplorer.tsx · CpTabs.tsx · ConfirmSubmit.tsx · LogoutButton.tsx
  db/                               # schema.ts (Drizzle) + index.ts (cliente Neon)
  lib/                              # jwt.ts (edge) + session.ts (servidor)
  proxy.ts                          # protege /dashboard (Next 16; antes "middleware")
scripts/
  hash-password.mjs                 # genera un hash bcrypt (utilidad)
  etl-codigos-postales.ts           # carga geometrías de CP (CNIG)
  etl-municipios.ts                 # rellena nombres de municipio (INE)
```

## Notas

- **Seguridad (pendiente):** el super-admin usa contraseña en **texto plano** en el entorno (atajo temporal por el problema de los `$` en `.env`). Antes de "producción seria" se restaurará el hash (versión base64). Los usuarios de DB sí van hasheados.
- **Fase 2 (pendiente):** rutas diarias de los repartidores — las tablas `routes`/`route_stops` están modeladas pero la función aún no está construida.
