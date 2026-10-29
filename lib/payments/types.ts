// Contrato común del simulador y de Mercado Pago (spec 04).

export type PaymentStatus = "pending" | "approved" | "rejected" | "cancelled" | "refunded";

export type CheckoutInput = {
  /** payments.id: viaja como external_reference y vuelve en el webhook. */
  paymentId: string;
  title: string;
  amountCents: number;
  payerEmail: string;
  /** A dónde vuelve el usuario después de pagar (/pago/retorno?...). */
  returnUrl: string;
};

export type ProviderPayment = {
  id: string;
  status: PaymentStatus;
  externalReference: string | null;
  /** null en el simulador (no hay monto real que comparar). */
  amountCents: number | null;
};

export interface PaymentProvider {
  name: "mock" | "mercadopago";
  createCheckout(input: CheckoutInput): Promise<{ redirectUrl: string; preferenceId: string | null }>;
  getPayment(id: string): Promise<ProviderPayment>;
}

// Suscripciones (spec 06): Preapproval API de Mercado Pago, cobro recurrente mensual.

export type SubscriptionStatus = "pending" | "authorized" | "paused" | "cancelled";

export type CreatePreapprovalInput = {
  /** subscriptions.id: viaja como external_reference y vuelve en el webhook. */
  subscriptionId: string;
  planName: string;
  amountCents: number;
  payerEmail: string;
  returnUrl: string;
};

export type ProviderPreapproval = {
  id: string;
  status: SubscriptionStatus;
  externalReference: string | null;
};

export interface SubscriptionProvider {
  name: "mock" | "mercadopago";
  createPreapproval(input: CreatePreapprovalInput): Promise<{ redirectUrl: string; preapprovalId: string }>;
  getPreapproval(id: string): Promise<ProviderPreapproval>;
  cancelPreapproval(id: string): Promise<void>;
  /** El webhook `subscription_authorized_payment` trae el id de un cobro: de ahí sale a qué preapproval pertenece. */
  getAuthorizedPayment(id: string): Promise<{ preapprovalId: string }>;
}
