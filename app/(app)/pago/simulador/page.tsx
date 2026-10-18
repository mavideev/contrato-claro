import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { FlowPage, SkeletonBlock } from "@/components/app/flow";
import { Button } from "@/components/ui/button";
import { Kicker, Title } from "@/components/ui/typography";
import { requireUser } from "@/lib/auth/session";
import { scoped } from "@/lib/db/scoped";
import { formatPrice } from "@/lib/format";
import { paymentProvider } from "@/lib/payments/provider";
import { simulatePayment } from "./actions";

// Reemplaza al checkout de Mercado Pago mientras no hay credenciales (solo desarrollo).
export const metadata: Metadata = { title: "Simulador de pagos · Contrato Claro" };

export default function Page({ searchParams }: PageProps<"/pago/simulador">) {
  return (
    <FlowPage wide={false}>
      <Suspense fallback={<SkeletonBlock className="h-72" />}>
        <Simulator searchParams={searchParams} />
      </Suspense>
    </FlowPage>
  );
}

async function Simulator({ searchParams }: Pick<PageProps<"/pago/simulador">, "searchParams">) {
  const { pago } = await searchParams;
  const user = await requireUser("/analisis");
  if (typeof pago !== "string" || paymentProvider().name !== "mock") notFound();
  const payment = await scoped(user.id).payments.get(pago);
  if (!payment) notFound();

  const options = [
    { status: "approved" as const, label: "Aprobar el pago", variant: "primary" as const },
    { status: "pending" as const, label: "Dejarlo pendiente", variant: "ghost" as const },
    { status: "rejected" as const, label: "Rechazarlo", variant: "ghost" as const },
  ];

  return (
    <section className="flex flex-col gap-5 rounded-2xl border-2 border-dashed border-attention bg-surface p-6 md:mt-8 md:p-8">
      <Kicker>Simulador de Mercado Pago · solo desarrollo</Kicker>
      <Title>¿Cómo sale el pago?</Title>
      <p className="text-ink-2">
        {payment.kind === "analysis" ? "Análisis de contrato de alquiler" : "Re-chequeo del día de la firma"} ·{" "}
        <strong>{formatPrice(payment.amountCents)}</strong>
      </p>
      <p className="text-sm text-ink-3">
        Acá iría el checkout de Mercado Pago. Elegí el resultado: la app recibe el mismo aviso firmado que mandaría Mercado Pago.
      </p>
      <div className="flex flex-col gap-2.5 md:flex-row">
        {options.map((o) => (
          <form key={o.status} action={simulatePayment.bind(null, payment.id, o.status)} className="md:flex-1">
            <Button type="submit" variant={o.variant} className="w-full">
              {o.label}
            </Button>
          </form>
        ))}
      </div>
    </section>
  );
}
