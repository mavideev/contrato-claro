import "server-only";
import { z } from "zod";

// Variables de entorno del servidor. Se validan la primera vez que se usan
// (no al importar) para que `next build` funcione sin un .env completo.
// Ver docs/specs/00-architecture.md.

const optional = z
  .string()
  .optional()
  .transform((v) => (v === "" ? undefined : v));

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_URL: z.url(),
  DATABASE_URL: z.url(),

  // Firma de cookies y tokens de Better Auth. En producción, un valor aleatorio
  // (`openssl rand -base64 32`).
  BETTER_AUTH_SECRET: z.string().min(32),
  GOOGLE_CLIENT_ID: optional,
  GOOGLE_CLIENT_SECRET: optional,

  S3_ENDPOINT: optional.pipe(z.url().optional()),
  S3_PUBLIC_ENDPOINT: optional.pipe(z.url().optional()),
  S3_REGION: z.string().default("us-east-1"),
  S3_BUCKET: z.string().min(1),
  S3_ACCESS_KEY_ID: z.string().min(1),
  S3_SECRET_ACCESS_KEY: z.string().min(1),
  S3_FORCE_PATH_STYLE: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),

  EMAIL_FROM: z.string().default("Contrato Claro <hola@localhost>"),
  SMTP_HOST: optional,
  SMTP_PORT: z.coerce.number().int().default(1025),
  RESEND_API_KEY: optional,

  // Mercado Pago (spec 04). Sin el secreto, el webhook rechaza todo.
  MP_ACCESS_TOKEN: optional,
  MP_WEBHOOK_SECRET: optional,

  INNGEST_DEV: optional,
  INNGEST_EVENT_KEY: optional,
  INNGEST_SIGNING_KEY: optional,
});

export type Env = z.infer<typeof schema>;

let cached: Env | undefined;

export function env(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const fields = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`);
    throw new Error(`Variables de entorno inválidas:\n${fields.join("\n")}`);
  }
  cached = parsed.data;
  return cached;
}
