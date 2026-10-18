import "server-only";
import { randomUUID } from "node:crypto";
import { HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@/lib/env";
import { bucket, s3 } from "./s3";

// Subida directa del navegador a S3 con URL firmada (spec 05, "Subida de archivos").
// La app firma un PUT con tipo y tamaño fijos; al terminar, verifica con HEAD.

export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
export const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/heic",
  "image/webp",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;
export type AllowedType = (typeof ALLOWED_TYPES)[number];

const SIGNED_URL_SECONDS = 10 * 60;

// Las URL las usa el navegador: se firman contra el endpoint público
// (en local, localhost:9000 en lugar de storage:9000 dentro de Docker).
let publicClient: S3Client | undefined;
function signer(): S3Client {
  const e = env();
  if (!e.S3_PUBLIC_ENDPOINT || e.S3_PUBLIC_ENDPOINT === e.S3_ENDPOINT) return s3();
  publicClient ??= new S3Client({
    endpoint: e.S3_PUBLIC_ENDPOINT,
    region: e.S3_REGION,
    forcePathStyle: e.S3_FORCE_PATH_STYLE,
    credentials: { accessKeyId: e.S3_ACCESS_KEY_ID, secretAccessKey: e.S3_SECRET_ACCESS_KEY },
  });
  return publicClient;
}

export function isAllowedType(type: string): type is AllowedType {
  return (ALLOWED_TYPES as readonly string[]).includes(type);
}

/** URL firmada para subir un archivo. La clave queda bajo el usuario: users/<userId>/... */
export async function presignUpload(opts: { userId: string; contentType: string; size: number }) {
  if (!isAllowedType(opts.contentType)) throw new Error(`Tipo no permitido: ${opts.contentType}`);
  if (!Number.isInteger(opts.size) || opts.size <= 0 || opts.size > MAX_UPLOAD_BYTES) throw new Error("Tamaño fuera de límite");
  const key = `users/${opts.userId}/uploads/${randomUUID()}`;
  const url = await getSignedUrl(
    signer(),
    new PutObjectCommand({
      Bucket: bucket(),
      Key: key,
      ContentType: opts.contentType,
      ContentLength: opts.size,
    }),
    { expiresIn: SIGNED_URL_SECONDS, signableHeaders: new Set(["content-type", "content-length"]) },
  );
  return { key, url, expiresIn: SIGNED_URL_SECONDS };
}

/** Verifica que el objeto subido exista y tenga el tipo y tamaño esperados. */
export async function verifyUpload(key: string, expected: { contentType: string; size: number }) {
  try {
    const head = await s3().send(new HeadObjectCommand({ Bucket: bucket(), Key: key }));
    return head.ContentLength === expected.size && head.ContentType === expected.contentType;
  } catch {
    return false;
  }
}
