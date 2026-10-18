import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { magicLink } from "better-auth/plugins/magic-link";
import * as schema from "@/db/schema";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { magicLinkEmail, resetPasswordEmail, verificationEmail } from "@/lib/email/templates";
import { env } from "@/lib/env";

// Cuentas (spec 02). Se crea la primera vez que se usa, igual que db(),
// para que `next build` no necesite las variables de entorno.

async function audit(action: string, userId: string, metadata?: Record<string, unknown>) {
  try {
    await db().insert(schema.auditLog).values({ action, userId, targetType: "user", targetId: userId, metadata });
  } catch (err) {
    // El registro de auditoría no debe impedir entrar.
    console.error("[audit]", err);
  }
}

function createAuth() {
  const e = env();
  const google =
    e.GOOGLE_CLIENT_ID && e.GOOGLE_CLIENT_SECRET
      ? { google: { clientId: e.GOOGLE_CLIENT_ID, clientSecret: e.GOOGLE_CLIENT_SECRET } }
      : undefined;

  return betterAuth({
    appName: "Contrato Claro",
    baseURL: e.APP_URL,
    secret: e.BETTER_AUTH_SECRET,
    database: drizzleAdapter(db(), { provider: "pg", schema }),

    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      minPasswordLength: 8,
      resetPasswordTokenExpiresIn: 60 * 60,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, url }) => {
        await sendEmail({ to: user.email, ...resetPasswordEmail(url) });
      },
      onPasswordReset: async ({ user }) => {
        await audit("password_reset", user.id);
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      sendOnSignIn: true,
      autoSignInAfterVerification: true,
      expiresIn: 60 * 60,
      sendVerificationEmail: async ({ user, url }) => {
        await sendEmail({ to: user.email, ...verificationEmail(url) });
      },
    },
    socialProviders: google,

    rateLimit: { enabled: true, storage: "database" },

    databaseHooks: {
      user: {
        create: { after: async (user) => audit("sign_up", user.id) },
      },
      session: {
        create: { after: async (session, ctx) => audit("sign_in", session.userId, { via: ctx?.path }) },
      },
    },

    plugins: [
      magicLink({
        expiresIn: 15 * 60,
        sendMagicLink: async ({ email, url }) => {
          await sendEmail({ to: email, ...magicLinkEmail(url) });
        },
      }),
      // Tiene que ir último: aplica las cookies cuando se llama a la API desde Server Actions.
      nextCookies(),
    ],
  });
}

export type Auth = ReturnType<typeof createAuth>;

const globalForAuth = globalThis as unknown as { auth?: Auth };

export function auth(): Auth {
  globalForAuth.auth ??= createAuth();
  return globalForAuth.auth;
}

export function googleEnabled(): boolean {
  const e = env();
  return Boolean(e.GOOGLE_CLIENT_ID && e.GOOGLE_CLIENT_SECRET);
}
