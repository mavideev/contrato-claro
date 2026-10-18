// Test de integración: necesita la base del compose con el seed cargado
// (`make up`). Recorre los flujos de cuenta de la spec 02 contra Better Auth.
import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { afterAll, describe, expect, it, vi } from "vitest";
import { auditLog, session, user } from "@/db/schema";
import { auth } from "@/lib/auth";
import { db, sql } from "@/lib/db";
import type { OutgoingEmail } from "@/lib/email";

const outbox: OutgoingEmail[] = [];
vi.mock("@/lib/email", () => ({
  sendEmail: async (mail: OutgoingEmail) => {
    outbox.push(mail);
  },
}));

/** Último mail enviado a `to`, con el token que trae el link. */
function lastMailTo(to: string) {
  const mail = outbox.findLast((m) => m.to === to);
  if (!mail) throw new Error(`No hay mails para ${to}`);
  const url = new URL(mail.text.match(/https?:\/\/\S+/)![0]);
  const token = url.searchParams.get("token") ?? url.pathname.split("/").pop()!;
  return { mail, url, token };
}

async function errorCode(p: Promise<unknown>) {
  try {
    await p;
  } catch (err) {
    return (err as { body?: { code?: string } }).body?.code;
  }
  throw new Error("se esperaba un error");
}

const email = `test-${randomUUID()}@contratoclaro.local`;
const password = "clave-de-prueba-1";

afterAll(async () => {
  const ids = (await db().select({ id: user.id }).from(user).where(eq(user.email, email))).map((u) => u.id);
  if (ids.length) {
    await db().delete(auditLog).where(inArray(auditLog.userId, ids));
    await db().delete(user).where(inArray(user.id, ids));
  }
  await sql().end();
});

describe("cuentas (Better Auth)", () => {
  it("el registro manda el mail de verificación y no deja entrar sin verificar", async () => {
    await auth().api.signUpEmail({ body: { email, password, name: "test", callbackURL: "/analisis" } });

    const { mail, url } = lastMailTo(email);
    expect(mail.subject).toBe("Confirmá tu email");
    expect(url.pathname).toBe("/api/auth/verify-email");
    expect(url.searchParams.get("callbackURL")).toBe("/analisis");

    expect(await errorCode(auth().api.signInEmail({ body: { email, password } }))).toBe("EMAIL_NOT_VERIFIED");
  });

  it("el link de verificación verifica la cuenta y queda en audit_log", async () => {
    const { token } = lastMailTo(email);
    await auth().api.verifyEmail({ query: { token } });

    const [u] = await db().select().from(user).where(eq(user.email, email));
    expect(u.emailVerified).toBe(true);
    const actions = await db().select({ action: auditLog.action }).from(auditLog).where(eq(auditLog.userId, u.id));
    expect(actions.map((a) => a.action)).toContain("sign_up");
  });

  it("contraseña incorrecta y email inexistente dan el mismo error", async () => {
    const wrong = await errorCode(auth().api.signInEmail({ body: { email, password: "otra-clave-123" } }));
    const missing = await errorCode(
      auth().api.signInEmail({ body: { email: `nadie-${randomUUID()}@contratoclaro.local`, password } }),
    );
    expect(wrong).toBe("INVALID_EMAIL_OR_PASSWORD");
    expect(missing).toBe(wrong);
  });

  it("el link mágico sirve una sola vez", async () => {
    await auth().api.signInMagicLink({ body: { email, callbackURL: "/analisis" }, headers: new Headers() });
    const { mail, url, token } = lastMailTo(email);
    expect(mail.subject).toBe("Tu link para entrar");
    expect(url.pathname).toBe("/api/auth/magic-link/verify");

    const first = await auth().api.magicLinkVerify({ query: { token }, headers: new Headers() });
    expect(first.user.email).toBe(email);
    // El segundo uso redirige al errorCallbackURL con el código del error.
    const second = await auth().api.magicLinkVerify({
      query: { token, errorCallbackURL: "/ingresar" },
      headers: new Headers(),
      asResponse: true,
    });
    expect(second.status).toBe(302);
    expect(second.headers.get("location")).toContain("error=INVALID_TOKEN");
  });

  it("recuperar la contraseña la cambia y cierra las demás sesiones", async () => {
    await auth().api.signInEmail({ body: { email, password } });
    const [u] = await db().select().from(user).where(eq(user.email, email));
    expect((await db().select().from(session).where(eq(session.userId, u.id))).length).toBeGreaterThan(0);

    await auth().api.requestPasswordReset({ body: { email, redirectTo: "/recuperar/nueva" } });
    const { mail, token } = lastMailTo(email);
    expect(mail.subject).toBe("Cambiá tu contraseña");

    await auth().api.resetPassword({ body: { token, newPassword: "clave-nueva-123" } });
    expect(await db().select().from(session).where(eq(session.userId, u.id))).toHaveLength(0);
    expect(await errorCode(auth().api.signInEmail({ body: { email, password } }))).toBe("INVALID_EMAIL_OR_PASSWORD");
    const ok = await auth().api.signInEmail({ body: { email, password: "clave-nueva-123" } });
    expect(ok.user.email).toBe(email);
  });
});
