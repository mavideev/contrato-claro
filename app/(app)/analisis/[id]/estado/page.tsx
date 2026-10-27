import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { startPayment } from "@/app/(app)/analisis/actions";
import { AutoRefresh } from "@/components/app/auto-refresh";
import { FlowPage, SkeletonBlock } from "@/components/app/flow";
import { ProgressSteps } from "@/components/app/progress-steps";
import { WaitForReading } from "@/components/app/wait-for-reading";
import { Button, buttonClass } from "@/components/ui/button";
import { LegalDisclaimer } from "@/components/ui/disclaimer";
import { RiskCounts } from "@/components/ui/pill";
import { Kicker, Title } from "@/components/ui/typography";
import { loadAnalysis } from "@/lib/analysis/load";
import { formatPrice } from "@/lib/format";
import { priceCents } from "@/lib/payments/provider";

// Prototipo 4 · Análisis y pago / móvil 5. Corrección 2 de la spec 03: el
// re-chequeo es un extra.
export const metadata: Metadata = { title: "Análisis y pago · Contrato Claro" };

// Por qué falló la lectura (`analyses.error_code`, ver lib/extraction/read.ts).
const FAILED: Record<string, string> = {
  empty: "El documento no tiene texto. Probá con el PDF o pegá el texto del contrato.",
  pdf_without_text: "El PDF parece escaneado y no pudimos leerlo. Probá sacándole fotos desde el celular.",
  photos_without_text: "No pudimos leer las fotos. Sacalas de nuevo con buena luz y la hoja entera, o subí el PDF.",
  too_many_pages: "El contrato tiene más de 30 páginas. Subí solo las del contrato, sin anexos.",
  queue: "No pudimos empezar a leer tu contrato. Probá de nuevo en un rato.",
  unreadable: "No pudimos abrir el archivo. Probá con otra foto o con el PDF. Si el problema sigue, escribinos.",
};

export default function Page({ params }: PageProps<"/analisis/[id]/estado">) {
  return (
    <FlowPage>
      <Suspense fallback={<SkeletonBlock className="h-[480px]" />}>
        <Status params={params} />
      </Suspense>
    </FlowPage>
  );
}

async function Status({ params }: Pick<PageProps<"/analisis/[id]/estado">, "params">) {
  const { analysis, db } = await loadAnalysis(params, "estado");
  const { id, status, preview } = analysis;
  if (status === "awaiting_confirmation" || status === "draft") redirect(`/analisis/${id}/confirmar`);
  if (status === "ready") redirect(`/analisis/${id}/informe`);

  const total = preview ? preview.high + preview.attention + preview.none : null;
  const reading = status === "extracting";
  const steps = reading
    ? ["Leyendo el texto", "Detectando las cláusulas", "Buscando los datos clave"]
    : ["Leyendo el texto", total ? `Detectando ${total} cláusulas` : "Detectando las cláusulas", "Buscando riesgos", "Preparando el informe"];
  const paid = status === "paid" || status === "analyzing";
  const active = reading ? 0 : paid ? 3 : status === "failed" ? 0 : steps.length;
  const heading = status === "failed" ? "No pudimos leer tu contrato" : paid ? "Preparando tu informe completo" : status === "preview_ready" ? "Tu vista previa está lista" : "Leyendo tu contrato";
  const payment = await db.payments.latest(id, "analysis");

  return (
    <>
      <div className="flex flex-col gap-5 md:flex-row md:items-start md:gap-12">
        <div className="flex flex-col gap-5 md:flex-[1_1_360px] md:gap-[22px]">
          <div className="flex items-center gap-2.5">
            <Title>{heading}</Title>
            {active < steps.length && status !== "failed" && (
              <svg
                aria-hidden="true"
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="shrink-0 animate-pulse text-primary"
              >
                <path d="M12 2l1.8 5.2L19 9l-5.2 1.8L12 16l-1.8-5.2L5 9l5.2-1.8L12 2z" />
                <path d="M19 15l.9 2.6L22.5 18.5l-2.6.9L19 22l-.9-2.6-2.6-.9 2.6-.9L19 15z" opacity="0.7" />
              </svg>
            )}
          </div>
          {status === "failed" ? (
            <>
              <p className="text-ink-2">{FAILED[analysis.errorCode ?? ""] ?? FAILED.unreadable}</p>
              <Link href="/analisis/nuevo" className={buttonClass("primary", "self-start")}>
                Subir otro archivo
              </Link>
            </>
          ) : (
            <>
              <ProgressSteps steps={steps} active={active} />
              {paid && <AutoRefresh />}
              {reading && <WaitForReading id={id} />}
              {active < steps.length && <p className="text-[13px] text-ink-3 md:text-[15px]">No cierres esta pantalla. Suele tardar menos de un minuto.</p>}
            </>
          )}
        </div>

        {preview && status !== "failed" && (
          <section className="flex flex-col gap-3.5 rounded-2xl border border-line-soft bg-surface px-5 py-[22px] md:max-w-[560px] md:flex-[999_1_480px] md:gap-[18px] md:p-8">
            <Kicker>Vista previa gratuita</Kicker>
            <RiskCounts {...preview} />
            <LegalDisclaimer />
            <div aria-hidden className="flex flex-col gap-2.5">
              {["bg-high w-[60%]", "bg-attention w-[45%]"].map((c) => (
                <div key={c} className="flex h-[42px] items-center gap-2.5 rounded-[10px] bg-[#EFEAE2] px-4 blur-[1px] md:h-12">
                  <span className={`size-2.5 rounded-full ${c.split(" ")[0]}`} />
                  <span className={`h-2 rounded bg-[#D9D2C5] ${c.split(" ")[1]}`} />
                </div>
              ))}
            </div>
            {paid ? (
              <p className="text-[15px] text-ok-fg md:text-base">Pago confirmado. Estamos preparando tu informe: esta pantalla se actualiza sola.</p>
            ) : (
              <>
                <p className="flex items-center gap-2 text-[15px] text-[#243B53] md:text-base">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                    <rect x="5" y="11" width="14" height="10" rx="2" />
                    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                  </svg>
                  El detalle de cada cláusula se desbloquea al pagar.
                </p>
                <div className="flex items-baseline gap-2.5 md:gap-3">
                  <span className="font-display text-[34px] font-bold md:text-[40px]">{formatPrice(payment?.amountCents || priceCents("analysis"))}</span>
                  <span className="text-sm text-ink-3 md:text-[15px]">pago único</span>
                </div>
                <p className="text-[15px] leading-normal text-ink-2 md:text-base">
                  Informe completo en PDF · Cláusulas citadas · Re-chequeo del día de la firma: extra, lo comprás cuando lo necesites
                </p>
                <form action={startPayment.bind(null, id)} className="mt-2">
                  <Button type="submit" className="min-h-[54px] w-full text-[17px]">
                    {payment?.status === "pending" ? "Ver estado del pago" : "Pagar con Mercado Pago"}
                  </Button>
                </form>
                <p className="text-center text-xs leading-snug text-ink-3 md:text-left md:text-[13px]">
                  Pagás en el sitio de Mercado Pago y volvés acá. El informe se desbloquea cuando se confirma el pago.
                </p>
              </>
            )}
          </section>
        )}
      </div>
    </>
  );
}
