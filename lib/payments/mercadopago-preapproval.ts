import type { SubscriptionProvider, SubscriptionStatus } from "./types";

// Mercado Pago Preapproval API (spec 06): suscripción con cobro recurrente
// mensual. Es un circuito distinto al Checkout Pro de spec 04 (otros
// endpoints, otro ciclo de vida), pero comparte el mismo webhook y la misma
// verificación de firma.
// - POST /preapproval: crea la suscripción y devuelve init_point.
// - GET /preapproval/:id: el estado real (nunca se confía en el webhook).
// - PUT /preapproval/:id: pausar o cancelar.

const API = "https://api.mercadopago.com";

/** Estados de Mercado Pago → los de `subscriptions.status`. */
export function mapSubscriptionStatus(mp: string): SubscriptionStatus {
  switch (mp) {
    case "authorized":
      return "authorized";
    case "paused":
      return "paused";
    case "cancelled":
      return "cancelled";
    default:
      return "pending";
  }
}

export function mercadoPagoSubscriptionProvider(opts: { accessToken: string; appUrl: string; fetch?: typeof fetch }): SubscriptionProvider {
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
    async createPreapproval({ subscriptionId, planName, amountCents, payerEmail, returnUrl }) {
      if (amountCents <= 0) throw new Error("Falta el precio del plan");
      const pre = await call("/preapproval", {
        method: "POST",
        headers: { "X-Idempotency-Key": subscriptionId },
        body: JSON.stringify({
          reason: planName,
          external_reference: subscriptionId,
          payer_email: payerEmail,
          back_url: returnUrl,
          auto_recurring: { frequency: 1, frequency_type: "months", transaction_amount: amountCents / 100, currency_id: "ARS" },
          status: "pending",
          ...(opts.appUrl.startsWith("https://") ? { notification_url: `${opts.appUrl}/api/webhooks/mercadopago` } : {}),
        }),
      });
      return { redirectUrl: pre.init_point, preapprovalId: pre.id };
    },
    async getPreapproval(id) {
      const p = await call(`/preapproval/${encodeURIComponent(id)}`);
      return { id: String(p.id), status: mapSubscriptionStatus(p.status), externalReference: p.external_reference ?? null };
    },
    async cancelPreapproval(id) {
      await call(`/preapproval/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify({ status: "cancelled" }) });
    },
    async getAuthorizedPayment(id) {
      const p = await call(`/authorized_payments/${encodeURIComponent(id)}`);
      return { preapprovalId: String(p.preapproval_id) };
    },
  };
}
