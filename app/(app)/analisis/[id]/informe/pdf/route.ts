import { notFound } from "next/navigation";
import { buildReportPdf } from "@/lib/analysis/pdf";
import { requireUser } from "@/lib/auth/session";
import { scoped } from "@/lib/db/scoped";

// Descarga del informe en PDF (etapa 3). Mismos datos que /informe.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/analisis/${id}/informe`);
  const report = await scoped(user.id).analyses.report(id);
  if (!report || report.analysis.status !== "ready") notFound();

  const bytes = await buildReportPdf(report.analysis, report.clauses, report.findings);
  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="informe-${id}.pdf"`,
    },
  });
}
