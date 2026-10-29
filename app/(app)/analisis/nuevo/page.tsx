import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { prepayAnalysis } from "@/app/(app)/analisis/actions";
import { AutoRefresh } from "@/components/app/auto-refresh";
import { SkeletonBlock } from "@/components/app/flow";
import { UploadForm } from "@/components/app/upload-form";
import { Button, ButtonLink } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/session";
import { analysisEntitlement } from "@/lib/billing/entitlement";
import { formatPrice } from "@/lib/format";
import { priceCents } from "@/lib/payments/provider";

// Prototipo 2 · Subir contrato (desktop y mobile).
export const metadata: Metadata = { title: "Subir contrato · Contrato Claro" };

export default function Page() {
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <main className="flex min-w-0 flex-1 flex-col gap-5 px-5 pt-6 md:gap-[26px] md:px-14 md:py-12">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 md:gap-3">
            <span className="font-display text-xl font-semibold md:text-2xl">Contrato Claro</span>
            <span className="inline-flex h-[22px] items-center rounded-full bg-ok-bg px-2 text-[11px] font-bold tracking-[0.06em] text-ok-fg md:h-6 md:px-2.5 md:text-xs">
              BETA
            </span>
          </div>
          <nav aria-label="Principal" className="flex items-center gap-4 text-[15px] font-semibold">
            <Link href="/analisis" className="inline-flex min-h-11 items-center text-primary-hover">
              Mis análisis
            </Link>
            <Link href="/cuenta" className="hidden min-h-11 items-center text-primary-hover md:inline-flex">
              Cuenta
            </Link>
          </nav>
        </div>
        <div className="flex max-w-[620px] flex-col gap-2.5 md:gap-3.5">
          <h1 className="font-display text-[32px] leading-[1.1] font-semibold tracking-[-0.01em] md:text-[46px] md:leading-[1.08]">
            Subí tu contrato y sabé qué estás por firmar
          </h1>
          <p className="text-base text-ink-2 md:text-lg">Foto, PDF, Word o texto. Detectamos riesgos cláusula por cláusula.</p>
        </div>
        <Suspense fallback={<SkeletonBlock className="h-80 max-w-[620px]" />}>
          <Form />
        </Suspense>
      </main>
      <PhoneIllustration />
    </div>
  );
}

async function Form() {
  const user = await requireUser("/analisis/nuevo");
  const entitlement = await analysisEntitlement(user.id);
  if (entitlement.mode === "none") return <ChoosePlan />;
  if (entitlement.mode === "pending") return <PendingPrepay />;
  return <UploadForm />;
}

/** Sin suscripción con cupo ni pago aprobado: hay que elegir cómo pagar antes de subir nada. */
function ChoosePlan() {
  return (
    <div className="flex max-w-[620px] flex-col gap-4">
      <p className="text-ink-2">Antes de subir el contrato, elegí cómo lo pagás.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-3 rounded-2xl border border-line-soft bg-surface p-6">
          <p className="text-lg font-bold">Suscripción</p>
          <p className="text-sm text-ink-2">Un cupo de páginas por mes, re-chequeos incluidos. Conviene si vas a analizar más de un contrato.</p>
          <ButtonLink href="/suscripcion" className="mt-auto">
            Ver planes
          </ButtonLink>
        </div>
        <div className="flex flex-col gap-3 rounded-2xl border border-line-soft bg-surface p-6">
          <p className="text-lg font-bold">Pago único</p>
          <p className="font-display text-[28px] font-semibold">{formatPrice(priceCents("analysis"))}</p>
          <p className="text-sm text-ink-2">Para analizar un solo contrato.</p>
          <form action={prepayAnalysis} className="mt-auto">
            <Button type="submit" className="w-full">
              Pagar con Mercado Pago
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

/** Ya inició el pago único, falta que Mercado Pago lo confirme. */
function PendingPrepay() {
  return (
    <div className="flex max-w-[620px] flex-col gap-3">
      <AutoRefresh />
      <p className="text-ink-2">Estamos esperando que se confirme tu pago. Esta pantalla se actualiza sola.</p>
    </div>
  );
}

/** Panel derecho del prototipo (solo desktop): el escaneo es desde el celular. */
function PhoneIllustration() {
  const lines = [95, 80, 90, 60, 92, 85, 70, 94, 76];
  return (
    <aside aria-hidden className="hidden w-[400px] shrink-0 flex-col items-center justify-center gap-6 bg-ink px-8 py-12 lg:flex">
      <div className="relative flex h-[490px] w-60 flex-col items-center justify-between rounded-[36px] border-8 border-[#0B1620] bg-[#1B2733] px-[22px] py-10">
        <div className="relative h-[340px] w-full">
          <div className="absolute inset-3 flex -rotate-2 flex-col gap-[7px] bg-white px-3.5 py-4">
            <div className="mb-1.5 text-[9px] font-bold tracking-[0.08em] text-ink">CONTRATO DE LOCACIÓN</div>
            {lines.map((w, i) => (
              <div key={i} className="h-[5px] rounded-sm bg-[#D3D8DD]" style={{ width: `${w}%` }} />
            ))}
          </div>
          {["left-0 top-0 border-l-[3px] border-t-[3px]", "right-0 top-0 border-r-[3px] border-t-[3px]", "left-0 bottom-0 border-l-[3px] border-b-[3px]", "right-0 bottom-0 border-r-[3px] border-b-[3px]"].map((c) => (
            <div key={c} className={`absolute size-[26px] border-check ${c}`} />
          ))}
        </div>
        <div className="text-[13px] text-white">Detectando bordes…</div>
      </div>
      <p className="text-center text-[15px] text-[#B7C7D6]">Para sacar fotos, entrá desde tu celular</p>
    </aside>
  );
}
