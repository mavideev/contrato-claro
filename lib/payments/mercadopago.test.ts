import { describe, expect, it } from "vitest";
import { parseSignature, sign, signatureManifest, verifySignature } from "./mercadopago";

const secret = "secreto-de-prueba";

describe("firma de Mercado Pago", () => {
  it("arma el manifiesto con data.id en minúsculas", () => {
    expect(signatureManifest("ABC123", "req-1", "1700000000")).toBe("id:abc123;request-id:req-1;ts:1700000000;");
    expect(signatureManifest(null, "req-1", "1700000000")).toBe("request-id:req-1;ts:1700000000;");
  });

  it("lee el header x-signature", () => {
    expect(parseSignature("ts=1700000000,v1=abcd")).toEqual({ ts: "1700000000", v1: "abcd" });
    expect(parseSignature("v1=abcd")).toBeNull();
    expect(parseSignature(null)).toBeNull();
  });

  it("acepta una firma válida y rechaza las alteradas", () => {
    const v1 = sign(secret, signatureManifest("123", "req-1", "1700000000"));
    const ok = { secret, signature: `ts=1700000000,v1=${v1}`, requestId: "req-1", dataId: "123" };
    expect(verifySignature(ok)).toBe(true);
    expect(verifySignature({ ...ok, dataId: "124" })).toBe(false);
    expect(verifySignature({ ...ok, secret: "otro" })).toBe(false);
    expect(verifySignature({ ...ok, signature: "ts=1700000000,v1=zz" })).toBe(false);
    expect(verifySignature({ ...ok, signature: null })).toBe(false);
  });
});
