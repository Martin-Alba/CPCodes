# Plataforma de Gestión de Almacén y Repartidores — Plan de Arquitectura

**Proyecto:** CPCodes
**Fecha:** 15/06/2026
**Autor:** Martin (Product owner) · Asistencia de ingeniería senior
**Estado:** Fase 0 y Fase 1 **completadas y desplegadas en Vercel** (16/06/2026). Este documento conserva el plan original; ver "Estado actual" justo abajo para lo realmente construido.

---

## Estado actual (16/06/2026) — construido y desplegado

Fases 0 y 1 completas, en producción en Vercel. Resumen de lo construido y de las **desviaciones respecto al plan original** (que se conserva más abajo como referencia):

- **Stack real:** Next.js **16** (no 15) + React 19 + TS · Tailwind v4 · Neon + Drizzle · **Leaflet + OSM** (abstracción `MapView`) · pnpm 11 · Vercel.
- **Auth (cambió respecto al plan):** NO se usó Auth.js (su v5 seguía en beta). Se implementó una **sesión propia ligera**: JWT con `jose` en cookie httpOnly + `bcryptjs`. Login con **super-admin fijo** por entorno (`ADMIN_USERNAME` + `ADMIN_PASSWORD`, hoy en **texto plano** — pendiente restaurar hash) y **usuarios de solo lectura** en DB (por **nombre de usuario**). `proxy.ts` protege `/dashboard` (Next 16 renombró `middleware`).
- **Datos:** geometrías de CP del **CNIG** + nombres de municipio del **INE** (codeforspain). ~10.900 CP y ~8.100 municipios cargados. *No* se aplicó simplificación de polígonos (caben holgados; queda como optimización futura).
- **Funciones (Fase 1):** búsqueda de CP por **CP / municipio / provincia** (mapa con polígono + listado paginado bidireccional), **repartidores** (CRUD + asignación N:M de CP) y **usuarios** de solo lectura. Mutaciones con **Server Actions** (admin-only, fail-closed, idempotentes).
- **Pendientes:** restaurar hash del admin (§7) · rutas diarias (Fase 2) · rotar credenciales expuestas.

---

## 0. Decisiones confirmadas (15/06/2026)

- **Roles:** un **super-admin fijo** (CRUD total de datos + alta/edición/baja de usuarios) y **usuarios de solo lectura** que el admin gestiona. → La tabla `users` pasa a **Fase 1** (no Fase 3). Permisos validados en el servidor.
- **Licencia de datos:** uso personal, sin restricción. Decisión §9.1 cerrada.
- **Fuente de la geometría de CP:** **CNIG** vía GeoJSON por provincias del repo `inigoflores/ds-codigos-postales` (polígonos reales + cruce CP→municipio INE). El listado de `codigospostales.com` queda descartado para este fin porque **no contiene geometría**, solo CP + nombres de calle.
- **Rutas diarias:** las rutas habituales de los repartidores. **Modeladas pero NO construidas** hasta definir el detalle.
- **Mapa:** Leaflet + OSM tras una abstracción `MapProvider` (confirmado).

---

## 1. Objetivo

Una plataforma web interna para gestionar el almacén y los repartidores de una empresa de paquetería en **España**, que permita:

- Buscar y administrar **códigos postales (CP)** y la **zona geográfica** que abarca cada uno (polígono real sobre mapa).
- Gestionar **repartidores** y **qué CP cubre cada uno**.
- Dejar preparada la gestión de **rutas diarias** (fase posterior).
- Acceso controlado por un **super-administrador fijo** (usuario + contraseña).
- Funcionar con **servicios gratuitos** (hosting, base de datos y mapa), de forma **rápida en ordenadores de bajos recursos** y con **varios usuarios a la vez**.

---

## 2. La verdad sobre "todo gratis" (lectura honesta)

Tu petición tiene una tensión real que conviene dejar clara desde el principio. No te voy a dar la razón en lo que no la tiene:

1. **Google Maps NO es realmente gratis.** Desde el **1 de marzo de 2025** Google retiró el crédito mensual de 200 USD y lo sustituyó por cupos gratuitos por producto (p. ej. ~10.000 cargas de mapa al mes en "Essentials"). Aun dentro del cupo, **exige una cuenta de facturación con tarjeta** y vigilar el consumo. Para una herramienta interna pequeña probablemente no pagues nada, pero el riesgo de coste y la fricción existen.

2. **Google no te da gratis el polígono de un CP.** Los límites de zona por código postal son un dato aparte. La capa oficial de Google (Boundaries) es de pago. Es decir: *aunque usaras Google Maps, los polígonos hay que sacarlos igualmente de datos abiertos.* Por tanto Google aporta poco a esta función concreta y sí añade fricción de facturación.

3. **Los límites de CP en España tienen un problema de licencia.** La cartografía oficial de CP dejó de ser abierta en 2017; hoy Correos la vende (~6.000 €/año). Existen **datasets comunitarios gratuitos** (GeoJSON por provincias), suficientes para empezar, pero **su licencia para uso comercial es ambigua**. Hay que decidir esto conscientemente (ver §9).

**Conclusión:** se puede construir todo gratis, pero el "mapa con polígonos de CP" se resuelve mejor con **mapa de código abierto + datos abiertos**, no con Google. Lo dejaremos **abstraído** para poder cambiar de proveedor sin reescribir.

---

## 3. Stack recomendado

| Capa | Elección | Por qué |
|---|---|---|
| **Framework** | **Next.js 15 (App Router) + React + TypeScript** | Lo pediste. Server Components reducen JS en el cliente → clave para bajos recursos. |
| **Hosting / Deploy** | **Vercel (plan Hobby, gratis)** | Integración nativa con Next.js, CI/CD desde Git, HTTPS y CDN incluidos. |
| **Base de datos** | **Neon (Postgres serverless, free tier)** | Postgres real (robusto, relacional). Driver HTTP que **evita agotar conexiones** con muchos usuarios concurrentes en serverless. Soporta **PostGIS** para datos geográficos. Free ~0,5 GB. |
| **ORM / acceso a datos** | **Drizzle ORM** | Ligero, tipado, SQL explícito y predecible. Migraciones versionadas. |
| **Autenticación** | **Auth.js (NextAuth) — Credentials** | Super-admin fijo con usuario+contraseña **hasheada** en variable de entorno. Cookie de sesión httpOnly. Preparado para multiusuario. |
| **Mapa** | **Leaflet + teselas OpenStreetMap**, tras una **interfaz `MapProvider`** | 100% gratis, sin tarjeta. **42 KB** vs 290 KB de MapLibre y **sin WebGL** → mejor en ordenadores antiguos. Renderiza GeoJSON sin problema. Cambiable a Google/MapLibre por la abstracción. |
| **Datos de CP** | **GeoJSON de datos abiertos**, ingeridos una vez y **simplificados** | Se cargan a Postgres con un script ETL. El navegador solo recibe el polígono del CP que se consulta. |
| **Estilos / UI** | **Tailwind CSS** + componentes propios minimalistas | Diseño simple, profesional, sin librerías pesadas. |
| **Validación** | **Zod** | Validar entrada en API y formularios (seguridad/robustez). |

> **Nota sobre las "Skills de Next.js y Diseño":** no existen como skills instalables en este entorno. No hace falta: aplicaré directamente las buenas prácticas de Next.js (Server Components, route handlers, caché) y un sistema de diseño minimalista con Tailwind. Si en el futuro quieres componentes prefabricados, se puede añadir **shadcn/ui** (ligero, copia el código a tu repo).

### ¿Por qué Neon y no Supabase?
Supabase es excelente si necesitas un *backend completo* (auth, storage, realtime). Aquí solo necesitas **una base de datos sólida + un login fijo**, así que Neon es más simple y ligero, y su driver sobre HTTP encaja mejor con el requisito de **muchos usuarios simultáneos** en funciones serverless. Supabase queda como alternativa válida si más adelante quieres auth gestionada o subida de archivos.

---

## 4. Modelo de datos (inicial)

Relacional, normalizado y preparado para crecer. Tablas principales:

**`postal_codes`** — un registro por CP
- `code` (CHAR(5), único, PK lógica) · `municipio` · `provincia`
- `geometry` (GeoJSON/PostGIS, polígono simplificado) · `centroid_lat` · `centroid_lng`
- `created_at` · `updated_at`

**`drivers`** (repartidores)
- `id` (uuid) · `nombre` · `telefono` · `vehiculo` (opcional) · `activo` (bool)
- `created_at` · `updated_at`

**`driver_postal_codes`** (relación N:M — qué CP cubre cada repartidor)
- `driver_id` → drivers · `postal_code` → postal_codes
- `es_principal` (bool, opcional) · PK compuesta (driver_id, postal_code)
- *Permite que un CP lo cubran varios repartidores y que un repartidor cubra varios CP.*

**`routes`** (rutas diarias — *estructura preparada, fase 2*)
- `id` · `driver_id` → drivers · `dia_semana` (0–6) o `fecha` · `nombre`
- `activa` (bool) · `created_at`

**`route_stops`** (paradas de una ruta — *fase 2*)
- `route_id` → routes · `postal_code` → postal_codes · `orden` (int)

**`users`** (*preparada para multiusuario, fase 3*)
- `id` · `email` · `password_hash` · `rol` (admin/operador) · `activo`
- *En fase 1 el super-admin vive en variables de entorno; esta tabla queda lista para migrar a varios usuarios con roles.*

**`audit_log`** (opcional, recomendable con varios usuarios)
- `id` · `user_ref` · `accion` · `entidad` · `payload` · `created_at`

Índices clave: `postal_codes.code`, `drivers.activo`, `driver_postal_codes(driver_id)`, `driver_postal_codes(postal_code)`.

---

## 5. Arquitectura de la función "zona del CP" (la parte delicada)

El dataset completo de polígonos de España es **grande (~60+ MB)**. Enviarlo entero al navegador rompería el requisito de bajos recursos. Estrategia:

1. **ETL (una vez, offline):** script que descarga el GeoJSON de datos abiertos, lo **simplifica** (algoritmo Douglas–Peucker vía `mapshaper`/`topojson`) para reducir vértices manteniendo la forma, y lo carga en `postal_codes` (geometría + centroide + municipio/provincia).
2. **API bajo demanda:** `GET /api/postal-codes/:code` devuelve **solo** el polígono simplificado de ese CP (payload de KB, no de MB), cacheado.
3. **Render:** Leaflet pinta ese único polígono y ajusta el encuadre (`fitBounds`) al centroide/área.

Esto mantiene los pagos de red mínimos → **rápido en equipos modestos** y **barato bajo concurrencia**.

---

## 6. Concurrencia, escalabilidad y rendimiento

- **Concurrencia:** Postgres gestiona lecturas/escrituras concurrentes con transacciones ACID. El driver HTTP de Neon evita el clásico agotamiento de conexiones cuando varias funciones serverless atienden a la vez.
- **Escalabilidad:** Vercel escala las funciones automáticamente; el cuello de botella sería la DB, mitigado por índices, paginación *keyset* y caché de respuestas de solo lectura (CP, que cambian poco).
- **Bajos recursos (cliente):** Server Components → menos JavaScript; Leaflet sin WebGL; polígonos simplificados; carga diferida del mapa solo en las vistas que lo usan; imágenes/teselas con caché del navegador.
- **Bajos recursos (red):** respuestas pequeñas y cacheadas; sin descargar datasets completos.

---

## 7. Seguridad

- Super-admin con **contraseña hasheada** (bcrypt/argon2) en variable de entorno — **nunca en texto plano ni en el repositorio**.
- Sesión por **cookie httpOnly + Secure + SameSite**; CSRF gestionado por Auth.js.
- **Todas** las rutas de la app y de API protegidas por middleware de sesión.
- **Validación con Zod** en cada endpoint; consultas parametrizadas vía Drizzle (sin SQL injection).
- Secretos solo en variables de entorno de Vercel. HTTPS por defecto.
- Limitación básica de intentos de login (rate limiting) para evitar fuerza bruta.

---

## 8. Estructura del proyecto (App Router)

```
src/
  app/
    (auth)/login/            # pantalla de login del super-admin
    (dashboard)/
      codigos-postales/      # buscar CP, ver zona en mapa
      repartidores/          # CRUD repartidores + asignación de CP
      rutas/                 # fase 2 (placeholder preparado)
    api/
      postal-codes/[code]/   # devuelve polígono simplificado
      drivers/               # CRUD repartidores
      auth/                  # Auth.js
  components/
    map/                     # MapProvider (interfaz) + LeafletMap (impl)
    ui/                      # componentes minimalistas reutilizables
  db/
    schema.ts                # Drizzle: tablas
    index.ts                 # cliente Neon
  lib/                       # validaciones zod, auth, utils
scripts/
  etl-codigos-postales.ts    # ingesta + simplificación de polígonos
```

---

## 9. Riesgos y decisiones abiertas (necesito tu confirmación)

1. **Licencia de los datos de CP (importante).** Los polígonos oficiales son de pago (Correos). Los datasets comunitarios son gratis pero de **licencia ambigua para uso comercial**. Opciones:
   (a) empezar con datos abiertos asumiendo el riesgo y revisar licencia antes de producción;
   (b) presupuestar la fuente oficial/un proveedor de pago más adelante;
   (c) usar **secciones censales del INE** (oficiales y libres) como aproximación de zona en vez del CP exacto.
2. **Super-admin único compartido vs. usuarios con roles.** Un solo usuario fijo es simple, pero si de verdad van a entrar **varias personas a la vez**, perderás trazabilidad (no sabrás quién hizo qué). ¿Lo dejamos fijo en fase 1 y migramos a usuarios con roles en fase 3, como propongo?
3. **Rutas diarias.** ¿Una ruta = un repartidor + lista ordenada de CP para un día/semana? ¿Recurrentes (cada lunes) o por fecha concreta? Lo dejo **modelado pero sin construir** hasta que lo definamos.
4. **Mapa.** Confirmo recomendación: **Leaflet + OSM** detrás de una abstracción. ¿De acuerdo, o quieres que deje también lista la implementación de Google Maps por si en el futuro activáis facturación?

---

## 10. Roadmap por fases

**Fase 0 — Cimientos** ✅ *completada*
Scaffolding Next.js 16 + TypeScript + Tailwind · conexión a Neon · esquema Drizzle + migraciones · auth propia con super-admin fijo · layout minimalista y `proxy.ts` de protección.

**Fase 1 — MVP funcional (núcleo de tu petición)** ✅ *completada y desplegada*
CRUD de repartidores · búsqueda de CP por CP/municipio/provincia · listado paginado · asignación repartidor↔CP · ETL de polígonos (CNIG) y nombres de municipio (INE) · mapa con la zona del CP (Leaflet) · gestión de usuarios de solo lectura.

**Fase 2 — Rutas diarias** *(pendiente)*
Modelo y UI de rutas/paradas ordenadas por CP y día · visualización de la ruta en mapa.

**Fase 3 — Multiusuario y robustez**
Tabla `users` con roles · audit log · rate limiting reforzado · panel de administración de usuarios.

---

## 11. Próximos pasos

1. Que valides este plan y respondas las **4 decisiones abiertas** del §9.
2. Con tu OK, arranco la **Fase 0** (scaffolding) y te dejo el proyecto corriendo en local + listo para deploy en Vercel.
3. Iteramos Fase 1 con entregas pequeñas, probadas en terminal y navegador antes de cada commit (según tus reglas del proyecto).
