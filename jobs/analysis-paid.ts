import { and, eq } from "drizzle-orm";
import { analyses } from "@/db/schema";
import { CHECKLIST_VERSION, runAnalysis } from "@/lib/analysis/analyze";
import { db } from "@/lib/db";
import { inngest } from "@/lib/inngest/client";

// Después de un pago aprobado (spec 05, `analysis/paid`): hallazgos por
// cláusula con IA (etapa 3, `lib/analysis/analyze.ts`) y deja el análisis listo.
export const analysisPaid = inngest.createFunction(
  { id: "analysis-paid", triggers: [{ event: "analysis/paid" }], concurrency: { key: "event.data.analysisId", limit: 1 } },
  async ({ event, step }) => {
    const { analysisId } = event.data as { analysisId: string };
    console.log("[análisis] pago aprobado, arrancando el análisis real", { analysisId });

    await step.run("análisis con IA", async () => {
      const [current] = await db()
        .update(analyses)
        .set({ status: "analyzing" })
        .where(and(eq(analyses.id, analysisId), eq(analyses.status, "paid")))
        .returning({ signingDate: analyses.signingDate });
      if (!current) return;

      await runAnalysis(db(), analysisId, current.signingDate);

      await db()
        .update(analyses)
        .set({ status: "ready", checklistVersion: CHECKLIST_VERSION })
        .where(and(eq(analyses.id, analysisId), eq(analyses.status, "analyzing")));
    });

    console.log("[análisis] informe listo", { analysisId });
    return { analysisId };
  },
);
