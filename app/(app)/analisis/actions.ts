"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { FIELDS } from "@/lib/analysis/fields";
import { SAMPLE_FIELDS, SAMPLE_PREVIEW } from "@/lib/analysis/sample";
import { requireUser } from "@/lib/auth/session";
import { scoped } from "@/lib/db/scoped";

// Acciones del flujo del análisis (spec 03). Cada una valida la sesión y pasa
// por scoped(), así que solo toca datos del usuario.
//
// Etapa 0: no hay extracción, análisis ni Mercado Pago todavía. Subir crea el
// análisis con datos de ejemplo y pagar deja el pago en `pending`. El archivo
// no viaja en la acción: en la etapa 2 se sube directo a S3 con URL firmada.

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
  // Precio: [PRECIO] hasta que se defina (spec 04); se guarda 0.
  const payment = await scoped(user.id).payments.start(id, "analysis", 0);
  if (!payment) redirect("/analisis");
  redirect(`/pago/retorno?analisis=${id}`);
}

export async function startRecheckPayment(id: string): Promise<void> {
  const user = await requireUser(`/analisis/${id}/rechequeo`);
  const payment = await scoped(user.id).payments.start(id, "recheck", 0);
  if (!payment) redirect("/analisis");
  redirect(`/pago/retorno?analisis=${id}&tipo=rechequeo`);
}

export async function createRecheck(id: string): Promise<void> {
  const user = await requireUser(`/analisis/${id}/rechequeo`);
  await scoped(user.id).rechecks.create(id);
  redirect(`/analisis/${id}/rechequeo`);
}
