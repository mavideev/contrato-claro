import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { createRecheck, startRecheckPayment } from "@/app/(app)/analisis/actions";
import { BottomBar, FlowPage, SkeletonBlock } from "@/components/app/flow";
import { RecheckUpload } from "@/components/app/recheck-upload";
import { Button, ButtonLink } from "@/components/ui/button";
import { LegalDisclaimer } from "@/components/ui/disclaimer";
import { Kicker, Title } from "@/components/ui/typography";
import { clauseLabel } from "@/lib/analysis/presentation";
import { requireUser } from "@/lib/auth/session";
import { scoped } from "@/lib/db/scoped";
import { wordDiff } from "@/lib/diff";
import { formatDay, formatDayTime, formatPrice } from "@/lib/format";
import { priceCents } from "@/lib/payments/provider";

// Prototipo 6 · Re-chequeo / móvil 7. Corrección 6 de la spec 03: antes, la
// compra del extra; después, la subida y el resultado (con «Todo idéntico»).
export const metadata: Metadata = { title: "Re-chequeo · Contrato Claro" };

export default function Page({ params }: PageProps<"/analisis/[id]/rechequeo">) {
  return (
    <FlowPage>
      <Suspense fallback={<SkeletonBlock className="h-[480px]" />}>
        <Recheck params={params} />
      </Suspense>
    </FlowPage>
  );
}

const hash = (h: string) => `${h.slice(0, 4)}…${h.slice(-2)}`;

async function Recheck({ params }: Pick<PageProps<"/analisis/[id]/rechequeo">, "params">) {
  const { id } = await params;
  const user = await requireUser(`/analisis/${id}/rechequeo`);
  const data = await scoped(user.id).analyses.recheck(id);
  if (!data) notFound();
  const { analysis, fingerprint, clauseCount, latest, payment } = data;
  if (analysis.status !== "ready") redirect(`/analisis/${id}/estado`);

  const header = (subtitle: string) => (
    <>
      <div className="flex flex-col gap-1.5">
        <Title>Re-chequeo del día de la firma</Title>
        <p className="text-sm leading-normal text-ink-2 md:text-base">{subtitle}</p>
      </div>
    </>
  );
  const analyzed = formatDay(analysis.createdAt);
  const upload = (
    <div className="flex gap-2.5 md:gap-3">
      <ButtonLink href={`/analisis/nuevo/escanear?rechequeo=${id}`} variant="outline" className="flex-1 md:hidden">
        Escanear final
      </ButtonLink>
      <RecheckUpload action={createRecheck.bind(null, id)} className="flex-1 md:flex-none" />
    </div>
  );

  // 1. Comprar el re-chequeo.
  if (payment?.status !== "approved") {
    const pending = payment?.status === "pending";
    return (
      <>
        {header(`El día de la firma, subí la versión final y la comparamos cláusula por cláusula con la que analizamos el ${analyzed}.`)}
        <section className="flex max-w-[560px] flex-col gap-4 rounded-2xl border border-line-soft bg-surface px-5 py-6 md:p-8">
          <Kicker>Re-chequeo</Kicker>
          <div className="flex items-baseline gap-3">
            <span className="font-display text-[34px] font-bold md:text-[40px]">{formatPrice(payment?.amountCents || priceCents("recheck"))}</span>
            <span className="text-[15px] text-ink-3">pago único</span>
          </div>
          <p className="text-[15px] leading-normal text-ink-2 md:text-base">
            Te avisamos si cambió algo, aunque sea una palabra o un número, y te damos un certificado con las dos huellas.
          </p>
          {pending ? (
            <ButtonLink href={`/pago/retorno?analisis=${id}&tipo=rechequeo`}>Ver estado del pago</ButtonLink>
          ) : (
            <form action={startRecheckPayment.bind(null, id)}>
              <Button type="submit" className="w-full">
                Pagar con Mercado Pago
              </Button>
            </form>
          )}
        </section>
      </>
    );
  }

  // 2. Pagado, falta subir la versión final.
  if (!latest) {
    return (
      <>
        {header(`Subí la versión que vas a firmar. La comparamos con la que analizamos el ${analyzed}.`)}
        <section className="flex max-w-[560px] flex-col gap-4 rounded-2xl border border-line-soft bg-surface px-5 py-6 md:p-8">
          <p className="text-ink-2">Podés sacarle fotos desde el celular o subir el PDF o Word.</p>
          {upload}
        </section>
      </>
    );
  }

  const comparedText = `Comparamos la versión que subiste el ${formatDayTime(latest.createdAt)} con la que analizamos el ${analyzed}.`;
  let body: ReactNode;

  if (latest.result === "pending") {
    body = <Banner tone="info">Estamos comparando las dos versiones. Suele tardar menos de un minuto.</Banner>;
  } else if (latest.result === "failed") {
    body = (
      <>
        <Banner tone="high">No pudimos leer la versión final. Probá con otra foto o con el PDF.</Banner>
        {upload}
      </>
    );
  } else {
    const changes = latest.changes ?? [];
    const identical = clauseCount - changes.length;
    body = (
      <>
        {latest.result === "identical" ? (
          <Banner tone="ok">Todo idéntico: la versión final es igual a la que analizamos.</Banner>
        ) : (
          <Banner tone="high">
            Se detectaron {changes.length} {changes.length === 1 ? "cambio" : "cambios"} desde el análisis. Revisalos antes de firmar.
          </Banner>
        )}
        <div className="flex flex-col gap-1.5 md:gap-2">
          <div className="flex justify-between text-sm md:text-[15px]">
            <span>Cláusulas idénticas</span>
            <strong>
              {identical} de {clauseCount}
            </strong>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-line-soft md:h-2.5">
            <div className="h-full rounded-full bg-primary" style={{ width: `${clauseCount ? (identical / clauseCount) * 100 : 0}%` }} />
          </div>
        </div>
        {changes.map((c) => (
          <div key={c.clauseNumber} className="flex flex-col gap-1.5 rounded-[14px] border border-line-soft bg-surface p-4 md:gap-2 md:px-6 md:py-5">
            <Kicker>
              {clauseLabel({ number: c.clauseNumber, title: c.title })}
            </Kicker>
            <p className="text-base leading-[1.7] md:text-lg md:leading-relaxed">
              {wordDiff(c.before, c.after).map((s, i) =>
                s.type === "del" ? (
                  <del key={i} className="rounded bg-high-bg px-1.5 py-0.5 text-high-fg">
                    {s.text}
                  </del>
                ) : s.type === "ins" ? (
                  <ins key={i} className="rounded bg-[#BFE5CB] px-1.5 py-0.5 text-[#14532D] no-underline">
                    {s.text}
                  </ins>
                ) : (
                  <span key={i}>{s.text}</span>
                ),
              )}
            </p>
          </div>
        ))}
        {fingerprint && (
          <p className="font-mono text-xs leading-normal text-ink-3 md:text-[13px]">
            Huella analizada {hash(fingerprint.normalizedTextSha256)} · Huella actual {latest.result === "identical" ? "idéntica" : "distinta"}
          </p>
        )}
      </>
    );
  }

  return (
    <>
      {header(comparedText)}
      {body}
      {latest.result !== "pending" && latest.result !== "failed" && <LegalDisclaimer />}
      {latest.result !== "pending" && latest.result !== "failed" && (
        <BottomBar>
          <div className="order-2 md:order-1">{upload}</div>
          {/* El certificado llega con la etapa 4. */}
          <Button type="button" disabled title="Disponible próximamente" className="order-1 md:order-2">
            Descargar certificado de re-chequeo
          </Button>
        </BottomBar>
      )}
    </>
  );
}

function Banner({ tone, children }: { tone: "high" | "ok" | "info"; children: ReactNode }) {
  const styles = {
    high: "border-[#E8A39A] bg-high-bg text-high-fg",
    ok: "border-ok/30 bg-ok-bg text-ok-fg",
    info: "border-line-soft bg-surface text-ink-2",
  }[tone];
  return (
    <div role={tone === "high" ? "alert" : "status"} className={`flex items-start gap-2.5 rounded-xl border px-4 py-3.5 text-[15px] leading-snug font-bold md:items-center md:gap-3 md:px-[22px] md:py-[18px] md:text-[17px] ${styles}`}>
      {tone === "high" && (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0">
          <path d="M12 3l10 18H2z" />
          <path d="M12 10v5M12 18h.01" />
        </svg>
      )}
      {children}
    </div>
  );
}
