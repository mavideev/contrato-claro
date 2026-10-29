import type { Metadata } from "next";
import { Suspense } from "react";
import { MobileBrand, PanelShell } from "@/components/app/panel-shell";
import { Button } from "@/components/ui/button";
import { Kicker, Title } from "@/components/ui/typography";
import { requireUser } from "@/lib/auth/session";
import { getPlan, listActivePlans, scoped } from "@/lib/db/scoped";
import { formatPrice } from "@/lib/format";
import { buyTopup, cancelSubscription, subscribe } from "./actions";

// Pantalla agregada (navegación del panel): suscripción mensual con cupo de páginas (spec 06).
export const metadata: Metadata = { title: "Mi suscripción · Contrato Claro" };

export default function Page() {
  return (
    <PanelShell current="suscripcion">
      <MobileBrand />
      <Title>Mi suscripción</Title>
      <Suspense fallback={<div aria-hidden className="h-40 animate-pulse rounded-[14px] bg-line-soft" />}>
        <Subscription />
      </Suspense>
    </PanelShell>
  );
}

async function Subscription() {
  const user = await requireUser("/suscripcion");
  const db = scoped(user.id);
  const [subscription, plans] = await Promise.all([db.billing.current(), listActivePlans()]);

  if (!subscription) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-ink-2">Un cupo de páginas por mes para analizar contratos y re-chequear, sin pagar uno por uno.</p>
        {plans.length === 0 ? (
          <p className="text-ink-3">Todavía no hay planes disponibles.</p>
        ) : (
          plans.map((plan) => (
            <form key={plan.id} action={subscribe.bind(null, plan.id)} className="flex flex-col gap-3 rounded-[14px] border border-line-soft bg-surface p-6">
              <Kicker>{plan.name}</Kicker>
              <p className="font-display text-[28px] font-bold">{formatPrice(plan.priceCents)} / mes</p>
              <p className="text-ink-2">Hasta {plan.pageQuota} páginas por mes, re-chequeos incluidos.</p>
              <Button type="submit">Suscribirme</Button>
            </form>
          ))
        )}
      </div>
    );
  }

  if (subscription.status === "pending") {
    return <p className="text-ink-2">Estamos esperando que confirmes el débito automático con Mercado Pago.</p>;
  }

  const [plan, cycle] = await Promise.all([getPlan(subscription.planId), db.billing.activeCycle()]);
  const remaining = cycle ? cycle.pageQuota + cycle.extraPagesGranted - cycle.pagesUsed : null;

  return (
    <div className="flex flex-col gap-4">
      {subscription.status === "paused" && <p className="text-ink-2">Tu suscripción está pausada.</p>}
      <div className="flex flex-col gap-3 rounded-[14px] border border-line-soft bg-surface p-6">
        <Kicker>{plan?.name ?? "Plan"}</Kicker>
        {cycle ? (
          <>
            <p className="text-ink-2">
              Usaste <strong>{cycle.pagesUsed}</strong> de <strong>{cycle.pageQuota + cycle.extraPagesGranted}</strong> páginas este mes.
            </p>
            {remaining !== null && remaining <= 0 && (
              <form action={buyTopup.bind(null, cycle.id)}>
                <Button type="submit">Comprar páginas extra</Button>
              </form>
            )}
          </>
        ) : (
          <p className="text-ink-3">Todavía no hay un ciclo activo.</p>
        )}
      </div>
      {!subscription.cancelAtPeriodEnd && (
        <form action={cancelSubscription.bind(null, subscription.id)}>
          <Button type="submit" variant="ghost">
            Cancelar suscripción
          </Button>
        </form>
      )}
      {subscription.cancelAtPeriodEnd && <p className="text-ink-3">Se cancela al terminar el ciclo actual.</p>}
    </div>
  );
}
