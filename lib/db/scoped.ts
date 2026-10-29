import "server-only";
import { and, asc, count, desc, eq, inArray, isNull } from "drizzle-orm";
import {
  analyses,
  clauses,
  documentPages,
  documents,
  findings,
  fingerprints,
  payments,
  plans,
  rechecks,
  subscriptionCycles,
  subscriptions,
  type ConfirmedFields,
  type PreviewCounts,
} from "@/db/schema";
import { db as defaultDb, type Db } from "@/lib/db";

// Acceso a datos de usuario. No hay RLS: toda lectura/escritura de datos de
// un usuario pasa por acá, que siempre filtra por userId. Si un id no es del
// usuario, se devuelve null y la página responde 404 (spec 01, "Acceso").

type PaymentKind = (typeof payments.$inferSelect)["kind"];
type AnalysisStatus = (typeof analyses.$inferSelect)["status"];
type DocumentKind = (typeof documents.$inferSelect)["kind"];

// Un id mal formado no llega a la base (Postgres rechazaría el uuid con un error 500).
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Estados en los que todavía se pueden corregir los datos clave (antes de pagar). */
export const EDITABLE_STATUSES: AnalysisStatus[] = ["awaiting_confirmation", "preview_ready"];

export function scoped(userId: string, db: Db = defaultDb()) {
  if (!userId) throw new Error("scoped() requiere userId");

  const ownAnalysis = (id: string) => and(eq(analyses.id, id), eq(analyses.userId, userId));

  async function getAnalysis(id: string) {
    if (!UUID.test(id)) return null;
    const [row] = await db.select().from(analyses).where(ownAnalysis(id)).limit(1);
    return row ?? null;
  }

  async function latestPayment(analysisId: string, kind: PaymentKind) {
    const [row] = await db
      .select()
      .from(payments)
      .where(and(eq(payments.analysisId, analysisId), eq(payments.userId, userId), eq(payments.kind, kind)))
      .orderBy(desc(payments.createdAt))
      .limit(1);
    return row ?? null;
  }

  /** Suscripción `authorized` del usuario y su ciclo vigente, o null (spec 06). */
  async function activeCycle() {
    const [sub] = await db
      .select()
      .from(subscriptions)
      .where(and(eq(subscriptions.userId, userId), eq(subscriptions.status, "authorized")))
      .orderBy(desc(subscriptions.createdAt))
      .limit(1);
    if (!sub) return null;
    const [cycle] = await db
      .select()
      .from(subscriptionCycles)
      .where(eq(subscriptionCycles.subscriptionId, sub.id))
      .orderBy(desc(subscriptionCycles.periodStart))
      .limit(1);
    if (!cycle || cycle.periodEnd < new Date()) return null;
    return cycle;
  }

  return {
    analyses: {
      list() {
        return db.select().from(analyses).where(eq(analyses.userId, userId)).orderBy(desc(analyses.createdAt));
      },
      get: getAnalysis,
      /** Informe: análisis + cláusulas + hallazgos, o null si no es del usuario. */
      async report(id: string) {
        const analysis = await getAnalysis(id);
        if (!analysis) return null;
        const [clauseRows, findingRows] = await Promise.all([
          db.select().from(clauses).where(eq(clauses.analysisId, id)).orderBy(asc(clauses.number)),
          db.select().from(findings).where(eq(findings.analysisId, id)),
        ]);
        return { analysis, clauses: clauseRows, findings: findingRows };
      },
      create(values: { contractType?: "rental"; status: AnalysisStatus; confirmedFields?: ConfirmedFields }) {
        return db
          .insert(analyses)
          .values({ ...values, userId })
          .returning()
          .then(([row]) => row);
      },
      /**
       * Análisis nuevo con el contrato ya subido (spec 05, "Subida de archivos"):
       * queda en `extracting` hasta que corre la extracción. Las fotos van como
       * un documento con una página por foto.
       */
      async createFromUpload(upload: {
        kind: DocumentKind;
        mime: string;
        sizeBytes: number;
        storageKey: string;
        pages?: { storageKey: string; sizeBytes: number }[];
        subscriptionCycleId?: string;
      }) {
        return db.transaction(async (tx) => {
          const [analysis] = await tx
            .insert(analyses)
            .values({
              userId,
              contractType: "rental",
              status: "extracting",
              billingMode: upload.subscriptionCycleId ? "subscription" : "one_time",
              subscriptionCycleId: upload.subscriptionCycleId,
            })
            .returning();
          const [document] = await tx
            .insert(documents)
            .values({ analysisId: analysis.id, kind: upload.kind, mime: upload.mime, sizeBytes: upload.sizeBytes, storageKey: upload.storageKey, pageCount: upload.pages?.length })
            .returning();
          if (upload.pages?.length) {
            await tx.insert(documentPages).values(upload.pages.map((p, i) => ({ documentId: document.id, pageNumber: i + 1, storageKey: p.storageKey })));
          }
          return analysis;
        });
      },
      /** No se pudo encolar la extracción: el análisis queda como fallido. */
      async markFailed(id: string, errorCode: string) {
        if (!UUID.test(id)) return;
        await db.transaction(async (tx) => {
          const [row] = await tx
            .update(analyses)
            .set({ status: "failed", errorCode })
            .where(and(ownAnalysis(id), eq(analyses.status, "extracting")))
            .returning({ id: analyses.id });
          if (!row) return;
          // Si se había pagado antes de subir (spec 06), se devuelve el crédito.
          await tx.update(payments).set({ analysisId: null }).where(and(eq(payments.analysisId, id), eq(payments.kind, "analysis")));
        });
      },
      /** Contrato original subido (para saber si vino de una foto). */
      async original(id: string) {
        if (!(await getAnalysis(id))) return null;
        const [row] = await db
          .select()
          .from(documents)
          .where(and(eq(documents.analysisId, id), eq(documents.role, "original")))
          .orderBy(asc(documents.createdAt))
          .limit(1);
        return row ?? null;
      },
      async clauses(id: string) {
        if (!(await getAnalysis(id))) return [];
        return db.select().from(clauses).where(eq(clauses.analysisId, id)).orderBy(asc(clauses.number));
      },
      /** Guarda los datos confirmados. Solo antes de pagar; si no, devuelve null. */
      async confirm(id: string, values: { confirmedFields: ConfirmedFields; signingDate: string | null; propertyLabel: string | null; preview: PreviewCounts }) {
        if (!UUID.test(id)) return null;
        const [row] = await db
          .update(analyses)
          .set({ ...values, status: "preview_ready" })
          .where(and(ownAnalysis(id), inArray(analyses.status, EDITABLE_STATUSES)))
          .returning();
        return row ?? null;
      },
      /**
       * Pasa de "vista previa" a "pagado" sin un pago puntual nuevo (spec 06 y
       * "pagar antes de subir"): lo llama quien ya verificó que corresponde
       * (cupo de suscripción reservado, o pago de análisis ya aprobado).
       */
      async markPaid(id: string) {
        const [row] = await db
          .update(analyses)
          .set({ status: "paid" })
          .where(and(ownAnalysis(id), eq(analyses.status, "preview_ready")))
          .returning({ id: analyses.id });
        return !!row;
      },
      /** Re-chequeo: análisis, huella, cantidad de cláusulas, último re-chequeo y pago del re-chequeo. */
      async recheck(id: string) {
        const analysis = await getAnalysis(id);
        if (!analysis) return null;
        const [[fingerprint], [{ clauseCount }], [latest], payment] = await Promise.all([
          db.select().from(fingerprints).where(eq(fingerprints.analysisId, id)).limit(1),
          db.select({ clauseCount: count() }).from(clauses).where(eq(clauses.analysisId, id)),
          db.select().from(rechecks).where(eq(rechecks.analysisId, id)).orderBy(desc(rechecks.createdAt)).limit(1),
          latestPayment(id, "recheck"),
        ]);
        return { analysis, fingerprint: fingerprint ?? null, clauseCount, latest: latest ?? null, payment };
      },
    },
    payments: {
      /** Historial con el análisis al que corresponde cada pago (null en las páginas extra, spec 06). */
      list() {
        return db
          .select({
            payment: payments,
            analysis: { id: analyses.id, contractType: analyses.contractType, propertyLabel: analyses.propertyLabel },
          })
          .from(payments)
          .leftJoin(analyses, eq(payments.analysisId, analyses.id))
          .where(eq(payments.userId, userId))
          .orderBy(desc(payments.createdAt));
      },
      async get(paymentId: string) {
        if (!UUID.test(paymentId)) return null;
        const [row] = await db.select().from(payments).where(and(eq(payments.id, paymentId), eq(payments.userId, userId))).limit(1);
        return row ?? null;
      },
      async setPreference(paymentId: string, mpPreferenceId: string) {
        await db.update(payments).set({ mpPreferenceId }).where(and(eq(payments.id, paymentId), eq(payments.userId, userId)));
      },
      /** Último pago de un tipo para un análisis del usuario. */
      async latest(analysisId: string, kind: PaymentKind) {
        if (!(await getAnalysis(analysisId))) return null;
        return latestPayment(analysisId, kind);
      },
      /**
       * Crea un pago pendiente (spec 04, paso 2), salvo que ya haya uno pendiente
       * o aprobado. La preferencia de Mercado Pago se agrega en la etapa 1.
       */
      async start(analysisId: string, kind: PaymentKind, amountCents: number) {
        if (!(await getAnalysis(analysisId))) return null;
        const current = await latestPayment(analysisId, kind);
        if (current && (current.status === "pending" || current.status === "approved")) return current;
        const [row] = await db.insert(payments).values({ userId, analysisId, kind, amountCents }).returning();
        return row;
      },
      /** Pago sin análisis todavía ("pagar antes de subir"): pendiente o aprobado, el más reciente. */
      async latestPrepaid(kind: PaymentKind) {
        const [row] = await db
          .select()
          .from(payments)
          .where(and(eq(payments.userId, userId), eq(payments.kind, kind), isNull(payments.analysisId), inArray(payments.status, ["pending", "approved"])))
          .orderBy(desc(payments.createdAt))
          .limit(1);
        return row ?? null;
      },
      /** Crea el pago antes de tener un análisis, salvo que ya haya uno pendiente o aprobado sin usar. */
      async startPrepaid(kind: PaymentKind, amountCents: number) {
        const current = await this.latestPrepaid(kind);
        if (current) return current;
        const [row] = await db.insert(payments).values({ userId, kind, amountCents }).returning();
        return row;
      },
      /** Une el pago prepago con el análisis recién creado (lo consume). */
      async linkPrepaid(paymentId: string, analysisId: string) {
        await db.update(payments).set({ analysisId }).where(and(eq(payments.id, paymentId), eq(payments.userId, userId), isNull(payments.analysisId)));
      },
    },
    rechecks: {
      /**
       * Versión final subida (archivo o fotos): exige un pago de re-chequeo
       * aprobado, crea el documento (`role: "recheck"`) y el re-chequeo `pending`.
       */
      async upload(
        analysisId: string,
        upload: { kind: DocumentKind; mime: string; sizeBytes: number; storageKey: string; pages?: { storageKey: string; sizeBytes: number }[] },
        opts: { subscriptionCycleId?: string } = {},
      ) {
        let paymentId: string | null = null;
        if (opts.subscriptionCycleId) {
          const analysis = await getAnalysis(analysisId);
          if (!analysis || analysis.status !== "ready") return null;
          const [cycle] = await db.select().from(subscriptionCycles).where(eq(subscriptionCycles.id, opts.subscriptionCycleId)).limit(1);
          if (!cycle || cycle.pageQuota + cycle.extraPagesGranted - cycle.pagesUsed <= 0) return null;
        } else {
          const payment = await this.paid(analysisId);
          if (!payment) return null;
          paymentId = payment.id;
        }
        return db.transaction(async (tx) => {
          const [document] = await tx
            .insert(documents)
            .values({ analysisId, role: "recheck", kind: upload.kind, mime: upload.mime, sizeBytes: upload.sizeBytes, storageKey: upload.storageKey, pageCount: upload.pages?.length })
            .returning();
          if (upload.pages?.length) {
            await tx.insert(documentPages).values(upload.pages.map((p, i) => ({ documentId: document.id, pageNumber: i + 1, storageKey: p.storageKey })));
          }
          const [row] = await tx
            .insert(rechecks)
            .values({ analysisId, paymentId, documentId: document.id, subscriptionCycleId: opts.subscriptionCycleId })
            .returning();
          return row;
        });
      },
      async paid(analysisId: string) {
        const analysis = await getAnalysis(analysisId);
        if (!analysis || analysis.status !== "ready") return null;
        const payment = await latestPayment(analysisId, "recheck");
        return payment?.status === "approved" ? payment : null;
      },
      /** Si puede re-chequear: pago aprobado, o cupo de suscripción vigente (spec 06). */
      async entitlement(analysisId: string): Promise<{ ok: true; subscriptionCycleId?: string } | { ok: false; reason: "no_listo" | "sin_suscripcion" | "sin_cupo" }> {
        const analysis = await getAnalysis(analysisId);
        if (!analysis || analysis.status !== "ready") return { ok: false, reason: "no_listo" };
        if (await this.paid(analysisId)) return { ok: true };
        const cycle = await activeCycle();
        if (!cycle) return { ok: false, reason: "sin_suscripcion" };
        if (cycle.pageQuota + cycle.extraPagesGranted - cycle.pagesUsed <= 0) return { ok: false, reason: "sin_cupo" };
        return { ok: true, subscriptionCycleId: cycle.id };
      },
    },
    billing: {
      activeCycle,
      /** Suscripción activa o pendiente del usuario, si tiene una. */
      async current() {
        const [row] = await db
          .select()
          .from(subscriptions)
          .where(and(eq(subscriptions.userId, userId), inArray(subscriptions.status, ["pending", "authorized", "paused"])))
          .orderBy(desc(subscriptions.createdAt))
          .limit(1);
        return row ?? null;
      },
      /** Alta de suscripción (spec 06): no duplica si ya hay una pendiente o activa. */
      async start(planId: string) {
        const current = await this.current();
        if (current) return current;
        const [row] = await db.insert(subscriptions).values({ userId, planId }).returning();
        return row;
      },
      async setPreapproval(subscriptionId: string, mpPreapprovalId: string) {
        await db.update(subscriptions).set({ mpPreapprovalId }).where(and(eq(subscriptions.id, subscriptionId), eq(subscriptions.userId, userId)));
      },
      async cancel(subscriptionId: string) {
        await db.update(subscriptions).set({ cancelAtPeriodEnd: true }).where(and(eq(subscriptions.id, subscriptionId), eq(subscriptions.userId, userId)));
      },
      /** Páginas extra compradas dentro del ciclo vigente (spec 06, top-up). */
      async startTopup(subscriptionCycleId: string, amountCents: number, pagesGranted: number) {
        const [row] = await db.insert(payments).values({ userId, kind: "topup", amountCents, subscriptionCycleId, pagesGranted }).returning();
        return row;
      },
    },
    account: {
      /** Claves de S3 de todos los archivos del usuario, para borrarlos junto con la cuenta. */
      async storageKeys() {
        const own = eq(analyses.userId, userId);
        const [docs, pages, certs] = await Promise.all([
          db.select({ key: documents.storageKey }).from(documents).innerJoin(analyses, eq(documents.analysisId, analyses.id)).where(own),
          db
            .select({ key: documentPages.storageKey })
            .from(documentPages)
            .innerJoin(documents, eq(documentPages.documentId, documents.id))
            .innerJoin(analyses, eq(documents.analysisId, analyses.id))
            .where(own),
          db.select({ key: rechecks.certificateKey }).from(rechecks).innerJoin(analyses, eq(rechecks.analysisId, analyses.id)).where(own),
        ]);
        return [...docs, ...pages, ...certs].flatMap((r) => (r.key ? [r.key] : []));
      },
    },
  };
}

/** Catálogo de planes activos (spec 06), no depende de un usuario. */
export function listActivePlans(db: Db = defaultDb()) {
  return db.select().from(plans).where(eq(plans.active, true)).orderBy(asc(plans.priceCents));
}

export async function getPlan(id: string, db: Db = defaultDb()) {
  const [row] = await db.select().from(plans).where(eq(plans.id, id)).limit(1);
  return row ?? null;
}
