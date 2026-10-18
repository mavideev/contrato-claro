import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { Resend } from "resend";
import { env } from "@/lib/env";
import type { EmailMessage } from "./templates";

// Envío de mails (spec 02, "Emails"). Producción: Resend si hay RESEND_API_KEY.
// Local: SMTP a Mailpit. Sin ninguno de los dos, se loguea en consola.

export type OutgoingEmail = EmailMessage & { to: string };

const globalForEmail = globalThis as unknown as { smtp?: Transporter; resend?: Resend };

export async function sendEmail(mail: OutgoingEmail): Promise<void> {
  const { EMAIL_FROM, RESEND_API_KEY, SMTP_HOST, SMTP_PORT } = env();

  if (RESEND_API_KEY) {
    globalForEmail.resend ??= new Resend(RESEND_API_KEY);
    const { error } = await globalForEmail.resend.emails.send({ from: EMAIL_FROM, ...mail });
    if (error) throw new Error(`Resend: ${error.message}`);
    return;
  }

  if (SMTP_HOST) {
    globalForEmail.smtp ??= nodemailer.createTransport({ host: SMTP_HOST, port: SMTP_PORT, secure: false });
    await globalForEmail.smtp.sendMail({ from: EMAIL_FROM, ...mail });
    return;
  }

  console.warn(`[email] sin transporte configurado; mail a ${mail.to}: ${mail.subject}\n${mail.text}`);
}
