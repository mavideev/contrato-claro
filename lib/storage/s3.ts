import { S3Client } from "@aws-sdk/client-s3";
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
