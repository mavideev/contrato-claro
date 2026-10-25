import { HeadBucketCommand } from "@aws-sdk/client-s3";
import { connection } from "next/server";
import { pingAnthropic } from "@/lib/ai/anthropic";
import { aiProvider } from "@/lib/ai/provider";
import { sql } from "@/lib/db";
import { bucket, s3 } from "@/lib/storage/s3";

type Check = "ok" | "error";

async function check(fn: () => Promise<unknown>): Promise<Check> {
  try {
    await fn();
    return "ok";
  } catch (err) {
    console.error("[health]", err);
    return "error";
  }
}

// Si Claude está activo, valida la clave y el modelo con `models.retrieve`
// (no genera texto, no gasta tokens). Con el simulador, no corre nada.
async function aiCheck(): Promise<Check | "skipped"> {
  try {
    if (aiProvider().name !== "anthropic") return "skipped";
  } catch (err) {
    console.error("[health]", err);
    return "error";
  }
  return check(pingAnthropic);
}

// Health check de Render y del compose: base, almacenamiento e IA.
export async function GET() {
  await connection();
  const [db, storage, ai] = await Promise.all([
    check(() => sql()`select 1`),
    check(() => s3().send(new HeadBucketCommand({ Bucket: bucket() }))),
    aiCheck(),
  ]);
  const ok = db === "ok" && storage === "ok" && ai !== "error";
  return Response.json({ status: ok ? "ok" : "error", db, storage, ai }, { status: ok ? 200 : 503 });
}
