import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { FlowPage, SkeletonBlock } from "@/components/app/flow";
import { Button } from "@/components/ui/button";
import { Kicker, Title } from "@/components/ui/typography";
import { requireUser } from "@/lib/auth/session";
import { scoped } from "@/lib/db/scoped";
import { subscriptionProvider } from "@/lib/payments/provider";
import { simulateSubscription } from "./actions";

// Reemplaza la pantalla de Mercado Pago para autorizar el débito mensual, mientras no hay credenciales (solo desarrollo).
export const metadata: Metadata = { title: "Simulador de suscripción · Contrato Claro" };

export default function Page({ searchParams }: PageProps<"/suscripcion/simulador">) {
  return (
    <FlowPage wide={false}>
      <Suspense fallback={<SkeletonBlock className="h-72" />}>
        <Simulator searchParams={searchParams} />
      </Suspense>
    </FlowPage>
  );
}

async function Simulator({ searchParams }: Pick<PageProps<"/suscripcion/simulador">, "searchParams">) {
  const { suscripcion } = await searchParams;
  const user = await requireUser("/suscripcion");
  if (typeof suscripcion !== "string" || subscriptionProvider().name !== "mock") notFound();
  const subscription = await scoped(user.id).billing.current();
  if (!subscription || subscription.id !== suscripcion) notFound();

  const options = [
    { status: "authorized" as const, label: "Autorizar el débito mensual", variant: "primary" as const },
    { status: "cancelled" as const, label: "Cancelarla", variant: "ghost" as const },
  ];

  return (
    <section className="flex flex-col gap-5 rounded-2xl border-2 border-dashed border-attention bg-surface p-6 md:mt-8 md:p-8">
      <Kicker>Simulador de Mercado Pago · solo desarrollo</Kicker>
      <Title>¿Cómo sale la suscripción?</Title>
      <p className="text-sm text-ink-3">
        Acá iría la pantalla de Mercado Pago para autorizar el débito mensual. Elegí el resultado: la app recibe el mismo aviso firmado que mandaría Mercado Pago.
      </p>
      <div className="flex flex-col gap-2.5 md:flex-row">
        {options.map((o) => (
          <form key={o.status} action={simulateSubscription.bind(null, subscription.id, o.status)} className="md:flex-1">
            <Button type="submit" variant={o.variant} className="w-full">
              {o.label}
            </Button>
          </form>
        ))}
      </div>
    </section>
  );
}
