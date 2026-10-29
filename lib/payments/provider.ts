import "server-only";
import { env } from "@/lib/env";
import { mercadoPagoProvider } from "./mercadopago-api";
import { mercadoPagoSubscriptionProvider } from "./mercadopago-preapproval";
import { mockProvider, mockSubscriptionProvider } from "./mock";
import type { PaymentProvider, SubscriptionProvider } from "./types";

// Elige el proveedor: Mercado Pago si hay MP_ACCESS_TOKEN, el simulador si no.
// El simulador aprueba pagos sin cobrar, así que en producción está prohibido.
export function paymentProvider(): PaymentProvider {
  const e = env();
  const name = e.PAYMENTS_PROVIDER ?? (e.MP_ACCESS_TOKEN ? "mercadopago" : "mock");
  if (name === "mock") {
    if (e.NODE_ENV === "production") throw new Error("El simulador de pagos no se puede usar en producción");
    return mockProvider(e.APP_URL);
  }
  if (!e.MP_ACCESS_TOKEN) throw new Error("Falta MP_ACCESS_TOKEN");
  return mercadoPagoProvider({ accessToken: e.MP_ACCESS_TOKEN, appUrl: e.APP_URL });
}

/** Precio en centavos según el tipo de pago (0 = sin definir). */
export function priceCents(kind: "analysis" | "recheck" | "topup"): number {
  const e = env();
  const ars = kind === "analysis" ? e.PRICE_ANALYSIS_ARS : kind === "recheck" ? e.PRICE_RECHECK_ARS : e.PRICE_TOPUP_ARS;
  return ars * 100;
}

// Suscripciones (spec 06): mismo criterio que paymentProvider().
export function subscriptionProvider(): SubscriptionProvider {
  const e = env();
  const name = e.PAYMENTS_PROVIDER ?? (e.MP_ACCESS_TOKEN ? "mercadopago" : "mock");
  if (name === "mock") {
    if (e.NODE_ENV === "production") throw new Error("El simulador de pagos no se puede usar en producción");
    return mockSubscriptionProvider(e.APP_URL);
  }
  if (!e.MP_ACCESS_TOKEN) throw new Error("Falta MP_ACCESS_TOKEN");
  return mercadoPagoSubscriptionProvider({ accessToken: e.MP_ACCESS_TOKEN, appUrl: e.APP_URL });
}
