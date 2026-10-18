import "server-only";
import { and, asc, count, desc, eq, inArray } from "drizzle-orm";
import {
  analyses,
  clauses,
  documentPages,
  documents,
  findings,
  fingerprints,
  payments,
  rechecks,
  type ConfirmedFields,
  type PreviewCounts,
} from "@/db/schema";
import { db as defaultDb, type Db } from "@/lib/db";

// Acceso a datos de usuario. No hay RLS: toda lectura/escritura de datos de
// un usuario pasa por acá, que siempre filtra por userId. Si un id no es del
// usuario, se devuelve null y la página responde 404 (spec 01, "Acceso").

type PaymentKind = (typeof payments.$inferSelect)["kind"];
type AnalysisStatus = (typeof analyses.$inferSelect)["status"];

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
      /** Historial con el análisis al que corresponde cada pago. */
      list() {
        return db
          .select({
            payment: payments,
            analysis: { id: analyses.id, contractType: analyses.contractType, propertyLabel: analyses.propertyLabel },
          })
          .from(payments)
          .innerJoin(analyses, eq(payments.analysisId, analyses.id))
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
    },
    rechecks: {
      /** Nuevo re-chequeo pendiente; exige un pago de re-chequeo aprobado. */
      async create(analysisId: string) {
        const payment = await this.paid(analysisId);
        if (!payment) return null;
        const [row] = await db.insert(rechecks).values({ analysisId, paymentId: payment.id }).returning();
        return row;
      },
      async paid(analysisId: string) {
        const analysis = await getAnalysis(analysisId);
        if (!analysis || analysis.status !== "ready") return null;
        const payment = await latestPayment(analysisId, "recheck");
        return payment?.status === "approved" ? payment : null;
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
