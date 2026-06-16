# CLAUDE.md — CPCodes

Internal web platform to manage a parcel company's **warehouse and delivery drivers**: postal codes with their **zone on the map**, drivers and the postal codes they cover, and access users. Next.js 16, deployed on Vercel. Personal/internal use (no special compliance requirements).

<!-- Loaded into context every session. Keep it short (<150 lines). Sources of truth: PLAN-ARQUITECTURA.md and README.md. -->

## Source-of-truth docs
- `PLAN-ARQUITECTURA.md` — architecture, settled decisions, and phased roadmap.
- `README.md` — setup (Neon, environment variables, deploy).
- Keep both up to date when closing each task.

## Stack
- Next.js 16 (App Router) + React 19 + TypeScript
- Tailwind CSS v4
- Neon (serverless Postgres) + Drizzle ORM
- Lightweight custom auth: JWT with `jose` in an httpOnly cookie + `bcryptjs`
- Map: Leaflet + OpenStreetMap, behind the `MapView` abstraction
- pnpm 11 · Node 24 LTS

## Commands
- Install: `pnpm install`
- Dev: `pnpm dev` · Build: `pnpm build`
- **Gate before commit:** `pnpm typecheck && pnpm lint && pnpm build` (no hooks yet; run it manually)
- DB: `pnpm db:push` (sync schema) · `pnpm db:generate` · `pnpm db:migrate`
- Admin hash: `pnpm hash "Password"`

## Working agreement
- **Think before coding.** State assumptions; if uncertain, ask. If multiple interpretations exist, surface them — don't pick silently.
- **Don't assume, verify.** Check the code, the DB, and real sources; don't trust names or docs.
- **Honesty.** If something is wrong or there's a simpler path, say so. Don't agree by default.
- **Simplicity first.** The minimum code that solves the problem. No speculative features or single-use abstractions.
- **Surgical changes.** Touch only what the task requires; match the existing style; don't reformat adjacent code.
- **Minimalist design**, **optimized for low-resource computers**: Server Components, little client JS, simplified geometry; never ship full datasets to the browser.
- **Test before committing** (terminal and browser).

## Project conventions
- **Roles:** fixed super-admin (environment variables) + **read-only** users (in DB). Permissions are enforced **on the server** (`proxy.ts` + `getSession`/`requireAdmin`), never by just hiding UI.
- **Secrets** (`AUTH_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`, `DATABASE_URL`) live only in the environment, never in the repo. Passwords are always hashed (bcrypt).
- **Next 16:** request interception goes in `proxy.ts` (not `middleware.ts`, which is deprecated).
- **DB:** the Drizzle schema (`src/db/schema.ts`) is the source of truth; verify the real schema before writing SQL. Lazy client `getDb()`.
- **Map:** all map access goes through `MapView` (swappable provider).
- **CP geometry:** open data from the **CNIG** (`inigoflores/ds-codigos-postales` repo), NOT codigospostales.com (no polygons).
- **React 19:** no synchronous `setState` inside a `useEffect`. Navigate with `router.push()`, not `window.location.href`.

## Production-grade engineering (high priority — built for multiple concurrent users)
- **Production-focused.** No executed path runs on mocks, fake data, or placeholders. Incomplete work goes behind a flag, not half-shipped.
- **No race conditions.** Treat every read-modify-write as concurrent; no check-then-act across an `await`. Enforce invariants in Postgres (atomic `UPDATE ... WHERE`, `INSERT ... ON CONFLICT`, `UNIQUE` constraints), not in app memory.
- **Assume ≥2 serverless instances.** No module-level mutable state that must stay correct across requests; that state lives in Postgres.
- **Fail closed.** Every auth/permission check denies on error or ambiguity. Never trust a client-supplied `role`/`id`: validate on the server.
- **Expand/contract migrations.** Backward-compatible, idempotent (`IF NOT EXISTS`), forward-only; a deploy must not break instances running the previous version. Commit the migration in the same session you apply it.
- **Bounded timeouts + graceful degradation.** Every DB/network call has a timeout and bounded retries; an external failure doesn't block the user.

## Git
- Single-developer repo: `main` stays stable; work on feature branches and merge when the gate is green.
- Don't skip the gate (no `--no-verify` once hooks are added).
