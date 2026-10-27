import type { Metadata } from "next";
import { Suspense } from "react";
import { desc, eq, sql } from "drizzle-orm";
import { aiUsage, analyses, user } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { costUsd } from "@/lib/ai/pricing";
import { db } from "@/lib/db";
import { formatDayTime } from "@/lib/format";
import { Kicker, Title } from "@/components/ui/typography";

// Panel interno (no está en la navegación): costo de IA por análisis, para
// detectar dónde se gastan de más tokens. Rol "admin" se activa a mano por SQL.
export const metadata: Metadata = { title: "Costo de IA · Contrato Claro" };

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 4 });

type UsageRow = {
  analysisId: string;
  kind: (typeof aiUsage.$inferSelect)["kind"];
  model: string;
  status: string;
  createdAt: Date;
  email: string;
  inputTokens: number;
  outputTokens: number;
  calls: number;
};

async function usageRows(): Promise<UsageRow[]> {
  return db()
    .select({
      analysisId: aiUsage.analysisId,
      kind: aiUsage.kind,
      model: aiUsage.model,
      status: analyses.status,
      createdAt: analyses.createdAt,
      email: user.email,
      inputTokens: sql<number>`sum(${aiUsage.inputTokens})`.mapWith(Number),
      outputTokens: sql<number>`sum(${aiUsage.outputTokens})`.mapWith(Number),
      calls: sql<number>`count(*)`.mapWith(Number),
    })
    .from(aiUsage)
    .innerJoin(analyses, eq(analyses.id, aiUsage.analysisId))
    .innerJoin(user, eq(user.id, analyses.userId))
    .groupBy(aiUsage.analysisId, aiUsage.kind, aiUsage.model, analyses.status, analyses.createdAt, user.email)
    .orderBy(desc(analyses.createdAt));
}

export default function Page() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 p-6 md:p-10">
      <Title>Costo de IA</Title>
      <Suspense fallback={<p className="text-ink-2">Cargando…</p>}>
        <Report />
      </Suspense>
    </div>
  );
}

async function Report() {
  await requireAdmin();
  const rows = await usageRows();

  const byAnalysis = new Map<string, { status: string; createdAt: Date; email: string; calls: UsageRow[] }>();
  for (const row of rows) {
    const entry = byAnalysis.get(row.analysisId) ?? { status: row.status, createdAt: row.createdAt, email: row.email, calls: [] };
    entry.calls.push(row);
    byAnalysis.set(row.analysisId, entry);
  }

  const analysesCost = [...byAnalysis.entries()]
    .map(([analysisId, entry]) => ({
      analysisId,
      ...entry,
      cost: entry.calls.reduce((sum, c) => sum + (costUsd(c.model, c.inputTokens, c.outputTokens) ?? 0), 0),
    }))
    .sort((a, b) => b.cost - a.cost);

  const total = analysesCost.reduce((sum, a) => sum + a.cost, 0);
  const byKind = { read_pages: 0, extract_fields: 0, analyze_risks: 0 };
  for (const row of rows) byKind[row.kind] += costUsd(row.model, row.inputTokens, row.outputTokens) ?? 0;

  if (rows.length === 0) return <p className="text-ink-2">Todavía no hay llamadas a Claude registradas.</p>;

  return (
    <>
      <section className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <Stat label="Gastado en total" value={usd.format(total)} />
        <Stat label="Análisis con IA" value={String(analysesCost.length)} />
        <Stat label="Leer fotos/PDF" value={usd.format(byKind.read_pages)} />
        <Stat label="Datos clave" value={usd.format(byKind.extract_fields)} />
        <Stat label="Riesgos por cláusula" value={usd.format(byKind.analyze_risks)} />
      </section>

      <div className="overflow-x-auto rounded-[14px] border border-line-soft">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-line-soft/40 text-xs uppercase text-ink-3">
            <tr>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Usuario</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Modelo</th>
              <th className="px-4 py-3 text-right">Tokens in</th>
              <th className="px-4 py-3 text-right">Tokens out</th>
              <th className="px-4 py-3 text-right">Costo</th>
            </tr>
          </thead>
          <tbody>
            {analysesCost.map((a) => {
              const inputTokens = a.calls.reduce((s, c) => s + c.inputTokens, 0);
              const outputTokens = a.calls.reduce((s, c) => s + c.outputTokens, 0);
              const models = [...new Set(a.calls.map((c) => c.model))].join(", ");
              return (
                <tr key={a.analysisId} className="border-t border-line-soft">
                  <td className="px-4 py-3 whitespace-nowrap">{formatDayTime(a.createdAt)}</td>
                  <td className="px-4 py-3">{a.email}</td>
                  <td className="px-4 py-3">{a.status}</td>
                  <td className="px-4 py-3">{models}</td>
                  <td className="px-4 py-3 text-right">{inputTokens.toLocaleString("es-AR")}</td>
                  <td className="px-4 py-3 text-right">{outputTokens.toLocaleString("es-AR")}</td>
                  <td className="px-4 py-3 text-right font-semibold">{usd.format(a.cost)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-[14px] border border-line-soft bg-surface p-4">
      <Kicker>{label}</Kicker>
      <p className="font-display text-2xl font-semibold">{value}</p>
    </div>
  );
}
