// Crea el bucket privado de contratos si no existe. Lo corre el servicio
// `setup` del compose; en producción el bucket de R2 se crea a mano.
import {
  CreateBucketCommand,
  HeadBucketCommand,
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
  try {
    await client.send(new HeadBucketCommand({ Bucket }));
    console.log(`[setup-storage] bucket "${Bucket}" ya existe`);
    return;
  } catch {
    // no existe: se crea abajo
  }
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
