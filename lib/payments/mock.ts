import type { PaymentProvider, PaymentStatus, SubscriptionProvider, SubscriptionStatus } from "./types";

// Simulador de Mercado Pago para desarrollo (etapa 1, sin cuenta de MP).
// El «id de pago» lleva el resultado y la referencia: mock_<estado>_<paymentId>,
// así getPayment no necesita guardar nada. El webhook y su procesamiento son
// los reales: el simulador manda el aviso firmado como lo haría Mercado Pago.

const STATUSES: PaymentStatus[] = ["approved", "rejected", "pending", "cancelled"];

export function mockPaymentId(status: PaymentStatus, paymentId: string) {
  return `mock_${status}_${paymentId}`;
}

export function parseMockPaymentId(id: string): { status: PaymentStatus; paymentId: string } | null {
  const match = /^mock_([a-z]+)_([0-9a-f-]{36})$/.exec(id);
  if (!match || !STATUSES.includes(match[1] as PaymentStatus)) return null;
  return { status: match[1] as PaymentStatus, paymentId: match[2] };
}

export function mockProvider(appUrl: string): PaymentProvider {
  return {
    name: "mock",
    async createCheckout({ paymentId }) {
      return { redirectUrl: `${appUrl}/pago/simulador?pago=${paymentId}`, preferenceId: null };
    },
    async getPayment(id) {
      const parsed = parseMockPaymentId(id);
      if (!parsed) throw new Error(`Pago simulado inválido: ${id}`);
      return { id, status: parsed.status, externalReference: parsed.paymentId, amountCents: null };
    },
  };
}

// Simulador de la Preapproval API (spec 06), mismo criterio: el "id de
// suscripción" lleva el resultado y la referencia.

const SUBSCRIPTION_STATUSES: SubscriptionStatus[] = ["authorized", "cancelled", "pending"];

export function mockPreapprovalId(status: SubscriptionStatus, subscriptionId: string) {
  return `mock_${status}_${subscriptionId}`;
}

export function parseMockPreapprovalId(id: string): { status: SubscriptionStatus; subscriptionId: string } | null {
  const match = /^mock_([a-z]+)_([0-9a-f-]{36})$/.exec(id);
  if (!match || !SUBSCRIPTION_STATUSES.includes(match[1] as SubscriptionStatus)) return null;
  return { status: match[1] as SubscriptionStatus, subscriptionId: match[2] };
}

/** Simula el cobro mensual: referencia a una suscripción ya autorizada. */
export function mockAuthorizedPaymentId(subscriptionId: string) {
  return `mock_charge_${subscriptionId}`;
}

function parseMockAuthorizedPaymentId(id: string): { subscriptionId: string } | null {
  const match = /^mock_charge_([0-9a-f-]{36})$/.exec(id);
  return match ? { subscriptionId: match[1] } : null;
}

export function mockSubscriptionProvider(appUrl: string): SubscriptionProvider {
  return {
    name: "mock",
    async createPreapproval({ subscriptionId }) {
      return { redirectUrl: `${appUrl}/suscripcion/simulador?suscripcion=${subscriptionId}`, preapprovalId: mockPreapprovalId("pending", subscriptionId) };
    },
    async getPreapproval(id) {
      const parsed = parseMockPreapprovalId(id);
      if (!parsed) throw new Error(`Suscripción simulada inválida: ${id}`);
      return { id, status: parsed.status, externalReference: parsed.subscriptionId };
    },
    async cancelPreapproval() {},
    async getAuthorizedPayment(id) {
      const parsed = parseMockAuthorizedPaymentId(id);
      if (!parsed) throw new Error(`Cobro simulado inválido: ${id}`);
      return { preapprovalId: mockPreapprovalId("authorized", parsed.subscriptionId) };
    },
  };
}
