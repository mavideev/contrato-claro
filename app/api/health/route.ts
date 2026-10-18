import { HeadBucketCommand } from "@aws-sdk/client-s3";
import { connection } from "next/server";
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

// Health check de Render y del compose: base y almacenamiento.
export async function GET() {
  await connection();
  const [db, storage] = await Promise.all([
    check(() => sql()`select 1`),
    check(() => s3().send(new HeadBucketCommand({ Bucket: bucket() }))),
  ]);
  const ok = db === "ok" && storage === "ok";
  return Response.json({ status: ok ? "ok" : "error", db, storage }, { status: ok ? 200 : 503 });
}
