import { DeleteObjectsCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { env } from "@/lib/env";

// Cliente S3: RustFS en local, Cloudflare R2 en producción.
let client: S3Client | undefined;

export function s3(): S3Client {
  if (client) return client;
  const e = env();
  client = new S3Client({
    endpoint: e.S3_ENDPOINT,
    region: e.S3_REGION,
    forcePathStyle: e.S3_FORCE_PATH_STYLE,
    credentials: {
      accessKeyId: e.S3_ACCESS_KEY_ID,
      secretAccessKey: e.S3_SECRET_ACCESS_KEY,
    },
  });
  return client;
}

export function bucket(): string {
  return env().S3_BUCKET;
}

/** Contenido de un objeto (para leer el contrato en los jobs). */
export async function getObjectBytes(key: string): Promise<Uint8Array> {
  const res = await s3().send(new GetObjectCommand({ Bucket: bucket(), Key: key }));
  if (!res.Body) throw new Error(`Objeto vacío: ${key}`);
  return res.Body.transformToByteArray();
}

/** Sube un objeto desde el servidor (el texto pegado no pasa por una URL firmada). */
export async function putObject(key: string, body: Uint8Array | string, contentType: string): Promise<void> {
  await s3().send(new PutObjectCommand({ Bucket: bucket(), Key: key, Body: body, ContentType: contentType }));
}

/** Borra objetos de a 1000 (el máximo de S3 por pedido). Ignora los que ya no existen. */
export async function deleteObjects(keys: string[]): Promise<number> {
  let deleted = 0;
  for (let i = 0; i < keys.length; i += 1000) {
    const batch = keys.slice(i, i + 1000);
    const res = await s3().send(new DeleteObjectsCommand({ Bucket: bucket(), Delete: { Objects: batch.map((Key) => ({ Key })), Quiet: true } }));
    if (res.Errors?.length) throw new Error(`No se pudieron borrar ${res.Errors.length} archivos: ${res.Errors[0].Message}`);
    deleted += batch.length;
  }
  return deleted;
}
