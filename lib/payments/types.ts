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
