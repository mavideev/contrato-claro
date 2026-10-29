"use server";
import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import { FIELDS } from "@/lib/analysis/fields";
import { samplePreview } from "@/lib/analysis/sample-report";
import { requireUser, type CurrentUser } from "@/lib/auth/session";
import { analysisEntitlement } from "@/lib/billing/entitlement";
import { scoped } from "@/lib/db/scoped";
import { env } from "@/lib/env";
import { inngest } from "@/lib/inngest/client";
import { paymentProvider, priceCents } from "@/lib/payments/provider";
import { putObject } from "@/lib/storage/s3";
import { isAllowedType, MAX_PAGES, MAX_UPLOAD_BYTES, presignUpload, verifyUpload } from "@/lib/storage/upload";

// Acciones del flujo del análisis (spec 03). Cada una valida la sesión y pasa
// por scoped(), así que solo toca datos del usuario.
//
// Subir: el navegador pide URL firmadas (prepareUploads), sube directo a S3 y
// después llama a startAnalysis con las claves; el texto pegado lo sube el
// servidor. La extracción corre en Inngest (jobs/extract-analysis.ts). Pagar va
// a Mercado Pago (o al simulador, sin credenciales).

export type FormState = { error?: string };

const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const MIN_TEXT = 100;
const MAX_TEXT = 200_000;

const fileSchema = z.object({ type: z.string(), size: z.number().int().positive() });

/** URL firmadas para subir el contrato: un archivo, o una foto por página. */
export async function prepareUploads(files: z.input<typeof fileSchema>[]): Promise<{ error: string } | { uploads: { key: string; url: string }[] }> {
  const user = await requireUser("/analisis/nuevo");
  const parsed = z.array(fileSchema).min(1).max(MAX_PAGES).safeParse(files);
  if (!parsed.success) return { error: `Podés subir hasta ${MAX_PAGES} páginas.` };
  for (const f of parsed.data) {
    if (!isAllowedType(f.type)) return { error: "Ese tipo de archivo no lo podemos leer. Subí un PDF, un Word o fotos." };
    if (f.size > MAX_UPLOAD_BYTES) return { error: "El archivo pesa más de 20 MB." };
  }
  const uploads = await Promise.all(parsed.data.map((f) => presignUpload({ userId: user.id, contentType: f.type, size: f.size })));
  return { uploads: uploads.map(({ key, url }) => ({ key, url })) };
}

const uploadedSchema = z.object({ key: z.string(), type: z.string(), size: z.coerce.number().int().positive() });

const startSchema = z.discriminatedUnion("method", [
  z.object({ method: z.literal("archivo"), file: uploadedSchema }),
  z.object({ method: z.literal("foto"), pages: z.array(uploadedSchema).min(1).max(MAX_PAGES) }),
  z.object({
    method: z.literal("texto"),
    text: z.string().trim().min(MIN_TEXT, { error: "Pegá el texto completo del contrato." }).max(MAX_TEXT, { error: "El texto es demasiado largo. Subilo como PDF o Word." }),
  }),
]);

const json = (v: FormDataEntryValue | null) => {
  try {
    return typeof v === "string" ? JSON.parse(v) : undefined;
  } catch {
    return undefined;
  }
};

export async function startAnalysis(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser("/analisis/nuevo");
  if (form.get("contractType") !== "rental") return { error: "Por ahora solo analizamos contratos de alquiler." };
  const parsed = startSchema.safeParse({ method: form.get("method"), file: json(form.get("file")), pages: json(form.get("pages")), text: form.get("text") ?? "" });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { error: issue.path[0] === "text" ? issue.message : "No pudimos recibir el contrato. Probá de nuevo." };
  }
  const input = parsed.data;

  // Las claves las firmó prepareUploads para este usuario; igual se revisa que
  // sean suyas y que el archivo haya llegado entero.
  const own = `users/${user.id}/uploads/`;
  const uploaded = input.method === "archivo" ? [input.file] : input.method === "foto" ? input.pages : [];
  for (const f of uploaded) {
    if (!f.key.startsWith(own) || !isAllowedType(f.type) || !(await verifyUpload(f.key, { contentType: f.type, size: f.size }))) {
      return { error: "El archivo no terminó de subirse. Probá de nuevo." };
    }
  }

  let upload: Parameters<ReturnType<typeof scoped>["analyses"]["createFromUpload"]>[0];
  if (input.method === "archivo") {
    const { key, type, size } = input.file;
    if (type !== "application/pdf" && type !== DOCX) return { error: "Subí un PDF o un Word (.docx)." };
    upload = { kind: type === DOCX ? "docx" : "pdf", mime: type, sizeBytes: size, storageKey: key };
  } else if (input.method === "foto") {
    if (!input.pages.every((p) => p.type.startsWith("image/"))) return { error: "Las páginas tienen que ser fotos." };
    const first = input.pages[0];
    upload = {
      kind: "photo",
      mime: first.type,
      sizeBytes: input.pages.reduce((n, p) => n + p.size, 0),
      storageKey: first.key,
      pages: input.pages.map((p) => ({ storageKey: p.key, sizeBytes: p.size })),
    };
  } else {
    const body = new TextEncoder().encode(input.text);
    const key = `${own}${randomUUID()}`;
    await putObject(key, body, "text/plain; charset=utf-8");
    upload = { kind: "text", mime: "text/plain", sizeBytes: body.byteLength, storageKey: key };
  }

  // "Pagar antes de subir": sin suscripción con cupo ni un pago ya aprobado, no se sube nada.
  const entitlement = await analysisEntitlement(user.id);
  if (entitlement.mode === "none" || entitlement.mode === "pending") {
    return { error: "Elegí cómo pagar antes de subir el contrato." };
  }
  if (entitlement.mode === "subscription") upload.subscriptionCycleId = entitlement.subscriptionCycleId;

  const db = scoped(user.id);
  const analysis = await db.analyses.createFromUpload(upload);
  if (entitlement.mode === "prepaid") await db.payments.linkPrepaid(entitlement.paymentId, analysis.id);
  try {
    await inngest.send({ name: "analysis/uploaded", data: { analysisId: analysis.id, userId: user.id } });
  } catch (err) {
    console.error("[análisis] no se pudo encolar la extracción", { analysisId: analysis.id, err });
    await db.analyses.markFailed(analysis.id, "queue");
    return { error: "No pudimos empezar a leer tu contrato. Probá de nuevo en un rato." };
  }
  console.log("[análisis] contrato subido, extracción encolada", { analysisId: analysis.id, method: input.method });
  redirect(`/analisis/${analysis.id}/estado`);
}

/** Estado del análisis, para la pantalla que espera la lectura del contrato. */
export async function analysisStatus(id: string): Promise<string | null> {
  const user = await requireUser(`/analisis/${id}/estado`);
  return (await scoped(user.id).analyses.get(id))?.status ?? null;
}

const confirmSchema = z.object({
  ...Object.fromEntries(FIELDS.map((f) => [f.key, z.string().trim().max(300)])),
  signingDate: z.union([z.literal(""), z.iso.date({ error: "Revisá la fecha de firma." })]),
});

export async function confirmAnalysis(id: string, _: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser(`/analisis/${id}/confirmar`);
  const parsed = confirmSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { signingDate, ...rest } = parsed.data as Record<string, string>;
  const confirmedFields = Object.fromEntries(FIELDS.map((f) => [f.key, rest[f.key] ?? ""]));
  const db = scoped(user.id);
  // Etapa 2: vista previa de ejemplo sobre las cláusulas reales (la checklist con IA es la etapa 3).
  const row = await db.analyses.confirm(id, {
    confirmedFields,
    signingDate: signingDate || null,
    propertyLabel: confirmedFields.property || null,
    preview: samplePreview(await db.analyses.clauses(id)),
  });
  if (!row) {
    console.error("[análisis] no se pudo confirmar (estado inválido)", { analysisId: id });
    return { error: "Este análisis ya no se puede editar." };
  }
  console.log("[análisis] datos clave confirmados", { analysisId: id });

  // Ya se pagó antes de subir (suscripción con cupo, o pago de análisis aprobado):
  // pasa derecho a "pagado", sin mostrar el botón de pagar.
  const alreadyPaid = row.billingMode === "subscription" || (await db.payments.latest(id, "analysis"))?.status === "approved";
  if (alreadyPaid && (await db.analyses.markPaid(id))) {
    await inngest.send({ id: `analysis-paid-${id}`, name: "analysis/paid", data: { analysisId: id } });
  }
  redirect(`/analisis/${id}/estado`);
}

export async function startPayment(id: string): Promise<void> {
  const user = await requireUser(`/analisis/${id}/estado`);
  const db = scoped(user.id);
  const analysis = await db.analyses.get(id);
  if (!analysis) redirect("/analisis");
  // Suscripción (spec 06) o ya pagado antes de subir: no hace falta un pago puntual.
  // (Con el flujo nuevo esto ya se resuelve en confirmAnalysis; queda como respaldo.)
  const alreadyPaid = analysis.billingMode === "subscription" || (await db.payments.latest(id, "analysis"))?.status === "approved";
  if (alreadyPaid) {
    if (await db.analyses.markPaid(id)) {
      await inngest.send({ id: `analysis-paid-${id}`, name: "analysis/paid", data: { analysisId: id } });
    }
    redirect(`/pago/retorno?analisis=${id}`);
  }
  await checkout(user, id, "analysis");
}

/** Pagar un análisis antes de subir el contrato ("pagar antes de subir"). */
export async function prepayAnalysis(): Promise<void> {
  const user = await requireUser("/analisis/nuevo");
  const db = scoped(user.id);
  const payment = await db.payments.startPrepaid("analysis", priceCents("analysis"));
  const returnPath = "/analisis/nuevo";
  if (payment.status === "approved") redirect(returnPath);
  if (payment.status === "pending" && payment.mpPreferenceId) redirect(returnPath);

  const { redirectUrl, preferenceId } = await paymentProvider().createCheckout({
    paymentId: payment.id,
    title: "Análisis de contrato de alquiler",
    amountCents: payment.amountCents,
    payerEmail: user.email,
    returnUrl: `${env().APP_URL}${returnPath}`,
  });
  if (preferenceId) await db.payments.setPreference(payment.id, preferenceId);
  redirect(redirectUrl);
}

export async function startRecheckPayment(id: string): Promise<void> {
  const user = await requireUser(`/analisis/${id}/rechequeo`);
  await checkout(user, id, "recheck");
}

// Spec 04, pasos 2 y 3: pago `pending` + preferencia, y a pagar.
async function checkout(user: CurrentUser, analysisId: string, kind: "analysis" | "recheck") {
  const db = scoped(user.id);
  const payment = await db.payments.start(analysisId, kind, priceCents(kind));
  if (!payment) redirect("/analisis");
  const returnPath = `/pago/retorno?analisis=${analysisId}${kind === "recheck" ? "&tipo=rechequeo" : ""}`;
  if (payment.status === "approved") redirect(returnPath);

  const { redirectUrl, preferenceId } = await paymentProvider().createCheckout({
    paymentId: payment.id,
    title: kind === "analysis" ? "Análisis de contrato de alquiler" : "Re-chequeo del día de la firma",
    amountCents: payment.amountCents,
    payerEmail: user.email,
    returnUrl: `${env().APP_URL}${returnPath}`,
  });
  if (preferenceId) await db.payments.setPreference(payment.id, preferenceId);
  redirect(redirectUrl);
}

const uploadRecheckSchema = z.discriminatedUnion("method", [
  z.object({ method: z.literal("archivo"), file: uploadedSchema }),
  z.object({ method: z.literal("foto"), pages: z.array(uploadedSchema).min(1).max(MAX_PAGES) }),
]);

/** Versión final del día de la firma: mismo chequeo de subida que startAnalysis. */
export async function uploadRecheck(id: string, _: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser(`/analisis/${id}/rechequeo`);
  const parsed = uploadRecheckSchema.safeParse({ method: form.get("method"), file: json(form.get("file")), pages: json(form.get("pages")) });
  if (!parsed.success) return { error: "No pudimos recibir el archivo. Probá de nuevo." };
  const input = parsed.data;

  const own = `users/${user.id}/uploads/`;
  const uploaded = input.method === "archivo" ? [input.file] : input.pages;
  for (const f of uploaded) {
    if (!f.key.startsWith(own) || !isAllowedType(f.type) || !(await verifyUpload(f.key, { contentType: f.type, size: f.size }))) {
      return { error: "El archivo no terminó de subirse. Probá de nuevo." };
    }
  }

  let upload: Parameters<ReturnType<typeof scoped>["rechecks"]["upload"]>[1];
  if (input.method === "archivo") {
    const { key, type, size } = input.file;
    if (type !== "application/pdf" && type !== DOCX) return { error: "Subí un PDF o un Word (.docx)." };
    upload = { kind: type === DOCX ? "docx" : "pdf", mime: type, sizeBytes: size, storageKey: key };
  } else {
    if (!input.pages.every((p) => p.type.startsWith("image/"))) return { error: "Las páginas tienen que ser fotos." };
    const first = input.pages[0];
    upload = {
      kind: "photo",
      mime: first.type,
      sizeBytes: input.pages.reduce((n, p) => n + p.size, 0),
      storageKey: first.key,
      pages: input.pages.map((p) => ({ storageKey: p.key, sizeBytes: p.size })),
    };
  }

  const db = scoped(user.id);
  const entitlement = await db.rechecks.entitlement(id);
  if (!entitlement.ok) return { error: "Este re-chequeo no está pagado, o el análisis ya no se puede re-chequear." };
  const recheck = await db.rechecks.upload(id, upload, { subscriptionCycleId: entitlement.subscriptionCycleId });
  if (!recheck) return { error: "Este re-chequeo no está pagado, o el análisis ya no se puede re-chequear." };
  try {
    await inngest.send({ name: "recheck/uploaded", data: { recheckId: recheck.id, analysisId: id, userId: user.id } });
  } catch (err) {
    console.error("[re-chequeo] no se pudo encolar la comparación", { analysisId: id, err });
    return { error: "No pudimos empezar a comparar. Probá de nuevo en un rato." };
  }
  console.log("[re-chequeo] versión final subida, comparación encolada", { analysisId: id, method: input.method });
  redirect(`/analisis/${id}/rechequeo`);
}
