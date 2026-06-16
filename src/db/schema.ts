import {
  pgTable,
  varchar,
  text,
  boolean,
  integer,
  uuid,
  doublePrecision,
  jsonb,
  timestamp,
  primaryKey,
  index,
} from "drizzle-orm/pg-core";

/**
 * Usuarios de SOLO LECTURA que crea/gestiona el super-admin.
 * El super-admin NO vive aquí: va en variables de entorno (ADMIN_USERNAME / ADMIN_PASSWORD_HASH).
 * El campo `role` queda preparado por si en el futuro quieres más perfiles.
 */
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: varchar("name", { length: 120 }),
  role: varchar("role", { length: 20 }).notNull().default("viewer"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Códigos postales con su geometría (polígono) para pintar la zona en el mapa.
 * `geometry` guarda GeoJSON simplificado (Polygon / MultiPolygon).
 */
export const postalCodes = pgTable(
  "postal_codes",
  {
    code: varchar("code", { length: 5 }).primaryKey(),
    municipio: varchar("municipio", { length: 160 }),
    provincia: varchar("provincia", { length: 80 }),
    ineMunicipio: varchar("ine_municipio", { length: 10 }),
    centroidLat: doublePrecision("centroid_lat"),
    centroidLng: doublePrecision("centroid_lng"),
    geometry: jsonb("geometry"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("postal_codes_provincia_idx").on(t.provincia)],
);

/** Repartidores. */
export const drivers = pgTable(
  "drivers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    nombre: varchar("nombre", { length: 160 }).notNull(),
    telefono: varchar("telefono", { length: 40 }),
    vehiculo: varchar("vehiculo", { length: 80 }),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("drivers_active_idx").on(t.active)],
);

/**
 * Relación N:M: qué códigos postales cubre cada repartidor.
 * Un CP puede cubrirlo más de un repartidor y un repartidor cubrir varios CP.
 */
export const driverPostalCodes = pgTable(
  "driver_postal_codes",
  {
    driverId: uuid("driver_id")
      .notNull()
      .references(() => drivers.id, { onDelete: "cascade" }),
    postalCode: varchar("postal_code", { length: 5 })
      .notNull()
      .references(() => postalCodes.code, { onDelete: "cascade" }),
    esPrincipal: boolean("es_principal").notNull().default(false),
  },
  (t) => [
    primaryKey({ columns: [t.driverId, t.postalCode] }),
    index("dpc_postal_code_idx").on(t.postalCode),
  ],
);

/* ─── Rutas diarias — PREPARADO PARA FASE 2 (modelado, aún no se usa) ───── */

export const routes = pgTable("routes", {
  id: uuid("id").defaultRandom().primaryKey(),
  driverId: uuid("driver_id").references(() => drivers.id, { onDelete: "set null" }),
  nombre: varchar("nombre", { length: 160 }).notNull(),
  diaSemana: integer("dia_semana"), // 0=domingo … 6=sábado (opcional)
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const routeStops = pgTable(
  "route_stops",
  {
    routeId: uuid("route_id")
      .notNull()
      .references(() => routes.id, { onDelete: "cascade" }),
    postalCode: varchar("postal_code", { length: 5 })
      .notNull()
      .references(() => postalCodes.code, { onDelete: "cascade" }),
    orden: integer("orden").notNull(),
  },
  (t) => [primaryKey({ columns: [t.routeId, t.postalCode] })],
);
