import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { MobileBrand, PanelShell } from "@/components/app/panel-shell";
import { ButtonLink } from "@/components/ui/button";
import { Pill } from "@/components/ui/pill";
import { Title } from "@/components/ui/typography";
import type { paymentStatus } from "@/db/schema";
import { CONTRACT_LABEL, type Tone } from "@/lib/analysis/presentation";
import { requireUser } from "@/lib/auth/session";
import { scoped } from "@/lib/db/scoped";
import { formatDay, formatPrice } from "@/lib/format";

// Pantalla agregada (navegación del panel): historial de pagos.
export const metadata: Metadata = { title: "Pagos · Contrato Claro" };

const STATUS: Record<(typeof paymentStatus.enumValues)[number], { tone: Tone; label: string }> = {
  pending: { tone: "neutral", label: "Pendiente" },
  approved: { tone: "ok", label: "Aprobado" },
  rejected: { tone: "high", label: "Rechazado" },
  cancelled: { tone: "neutral", label: "Cancelado" },
  refunded: { tone: "neutral", label: "Reembolsado" },
};

export default function Page() {
  return (
    <PanelShell current="pagos">
      <MobileBrand />
      <Title>Pagos</Title>
      <Suspense fallback={<div aria-hidden className="h-40 animate-pulse rounded-[14px] bg-line-soft" />}>
        <Payments />
      </Suspense>
    </PanelShell>
  );
}

async function Payments() {
  const user = await requireUser("/pagos");
  const rows = await scoped(user.id).payments.list();

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-start gap-4 rounded-[14px] border border-line-soft bg-surface p-6">
        <p className="text-ink-2">Todavía no hiciste ningún pago.</p>
        <ButtonLink href="/analisis/nuevo">Nuevo análisis</ButtonLink>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {rows.map(({ payment: p, analysis: a }) => (
        <li key={p.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[14px] border border-line-soft bg-surface p-4 md:px-6">
          <div className="flex min-w-0 flex-[1_1_240px] flex-col gap-1">
            <span className="font-bold">{p.kind === "analysis" ? "Análisis" : "Re-chequeo"}</span>
            <Link href={`/analisis/${a.id}/estado`} className="truncate text-sm text-ink-3">
              {CONTRACT_LABEL[a.contractType]}
              {a.propertyLabel ? ` · ${a.propertyLabel}` : ""}
            </Link>
          </div>
          <span className="text-sm text-ink-3">{formatDay(p.createdAt)}</span>
          <span className="font-semibold">{formatPrice(p.amountCents)}</span>
          <Pill tone={STATUS[p.status].tone}>{STATUS[p.status].label}</Pill>
        </li>
      ))}
    </ul>
  );
}
