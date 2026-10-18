"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { FIELDS } from "@/lib/analysis/fields";
import { SAMPLE_FIELDS, SAMPLE_PREVIEW } from "@/lib/analysis/sample";
import { requireUser, type CurrentUser } from "@/lib/auth/session";
import { scoped } from "@/lib/db/scoped";
import { env } from "@/lib/env";
import { paymentProvider, priceCents } from "@/lib/payments/provider";

// Acciones del flujo del análisis (spec 03). Cada una valida la sesión y pasa
// por scoped(), así que solo toca datos del usuario.
//
// Todavía no hay extracción (etapa 2): subir crea el análisis con datos de
// ejemplo. El archivo no viaja en la acción: en la etapa 2 se sube directo a
// S3 con URL firmada. Pagar va a Mercado Pago (o al simulador, sin credenciales).

export type FormState = { error?: string };

const startSchema = z.object({
  contractType: z.literal("rental", { error: "Por ahora solo analizamos contratos de alquiler." }),
  method: z.enum(["foto", "archivo", "texto"]),
});

export async function startAnalysis(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser("/analisis/nuevo");
  const parsed = startSchema.safeParse({ contractType: form.get("contractType"), method: form.get("method") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const analysis = await scoped(user.id).analyses.create({
    contractType: "rental",
    status: "awaiting_confirmation",
    confirmedFields: SAMPLE_FIELDS,
  });
  redirect(`/analisis/${analysis.id}/confirmar${parsed.data.method === "foto" ? "?origen=foto" : ""}`);
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
  const current = await db.analyses.get(id);
  const row = await db.analyses.confirm(id, {
    confirmedFields,
    signingDate: signingDate || null,
    propertyLabel: confirmedFields.property || null,
    preview: current?.preview ?? SAMPLE_PREVIEW,
  });
  if (!row) return { error: "Este análisis ya no se puede editar." };
  redirect(`/analisis/${id}/estado`);
}

export async function startPayment(id: string): Promise<void> {
  const user = await requireUser(`/analisis/${id}/estado`);
  await checkout(user, id, "analysis");
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

export async function createRecheck(id: string): Promise<void> {
  const user = await requireUser(`/analisis/${id}/rechequeo`);
  await scoped(user.id).rechecks.create(id);
  redirect(`/analisis/${id}/rechequeo`);
}
