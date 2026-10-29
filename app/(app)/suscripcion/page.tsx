import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import { MobileBrand, PanelShell } from "@/components/app/panel-shell";
import { Button } from "@/components/ui/button";
import { Pill } from "@/components/ui/pill";
import { Kicker, Title } from "@/components/ui/typography";
import type { plans as plansTable } from "@/db/schema";
import { requireUser } from "@/lib/auth/session";
import { getPlan, listActivePlans, scoped } from "@/lib/db/scoped";
import { formatDay, formatPrice } from "@/lib/format";
import { buyTopup, cancelSubscription, subscribe } from "./actions";

// Pantalla agregada (navegación del panel): suscripción mensual con cupo de páginas (spec 06).
export const metadata: Metadata = { title: "Mi suscripción · Contrato Claro" };

export default function Page() {
  return (
    <PanelShell current="suscripcion">
      <MobileBrand />
      <div className="relative flex flex-col gap-5">
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-x-6 -top-10 -z-10 h-72"
          style={{ background: "radial-gradient(640px 420px at 12% -10%, rgba(14,124,123,0.14), transparent 65%)" }}
        />
        <Title>Mi suscripción</Title>
        <Suspense fallback={<div aria-hidden className="h-40 animate-pulse rounded-[14px] bg-line-soft" />}>
          <Subscription />
        </Suspense>
      </div>
    </PanelShell>
  );
}

async function Subscription() {
  const user = await requireUser("/suscripcion");
  const db = scoped(user.id);
  const [subscription, activePlans] = await Promise.all([db.billing.current(), listActivePlans()]);

  if (!subscription) {
    return (
      <div className="flex flex-col gap-6">
        <p className="max-w-[58ch] text-[15px] leading-relaxed text-ink-2">
          Suscribite y analizá cuando quieras: un cupo de páginas por mes, con el re-chequeo del día de la firma incluido.
        </p>
        {activePlans.length === 0 ? (
          <p className="text-ink-3">Todavía no hay planes disponibles.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {activePlans.map((plan) => (
              <PlanCard key={plan.id} plan={plan} />
            ))}
          </div>
        )}
      </div>
    );
  }

  if (subscription.status === "pending") {
    return <p className="text-ink-2">Estamos esperando que confirmes el débito automático con Mercado Pago.</p>;
  }

  const [plan, cycle] = await Promise.all([getPlan(subscription.planId), db.billing.activeCycle()]);
  const quota = cycle ? cycle.pageQuota + cycle.extraPagesGranted : 0;
  const used = cycle?.pagesUsed ?? 0;
  const remaining = cycle ? quota - used : null;
  const empty = remaining !== null && remaining <= 0;
  const low = !empty && remaining !== null && quota > 0 && remaining / quota <= 0.15;

  return (
    <div className="flex max-w-[640px] flex-col gap-5 rounded-2xl border border-line-soft bg-surface p-6 md:p-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Kicker>Tu plan</Kicker>
          <p className="font-display text-2xl font-semibold">{plan?.name ?? "Plan"}</p>
        </div>
        {subscription.status === "paused" ? (
          <Pill tone="neutral">Pausada</Pill>
        ) : empty ? (
          <Pill tone="attention">Sin cupo</Pill>
        ) : low ? (
          <Pill tone="attention">Queda poco cupo</Pill>
        ) : (
          <Pill tone="ok">Al día</Pill>
        )}
      </div>

      {cycle ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between text-[14.5px] text-ink-2">
            <span>Páginas usadas este mes</span>
            <strong className="font-mono text-ink">
              {used} de {quota}
            </strong>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-line-soft">
            <div
              className={`h-full rounded-full ${empty || low ? "bg-attention" : "bg-primary"}`}
              style={{ width: `${quota ? Math.min(100, (used / quota) * 100) : 0}%` }}
            />
          </div>
          {empty && <p className="text-[13.5px] font-semibold text-attention-fg">Se agotó el cupo de este mes.</p>}
          {low && <p className="text-[13.5px] font-semibold text-attention-fg">Te quedan {remaining} páginas.</p>}
        </div>
      ) : (
        <p className="text-ink-3">Todavía no hay un ciclo activo.</p>
      )}

      <div className="flex flex-wrap gap-x-7 gap-y-3 border-t border-line-soft pt-4">
        <Meta label="Precio" value={plan ? `${formatPrice(plan.priceCents)} / mes` : "—"} />
        {subscription.currentPeriodEnd && <Meta label="Próximo cobro" value={formatDay(subscription.currentPeriodEnd)} />}
        <Meta label="Re-chequeos" value="Incluidos" />
      </div>

      <div className="flex flex-wrap gap-3">
        {cycle && empty && (
          <form action={buyTopup.bind(null, cycle.id)}>
            <Button type="submit">Comprar páginas extra</Button>
          </form>
        )}
        {subscription.cancelAtPeriodEnd ? (
          <p className="text-[13.5px] text-ink-3">Se cancela al terminar el ciclo actual.</p>
        ) : (
          <form action={cancelSubscription.bind(null, subscription.id)}>
            <Button type="submit" variant="outline">
              Cancelar suscripción
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}

const CHECK = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true">
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

function PlanCard({ plan }: { plan: typeof plansTable.$inferSelect }) {
  const features = [`${plan.pageQuota} páginas por mes`, "Re-chequeos incluidos", "Informe con IA y descarga en PDF", "Comprá páginas extra si se te acaban"];
  return (
    <form
      action={subscribe.bind(null, plan.id)}
      className={`relative flex flex-col gap-4 rounded-2xl border bg-surface p-6 transition-[transform,box-shadow,border-color] duration-150 hover:-translate-y-1 hover:border-primary hover:shadow-[0_16px_32px_-18px_rgba(16,42,67,0.28)] ${plan.featured ? "border-primary shadow-[0_18px_40px_-20px_rgba(14,124,123,0.4)]" : "border-line-soft"}`}
    >
      {plan.featured && (
        <span className="absolute -top-3 left-6 rounded-full bg-primary px-3 py-1 text-[11px] font-bold tracking-wide text-white uppercase">Más elegido</span>
      )}
      <div className="flex flex-col gap-1">
        <p className="text-lg font-bold">{plan.name}</p>
        {plan.description && <p className="text-[13.5px] text-ink-3">{plan.description}</p>}
      </div>
      <p className="relative font-display text-[34px] leading-none font-semibold">
        {plan.featured && (
          <span
            aria-hidden
            className="absolute -top-5 -right-2.5 -z-10 h-[90px] w-[90px] rounded-full"
            style={{ background: "radial-gradient(circle, rgba(14,124,123,0.18), transparent 70%)" }}
          />
        )}
        {formatPrice(plan.priceCents)}
        <span className="ml-1 font-sans text-sm font-semibold text-ink-3">/ mes</span>
      </p>
      <ul className="flex flex-1 flex-col gap-2.5">
        {features.map((f) => (
          <li key={f} className="flex gap-2 text-sm text-ink-2">
            {CHECK}
            {f}
          </li>
        ))}
      </ul>
      <Button type="submit" variant={plan.featured ? "primary" : "outline"}>
        Suscribirme
      </Button>
    </form>
  );
}

function Meta({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11.5px] font-semibold tracking-[0.06em] text-ink-3 uppercase">{label}</span>
      <strong className="font-mono text-[15px] font-semibold">{value}</strong>
    </div>
  );
}
