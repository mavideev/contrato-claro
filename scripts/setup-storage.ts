// Crea el bucket privado de contratos si no existe y le aplica CORS (el
// navegador sube directo con URL firmadas). Lo corre el servicio `setup` del
// compose; en producción el bucket de R2 se configura a mano (docs/deploy.md).
import {
  CreateBucketCommand,
  HeadBucketCommand,
  PutBucketCorsCommand,
  PutPublicAccessBlockCommand,
  S3Client,
} from "@aws-sdk/client-s3";

const required = ["S3_BUCKET", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"] as const;
for (const key of required) {
  if (!process.env[key]) throw new Error(`Falta ${key}`);
}

const Bucket = process.env.S3_BUCKET!;
const client = new S3Client({
  endpoint: process.env.S3_ENDPOINT || undefined,
  region: process.env.S3_REGION || "us-east-1",
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
  },
});

async function main() {
  if (await exists()) console.log(`[setup-storage] bucket "${Bucket}" ya existe`);
  else await create();
  // Siempre: un bucket creado antes de la etapa 2 no tenía CORS.
  const origin = new URL(process.env.APP_URL ?? "http://localhost:3000").origin;
  await client.send(
    new PutBucketCorsCommand({
      Bucket,
      CORSConfiguration: { CORSRules: [{ AllowedOrigins: [origin], AllowedMethods: ["PUT"], AllowedHeaders: ["content-type"], MaxAgeSeconds: 3600 }] },
    }),
  );
  console.log(`[setup-storage] CORS: PUT desde ${origin}`);
}

async function exists() {
  try {
    await client.send(new HeadBucketCommand({ Bucket }));
    return true;
  } catch {
    return false;
  }
}

async function create() {
  await client.send(new CreateBucketCommand({ Bucket }));
  try {
    await client.send(
      new PutPublicAccessBlockCommand({
        Bucket,
        PublicAccessBlockConfiguration: {
          BlockPublicAcls: true,
          IgnorePublicAcls: true,
          BlockPublicPolicy: true,
          RestrictPublicBuckets: true,
        },
      }),
    );
  } catch {
    // Algunos servidores S3 no implementan PublicAccessBlock; el bucket ya es privado por defecto.
  }
  console.log(`[setup-storage] bucket "${Bucket}" creado`);
}

main().catch((err) => {
  console.error("[setup-storage]", err);
  process.exit(1);
});
