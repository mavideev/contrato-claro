import "server-only";
import { and, asc, desc, eq } from "drizzle-orm";
import { analyses, clauses, findings, payments } from "@/db/schema";
import { db as defaultDb, type Db } from "@/lib/db";

// Acceso a datos de usuario. No hay RLS: toda lectura/escritura de datos de
// un usuario pasa por acá, que siempre filtra por userId. Si un id no es del
// usuario, se devuelve null y la página responde 404 (spec 01, "Acceso").
export function scoped(userId: string, db: Db = defaultDb()) {
  if (!userId) throw new Error("scoped() requiere userId");

  const ownAnalysis = (id: string) => and(eq(analyses.id, id), eq(analyses.userId, userId));

  return {
    analyses: {
      list() {
        return db.select().from(analyses).where(eq(analyses.userId, userId)).orderBy(desc(analyses.createdAt));
      },
      async get(id: string) {
        const [row] = await db.select().from(analyses).where(ownAnalysis(id)).limit(1);
        return row ?? null;
      },
      /** Informe: análisis + cláusulas + hallazgos, o null si no es del usuario. */
      async report(id: string) {
        const [analysis] = await db.select().from(analyses).where(ownAnalysis(id)).limit(1);
        if (!analysis) return null;
        const [clauseRows, findingRows] = await Promise.all([
          db.select().from(clauses).where(eq(clauses.analysisId, id)).orderBy(asc(clauses.number)),
          db.select().from(findings).where(eq(findings.analysisId, id)),
        ]);
        return { analysis, clauses: clauseRows, findings: findingRows };
      },
    },
    payments: {
      list() {
        return db.select().from(payments).where(eq(payments.userId, userId)).orderBy(desc(payments.createdAt));
      },
    },
  };
}
