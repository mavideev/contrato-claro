import { describe, expect, it, vi } from "vitest";
import { mapStatus, mercadoPagoProvider } from "./mercadopago-api";
import { mockPaymentId, mockProvider, parseMockPaymentId } from "./mock";

const id = "0b3f6a2e-1c1d-4c55-9a0e-6f1f7a3b2c10";

describe("simulador", () => {
  it("el id simulado lleva el resultado y la referencia", async () => {
    expect(parseMockPaymentId(mockPaymentId("approved", id))).toEqual({ status: "approved", paymentId: id });
    expect(parseMockPaymentId("mock_hackeado_x")).toBeNull();
    const p = await mockProvider("http://localhost:3000").getPayment(mockPaymentId("rejected", id));
    expect(p).toMatchObject({ status: "rejected", externalReference: id });
  });

  it("el checkout lleva a la pantalla del simulador", async () => {
    const c = await mockProvider("http://localhost:3000").createCheckout({ paymentId: id, title: "x", amountCents: 0, payerEmail: "a@b.c", returnUrl: "/" });
    expect(c.redirectUrl).toBe(`http://localhost:3000/pago/simulador?pago=${id}`);
  });
});

describe("Mercado Pago (API mockeada)", () => {
  it("traduce los estados", () => {
    expect(mapStatus("approved")).toBe("approved");
    expect(mapStatus("in_process")).toBe("pending");
    expect(mapStatus("charged_back")).toBe("refunded");
    expect(mapStatus("rejected")).toBe("rejected");
  });

  it("crea la preferencia con external_reference y el webhook si la URL es pública", async () => {
    const fetch = vi.fn(async () => Response.json({ id: "pref-1", init_point: "https://mp/checkout" }));
    const mp = mercadoPagoProvider({ accessToken: "TEST-1", appUrl: "https://app.test", fetch });
    const c = await mp.createCheckout({ paymentId: id, title: "Análisis", amountCents: 1_500_000, payerEmail: "a@b.c", returnUrl: "https://app.test/pago/retorno" });
    expect(c).toEqual({ redirectUrl: "https://mp/checkout", preferenceId: "pref-1" });
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.mercadopago.com/checkout/preferences");
    const body = JSON.parse(String(init.body));
    expect(body.external_reference).toBe(id);
    expect(body.items[0].unit_price).toBe(15000);
    expect(body.notification_url).toBe("https://app.test/api/webhooks/mercadopago");
  });

  it("no crea preferencias sin precio", async () => {
    const mp = mercadoPagoProvider({ accessToken: "TEST-1", appUrl: "https://app.test", fetch: vi.fn() });
    await expect(mp.createCheckout({ paymentId: id, title: "x", amountCents: 0, payerEmail: "a@b.c", returnUrl: "/" })).rejects.toThrow("precio");
  });

  it("lee el pago real", async () => {
    const fetch = vi.fn(async () => Response.json({ id: 123, status: "approved", external_reference: id, transaction_amount: 15000 }));
    const p = await mercadoPagoProvider({ accessToken: "TEST-1", appUrl: "https://app.test", fetch }).getPayment("123");
    expect(p).toEqual({ id: "123", status: "approved", externalReference: id, amountCents: 1_500_000 });
  });
});
