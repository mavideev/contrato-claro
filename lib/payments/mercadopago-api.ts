import type { PaymentProvider, PaymentStatus } from "./types";

// Mercado Pago Checkout Pro por API REST (spec 04). Sin SDK: dos llamadas.
// - POST /checkout/preferences: crea la preferencia y devuelve init_point.
// - GET /v1/payments/:id: el estado real del pago (nunca se confía en el webhook).

const API = "https://api.mercadopago.com";

/** Estados de Mercado Pago → los de `payments.status`. */
export function mapStatus(mp: string): PaymentStatus {
  switch (mp) {
    case "approved":
      return "approved";
    case "rejected":
      return "rejected";
    case "cancelled":
      return "cancelled";
    case "refunded":
    case "charged_back":
      return "refunded";
    default:
      // pending, in_process, authorized, in_mediation
      return "pending";
  }
}

export function mercadoPagoProvider(opts: { accessToken: string; appUrl: string; fetch?: typeof fetch }): PaymentProvider {
  const f = opts.fetch ?? fetch;
  const call = async (path: string, init?: RequestInit) => {
    const res = await f(`${API}${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${opts.accessToken}`, "Content-Type": "application/json", ...init?.headers },
    });
    if (!res.ok) throw new Error(`Mercado Pago ${init?.method ?? "GET"} ${path}: ${res.status} ${await res.text()}`);
    return res.json();
  };

  return {
    name: "mercadopago",
    async createCheckout({ paymentId, title, amountCents, payerEmail, returnUrl }) {
      if (amountCents <= 0) throw new Error("Falta el precio (PRICE_ANALYSIS_ARS / PRICE_RECHECK_ARS)");
      // Mercado Pago solo acepta notification_url públicas (https). En local, el
      // webhook se configura en el panel de la aplicación con la URL del túnel.
      const publicUrl = opts.appUrl.startsWith("https://");
      const pref = await call("/checkout/preferences", {
        method: "POST",
        headers: { "X-Idempotency-Key": paymentId },
        body: JSON.stringify({
          items: [{ id: paymentId, title, quantity: 1, unit_price: amountCents / 100, currency_id: "ARS" }],
          payer: { email: payerEmail },
          external_reference: paymentId,
          back_urls: { success: returnUrl, pending: returnUrl, failure: returnUrl },
          // auto_return exige back_urls https: en local se vuelve con «Volver al sitio».
          ...(returnUrl.startsWith("https://") ? { auto_return: "approved" } : {}),
          ...(publicUrl ? { notification_url: `${opts.appUrl}/api/webhooks/mercadopago` } : {}),
        }),
      });
      return { redirectUrl: pref.init_point, preferenceId: pref.id };
    },
    async getPayment(id) {
      const p = await call(`/v1/payments/${encodeURIComponent(id)}`);
      return {
        id: String(p.id),
        status: mapStatus(p.status),
        externalReference: p.external_reference ?? null,
        amountCents: Math.round(Number(p.transaction_amount) * 100),
      };
    },
  };
}
