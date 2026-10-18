import type { PaymentProvider, PaymentStatus } from "./types";

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
