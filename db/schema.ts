// Esquema de la base. Spec: docs/specs/01-data-model.md
// Las propiedades van en camelCase; drizzle las mapea a snake_case (casing en db/index y drizzle.config).
import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  vector,
} from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

const id = () => uuid().primaryKey().default(sql`gen_random_uuid()`);

// ───────────────────────────── Cuentas (Better Auth) ─────────────────────────────
// Los nombres de tabla y de propiedad son los que espera Better Auth.

export const user = pgTable("user", {
  id: text().primaryKey(),
  name: text().notNull(),
  email: text().notNull().unique(),
  emailVerified: boolean().notNull().default(false),
  image: text(),
  // "user" o "admin" (panel de costo de IA, /admin). Se activa a mano por SQL.
  role: text().notNull().default("user"),
  ...timestamps,
});

export const session = pgTable(
  "session",
  {
    id: text().primaryKey(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    token: text().notNull().unique(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    ipAddress: text(),
    userAgent: text(),
    ...timestamps,
  },
  (t) => [index().on(t.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text().primaryKey(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accountId: text().notNull(),
    providerId: text().notNull(),
    accessToken: text(),
    refreshToken: text(),
    idToken: text(),
    accessTokenExpiresAt: timestamp({ withTimezone: true }),
    refreshTokenExpiresAt: timestamp({ withTimezone: true }),
    scope: text(),
    password: text(),
    ...timestamps,
  },
  (t) => [index().on(t.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text().primaryKey(),
    identifier: text().notNull(),
    value: text().notNull(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    ...timestamps,
  },
  (t) => [index().on(t.identifier)],
);

export const rateLimit = pgTable("rate_limit", {
  id: text().primaryKey(),
  key: text().notNull().unique(),
  count: integer().notNull(),
  lastRequest: bigint({ mode: "number" }).notNull(),
});

// ───────────────────────────── Producto ─────────────────────────────

export const contractType = pgEnum("contract_type", ["rental", "sale", "boleto"]);
export const analysisStatus = pgEnum("analysis_status", [
  "draft",
  "extracting",
  "awaiting_confirmation",
  "preview_ready",
  "paid",
  "analyzing",
  "ready",
  "failed",
]);
export const documentRole = pgEnum("document_role", ["original", "recheck"]);
export const documentKind = pgEnum("document_kind", ["photo", "pdf", "docx", "text"]);
export const findingLevel = pgEnum("finding_level", ["high", "attention", "none"]);
export const recheckResult = pgEnum("recheck_result", ["pending", "identical", "changed", "failed"]);
export const paymentKind = pgEnum("payment_kind", ["analysis", "recheck"]);
export const paymentStatus = pgEnum("payment_status", [
  "pending",
  "approved",
  "rejected",
  "cancelled",
  "refunded",
]);

/** Datos clave confirmados por el usuario (pantalla Confirmar). */
export type ConfirmedFields = Partial<
  Record<
    | "landlord"
    | "tenant"
    | "property"
    | "term"
    | "initialRent"
    | "adjustment"
    | "deposit"
    | "guarantee"
    | "termination"
    | "expenses"
    | "commission"
    | "currency",
    string
  >
>;

/** Vista previa gratuita: cantidad de hallazgos por nivel. */
export type PreviewCounts = { high: number; attention: number; none: number };

export const analyses = pgTable(
  "analyses",
  {
    id: id(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    contractType: contractType().notNull().default("rental"),
    status: analysisStatus().notNull().default("draft"),
    signingDate: date({ mode: "string" }),
    propertyLabel: text(),
    checklistVersion: text(),
    confirmedFields: jsonb().$type<ConfirmedFields>(),
    preview: jsonb().$type<PreviewCounts>(),
    errorCode: text(),
    ...timestamps,
  },
  (t) => [index().on(t.userId, t.createdAt)],
);

export const documents = pgTable(
  "documents",
  {
    id: id(),
    analysisId: uuid()
      .notNull()
      .references(() => analyses.id, { onDelete: "cascade" }),
    role: documentRole().notNull().default("original"),
    kind: documentKind().notNull(),
    mime: text().notNull(),
    sizeBytes: bigint({ mode: "number" }).notNull(),
    storageKey: text().notNull(),
    pageCount: integer(),
    sha256: text(),
    deleteAfter: timestamp({ withTimezone: true }),
    deletedAt: timestamp({ withTimezone: true }),
    ...timestamps,
  },
  (t) => [index().on(t.analysisId)],
);

export const documentPages = pgTable(
  "document_pages",
  {
    id: id(),
    documentId: uuid()
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    pageNumber: integer().notNull(),
    storageKey: text().notNull(),
    width: integer(),
    height: integer(),
    blurScore: integer(),
    ...timestamps,
  },
  (t) => [unique().on(t.documentId, t.pageNumber)],
);

export const clauses = pgTable(
  "clauses",
  {
    id: id(),
    analysisId: uuid()
      .notNull()
      .references(() => analyses.id, { onDelete: "cascade" }),
    number: integer().notNull(),
    title: text().notNull(),
    text: text().notNull(),
    sha256: text().notNull(),
    pageFrom: integer(),
    pageTo: integer(),
    ...timestamps,
  },
  (t) => [unique().on(t.analysisId, t.number)],
);

export const aiCallKind = pgEnum("ai_call_kind", ["read_pages", "extract_fields"]);

// Tokens de cada llamada a Claude, para el panel de costo (/admin). El costo
// se calcula al mostrarlo (lib/ai/pricing.ts), no se guarda: así no queda
// desactualizado si cambian los precios del modelo.
export const aiUsage = pgTable(
  "ai_usage",
  {
    id: id(),
    analysisId: uuid()
      .notNull()
      .references(() => analyses.id, { onDelete: "cascade" }),
    kind: aiCallKind().notNull(),
    model: text().notNull(),
    inputTokens: integer().notNull(),
    outputTokens: integer().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index().on(t.analysisId)],
);

// ───────────────────────────── Normativa (RAG, etapa 5) ─────────────────────────────

export const normVersionStatus = pgEnum("norm_version_status", ["draft", "reviewed", "published"]);

export const norms = pgTable("norms", {
  id: id(),
  code: text().notNull().unique(),
  title: text().notNull(),
  jurisdiction: text().notNull().default("nacional"),
  sourceUrl: text(),
  ...timestamps,
});

export const normVersions = pgTable(
  "norm_versions",
  {
    id: id(),
    normId: uuid()
      .notNull()
      .references(() => norms.id, { onDelete: "cascade" }),
    validFrom: date({ mode: "string" }).notNull(),
    validTo: date({ mode: "string" }),
    status: normVersionStatus().notNull().default("draft"),
    sha256: text().notNull(),
    reviewedBy: text(),
    ...timestamps,
  },
  (t) => [index().on(t.normId, t.validFrom)],
);

export const normChunks = pgTable(
  "norm_chunks",
  {
    id: id(),
    normVersionId: uuid()
      .notNull()
      .references(() => normVersions.id, { onDelete: "cascade" }),
    article: text(),
    text: text().notNull(),
    // La dimensión se confirma al elegir el modelo de embeddings (etapa 5).
    embedding: vector({ dimensions: 1024 }),
    metadata: jsonb().$type<Record<string, unknown>>(),
    ...timestamps,
  },
  (t) => [index().on(t.normVersionId)],
);

// ───────────────────────────── Hallazgos, huellas y re-chequeos ─────────────────────────────

export const findings = pgTable(
  "findings",
  {
    id: id(),
    analysisId: uuid()
      .notNull()
      .references(() => analyses.id, { onDelete: "cascade" }),
    // Todo hallazgo cita su cláusula (documento base §15).
    clauseId: uuid()
      .notNull()
      .references(() => clauses.id, { onDelete: "cascade" }),
    level: findingLevel().notNull(),
    title: text().notNull(),
    explanation: text().notNull(),
    whatToAsk: text(),
    normVersionId: uuid().references(() => normVersions.id, { onDelete: "set null" }),
    ...timestamps,
  },
  (t) => [index().on(t.analysisId)],
);

export const fingerprints = pgTable("fingerprints", {
  id: id(),
  analysisId: uuid()
    .notNull()
    .unique()
    .references(() => analyses.id, { onDelete: "cascade" }),
  fileSha256: text(),
  normalizedTextSha256: text().notNull(),
  clauseHashes: jsonb().$type<Record<number, string>>().notNull(),
  ...timestamps,
});

export const payments = pgTable(
  "payments",
  {
    id: id(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    analysisId: uuid()
      .notNull()
      .references(() => analyses.id, { onDelete: "cascade" }),
    kind: paymentKind().notNull(),
    status: paymentStatus().notNull().default("pending"),
    mpPreferenceId: text(),
    mpPaymentId: text().unique(),
    amountCents: bigint({ mode: "number" }).notNull(),
    currency: text().notNull().default("ARS"),
    ...timestamps,
  },
  (t) => [index().on(t.userId), index().on(t.analysisId)],
);

export type RecheckChange = {
  clauseNumber: number;
  title: string;
  before: string;
  after: string;
};

export const rechecks = pgTable(
  "rechecks",
  {
    id: id(),
    analysisId: uuid()
      .notNull()
      .references(() => analyses.id, { onDelete: "cascade" }),
    documentId: uuid().references(() => documents.id, { onDelete: "set null" }),
    paymentId: uuid().references(() => payments.id, { onDelete: "set null" }),
    result: recheckResult().notNull().default("pending"),
    changes: jsonb().$type<RecheckChange[]>(),
    certificateKey: text(),
    ...timestamps,
  },
  (t) => [index().on(t.analysisId)],
);

export const paymentEvents = pgTable("payment_events", {
  id: id(),
  provider: text().notNull().default("mercadopago"),
  providerEventId: text().notNull().unique(),
  type: text().notNull(),
  payload: jsonb().notNull(),
  processedAt: timestamp({ withTimezone: true }),
  error: text(),
  ...timestamps,
});

export const auditLog = pgTable(
  "audit_log",
  {
    id: id(),
    // Sin FK: el registro sobrevive al borrado de la cuenta.
    userId: text(),
    action: text().notNull(),
    targetType: text(),
    targetId: text(),
    ip: text(),
    metadata: jsonb().$type<Record<string, unknown>>(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index().on(t.userId, t.createdAt)],
);
