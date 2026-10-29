"use server";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { getPlan, scoped } from "@/lib/db/scoped";
import { env } from "@/lib/env";
import { paymentProvider, priceCents, subscriptionProvider } from "@/lib/payments/provider";

// Suscripción mensual con cupo de páginas (spec 06). Alta vía Preapproval API
// de Mercado Pago (o el simulador, sin credenciales); el cobro recurrente lo
// confirma el webhook (lib/payments/process-subscription.ts).

export async function subscribe(planId: string): Promise<void> {
  const user = await requireUser("/suscripcion");
  const db = scoped(user.id);
  const subscription = await db.billing.start(planId);
  if (subscription.mpPreapprovalId) redirect("/suscripcion");

  const plan = await getPlan(planId);
  if (!plan) redirect("/suscripcion");

  const { redirectUrl, preapprovalId } = await subscriptionProvider().createPreapproval({
    subscriptionId: subscription.id,
    planName: plan.name,
    amountCents: plan.priceCents,
    payerEmail: user.email,
    returnUrl: `${env().APP_URL}/suscripcion`,
  });
  await db.billing.setPreapproval(subscription.id, preapprovalId);
  redirect(redirectUrl);
}

export async function cancelSubscription(subscriptionId: string): Promise<void> {
  const user = await requireUser("/suscripcion");
  await scoped(user.id).billing.cancel(subscriptionId);
  redirect("/suscripcion");
}

/** Páginas extra dentro del ciclo vigente, cuando se agota el cupo del mes. */
export async function buyTopup(subscriptionCycleId: string): Promise<void> {
  const user = await requireUser("/suscripcion");
  const db = scoped(user.id);
  const amountCents = priceCents("topup");
  const pages = env().TOPUP_PAGES;
  const payment = await db.billing.startTopup(subscriptionCycleId, amountCents, pages);

  const { redirectUrl, preferenceId } = await paymentProvider().createCheckout({
    paymentId: payment.id,
    title: `${pages} páginas extra`,
    amountCents,
    payerEmail: user.email,
    returnUrl: `${env().APP_URL}/suscripcion`,
  });
  if (preferenceId) await db.payments.setPreference(payment.id, preferenceId);
  redirect(redirectUrl);
}
