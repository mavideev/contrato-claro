import { and, eq } from "drizzle-orm";
import { analyses } from "@/db/schema";
import { writeSampleReport } from "@/lib/analysis/sample-report";
import { db } from "@/lib/db";
import { inngest } from "@/lib/inngest/client";

// Después de un pago aprobado (spec 05, `analysis/paid`). Etapa 1: escribe el
// informe de ejemplo y deja el análisis listo. La etapa 3 lo reemplaza por el análisis con IA.
export const analysisPaid = inngest.createFunction(
  { id: "analysis-paid", triggers: [{ event: "analysis/paid" }], concurrency: { key: "event.data.analysisId", limit: 1 } },
  async ({ event, step }) => {
    const { analysisId } = event.data as { analysisId: string };
    await step.run("informe de ejemplo", async () => {
      await db().update(analyses).set({ status: "analyzing" }).where(and(eq(analyses.id, analysisId), eq(analyses.status, "paid")));
      await writeSampleReport(db(), analysisId);
      await db()
        .update(analyses)
        .set({ status: "ready", checklistVersion: "sample-v1" })
        .where(and(eq(analyses.id, analysisId), eq(analyses.status, "analyzing")));
    });
    return { analysisId };
  },
);
