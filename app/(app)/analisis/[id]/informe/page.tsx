import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { BottomBar, FlowPage, SkeletonBlock } from "@/components/app/flow";
import { Button, ButtonLink } from "@/components/ui/button";
import { RiskCounts } from "@/components/ui/pill";
import { Title } from "@/components/ui/typography";
import { clauseLabel, CONTRACT_LABEL } from "@/lib/analysis/presentation";
import { requireUser } from "@/lib/auth/session";
import { scoped } from "@/lib/db/scoped";
import { formatDayTime } from "@/lib/format";

// Prototipo 5 · Informe / móvil 6.
export const metadata: Metadata = { title: "Informe · Contrato Claro" };

const LEVEL = {
  high: { dot: "bg-high", halo: "shadow-[0_0_0_6px_#FBE3E0]", order: 0 },
  attention: { dot: "bg-attention", halo: "shadow-[0_0_0_6px_#FDF3DD]", order: 1 },
  none: { dot: "bg-ok", halo: "shadow-[0_0_0_6px_#DFF0E3]", order: 2 },
} as const;

export default function Page({ params }: PageProps<"/analisis/[id]/informe">) {
  return (
    <FlowPage>
      <Suspense fallback={<SkeletonBlock className="h-[600px]" />}>
        <Report params={params} />
      </Suspense>
    </FlowPage>
  );
}

async function Report({ params }: Pick<PageProps<"/analisis/[id]/informe">, "params">) {
  const { id } = await params;
  const user = await requireUser(`/analisis/${id}/informe`);
  const report = await scoped(user.id).analyses.report(id);
  if (!report) notFound();
  const { analysis, clauses, findings } = report;
  if (analysis.status !== "ready") redirect(`/analisis/${id}/estado`);

  const byClause = new Map(clauses.map((c) => [c.id, c]));
  const flagged = findings.filter((f) => f.level !== "none").sort((a, b) => LEVEL[a.level].order - LEVEL[b.level].order);
  const flaggedIds = new Set(flagged.map((f) => f.clauseId));
  const clean = clauses.filter((c) => !flaggedIds.has(c.id));
  const counts = {
    high: flagged.filter((f) => f.level === "high").length,
    attention: flagged.filter((f) => f.level === "attention").length,
    none: clean.length,
  };

  return (
    <>
      <div className="flex flex-col gap-3.5 md:flex-row md:flex-wrap md:items-end md:justify-between md:gap-4">
        <div className="flex flex-col gap-1 md:gap-1.5">
          <Title>Informe del contrato</Title>
          <p className="text-sm text-ink-2 md:text-base">
            {CONTRACT_LABEL[analysis.contractType]} · {clauses.length} cláusulas · analizado el {formatDayTime(analysis.createdAt)}
          </p>
        </div>
        <RiskCounts {...counts} />
      </div>

      <div className="flex flex-col gap-3.5">
        {flagged.map((f, i) => {
          const clause = byClause.get(f.clauseId)!;
          return (
            <details
              key={f.id}
              open={i === 0 && f.level === "high"}
              className="group rounded-[14px] border border-line-soft bg-surface open:border-primary"
            >
              <summary className="flex cursor-pointer list-none items-start gap-4 p-4 md:gap-[18px] md:px-6 md:py-[22px] [&::-webkit-details-marker]:hidden">
                <span className={`mt-1.5 size-3 shrink-0 rounded-full md:size-3.5 ${LEVEL[f.level].dot} ${LEVEL[f.level].halo}`} />
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="text-[11px] font-semibold tracking-[0.08em] text-ink-3 uppercase md:text-[13px]">
                    {clauseLabel(clause)}
                  </span>
                  <span className="font-display text-lg leading-tight font-semibold md:text-[22px]">{f.title}</span>
                  <span className="text-sm leading-normal text-ink-2 md:text-base">{f.explanation}</span>
                </span>
                <span className="hidden min-h-11 shrink-0 items-center rounded-[10px] border border-line px-[18px] text-[15px] font-semibold md:inline-flex">
                  <span className="group-open:hidden">Ver detalle</span>
                  <span className="hidden group-open:inline">Cerrar</span>
                </span>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-ink-3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="mt-0.5 shrink-0 transition-transform group-open:rotate-180 md:hidden">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </summary>
              <div className="flex flex-col gap-2.5 px-4 pb-4 md:ml-8 md:flex-row md:flex-wrap md:gap-4 md:px-6 md:pb-[22px]">
                <div className="flex flex-col gap-1.5 rounded-[10px] bg-[#F7F5F0] px-3.5 py-3 md:flex-[1_1_320px] md:px-[18px] md:py-4">
                  <span className="text-[11px] font-bold tracking-[0.08em] text-ink-3 md:text-xs">QUÉ DICE EL CONTRATO</span>
                  <p className="text-sm leading-normal text-[#243B53] italic md:text-[15px]">{clause.text}</p>
                </div>
                {f.whatToAsk && (
                  <div className="flex flex-col gap-1.5 rounded-[10px] bg-[#EEF6F5] px-3.5 py-3 md:flex-[1_1_320px] md:px-[18px] md:py-4">
                    <span className="text-[11px] font-bold tracking-[0.08em] text-primary-hover md:text-xs">QUÉ PEDIR</span>
                    <p className="text-sm leading-normal text-[#243B53] md:text-[15px]">{f.whatToAsk}</p>
                  </div>
                )}
              </div>
            </details>
          );
        })}

        <details className="group rounded-[14px] border border-line-soft bg-surface">
          <summary className="flex cursor-pointer list-none items-center gap-3 p-4 md:gap-[18px] md:px-6 md:py-[18px] [&::-webkit-details-marker]:hidden">
            <span className="size-3 shrink-0 rounded-full bg-ok md:size-3.5" />
            <span className="flex-1 text-[15px] font-bold text-ok-fg md:text-base">{clean.length} cláusulas sin alertas</span>
            <span className="text-sm text-ink-2 underline md:text-[15px]">
              <span className="group-open:hidden">Ver detalle</span>
              <span className="hidden group-open:inline">Cerrar</span>
            </span>
          </summary>
          <ul className="flex flex-col gap-1 px-4 pb-4 text-[15px] text-ink-2 md:px-14 md:pb-5">
            {clean.map((c) => (
              <li key={c.id}>
                {clauseLabel(c)}
              </li>
            ))}
          </ul>
        </details>
      </div>

      <p className="text-xs leading-normal text-ink-3 md:hidden">Informe orientativo. No reemplaza el asesoramiento de un abogado o escribano.</p>
      <BottomBar>
        <p className="hidden max-w-[420px] text-sm leading-normal text-ink-3 md:block">
          Informe orientativo. No reemplaza el asesoramiento de un abogado o escribano.
        </p>
        <div className="flex flex-col-reverse gap-2.5 md:flex-row md:gap-3">
          <ButtonLink href={`/analisis/${id}/rechequeo`} variant="outline">
            Re-chequear el día de la firma
          </ButtonLink>
          {/* El PDF llega en la etapa 3. */}
          <Button type="button" disabled title="Disponible próximamente">
            Descargar informe PDF
          </Button>
        </div>
      </BottomBar>
    </>
  );
}
