import { createHmac, timingSafeEqual } from "node:crypto";

// Firma de los webhooks de Mercado Pago (spec 04, paso 4.1).
// Header `x-signature: ts=<segundos>,v1=<hmac hex>`. El HMAC-SHA256 con el
// secreto del webhook se calcula sobre el manifiesto
// `id:<data.id>;request-id:<x-request-id>;ts:<ts>;`, donde `data.id` sale
// de la query y va en minúsculas si es alfanumérico. Las partes sin valor se omiten.

export function parseSignature(header: string | null): { ts: string; v1: string } | null {
  if (!header) return null;
  const parts = Object.fromEntries(
    header.split(",").map((p) => {
      const [k, ...v] = p.split("=");
      return [k.trim(), v.join("=").trim()];
    }),
  );
  return parts.ts && parts.v1 ? { ts: parts.ts, v1: parts.v1 } : null;
}

export function signatureManifest(dataId: string | null, requestId: string | null, ts: string): string {
  const id = dataId && /^[a-z0-9]+$/i.test(dataId) ? dataId.toLowerCase() : dataId;
  return `${id ? `id:${id};` : ""}${requestId ? `request-id:${requestId};` : ""}ts:${ts};`;
}

export function sign(secret: string, manifest: string): string {
  return createHmac("sha256", secret).update(manifest).digest("hex");
}

export function verifySignature(opts: {
  secret: string;
  signature: string | null;
  requestId: string | null;
  dataId: string | null;
}): boolean {
  const parsed = parseSignature(opts.signature);
  if (!parsed) return false;
  const expected = Buffer.from(sign(opts.secret, signatureManifest(opts.dataId, opts.requestId, parsed.ts)), "hex");
  const given = Buffer.from(parsed.v1, "hex");
  return given.length === expected.length && timingSafeEqual(given, expected);
}
