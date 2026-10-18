// Test de integración: subida de prueba a RustFS con URL firmada (necesita `make up`).
// Usa S3_PUBLIC_ENDPOINT=http://localhost:9000, como el navegador.
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { afterAll, describe, expect, it } from "vitest";
import { bucket, s3 } from "./s3";
import { MAX_UPLOAD_BYTES, presignUpload, verifyUpload } from "./upload";

const pdf = new TextEncoder().encode("%PDF-1.4\n% contrato de prueba\n%%EOF\n");
const keys: string[] = [];

afterAll(async () => {
  await Promise.all(keys.map((Key) => s3().send(new DeleteObjectCommand({ Bucket: bucket(), Key }))));
});

describe("subida con URL firmada", () => {
  it("el navegador sube con PUT y el servidor lo verifica con HEAD", async () => {
    const { key, url } = await presignUpload({ userId: "test-user", contentType: "application/pdf", size: pdf.byteLength });
    keys.push(key);
    expect(key).toMatch(/^users\/test-user\/uploads\/[0-9a-f-]{36}$/);
    expect(url).toContain("localhost:9000");

    const res = await fetch(url, { method: "PUT", body: pdf, headers: { "content-type": "application/pdf" } });
    expect(res.status).toBe(200);
    expect(await verifyUpload(key, { contentType: "application/pdf", size: pdf.byteLength })).toBe(true);
    expect(await verifyUpload(key, { contentType: "application/pdf", size: pdf.byteLength + 1 })).toBe(false);
  });

  it("rechaza subir con otro tipo que el firmado", async () => {
    const { key, url } = await presignUpload({ userId: "test-user", contentType: "application/pdf", size: pdf.byteLength });
    keys.push(key);
    const res = await fetch(url, { method: "PUT", body: pdf, headers: { "content-type": "text/html" } });
    expect(res.status).toBe(403);
    expect(await verifyUpload(key, { contentType: "application/pdf", size: pdf.byteLength })).toBe(false);
  });

  it("no firma tipos ni tamaños fuera de los límites", async () => {
    await expect(presignUpload({ userId: "u", contentType: "text/html", size: 10 })).rejects.toThrow("Tipo no permitido");
    await expect(presignUpload({ userId: "u", contentType: "application/pdf", size: MAX_UPLOAD_BYTES + 1 })).rejects.toThrow("Tamaño");
    await expect(presignUpload({ userId: "u", contentType: "application/pdf", size: 0 })).rejects.toThrow("Tamaño");
  });
});
